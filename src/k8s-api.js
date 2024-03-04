
import YAML                from 'yaml';
import { KeytK8SAPIError } from './errors/k8s-api';

export const API_METHODS = {
	DEPLOYMENT: '/apis/apps/v1/namespaces/default/deployments',
	DAEMON_SET: '/apis/apps/v1/namespaces/default/daemonsets',
	SERVICE: '/api/v1/namespaces/default/services',
	INGRESS: '/apis/networking.k8s.io/v1/namespaces/default/ingresses',
	// CONFIG_MAP: '/api/v1/namespaces/default/configmaps',
	// SECRET: '/api/v1/namespaces/default/secrets',
};

async function getToken() {
	const file_config = Bun.file('/app/kubeconfig');
	const text_cofnig = await file_config.text();
	const config = YAML.parse(text_cofnig);

	for (const user of config.users) {
		if (user.name === 'admin') {
			return user.user.token;
		}
	}

	throw new Error('Can not read K8S API token.');
}

const {
	DRY_RUN,
	K8S_HOST = 'host.docker.internal',
	K8S_PORT = '16443',
	K8S_TOKEN,
} = process.env;

export async function callAPI(method, path, body) {
	const url = new URL(path, 'https://i');
	url.hostname = K8S_HOST;
	url.port = K8S_PORT;

	const headers = new Headers();

	const token = ('K8S_TOKEN' in process.env) ? K8S_TOKEN : (await getToken());
	headers.set(
		'Authorization',
		`Bearer ${token}`,
	);

	switch (method) {
		case 'GET':
		case 'DELETE':
			body = undefined;
			break;
		case 'POST':
		case 'PUT':
			headers.set(
				'Content-Type',
				'application/json',
			);
			body = JSON.stringify(body);
			break;
		default:
			throw new Error(`Unknown method: ${method}`);
	}

	try {
		const response = await fetch(
			url,
			{
				method,
				headers,
				body,
			},
		);

		return response;
	}
	catch {
		console.log(`❌ K8S API server is not reachable from Keyt container on host "${K8S_HOST}" and port "${K8S_PORT}".`);
		console.log();
		console.log('To find correct PORT, try to run:');
		console.log('> kubectl cluster-info');
		console.log('> kubectl config view --minify | grep server');
		console.log('and pass it to Keyt as K8S_PORT environment variable.');

		// eslint-disable-next-line no-process-exit, unicorn/no-process-exit
		process.exit(1);
	}
}

export async function setK8SResource(method_prefix, name, config) {
	const method = `${method_prefix}/${name}`;

	if (DRY_RUN === '1') {
		console.log(method);
		console.log(
			YAML.stringify(config),
		);
		return;
	}

	let response = await callAPI(
		'GET',
		method,
	);

	if (response.status === 404) {
		response = await callAPI(
			'POST',
			method_prefix,
			config,
		);

		if (response.ok) {
			return true;
		}
	}
	else if (response.status === 200) {
		response = await callAPI(
			'PUT',
			method,
			config,
		);

		if (response.ok) {
			return false;
		}
	}

	const response_body = await response.json();

	throw new KeytK8SAPIError(response_body.message);
}

export async function deleteK8SResource(method_prefix, name) {
	const method = `${method_prefix}/${name}`;

	if (DRY_RUN === '1') {
		console.log(method);
		return;
	}

	const response = await callAPI(
		'DELETE',
		method,
	);

	if (response.ok) {
		return;
	}

	const response_body = await response.json();

	throw new KeytK8SAPIError(response_body.message);
}
