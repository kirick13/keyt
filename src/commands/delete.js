
import { rm as deleteFile } from 'node:fs/promises';

import { POD_RESOURCE_TYPES } from '../consts.js';
import { KeytCommandError }   from '../errors/command.js';
import {
	DAEMON_SET_RESOURCE_TYPE,
	getDaemonSetConfigPath }  from '../types/daemon-set.js';
import {
	DEPLOYMENT_RESOURCE_TYPE,
	getDeploymentConfigPath } from '../types/deployment.js';
import { getPodConfigPath }   from '../types/pod';
import {
	API_METHODS,
	deleteK8SResource }       from '../k8s-api.js';

export default async function (args) {
	const resource_type = args.shift();
	if (resource_type === undefined) {
		throw new KeytCommandError('Missing pod resource type.');
	}
	if (POD_RESOURCE_TYPES.has(resource_type) === false) {
		throw new KeytCommandError(`Invalid pod resource type: ${resource_type}`);
	}

	const resource_name = args.shift();
	if (resource_name === undefined) {
		throw new KeytCommandError('Missing resource name.');
	}

	let resource_config_path;
	let k8s_api_method;
	switch (resource_type) {
		case DEPLOYMENT_RESOURCE_TYPE:
			resource_config_path = getDeploymentConfigPath(resource_name);
			k8s_api_method = API_METHODS.DEPLOYMENT;
			break;
		case DAEMON_SET_RESOURCE_TYPE:
			resource_config_path = getDaemonSetConfigPath(resource_name);
			k8s_api_method = API_METHODS.DAEMON_SET;
			break;
		// no default
	}

	try {
		await deleteFile(resource_config_path);
	}
	catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}

	try {
		await deleteFile(
			getPodConfigPath(
				resource_name,
				resource_type,
			),
		);
	}
	catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}

	await deleteK8SResource(
		k8s_api_method,
		resource_name,
	);

	console.log(`Deleted ${resource_type} "${resource_name}".`);
}
