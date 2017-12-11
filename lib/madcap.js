"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const StackTrace = require("stacktrace-js");
function reportToConsole(error, stackframes, attempts) {
    if (__DEBUG__) {
        console.group('%c%s', 'color: red', error.message);
        console.error(error);
        console.info(`Location: ${error.fileName}:${error.lineNumber}:${error.columnNumber}\n` + `Attempting: ${attempts.map(a => a[0]).reverse()}\n` // +
        // `State: ${JSON.stringify(errorMeta.state)}`
        );
    }
}
function warnToConfigureHandle() {
    console.warn('You need to configure a handler');
}
function init() {
    const attemptsMap = new Map();
    const config = {
        report: reportToConsole,
        handle: warnToConfigureHandle
    };
    function configure(mergeConfig) {
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
        const attempts = attemptsMap.get(error.attemptsRoot) ||
            [...Array.from(attemptsMap.values())][0] ||
            [];
        const attemptName = (attempts[0] && attempts[0][0]) || 'before first attempt';
        const msg = (error.message = `[APP/${attemptName}] ${error.message}`);
        if (stackFrames.length === 1) {
            const shouldAppendFrames = !attempts.some((attempt) => {
                const attemptFrames = attempt[1];
                return attemptFrames.some(frame => frame.fileName === topFrame.fileName &&
                    frame.lineNumber === topFrame.lineNumber &&
                    frame.columnNumber === topFrame.columnNumber);
            });
            if (shouldAppendFrames) {
                stackFrames = attempts.reduce((frames, attempt) => [
                    ...frames,
                    ...attempt[1]
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
    function cleanStack(stackFrame, index, stackFrames, removeFirst) {
        const isAttemptFn = stackFrame.functionName && stackFrame.functionName.endsWith('attempt');
        if (removeFirst) {
            return index !== 0 && !isAttemptFn;
        }
        return index === 0 || !isAttemptFn;
    }
    const cleanAttemptStack = (stackFrame, index, stackFrames) => cleanStack(stackFrame, index, stackFrames, true);
    function attempt(name, fn, pastAttempts) {
        return __awaiter(this, void 0, void 0, function* () {
            const stackFrames = yield StackTrace.fromError(new Error(), {
                filter: cleanAttemptStack
            });
            let attempts = pastAttempts || attemptsMap.get(fn) || [];
            if (!attempts.length) {
                attempts = [[name, stackFrames]];
                attemptsMap.set(fn, attempts);
                const ret = attempt(name, fn).catch((error) => __awaiter(this, void 0, void 0, function* () {
                    if (!error.trace) {
                        error.trace = yield StackTrace.fromError(error, {
                            filter: cleanStack
                        });
                        const newStackFrames = attempts
                            .reverse()
                            .map((attempt) => attempt[1])
                            .reduce((result, frames) => result.concat(frames), []);
                        error.trace = error.trace.concat(newStackFrames);
                        error.attemptsRoot = fn;
                        prepareError(error);
                        config.report(error, stackFrames, attempts);
                        config.handle(error, stackFrames, attempts);
                    }
                }));
                return ret;
            }
            attempts.push([name, stackFrames]);
            function subattempt(name, fn) {
                return attempt(name, fn, attempts);
            }
            try {
                const ret = fn(subattempt);
                if (ret === undefined) {
                    throw new Error('failed attempting ' + name);
                }
                return ret;
            }
            catch (error) {
                throw error;
            }
        });
    }
    // function retryThenRecover(error, retry, retryTimes, recover) {
    //   if (error.retry && error.retriedCount) {
    //   }
    // }
    // function createStrategy(strategyMap) {
    //   const strategyInstance = (error, stackFrames, attempts) => {
    //     let strategy;
    //     if (!strategyMap.has(error.constructor)) {
    //       if (!strategyInstance.__default__) return;
    //       strategy = strategyInstance.__default__;
    //     } else {
    //       strategy = strategyMap.get(error.constructor) || retryThenRecover;
    //     }
    //     strategy(error);
    //   };
    //   strategy.add = (constr, strategy) => strategyMap.set(constr, strategy);
    //   strategy.remove = (constr, strategy) => strategyMap.delete(constr);
    //   strategy.setDefault = strategy => (strategyInstance.__default__ = strategy);
    // }
    const api = { attempt, configure };
    Object.assign(api, { attempt, configure });
    if (typeof window !== 'undefined') {
        Object.assign(api, { cleanStack, prepareError, config });
    }
    return api;
}
exports.init = init;
if (typeof window !== 'undefined') {
    const coreApi = init();
    const _a = coreApi, { cleanStack, prepareError, config } = _a, browserApi = __rest(_a, ["cleanStack", "prepareError", "config"]);
    Madcap = browserApi;
    window.onerror = (msg, url, line, col, error) => {
        if (error) {
            StackTrace.fromError(error, { filter: cleanStack })
                .then(prepareError.bind(null, error))
                .then(config.report.bind(null, error));
        }
        // Return true to prevent the browser from further handling the error
        return true;
    };
    window.addEventListener('unhandledrejection', (e) => {
        e.preventDefault();
        const error = e.reason;
        if (error.trace) {
            prepareError(error, error.trace);
        }
        else {
            StackTrace.fromError(error, { filter: cleanStack }).then(prepareError.bind(null, error));
        }
    });
}
//# sourceMappingURL=madcap.js.map