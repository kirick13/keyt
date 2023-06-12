
import { createObjectValidator } from 'oh-my-props';

import { NAME_REGEXP,
         FQDN_WILDCARD_REGEXP } from '../consts.js';

const PATH_START_REGEXP = /^=?\//;

export default createObjectValidator({
	kind: {
		type: String,
		validator: (value) => value === 'Ingress',
	},
	name: {
		type: String,
		validator: (value) => NAME_REGEXP.test(value),
	},
	annotations: {
		type: Object,
		optional: true,
		keys: {
			type: String,
		},
		values: {
			type: String,
		},
	},
	rules: {
		type: Object,
		keys: {
			type: String,
			validator: (value) => FQDN_WILDCARD_REGEXP.test(value),
		},
		values: {
			type: Object,
			validator(value) {
				if (hasOwnProperty.call(value, 'target')) {
					return hasOwnProperty.call(value, 'paths') === false;
				}

				if (hasOwnProperty.call(value, 'paths')) {
					return hasOwnProperty.call(value, 'target') === false
						&& hasOwnProperty.call(value, 'targetPort') === false;
				}

				return false;
			},
			entries: {
				tlsSecret: {
					type: String,
					validator: (value) => NAME_REGEXP.test(value),
				},
				target: {
					type: String,
					optional: true,
					validator: (value) => NAME_REGEXP.test(value),
				},
				targetPort: {
					type: Number,
					optional: true,
					default: 80,
					validator: (value) => value > 0 && value < 65_536,
				},
				paths: {
					type: Object,
					optional: true,
					keys: {
						type: String,
						validator: (value) => PATH_START_REGEXP.test(value),
					},
					values: {
						type: Object,
						entries: {
							target: {
								type: String,
								validator: (value) => NAME_REGEXP.test(value),
							},
							targetPort: {
								type: Number,
								default: 80,
								validator: (value) => value > 0 && value < 65_536,
							},
						},
					},
				},
			},
			contentValidator: (value) => (value.target === null) !== (value.paths === null),
		},
	},
});
