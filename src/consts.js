
export const DASHED_WORD_REGEXP = /^[a-z](?:[\w-]*[\da-z])?$/;
export const NAME_REGEXP = /^[a-z](?:[\da-z-]*[\da-z])?$/;
export const FQDN_REGEXP = /^[\da-z](?:[\d_a-z-]*[\da-z])?(?:\.[\da-z](?:[\d_a-z-]*[\da-z])?)*$/;
export const FQDN_WILDCARD_REGEXP = /^(?:\*\.)?[\da-z](?:[\d_a-z-]*[\da-z])?(?:\.[\da-z](?:[\d_a-z-]*[\da-z])?)*$/;
export const ENV_KEY_REGEXP = /^[A-Z][\dA-Z_]*$/;
