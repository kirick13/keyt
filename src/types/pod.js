
import { isPlainObject } from '../utils.js';
import podValidator      from '../validators/pod.js';

export function getPodConfigPath(resource_name, resource_type) {
	return `/app/state/${resource_type}/${resource_name}.pod.json`;
}

export function validatePodConfig(config) {
	return podValidator.cast(config);
}

export async function readPodConfig(resource_name, resource_type) {
	const file = Bun.file(
		getPodConfigPath(
			resource_name,
			resource_type,
		),
	);

	return file.json();
}

export async function savePodConfig(config, resource_name, resource_type) {
	Bun.write(
		getPodConfigPath(
			resource_name,
			resource_type,
		),
		JSON.stringify(config),
	);
}

export async function patchPodConfig(resource_name, resource_type, patch_key, patch_value) {
	const config = await readPodConfig(
		resource_name,
		resource_type,
	);

	config[patch_key] = patch_value;

	await savePodConfig(
		config,
		resource_name,
		resource_type,
	);
}

export function applyPod({
	resource_name,
	resource_type,
	resource_config,
	pod_config,
	k8s_service_ports,
}) {
	const k8s_pod_containers = [];

	for (const [ container_name, container_spec ] of Object.entries(pod_config.containers)) {
		const k8s_pod_container = {
			name: container_name,
			imagePullPolicy: 'Always',
		};

		// image
		{
			let container_image = container_spec.image;
			const is_image_name_dynamic = container_image.startsWith('$');

			if (is_image_name_dynamic) {
				const images_namespace = resource_config.docker.imagesNamespace;
				if (typeof images_namespace !== 'string') {
					throw new TypeError(`Pod for ${resource_type} ${resource_name} requested docker images namespace, but deployment config does not contain it.`);
				}

				container_image = container_image.replace('$', images_namespace);
			}

			if (
				container_image.includes(':') === false
				|| (
					container_image.indexOf(':') < container_image.indexOf('/')
				)
			) {
				container_image += ':' + resource_config.docker.imagesTag;

				if (
					is_image_name_dynamic
					&& typeof pod_config.imagesTagSuffix === 'string'
				) {
					container_image += '-' + pod_config.imagesTagSuffix;
				}
			}

			k8s_pod_container.image = container_image;
		}

		// ports
		for (const pod_port of container_spec.ports) {
			const external_port = resource_config.ports[pod_port] ?? pod_port;

			const container_port = {
				containerPort: pod_port,
			};
			if (external_port !== pod_port) {
				container_port.hostPort = external_port;
			}

			k8s_pod_container.ports ??= [];
			k8s_pod_container.ports.push(container_port);

			k8s_service_ports.push({
				name: `${container_name}-${pod_port}`,
				protocol: 'TCP',
				port: pod_port,
				targetPort: pod_port,
			});
		}

		// env
		for (const [ env_name, env_value ] of Object.entries(container_spec.env)) {
			k8s_pod_container.env ??= [];
			k8s_pod_container.env.push({
				name: env_name,
				value: env_value,
			});
		}

		// envExpect
		for (const env_name of container_spec.envExpect) {
			if (resource_config.env[env_name] === undefined) {
				throw new Error(`Pod for ${resource_type} ${resource_name} requested environment variable ${env_name}, but deployment config does not contain it.`);
			}
		}

		// env from daemonset/deployment
		for (const [ env_name, env_value_definition ] of Object.entries(resource_config.env)) {
			k8s_pod_container.env ??= [];

			// string
			if (typeof env_value_definition === 'string') {
				k8s_pod_container.env.push({
					name: env_name,
					value: env_value_definition,
				});
			}
			// object
			else {
				const { valueFrom, secretFrom, key } = env_value_definition;

				if (valueFrom !== null) {
					k8s_pod_container.env.push({
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
					k8s_pod_container.env.push({
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

		// volumesExpect
		if (isPlainObject(container_spec.volumesExpect)) {
			for (const [ volume_name, path ] of Object.entries(container_spec.volumesExpect)) {
				k8s_pod_container.volumeMounts ??= [];

				const volume_definition = resource_config.volumes[volume_name];
				if (volume_definition === undefined) {
					throw new Error(`Pod for ${resource_type} ${resource_name} requested volume ${volume_name}, but deployment config does not contain it.`);
				}

				k8s_pod_container.volumeMounts.push({
					name: volume_name,
					mountPath: path,
					readOnly: true,
				});
			}
		}

		k8s_pod_containers.push(k8s_pod_container);
	}

	return k8s_pod_containers;
}
