
export class KeytK8SAPIError extends Error {
	constructor(message) {
		super(`kubeapi returned an error: ${message}`);
	}
}
