
import {
	API_METHODS,
	setK8SResource } from '../k8s-api.js';

export function getK8SServiceConfig(resource_name) {
	const k8s_service_ports = [];
	const k8s_service = {
		apiVersion: 'v1',
		kind: 'Service',
		metadata: {
			name: resource_name,
			labels: {
				app: resource_name,
			},
		},
		spec: {
			type: 'ClusterIP',
			selector: {
				app: resource_name,
			},
			ports: k8s_service_ports,
		},
	};

	return {
		k8s_service,
		k8s_service_ports,
	};
}

export async function sendServiceToK8s(resource_type, service_name, k8s_config) {
	const result = await setK8SResource(
		API_METHODS.SERVICE,
		service_name,
		k8s_config,
	);

	console.log(`Service for ${resource_type} "${service_name}" ${result ? 'created' : 'updated'}.`);
}
