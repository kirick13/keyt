
import { API_METHODS,
         setK8SResource } from '../k8s-api.js';
import ingressValidator   from '../validators/ingress.js';

export function validateIngressConfig(config) {
	return ingressValidator.cast(config);
}

export function applyIngress(config) {
	const k8s_ingress_tls = [];
	const k8s_ingress_rules = [];
	const k8s_ingress = {
		apiVersion: 'networking.k8s.io/v1',
		kind: 'Ingress',
		metadata: {
			name: config.name,
		},
		spec: {
			tls: k8s_ingress_tls,
			rules: k8s_ingress_rules,
		},
	};

	const tls_by_secrets = new Map();

	for (const [ host, { tlsSecret: tls_secret, target, targetPort, paths }] of Object.entries(config.rules)) {
		if (tls_secret !== null) {
			if (tls_by_secrets.has(tls_secret) === false) {
				tls_by_secrets.set(
					tls_secret,
					[],
				);
			}

			tls_by_secrets.get(tls_secret).push(host);
		}

		const k8s_host_paths = [];

		if (target !== null) {
			k8s_host_paths.push({
				path: '/',
				pathType: 'Prefix',
				backend: {
					service: {
						name: target,
						port: {
							number: targetPort,
						},
					},
				},
			});
		}
		else if (paths !== null) {
			for (const [ path, { target, targetPort: target_port }] of Object.entries(paths)) {
				const is_path_exact = path.startsWith('=');

				k8s_host_paths.push({
					path: is_path_exact ? path.slice(1) : path,
					pathType: is_path_exact ? 'Exact' : 'Prefix',
					backend: {
						service: {
							name: target,
							port: {
								number: target_port,
							},
						},
					},
				});
			}
		}

		k8s_ingress_rules.push({
			host,
			http: {
				paths: k8s_host_paths,
			},
		});
	}

	for (const [ tls_secret, hosts ] of tls_by_secrets.entries()) {
		k8s_ingress_tls.push({
			hosts,
			secretName: tls_secret,
		});
	}

	return sendIngressToK8s(
		config.name,
		k8s_ingress,
	);
}

async function sendIngressToK8s(name, k8s_config) {
	const result = await setK8SResource(
		API_METHODS.INGRESS,
		name,
		k8s_config,
	);

	console.log(`Ingress "${name}" ${result ? 'created' : 'updated'}.`);
}
