
import { OhMyPropsObjectValidator } from 'oh-my-props';

import { NAME_REGEXP,
         ENV_KEY_REGEXP } from '../consts.js';

export default new OhMyPropsObjectValidator({
	kind: {
		type: String,
		validator: (value) => value === 'Pod',
	},
	imagesTagSuffix: {
		type: String,
		optional: true,
	},
	containers: {
		type: Object,
		keys: {
			type: String,
			validator: (value) => NAME_REGEXP.test(value),
		},
		values: {
			type: Object,
			entries: {
				image: {
					type: String,
				},
				ports: {
					type: Array,
					default: () => [],
					values: {
						type: Number,
						validator: (value) => value > 0 && value < 65_536,
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
						type: String,
					},
				},
				envExpect: {
					type: Array,
					default: () => [],
					values: {
						type: String,
						validator: (value) => ENV_KEY_REGEXP.test(value),
					},
				},
			},
		},
	},
});
