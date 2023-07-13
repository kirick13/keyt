
import { OhMyPropsValidator } from 'oh-my-props';

import { NAME_REGEXP }              from '../consts.js';
import { validateDaemonSetConfig }  from '../types/daemon-set.js';
import { validateDeploymentConfig } from '../types/deployment.js';
import { validateIngressConfig }    from '../types/ingress.js';
import { validatePodConfig }        from '../types/pod.js';

const KINDS = new Set([
	'Pod',
	'Deployment',
	'DaemonSet',
	'Ingress',
]);

const validator = new OhMyPropsValidator({
	type: Object,
	entries: {
		kind: {
			type: String,
			validator: (value) => KINDS.has(value),
		},
		name: {
			type: String,
			optional: true,
			validator: (value) => NAME_REGEXP.test(value),
		},
	},
	contentValidator(value) {
		if (value.kind === 'Pod') {
			return value.name === null;
		}

		return value.name !== null;
	},
});

export default function (config) {
	const {
		kind,
		name,
	} = config;

	if (validator.test({ kind, name }) !== true) {
		throw new Error('Invalid config given.');
	}

	switch (kind) {
		case 'Pod':
			return validatePodConfig(config);
		case 'Deployment':
			return validateDeploymentConfig(config);
		case 'DaemonSet':
			return validateDaemonSetConfig(config);
		case 'Ingress':
			return validateIngressConfig(config);
		// no default
	}
}
