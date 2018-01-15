"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
function arePropsValid(props) {
    return (typeof props.message === 'string' || typeof props.message === 'function');
}
function validateMessage(props) {
    if (!arePropsValid(props)) {
        throw new TypeError('message either needs to be a string or a function that returns a string');
    }
    return true;
}
function createError(name, ParentError = Error, defaultProps = {}) {
    if (typeof name !== 'string') {
        throw new TypeError('expected "name" to be a string.');
    }
    if (ParentError !== Error &&
        !Error.prototype.isPrototypeOf(ParentError.prototype)) {
        throw new TypeError('expected "ParentError" to extend Error or a subclass of Error');
    }
    validateMessage(defaultProps);
    const _a = defaultProps, { message: defaultMessage } = _a, restDefaultProps = __rest(_a, ["message"]);
    let getMessage = typeof defaultMessage === 'string' ? () => defaultMessage : defaultMessage;
    const CustomError = function (message, props) {
        if (!(this instanceof CustomError)) {
            return new CustomError(message, props);
        }
        if (arguments.length === 1) {
            props = message;
            message = props.message;
        }
        const proxy = new ParentError();
        Object.setPrototypeOf(proxy, Object.getPrototypeOf(this));
        if (Error.captureStackTrace) {
            Error.captureStackTrace(proxy, CustomError);
        }
        Object.assign(proxy, props);
        proxy.name = name;
        proxy.message =
            typeof message === 'function'
                ? message(proxy)
                : message || getMessage(proxy);
        return proxy;
    };
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(CustomError, ParentError);
    }
    else {
        CustomError.__proto__ = ParentError;
    }
    Object.defineProperty(CustomError, 'name', {
        value: name,
        enumerable: false,
        configurable: true,
        writable: false
    });
    CustomError.configure = function (config) {
        validateMessage(config);
        if (typeof config.message !== 'string' &&
            typeof config.message !== 'function') {
            throw new TypeError('message either needs to be a string or a function that returns a string');
        }
        else {
            getMessage =
                typeof config.message === 'string'
                    ? () => config.message
                    : config.message;
        }
        const { message } = config, configRest = __rest(config, ["message"]);
        Object.assign(CustomError.prototype, configRest);
    };
    CustomError.prototype = Object.create(ParentError.prototype, {
        constructor: {
            value: CustomError,
            enumerable: false,
            configurable: true,
            writable: true
        },
        toString: {
            value: function () {
                return 'foo';
            },
            enumerable: false,
            configurable: true,
            writable: true
        }
    });
    Object.assign(CustomError.prototype, restDefaultProps);
    return CustomError;
}
exports.default = createError;
//# sourceMappingURL=createError.js.map