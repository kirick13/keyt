
import { DAEMON_SET_RESOURCE_TYPE } from './types/daemon-set.js';
import { DEPLOYMENT_RESOURCE_TYPE } from './types/deployment.js';

export const DASHED_WORD_REGEXP = /^[a-z](?:[\w-]*[\da-z])?$/;
export const NAME_REGEXP = /^[a-z](?:[\da-z-]*[\da-z])?$/;
export const FQDN_REGEXP = /^[\da-z](?:[\d_a-z-]*[\da-z])?(?:\.[\da-z](?:[\d_a-z-]*[\da-z])?)*$/;
export const FQDN_WILDCARD_REGEXP = /^(?:\*\.)?[\da-z](?:[\d_a-z-]*[\da-z])?(?:\.[\da-z](?:[\d_a-z-]*[\da-z])?)*$/;
export const ENV_KEY_REGEXP = /^[A-Z][\dA-Z_]*$/;
export const NUMBER_UINT_REGEXP = /^[1-9]\d*$/;

export const POD_RESOURCE_TYPES = new Set([
	DEPLOYMENT_RESOURCE_TYPE,
	DAEMON_SET_RESOURCE_TYPE,
]);
