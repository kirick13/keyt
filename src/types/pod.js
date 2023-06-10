
import podValidator from '../validators/pod.js';

function getPath(deployment_name) {
	return `/app/state/deployment/${deployment_name}.pod.json`;
}

export function validatePodConfig(config) {
	return podValidator.cast(config);
}

export async function readPodConfig(deployment_name) {
	const file = Bun.file(
		getPath(deployment_name),
	);

	return file.json();
}

export async function savePodConfig(config, deployment_name) {
	Bun.write(
		getPath(deployment_name),
		JSON.stringify(config),
	);
}

export async function patchPodConfig(deployment_name, patch_key, patch_value) {
	const config = await readPodConfig(deployment_name);

	config[patch_key] = patch_value;

	await savePodConfig(
		config,
		deployment_name,
	);
}
