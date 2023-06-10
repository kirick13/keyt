
import YAML from 'yaml';

export const API_METHODS = {
	DEPLOYMENT: '/apis/apps/v1/namespaces/default/deployments',
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
	const token = await getToken();

	const fetch_init = {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
		},
	};

	switch (method) {
		case 'GET':
			break;
		case 'POST':
		case 'PUT':
			fetch_init.headers['Content-Type'] = 'application/json';
			fetch_init.body = JSON.stringify(body);
			break;
		default:
			throw new Error(`Unknown method: ${method}`);
	}

	const url = new URL(path, 'https://k8s.local:16443');

	return fetch(
		url,
		fetch_init,
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

	throw new Error(`Unknown response status: ${response.status}`);
}
