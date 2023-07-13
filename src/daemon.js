
import { mkdir } from 'node:fs/promises';

try {
	await Promise.all([
		mkdir('/app/state/deployment'),
		mkdir('/app/state/daemon-set'),
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
