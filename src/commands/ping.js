
import {
	K8S_HOST,
	K8S_PORT,
	callAPI } from '../k8s-api.js';

export default async function ping() {
	try {
		const response = await callAPI('GET', 'ping');

		if (response.ok) {
			console.log('✅ K8S API server is up and running.');
			return;
		}

		console.log('❌ K8S API server returned an error:');
		console.log();

		console.log(`HTTP ${response.status} ${response.statusText}`);
		for (const [ key, value ] of response.headers) {
			console.log(`${key}: ${value}`);
		}

		console.log();
		console.log(
			await response.text(),
		);
	}
	catch {
		console.log(`❌ K8S API server is not reachable from Keyt container on host "${K8S_HOST}" and port "${K8S_PORT}".`);
		console.log();
		console.log('To find correct PORT, try to run:');
		console.log('> kubectl cluster-info');
		console.log('> kubectl config view --minify | grep server');
		console.log('and pass it to Keyt as K8S_PORT environment variable.');
	}
}
