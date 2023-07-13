
import { KeytDeploymentIncompleteError } from '../errors.js';
import {
	API_METHODS,
	setK8SResource }                     from '../k8s-api.js';
import {
	readPodConfig,
	applyPod     }                       from '../types/pod.js';
import {
	getK8SServiceConfig,
	sendServiceToK8s   }                 from '../types/service.js';
import deploymentValidator               from '../validators/deployment.js';

export const DEPLOYMENT_RESOURCE_TYPE = 'deployment';

function getPath(name) {
	return `/app/state/${DEPLOYMENT_RESOURCE_TYPE}/${name}.json`;
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
		pod_config = await readPodConfig(
			deployment_name,
			DEPLOYMENT_RESOURCE_TYPE,
		);
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
		volumes: [],
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

	const {
		k8s_service,
		k8s_service_ports,
	} = getK8SServiceConfig(deployment_name);

	// if (Object.keys(deployment_config.ports).length > 0) {
	// 	k8s_service.spec.type = 'LoadBalancer';
	// }

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

	// volumes
	for (const [ volume_name, volume ] of Object.entries(deployment_config.volumes)) {
		if (volume.valueFrom !== null) {
			k8s_deployment_pod_spec.volumes.push({
				name: volume_name,
				configMap: {
					name: volume.valueFrom,
				},
			});
		}
		// eslint-disable-next-line unicorn/no-negated-condition
		else if (volume.secretFrom !== null) {
			k8s_deployment_pod_spec.volumes.push({
				name: volume_name,
				secret: {
					secretName: volume.secretFrom,
				},
			});
		}
		else {
			throw new Error('Invalid volume configuration.');
		}
	}

	k8s_deployment_containers.push(
		...applyPod({
			resource_name: deployment_name,
			resource_type: DEPLOYMENT_RESOURCE_TYPE,
			resource_config: deployment_config,
			pod_config,
			k8s_service_ports,
		}),
	);

	await Promise.all([
		sendDeploymentToK8s(
			deployment_name,
			k8s_deployment,
		),
		sendServiceToK8s(
			DEPLOYMENT_RESOURCE_TYPE,
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
