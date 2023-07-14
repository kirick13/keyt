
import YAML from 'yaml';

import {
	NAME_REGEXP,
	POD_RESOURCE_TYPES }    from '../consts.js';
import { KeytCommandError } from '../errors/command.js';
import {
	saveDaemonSetConfig,
	applyDaemonSet     }    from '../types/daemon-set.js';
import {
	saveDeploymentConfig,
	applyDeployment     }   from '../types/deployment.js';
import { applyIngress }     from '../types/ingress.js';
import { savePodConfig }    from '../types/pod.js';
import validateConfig       from '../validators/main.js';

export default async function (args) {
	const filename = args.shift();
	if (filename === undefined) {
		throw new KeytCommandError('No filename given.');
	}

	const file = Bun.file(filename);
	const file_text = await file.text();
	if (file_text === undefined) {
		throw new KeytCommandError(`Cannot read file ${filename}`);
	}

	const config = validateConfig(
		YAML.parse(file_text),
	);

	switch (config.kind) {
		case 'Pod': {
			const resource_type = args.shift()?.slice(2);
			if (POD_RESOURCE_TYPES.has(resource_type) === false) {
				throw new KeytCommandError(`Invalid pod resource type: ${resource_type}`);
			}

			const resource_name = args.shift();
			if (NAME_REGEXP.test(resource_name) === false) {
				throw new KeytCommandError(`Invalid ${resource_type.replaceAll(/-(.)/g, (_, letter) => letter.toUpperCase())} name: ${resource_name}`);
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
}
