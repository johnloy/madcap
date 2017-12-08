import * as StackTrace from 'stacktrace-js';

// export { default as createError } from './createError';
// export { default as errors } from './errors/index';
// export { default as handlers } from './handlers/index';
// export { default as reporters } from './reporters/index';

declare var __DEBUG__: boolean;

export type AttemptName = string;

export type Attempt = [AttemptName, StackTrace.StackFrame[]];

export interface MadcapError extends Error {
  trace?: StackTrace.StackFrame[];
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  attemptsRoot: AttemptFunction;
}

export interface AttemptFunction {
  (attemptFactory: typeof attempt): any;
}

export interface Config {
  report(
    error: MadcapError,
    stackframes: StackTrace.StackFrame[],
    attempts: Attempt[]
  ): void;
}

const attemptsMap = new Map();

const config = {
  report: reportToConsole
};

function reportToConsole(
  error: MadcapError,
  stackframes: StackTrace.StackFrame[],
  attempts: Attempt[]
) {
  if (__DEBUG__) {
    console.group('%c%s', 'color: red', error.message);
    console.error(error);
    console.info(
      `Location: ${error.fileName}:${error.lineNumber}:${
        error.columnNumber
      }\n` + `Attempting: ${attempts.map(a => a[0]).reverse()}\n` // +
      // `State: ${JSON.stringify(errorMeta.state)}`
    );
    console.groupEnd();
  } else {
    // Log to back end
  }
}

export function configure(newConfig: Partial<Config>): Config {
  return { ...config, ...newConfig };
}

function prepareError(
  error: MadcapError,
  stackFrames?: StackTrace.StackFrame[]
) {
  stackFrames = error.trace! || stackFrames;
  const topFrame: StackTrace.StackFrame = stackFrames[0];

  const attempts =
    attemptsMap.get(error.attemptsRoot) ||
    [...Array.from(attemptsMap.values())][0] ||
    [];
  const attemptName = (attempts[0] && attempts[0][0]) || 'before first attempt';

  const msg = (error.message = `[APP/${attemptName}] ${error.message}`);

  if (stackFrames.length === 1) {
    const shouldAppendFrames = !attempts.some((attempt: Attempt) => {
      const attemptFrames = attempt[1];
      return attemptFrames.some(
        frame =>
          frame.fileName === topFrame.fileName &&
          frame.lineNumber === topFrame.lineNumber &&
          frame.columnNumber === topFrame.columnNumber
      );
    });
    if (shouldAppendFrames) {
      stackFrames = attempts.reduce(
        (frames: StackTrace.StackFrame[], attempt: Attempt) => [
          ...frames,
          ...attempt[1]
        ],
        [stackFrames[0]]
      );
    }
  }

  error.message = msg;
  error.stack = stackFrames && stackFrames.map(f => f.source).join('\n');
  error.fileName = topFrame.fileName;
  error.lineNumber = topFrame.lineNumber;
  error.columnNumber = topFrame.columnNumber;

  //   attempt.handleError(error, stackFrames, attempts);
}

// By default, v8 includes the 10 topmost stack frames
// https://github.com/v8/v8/wiki/Stack-Trace-API#basic-stack-traces
// Can be configured by setting Error.stackTraceLimit = number | Infinity
function cleanStack(
  stackFrame: StackTrace.StackFrame,
  index?: number,
  stackFrames?: StackTrace.StackFrame[],
  removeFirst?: boolean
): boolean {
  const isAttemptFn =
    stackFrame.functionName && stackFrame.functionName.endsWith('attempt');
  if (removeFirst) {
    return index !== 0 && !isAttemptFn;
  }
  return index === 0 || !isAttemptFn;
}

const cleanAttemptStack = (
  stackFrame: StackTrace.StackFrame,
  index?: number,
  stackFrames?: StackTrace.StackFrame[]
) => cleanStack(stackFrame, index, stackFrames, true);

export async function attempt(
  name: AttemptName,
  fn: AttemptFunction,
  pastAttempts?: Attempt[]
): Promise<any> {
  const stackFrames = await StackTrace.fromError(new Error(), {
    offline: true,
    filter: cleanAttemptStack
  });

  console.log('wut');

  let attempts = pastAttempts || attemptsMap.get(fn);

  if (!attempts) {
    attempts = [[name, stackFrames]];
    attemptsMap.set(fn, attempts);
    const ret = attempt(name, fn).catch(async (error: MadcapError) => {
      if (!error.trace) {
        error.trace = await StackTrace.fromError(error, {
          offline: true,
          filter: cleanStack
        });
        const newStackFrames = attempts
          .reverse()
          .map((attempt: Attempt) => attempt[1])
          .reduce(
            (
              result: StackTrace.StackFrame[],
              frames: StackTrace.StackFrame[]
            ) => result.concat(frames),
            []
          );
        error.trace = error.trace.concat(newStackFrames);
        error.attemptsRoot = fn;
        prepareError(error);
        config.report(error, stackFrames!, attempts);
      }
    });
    return ret;
  }

  attempts.push([name, stackFrames]);

  function subattempt(name: AttemptName, fn: AttemptFunction): Promise<any> {
    return attempt(name, fn, attempts);
  }

  try {
    const ret = fn(subattempt);
    if (ret === undefined) {
      throw new Error('failed attempting ' + name);
    }
    return ret;
  } catch (error) {
    throw error;
  }
}

/**
 * Set global onerror handler ASAP, before loading third party
 * scripts or your app. This should get replaced later with a
 * more capable global handler with access to application state.
 */

function isMadcapError(error: Error): error is MadcapError {
  return error.hasOwnProperty('trace');
}

window.onerror = (msg, url, line, col, error) => {
  if (error && !isMadcapError(error)) {
    StackTrace.fromError(error, { offline: true, filter: cleanStack }).then(
      prepareError.bind(null, error)
    );
  }
  // Return true to prevent the browser from further handling the error
  return true;
};

window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  e.preventDefault();
  const error = e.reason;
  if (error.trace) {
    prepareError(error, error.trace);
  } else {
    StackTrace.fromError(error, { offline: true, filter: cleanStack }).then(
      prepareError.bind(null, error)
    );
  }
});

// function handleError(error, stackFrames, attempts) {
//   debugger;
//   // global
// }

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

// createStrategy(
//   new Map([
//     [FetchError],
//     [
//       AssetLoadError,
//       error => {
//         let foo;
//       }
//     ]
//   ])
// );

// attempt.reportError = reportError;

// attempt.handleError = createStrategy;

/*
Catch errors at these points, and throw custom errors
    Before app initialization (likely a syntax error)
    On app bootstrap (can possibly get information from the app)
    On component renders
        Reason: network call
    On user actions (label as a action failure, because of [[reason]])
        Reason: route change
        Reason: network call
        Reason: storage retreival
    Offline event
    In Service Workers?
    Trying to access client storage

Shuttle all errors up to these points for identification, then use window.onerror for handling
Component errors should be recovered from before propagating


*/

/*
Wrap every point of possible exception in a try catch. 
When not in debug mode, attempt to recover.
When in debug mode, fail noticeably.
When in debug mode use window.onerror to block the UI.
Always use window.onerror for logging.

1. error in sync function executing function returning a promise
handle with 
handle with window.onerror

2. error in sync function returning a promise
handle with window.onerror

3. error in the promise initializer
failure callback

4. error in failure callback for then
.catch

5. error in async function
.onerror
ideally failure callback for then

error in promise then

error in failure callback for the

*/
