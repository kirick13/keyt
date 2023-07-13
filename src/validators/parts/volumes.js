
import { OhMyPropsValidator } from 'oh-my-props';

import { NAME_REGEXP } from '../../consts.js';

export default new OhMyPropsValidator({
	type: Object,
	default: () => ({}),
	keys: {
		type: String,
		validator: (value) => NAME_REGEXP.test(value),
	},
	values: {
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
		},
		contentValidator: (value) => Number(value.valueFrom !== null) + Number(value.secretFrom !== null) === 1,
	},
});
