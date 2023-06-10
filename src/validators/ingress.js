
import { createObjectValidator } from 'oh-my-props';

import { NAME_REGEXP,
         FQDN_WILDCARD_REGEXP } from '../consts.js';
import { hasOwnProperty }       from '../utils.js';

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
	rules: {
		type: Object,
		keys: {
			type: String,
			validator: (value) => FQDN_WILDCARD_REGEXP.test(value),
		},
		values: {
			type: Object,
			validator(value) {
				if (hasOwnProperty(value, 'target')) {
					return hasOwnProperty(value, 'paths') === false;
				}

				if (hasOwnProperty(value, 'paths')) {
					return hasOwnProperty(value, 'target') === false
						&& hasOwnProperty(value, 'targetPort') === false;
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
