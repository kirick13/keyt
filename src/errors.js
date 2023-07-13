
class KeytResourceIncompleteError extends Error {
	static MISSING_POD = Symbol('missing-pod');

	constructor(resource_type, resource_name, mising_resource_type) {
		super(`No ${mising_resource_type} config for ${resource_type} "${resource_name}" was found. Do not worry, it is OK if you have not applied both deployment and pod config yet.`);
	}
}

export class KeytDeploymentIncompleteError extends KeytResourceIncompleteError {
	static MISSING_DEPLOYMENT = Symbol('missing-deployment');

	constructor(type, deployment_name) {
		let mising_resource_type;
		if (type === KeytDeploymentIncompleteError.MISSING_DEPLOYMENT) {
			mising_resource_type = 'deployment';
		}
		else if (type === KeytResourceIncompleteError.MISSING_POD) {
			mising_resource_type = 'pod';
		}
		else {
			throw new Error('Unknown type giden to KeytDeploymentIncompleteError constructor.');
		}

		super(
			'deployment',
			deployment_name,
			mising_resource_type,
		);
	}
}

export class KeyDaemonSetIncompleteError extends KeytResourceIncompleteError {
	static MISSING_DAEMON_SET = Symbol('missing-daemon-set');

	constructor(type, daemon_set_name) {
		let mising_resource_type;
		if (type === KeyDaemonSetIncompleteError.MISSING_DEPLOYMENT) {
			mising_resource_type = 'daemonSet';
		}
		else if (type === KeytResourceIncompleteError.MISSING_POD) {
			mising_resource_type = 'pod';
		}
		else {
			throw new Error('Unknown type giden to KeyDaemonSetIncompleteError constructor.');
		}

		super(
			'daemonSet',
			daemon_set_name,
			mising_resource_type,
		);
	}
}
