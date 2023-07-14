
import {
	NAME_REGEXP,
	POD_RESOURCE_TYPES }    from '../consts.js';
import { KeytCommandError } from '../errors/command.js';
import { applyDaemonSet }   from '../types/daemon-set.js';
import { applyDeployment }  from '../types/deployment.js';
import { patchPodConfig }   from '../types/pod.js';

export default async function (args) {
	const resource_type = args.shift();
	if (POD_RESOURCE_TYPES.has(resource_type) === false) {
		throw new KeytCommandError(`Invalid pod resource type: ${resource_type}`);
	}

	const resource_name = args.shift();
	if (NAME_REGEXP.test(resource_name) === false) {
		throw new KeytCommandError('Invalid deployment name');
	}

	const patch_key = args.shift();
	const patch_value = args.shift();
	switch (patch_key) {
		case 'imagesTagSuffix':
			if (typeof patch_value !== 'string') {
				throw new KeytCommandError('Invalid patch value for imagesTagSuffix.');
			}
			break;
		default:
			throw new KeytCommandError(`Unknown patch key "${patch_key}".`);
	}

	await patchPodConfig(
		resource_name,
		resource_type,
		patch_key,
		patch_value,
	);

	switch (resource_type) {
		case 'deployment':
			await applyDeployment(resource_name);
			break;
		case 'daemon-set':
			await applyDaemonSet(resource_name);
			break;
		// no default
	}
}
