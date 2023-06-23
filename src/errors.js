
export class KeytDeploymentIncompleteError extends Error {
	static MISSING_DEPLOYMENT = Symbol('missing-deployment');
	static MISSING_POD = Symbol('missing-pod');

	constructor(type, deployment_name) {
		let message_start;
		if (type === KeytDeploymentIncompleteError.MISSING_DEPLOYMENT) {
			message_start = 'deployment';
		}
		else if (type === KeytDeploymentIncompleteError.MISSING_POD) {
			message_start = 'pod';
		}
		else {
			throw new Error('Unknown type giden to KeytDeploymentIncompleteError constructor.');
		}

		super(`No ${message_start} config for deployment "${deployment_name}" was found. Do not worry, it is OK if you have not applied both deployment and pod config yet.`);
	}
}
