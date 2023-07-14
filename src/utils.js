
export function isPlainObject(value) {
	return value !== null && typeof value === 'object' && value.constructor === Object;
}
