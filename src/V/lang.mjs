export function isObject(value) {
    return value && (typeof value === 'object');
}

export function isUndefined(value) {
    return typeof value === 'undefined';
}

export function isString(value) {
    return typeof value === 'string';
}

export const isArray = Array.isArray;
