function timestamp() {
    return new Date().toISOString();
}

export function logStep(scope, step, message, data) {
    const prefix = `[PriceAlert][${scope}][${step}]`;
    if (data !== undefined) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

export function logError(scope, step, message, err) {
    const detail = err?.message || String(err);
    console.error(`[PriceAlert][${scope}][${step}] ${message}: ${detail}`);
    if (err?.stack) {
        console.error(err.stack);
    }
}

export function logWarn(scope, step, message, data) {
    const prefix = `[PriceAlert][${scope}][${step}]`;
    if (data !== undefined) {
        console.warn(`${prefix} ${message}`, data);
    } else {
        console.warn(`${prefix} ${message}`);
    }
}

export { timestamp };
