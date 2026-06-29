export function appLog(scope, message, data) {
    const prefix = `[PriceTracker][${scope}]`;
    if (data !== undefined) {
        console.log(prefix, message, data);
    } else {
        console.log(prefix, message);
    }
}

export function appWarn(scope, message, data) {
    const prefix = `[PriceTracker][${scope}]`;
    if (data !== undefined) {
        console.warn(prefix, message, data);
    } else {
        console.warn(prefix, message);
    }
}

export function appError(scope, message, err) {
    console.error(`[PriceTracker][${scope}]`, message, err);
}
