
import { KeyDaemonSetIncompleteError } from '../errors.js';
import {
	API_METHODS,
	setK8SResource }                   from '../k8s-api.js';
import {
	readPodConfig,
	applyPod     }                     from '../types/pod.js';
import {
	getK8SServiceConfig,
	sendServiceToK8s   }               from '../types/service.js';
import daemonSetValidator              from '../validators/daemon-set.js';

export const DAEMON_SET_RESOURCE_TYPE = 'daemon-set';

export function getDaemonSetConfigPath(name) {
	return `/app/state/${DAEMON_SET_RESOURCE_TYPE}/${name}.json`;
}

export function validateDaemonSetConfig(config) {
	return daemonSetValidator.cast(config);
}

export async function saveDaemonSetConfig(config) {
	Bun.write(
		getDaemonSetConfigPath(config.name),
		JSON.stringify(config),
	);
}

export async function readDaemonSetConfig(name) {
	const file = Bun.file(
		getDaemonSetConfigPath(name),
	);

	return file.json();
}

export async function applyDaemonSet(daemon_set_name) {
	let daemon_set_config;
	let pod_config;

	try {
		daemon_set_config = await readDaemonSetConfig(daemon_set_name);
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			throw new KeyDaemonSetIncompleteError(
				KeyDaemonSetIncompleteError.MISSING_DEPLOYMENT,
				daemon_set_name,
			);
		}

		throw error;
	}

	try {
		pod_config = await readPodConfig(
			daemon_set_name,
			DAEMON_SET_RESOURCE_TYPE,
		);
	}
	catch (error) {
		if (error.code === 'ENOENT') {
			throw new KeyDaemonSetIncompleteError(
				KeyDaemonSetIncompleteError.MISSING_POD,
				daemon_set_name,
			);
		}

		throw error;
	}

	const k8s_daemon_set_containers = [];
	const k8s_daemon_set_image_pull_secrets = [];
	const k8s_daemon_set_pod_spec = {
		containers: k8s_daemon_set_containers,
		imagePullSecrets: k8s_daemon_set_image_pull_secrets,
		volumes: [],
	};
	const k8s_daemon_set = {
		apiVersion: 'apps/v1',
		kind: 'DaemonSet',
		metadata: {
			name: daemon_set_name,
			labels: {
				app: daemon_set_name,
			},
		},
		spec: {
			selector: {
				matchLabels: {
					app: daemon_set_name,
				},
			},
			template: {
				metadata: {
					labels: {
						app: daemon_set_name,
					},
				},
				spec: k8s_daemon_set_pod_spec,
			},
		},
	};

	const {
		k8s_service,
		k8s_service_ports,
	} = getK8SServiceConfig(daemon_set_name);

	// if (Object.keys(daemon_set_config.ports).length > 0) {
	// 	k8s_service.spec.type = 'LoadBalancer';
	// }

	// nodes
	if (daemon_set_config.nodes !== null) {
		k8s_daemon_set_pod_spec.nodeSelector = daemon_set_config.nodes;
	}

	// imagePullSecrets
	if (daemon_set_config.docker.imagePullSecrets !== null) {
		for (const image_pull_secret of daemon_set_config.docker.imagePullSecrets) {
			k8s_daemon_set_image_pull_secrets.push({
				name: image_pull_secret,
			});
		}
	}

	// volumes
	for (const [ volume_name, volume ] of Object.entries(daemon_set_config.volumes)) {
		if (volume.valueFrom !== null) {
			k8s_daemon_set_pod_spec.volumes.push({
				name: volume_name,
				configMap: {
					name: volume.valueFrom,
				},
			});
		}
		// eslint-disable-next-line unicorn/no-negated-condition
		else if (volume.secretFrom !== null) {
			k8s_daemon_set_pod_spec.volumes.push({
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

	k8s_daemon_set_containers.push(
		...applyPod({
			resource_name: daemon_set_name,
			resource_type: DAEMON_SET_RESOURCE_TYPE,
			resource_config: daemon_set_config,
			pod_config,
			k8s_service_ports,
		}),
	);

	await Promise.all([
		sendDaemonSetToK8s(
			daemon_set_name,
			k8s_daemon_set,
		),
		sendServiceToK8s(
			DAEMON_SET_RESOURCE_TYPE,
			daemon_set_name,
			k8s_service,
		),
	]);
}

async function sendDaemonSetToK8s(daemon_set_name, k8s_config) {
	const result = await setK8SResource(
		API_METHODS.DAEMON_SET,
		daemon_set_name,
		k8s_config,
	);

	console.log(`Deployment "${daemon_set_name}" ${result ? 'created' : 'updated'}.`);
}
