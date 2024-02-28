
import commandApply                      from './commands/apply.js';
import commandDelete					 from './commands/delete.js';
import commandList                       from './commands/list.js';
import commandPatch                      from './commands/patch.js';
import { KeytDeploymentIncompleteError } from './errors.js';
import { KeytCommandError }              from './errors/command.js';
import { KeytK8SAPIError } 			     from './errors/k8s-api.js';

const COMMANDS = {
	// keyt apply deployment.yaml
	// keyt apply pod.yaml --deployment <name>
	// keyt apply ingress.yaml
	apply: commandApply,

	// keyt patch <resource-type> <resource-name> <key> <value>
	patch: commandPatch,

	// keyt list
	list: commandList,
	ls: commandList,

	// keyt delete <resource-type> <resource-name>
	delete: commandDelete,
	rm: commandDelete,
};

try {
	const args = process.argv.slice(2);

	const command = args.shift();
	if (command === undefined) {
		throw new KeytCommandError('No command given.');
	}

	if (command in COMMANDS === false) {
		throw new KeytCommandError(`Unknown command "${command}".`);
	}

	await COMMANDS[command](args);
}
catch (error) {
	if (error instanceof KeytDeploymentIncompleteError) {
		console.error(error.message);
		console.error('No config was applied to k8s this time.');
	}
	else if (
		error instanceof KeytCommandError
		|| error instanceof KeytK8SAPIError
	) {
		console.error(error.message);

		// eslint-disable-next-line no-process-exit, unicorn/no-process-exit
		process.exit(1);
	}
	else {
		throw error;
	}
}
