
import YAML from 'yaml';

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

export async function callAPI(method, path, body) {
	const url = new URL(path, 'https://host.docker.internal:16443');
	const headers = new Headers();

	if (process.env.K8S_HOST) {
		url.hostname = process.env.K8S_HOST;
	}

	const token = ('K8S_TOKEN' in process.env) ? process.env.K8S_TOKEN : (await getToken());
	headers.set(
		'Authorization',
		`Bearer ${token}`,
	);

	switch (method) {
		case 'GET':
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

	return fetch(
		new Request(
			url,
			{
				method,
				headers,
				body,
			},
		),
	);
}

export async function setK8SResource(method_prefix, name, config) {
	const method = `${method_prefix}/${name}`;

	if (typeof process.env.DRY_RUN === 'string') {
		console.log(method);
		console.log(YAML.stringify(config));
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

	console.error(response);
	console.error(await response.text());
	throw new Error(`Unknown response status: ${response.status}`);
}
