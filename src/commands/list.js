
import { readdir } from 'node:fs/promises';

import { DAEMON_SET_RESOURCE_TYPE } from '../types/daemon-set.js';
import { DEPLOYMENT_RESOURCE_TYPE } from '../types/deployment.js';

const RESOURCE_DISPLAY_NAMES = {
	[DAEMON_SET_RESOURCE_TYPE]: 'DaemonSet',
	[DEPLOYMENT_RESOURCE_TYPE]: 'Deployment',
};

export default async function () {
	const [
		daemon_sets,
		deployments,
	] = await Promise.all([
		getList(DAEMON_SET_RESOURCE_TYPE),
		getList(DEPLOYMENT_RESOURCE_TYPE),
	]);

	printList(
		DEPLOYMENT_RESOURCE_TYPE,
		deployments,
	);

	console.log();

	printList(
		DAEMON_SET_RESOURCE_TYPE,
		daemon_sets,
	);
}

function setResource(resources, resource_type, resource_name) {
	resources[resource_name] ??= {
		resource_type,
		resource: false,
		pod: false,
	};
}
async function getList(resource_type) {
	const file_names = await readdir(`/app/state/${resource_type}`);

	const resources = {};

	for (const file_name of file_names) {
		if (file_name.endsWith('.pod.json')) {
			const resource_name = file_name.slice(0, -9);

			setResource(
				resources,
				resource_type,
				resource_name,
			);

			resources[resource_name].pod = true;
		}
		else if (file_name.endsWith('.json')) {
			const resource_name = file_name.slice(0, -5);

			setResource(
				resources,
				resource_type,
				resource_name,
			);

			resources[resource_name].resource = true;
		}
	}

	return resources;
}

const PSEUDOGRAPHIC_ROOT = {
	[true]: '└',
	[false]: '├',
};
const PSEUDOGRAPHIC_ELEMENT = {
	[true]: ' ',
	[false]: '│',
};

function printList(resource_type, list) {
	const resource_display_name = RESOURCE_DISPLAY_NAMES[resource_type];

	console.log(`${resource_display_name}s:`);

	const list_entries = Object.entries(list);
	if (list_entries.length === 0) {
		console.log('no resources.');
	}
	else {
		const last_index = list_entries.length - 1;
		for (const [ index, [ resource_name, { resource, pod }]] of list_entries.entries()) {
			const is_last = (index === last_index);

			console.log(`${PSEUDOGRAPHIC_ROOT[is_last]}─ ${resource_name}`);
			console.log(`${PSEUDOGRAPHIC_ELEMENT[is_last]}  ├─ ${resource ? '✅' : '❌'} ${resource_display_name}`);
			console.log(`${PSEUDOGRAPHIC_ELEMENT[is_last]}  └─ ${pod ? '✅' : '❌'} Pod`);
		}
	}
}
