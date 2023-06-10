
import YAML from 'yaml';

import { NAME_REGEXP }         from './consts.js';
import { saveDeploymentConfig,
         applyDeployment     } from './types/deployment.js';
import { applyIngress }        from './types/ingress.js';
import { savePodConfig,
         patchPodConfig }      from './types/pod.js';
import validateConfig          from './validators/main.js';

const args = process.argv.slice(2);

// keyt apply deployment.yaml
// keyt apply pod.yaml --deployment <name>
// keyt apply ingress.yaml

const POD_APPLICATIONS = new Set([ 'deployment' ]);

const arg0 = args.shift();
switch (arg0) {
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
				const application_type = args.shift()?.slice(2);
				if (POD_APPLICATIONS.has(application_type) === false) {
					throw new Error(`Invalid pod application type: ${application_type}`);
				}

				const deployment_name = args.shift();
				if (NAME_REGEXP.test(deployment_name) === false) {
					throw new Error('Invalid deployment name');
				}

				await savePodConfig(
					config,
					deployment_name,
				);

				await applyDeployment(deployment_name);
			} break;
			case 'Deployment':
				await saveDeploymentConfig(config);
				await applyDeployment(config.name);
				break;
			case 'Ingress':
				await applyIngress(config);
				break;
			// no default
		}
	} break;
	case 'patch': {
		const deployment_name = args.shift();
		if (NAME_REGEXP.test(deployment_name) === false) {
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
			deployment_name,
			patch_key,
			patch_value,
		);

		await applyDeployment(deployment_name);
	} break;
	case undefined:
		console.error('No command given.');
		break;
	default:
		console.error(`Unknown command "${arg0}".`);
}
