
import YAML from 'yaml';

import { NAME_REGEXP }                   from './consts.js';
import { KeytDeploymentIncompleteError } from './errors.js';
import {
	DAEMON_SET_RESOURCE_TYPE,
	saveDaemonSetConfig,
	applyDaemonSet          }            from './types/daemon-set.js';
import {
	DEPLOYMENT_RESOURCE_TYPE,
	saveDeploymentConfig,
	applyDeployment         }            from './types/deployment.js';
import { applyIngress }                  from './types/ingress.js';
import {
	savePodConfig,
	patchPodConfig }                     from './types/pod.js';
import validateConfig                    from './validators/main.js';

const POD_RESOURCE_TYPES = new Set([
	DEPLOYMENT_RESOURCE_TYPE,
	DAEMON_SET_RESOURCE_TYPE,
]);

try {
	const args = process.argv.slice(2);

	const arg0 = args.shift();
	switch (arg0) {
		// keyt apply deployment.yaml
		// keyt apply pod.yaml --deployment <name>
		// keyt apply ingress.yaml
		case 'apply': {
			const filename = args.shift();
			if (filename === undefined) {
				throw new Error('No filename given.');
			}

			const file = Bun.file(filename);
			const file_text = await file.text();
			if (file_text === undefined) {
				throw new Error(`Cannot read file ${filename}`);
			}

			const config = validateConfig(
				YAML.parse(file_text),
			);

			switch (config.kind) {
				case 'Pod': {
					const resource_type = args.shift()?.slice(2);
					if (POD_RESOURCE_TYPES.has(resource_type) === false) {
						throw new Error(`Invalid pod resource type: ${resource_type}`);
					}

					const resource_name = args.shift();
					if (NAME_REGEXP.test(resource_name) === false) {
						throw new Error(`Invalid ${resource_type.replaceAll(/-(.)/g, (_, letter) => letter.toUpperCase())} name: ${resource_name}`);
					}

					await savePodConfig(
						config,
						resource_name,
						resource_type,
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
				} break;
				case 'Deployment':
					await saveDeploymentConfig(config);
					await applyDeployment(config.name);
					break;
				case 'DaemonSet':
					await saveDaemonSetConfig(config);
					await applyDaemonSet(config.name);
					break;
				case 'Ingress':
					await applyIngress(config);
					break;
				// no default
			}
		} break;
		// keyt patch <resource-type> <resource-name> <key> <value>
		case 'patch': {
			const resource_type = args.shift();
			if (POD_RESOURCE_TYPES.has(resource_type) === false) {
				throw new Error(`Invalid pod resource type: ${resource_type}`);
			}

			const resource_name = args.shift();
			if (NAME_REGEXP.test(resource_name) === false) {
				throw new Error('Invalid deployment name');
			}

			const patch_key = args.shift();
			const patch_value = args.shift();
			switch (patch_key) {
				case 'imagesTagSuffix':
					if (typeof patch_value !== 'string') {
						throw new TypeError('Invalid patch value for imagesTagSuffix.');
					}
					break;
				default:
					throw new Error(`Unknown patch key "${patch_key}".`);
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
		} break;
		case undefined:
			console.error('No command given.');
			break;
		default:
			console.error(`Unknown command "${arg0}".`);
	}
}
catch (error) {
	if (error instanceof KeytDeploymentIncompleteError) {
		console.log(error.message);
		console.log('No config was applied to k8s this time.');
	}
	else {
		throw error;
	}
}
