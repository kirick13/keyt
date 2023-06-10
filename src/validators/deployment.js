
import { createValidator,
         createObjectValidator,
         createType           } from 'oh-my-props';

import { NAME_REGEXP,
         ENV_KEY_REGEXP } from '../consts.js';

const TYPE_CONFIG_VALUE = (() => {
	const stringValidator = createValidator({
		type: String,
	});
	const configValueValidator = createValidator({
		type: Object,
		entries: {
			valueFrom: {
				type: String,
				optional: true,
				validator: (value) => NAME_REGEXP.test(value),
			},
			secretFrom: {
				type: String,
				optional: true,
				validator: (value) => NAME_REGEXP.test(value),
			},
			key: {
				type: String,
				validator: (value) => NAME_REGEXP.test(value),
			},
		},
		contentValidator: (value) => Number(value.valueFrom !== null) + Number(value.secretFrom !== null) === 1,
	});

	return createType(
		'configValue',
		null,
		(value) => {
			try {
				return stringValidator.cast(value);
			}
			catch {}

			try {
				return configValueValidator.cast(value);
			}
			catch {}

			throw new TypeError(`Cannot cast value ${value} to type "configValue"`);
		},
	);
})();

export default createObjectValidator({
	kind: {
		type: String,
		validator: (value) => value === 'Deployment',
	},
	name: {
		type: String,
		validator: (value) => NAME_REGEXP.test(value),
	},
	docker: {
		type: Object,
		default: () => ({}),
		entries: {
			imagesNamespace: {
				type: String,
				optional: true,
				validator: (value) => value.length > 0,
			},
			imagesTag: {
				type: String,
				default: 'latest',
				validator: (value) => NAME_REGEXP.test(value),
			},
			imagePullSecrets: {
				type: Array,
				default: () => [],
				values: {
					type: String,
					validator: (value) => NAME_REGEXP.test(value),
				},
			},
		},
	},
	env: {
		type: Object,
		default: () => ({}),
		keys: {
			type: String,
			validator: (value) => ENV_KEY_REGEXP.test(value),
		},
		values: {
			type: TYPE_CONFIG_VALUE,
		},
	},
	replicas: {
		type: Number,
		default: 1,
		validator: (value) => value > 0,
	},
});
