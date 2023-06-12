
import { KeytDeploymentIncompleteError } from '../errors.js';
import { API_METHODS,
         setK8SResource }                from '../k8s-api.js';
import { readPodConfig }                 from '../types/pod.js';
import deploymentValidator               from '../validators/deployment.js';

function getPath(name) {
	return `/app/state/deployment/${name}.json`;
}

export function validateDeploymentConfig(config) {
	return deploymentValidator.cast(config);
}

export async function saveDeploymentConfig(config) {
	Bun.write(
		getPath(config.name),
		JSON.stringify(config),
	);
}

export async function readDeploymentConfig(name) {
	const file = Bun.file(
		getPath(name),
	);

	return file.json();
}

export async function applyDeployment(deployment_name) {
	let deployment_config;
	let pod_config;

	try {
		deployment_config = await readDeploymentConfig(deployment_name);
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			throw new KeytDeploymentIncompleteError(
				KeytDeploymentIncompleteError.MISSING_DEPLOYMENT,
				deployment_name,
			);
		}

		throw error;
	}

	try {
		pod_config = await readPodConfig(deployment_name);
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			throw new KeytDeploymentIncompleteError(
				KeytDeploymentIncompleteError.MISSING_POD,
				deployment_name,
			);
		}

		throw error;
	}

	const k8s_deployment_containers = [];
	const k8s_deployment_image_pull_secrets = [];
	const k8s_deployment_pod_spec = {
		containers: k8s_deployment_containers,
		imagePullSecrets: k8s_deployment_image_pull_secrets,
	};
	const k8s_deployment = {
		apiVersion: 'apps/v1',
		kind: 'Deployment',
		metadata: {
			name: deployment_name,
			labels: {
				app: deployment_name,
			},
		},
		spec: {
			replicas: deployment_config.replicas,
			selector: {
				matchLabels: {
					app: deployment_name,
				},
			},
			template: {
				metadata: {
					labels: {
						app: deployment_name,
					},
				},
				spec: k8s_deployment_pod_spec,
			},
		},
	};

	const k8s_service_ports = [];
	const k8s_service = {
		apiVersion: 'v1',
		kind: 'Service',
		metadata: {
			name: deployment_name,
			labels: {
				app: deployment_name,
			},
		},
		spec: {
			selector: {
				app: deployment_name,
			},
			ports: k8s_service_ports,
		},
	};

	// nodes
	if (deployment_config.nodes !== null) {
		k8s_deployment_pod_spec.nodeSelector = deployment_config.nodes;
	}

	// imagePullSecrets
	if (deployment_config.docker.imagePullSecrets !== null) {
		for (const image_pull_secret of deployment_config.docker.imagePullSecrets) {
			k8s_deployment_image_pull_secrets.push({
				name: image_pull_secret,
			});
		}
	}

	for (const [ container_name, container_spec ] of Object.entries(pod_config.containers)) {
		const k8s_deployment_container = {
			name: container_name,
			imagePullPolicy: 'Always',
		};

		// image
		{
			let container_image = container_spec.image;
			const is_image_name_dynamic = container_image.startsWith('$');

			if (is_image_name_dynamic) {
				const images_namespace = deployment_config.docker.imagesNamespace;
				if (typeof images_namespace !== 'string') {
					throw new TypeError(`Pod for deployment ${deployment_name} requested docker images namespace, but deployment config does not contain it.`);
				}

				container_image = container_image.replace('$', images_namespace);
			}

			if (container_image.includes(':') === false) {
				container_image += ':' + deployment_config.docker.imagesTag;

				if (
					is_image_name_dynamic
					&& typeof pod_config.imagesTagSuffix === 'string'
				) {
					container_image += '-' + pod_config.imagesTagSuffix;
				}
			}

			k8s_deployment_container.image = container_image;
		}

		// ports
		for (const port of container_spec.ports) {
			k8s_deployment_container.ports ??= [];
			k8s_deployment_container.ports.push({
				containerPort: port,
			});

			k8s_service_ports.push({
				protocol: 'TCP',
				port,
				targetPort: port,
			});
		}

		// env
		for (const [ env_name, env_value ] of Object.entries(container_spec.env)) {
			k8s_deployment_container.env ??= [];
			k8s_deployment_container.env.push({
				name: env_name,
				value: env_value,
			});
		}

		// envExpect
		for (const env_name of container_spec.envExpect) {
			k8s_deployment_container.env ??= [];

			const env_value_definition = deployment_config.env[env_name];
			if (env_value_definition === undefined) {
				throw new Error(`Pod for deployment ${deployment_name} requested environment variable ${env_name}, but deployment config does not contain it.`);
			}

			// string
			if (typeof env_value_definition === 'string') {
				k8s_deployment_container.env.push({
					name: env_name,
					value: env_value_definition,
				});
			}
			// object
			else {
				const { valueFrom, secretFrom, key } = env_value_definition;

				if (valueFrom !== null) {
					k8s_deployment_container.env.push({
						name: env_name,
						valueFrom: {
							configMapKeyRef: {
								name: valueFrom,
								key,
							},
						},
					});
				}
				else if (secretFrom !== null) {
					k8s_deployment_container.env.push({
						name: env_name,
						valueFrom: {
							secretKeyRef: {
								name: secretFrom,
								key,
							},
						},
					});
				}
			}
		}

		k8s_deployment_containers.push(k8s_deployment_container);
	}

	await Promise.all([
		sendDeploymentToK8s(
			deployment_name,
			k8s_deployment,
		),
		sendServiceToK8s(
			deployment_name,
			k8s_service,
		),
	]);
}

async function sendDeploymentToK8s(name, k8s_config) {
	const result = await setK8SResource(
		API_METHODS.DEPLOYMENT,
		name,
		k8s_config,
	);

	console.log(`Deployment "${name}" ${result ? 'created' : 'updated'}.`);
}

async function sendServiceToK8s(name, k8s_config) {
	const result = await setK8SResource(
		API_METHODS.SERVICE,
		name,
		k8s_config,
	);

	console.log(`Service for deployment "${name}" ${result ? 'created' : 'updated'}.`);
}
