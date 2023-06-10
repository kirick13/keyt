
import { mkdir } from 'node:fs/promises';

try {
	await Promise.all([
		// mkdir('/app/state/config_map'),
		mkdir('/app/state/deployment'),
		// mkdir('/app/state/ingress'),
		// mkdir('/app/state/secret'),
	]);
}
catch (error) {
	if (error.code !== 'EEXIST') {
		throw error;
	}
}

setInterval(
	() => {
		console.log('Daemon running...');
	},
	86_400_000, // 24 hours
);
