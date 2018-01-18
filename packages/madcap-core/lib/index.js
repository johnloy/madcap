"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const StackTrace = require("stacktrace-js");
const createError_1 = require("./lib/createError");
exports.createError = createError_1.createError;
const reporters_1 = require("./reporters");
const handlers_1 = require("./handlers");
const UndefinedAttemptError_1 = require("./errors/UndefinedAttemptError");
const strategy_1 = require("./lib/strategy");
exports.createReportStrategy = strategy_1.createReportStrategy;
exports.createHandleStrategy = strategy_1.createHandleStrategy;
function warnToConfigureHandle() {
    console.warn('You need to configure a handler');
}
function isAttemptFunction(a) {
    return typeof a === 'function';
}
function cleanStack(stackFrame, index, stackFrames, removeFirst) {
    const isAttemptFn = stackFrame.functionName && stackFrame.functionName.endsWith('attempt');
    if (removeFirst) {
        return index !== 0 && !isAttemptFn;
    }
    return index === 0 || !isAttemptFn;
}
const cleanAttemptStack = (stackFrame, index, stackFrames) => cleanStack(stackFrame, index, stackFrames, true);
function Madcap(initConfig) {
    /*
     * A Map instance with shape Map<AttemptFunction, Attempt[]>, held in the
     * Madcap function closure, that stores attempt data. This data supplies
     * the .attemptRoot (Function) and .attempts (Attempt[]) properties to errors.
     */
    const attemptsMap = new Map();
    const config = {
        report: reporters_1.consoleReporter,
        handle: warnToConfigureHandle,
        allowUndefinedAttempts: false
    };
    if (typeof initConfig === 'object') {
        configure(initConfig);
    }
    function configure(mergeConfig) {
        if (strategy_1.isStrategyMap(mergeConfig.report)) {
            mergeConfig.report = strategy_1.createReportStrategy(mergeConfig.report);
        }
        if (strategy_1.isStrategyMap(mergeConfig.handle)) {
            mergeConfig.handle = strategy_1.createHandleStrategy(mergeConfig.handle);
        }
        Object.assign(config, mergeConfig);
        // By default, v8 includes the 10 topmost stack frames
        // https://github.com/v8/v8/wiki/Stack-Trace-API#basic-stack-traces
        // Can be configured by setting Error.stackTraceLimit = number | Infinity
        if (config.stackTraceLimit) {
            Error.stackTraceLimit = config.stackTraceLimit;
        }
        return config;
    }
    function prepareError(error, stackFrames) {
        stackFrames = error.trace || stackFrames;
        const topFrame = stackFrames[0];
        const attempts = attemptsMap.get(error.attemptFn) ||
            [...Array.from(attemptsMap.values())][0] ||
            [];
        const attemptName = (attempts[0] && attempts[0].name) || 'before first attempt';
        const msg = (error.message = `[APP/${attemptName}] ${error.message}`);
        if (stackFrames.length === 1) {
            const shouldAppendFrames = !attempts.some((attempt) => {
                const attemptFrames = attempt.stackFrames;
                return attemptFrames.some(frame => frame.fileName === topFrame.fileName &&
                    frame.lineNumber === topFrame.lineNumber &&
                    frame.columnNumber === topFrame.columnNumber);
            });
            if (shouldAppendFrames) {
                stackFrames = attempts.reduce((frames, attempt) => [
                    ...frames,
                    ...attempt.stackFrames
                ], [stackFrames[0]]);
            }
        }
        const stackString = stackFrames
            .filter(l => l.source)
            .map(f => f.source)
            .join('\n');
        error.message = msg;
        error.stack = stackString;
        error.fileName = topFrame.fileName;
        error.lineNumber = topFrame.lineNumber;
        error.columnNumber = topFrame.columnNumber;
        return error;
    }
    function attempt(name, contextOrFn, fnOrPastAttempts, pastAttempts) {
        return __awaiter(this, void 0, void 0, function* () {
            let context;
            let fn;
            if (isAttemptFunction(fnOrPastAttempts)) {
                context = contextOrFn;
                fn = fnOrPastAttempts;
            }
            else {
                fn = contextOrFn;
                pastAttempts = fnOrPastAttempts;
            }
            const stackFrames = yield StackTrace.fromError(new Error(), {
                filter: cleanAttemptStack
            });
            let attempts = pastAttempts || attemptsMap.get(fn) || [];
            if (!attempts.length) {
                attempts = [{ name, function: fn, stackFrames, context }];
                attemptsMap.set(fn, attempts);
                const ret = attempt(name, fn).catch((error) => __awaiter(this, void 0, void 0, function* () {
                    if (!error.trace) {
                        error.trace = yield StackTrace.fromError(error, {
                            filter: cleanStack
                        });
                        const newStackFrames = attempts
                            .reverse()
                            .map((attempt) => attempt.stackFrames)
                            .reduce((result, frames) => result.concat(frames), []);
                        error.trace = error.trace.concat(newStackFrames);
                        error.attemptFn = fn;
                        error.attempts = attempts.reverse();
                        const errorEvent = new ErrorEvent('error', {
                            filename: error.fileName,
                            lineno: error.lineNumber,
                            colno: error.columnNumber,
                            message: error.message,
                            error
                        });
                        window.dispatchEvent(errorEvent);
                    }
                    // Prevent a subsequent .then callback from running
                    throw error;
                }));
                return ret;
            }
            if (fn !== attempts[0].function) {
                attempts.push({ name, function: fn, stackFrames, context });
            }
            function subattempt(name, fn) {
                return attempt(name, fn, attempts);
            }
            try {
                const ret = fn(subattempt);
                if (ret === undefined) {
                    if (!config.allowUndefinedAttempts) {
                        throw new UndefinedAttemptError_1.UndefinedAttemptError({ attemptName: name });
                    }
                    // Just nag instead. No throwing nonsense.
                    console.warn(`Attempt ${name} returns undefined. Is it a work in progress?`);
                }
                return ret;
            }
            catch (error) {
                return Promise.reject(error);
            }
        });
    }
    if (typeof window !== 'undefined') {
        window.onerror = (msg, url, line, col, error) => {
            if (error && !error.attempts) {
                error.isHandled = true;
                StackTrace.fromError(error, { filter: cleanStack })
                    .then(prepareError.bind(null, error))
                    .then(config.report.bind(null, error))
                    .then(config.handle.bind(null, error));
            }
            // Return true to prevent the browser from further handling the error
            return true;
        };
        window.addEventListener('unhandledrejection', (e) => {
            e.preventDefault();
            const error = e.reason;
            if (error.isHandled)
                return;
            StackTrace.fromError(error, { filter: cleanStack })
                .then(prepareError.bind(null, error))
                .then(config.report.bind(null, error))
                .then(config.handle.bind(null, error));
        });
    }
    // Public Madcap strategy API
    return {
        attempt,
        configure
    };
}
exports.default = Madcap;
const reporters = {
    consoleReporter: reporters_1.consoleReporter
};
exports.reporters = reporters;
const handlers = {
    retryThenRecover: handlers_1.retryThenRecover
};
exports.handlers = handlers;
const errors = {};
//# sourceMappingURL=index.js.map