
import { callAPI } from '../k8s-api.js';

export default async function ping() {
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
