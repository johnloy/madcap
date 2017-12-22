import {
  Attempt,
  AttemptFunction,
  AttemptName,
  AttemptsMap,
  AttemptFactory,
  BrowserApi,
  Config,
  CoreApi,
  MadcapError,
  Strategy,
  ErrorHandler,
  StrategyMap
} from 'madcap.d';
import * as StackTrace from 'stacktrace-js';
import createError from './createError';
import reportToConsole from './reporters/console';

const UndefinedAttemptError = createError('UndefinedAttempError', Error, {
  attemptName: '',
  message: (e: MadcapError) => {
    return `Attempt "${e.attemptName}" failed because undefined was returned`;
  }
});

function warnToConfigureHandle(): void {
  console.warn('You need to configure a handler');
}

export default function Madcap(initConfig: Config): CoreApi | Partial<CoreApi> {
  const attemptsMap: AttemptsMap = new Map();

  const config: Config = {
    report: reportToConsole,
    handle: warnToConfigureHandle,
    allowUndefinedAttempts: false
  };

  if (typeof initConfig === 'object') {
    configure(initConfig);
  }

  function isStrategyMap(strategy: any): strategy is StrategyMap {
    return strategy && (Array.isArray(strategy) || strategy instanceof Map);
  }

  function configure(mergeConfig: Partial<Config>): Config {
    if (isStrategyMap(mergeConfig.report)) {
      mergeConfig.report = createReportStrategy(mergeConfig.report!);
    }

    if (isStrategyMap(mergeConfig.handle)) {
      mergeConfig.handle = createHandleStrategy(mergeConfig.handle);
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

  function prepareError(
    error: MadcapError,
    stackFrames?: StackTrace.StackFrame[]
  ): MadcapError {
    stackFrames = error.trace! || stackFrames;
    const topFrame: StackTrace.StackFrame = stackFrames[0];

    const attempts =
      attemptsMap.get(error.attemptFn) ||
      [...Array.from(attemptsMap.values())][0] ||
      [];
    const attemptName =
      (attempts[0] && attempts[0].name) || 'before first attempt';

    const msg = (error.message = `[APP/${attemptName}] ${error.message}`);

    if (stackFrames.length === 1) {
      const shouldAppendFrames = !attempts.some((attempt: Attempt) => {
        const attemptFrames = attempt.stackFrames;
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
            ...attempt.stackFrames
          ],
          [stackFrames[0]]
        );
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

  function isAttemptFunction(a: any): a is AttemptFunction {
    return typeof a === 'function';
  }

  /**
   * Wrap a function with a Promise having at the end of its chain
   * a catch callback that reports and handles errors.
   *
   * @param {AttemptName} name
   * @param {AttemptFunction | any} contextOrFn
   * @param {Attempt[] | AttemptFunction} [pastAttempts]
   * @returns {Promise<any>}
   */
  function attempt(
    name: AttemptName,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
  function attempt(
    name: AttemptName,
    context: any,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
  async function attempt(
    name: AttemptName,
    contextOrFn?: any,
    fnOrPastAttempts?: Attempt[] | AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any> {
    let context: any;
    let fn: AttemptFunction;
    if (isAttemptFunction(fnOrPastAttempts)) {
      context = contextOrFn;
      fn = fnOrPastAttempts;
    } else {
      fn = contextOrFn;
      pastAttempts = fnOrPastAttempts;
    }

    const stackFrames = await StackTrace.fromError(new Error(), {
      filter: cleanAttemptStack
    });

    let attempts = pastAttempts || attemptsMap.get(fn) || [];

    if (!attempts.length) {
      attempts = [{ name, function: fn, stackFrames, context }];
      attemptsMap.set(fn, attempts);
      const ret = attempt(name, fn).catch(async (error: MadcapError) => {
        if (!error.trace) {
          error.trace = await StackTrace.fromError(error, {
            filter: cleanStack
          });
          const newStackFrames = attempts
            .reverse()
            .map((attempt: Attempt) => attempt.stackFrames)
            .reduce(
              (
                result: StackTrace.StackFrame[],
                frames: StackTrace.StackFrame[]
              ) => result.concat(frames),
              []
            );
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
      });
      return ret;
    }

    if (fn !== attempts[0].function) {
      attempts.push({ name, function: fn, stackFrames, context });
    }

    function subattempt(name: AttemptName, fn: AttemptFunction): Promise<any> {
      return attempt(name, fn, attempts);
    }

    try {
      const ret = fn(subattempt);
      if (ret === undefined) {
        if (!config.allowUndefinedAttempts) {
          throw new UndefinedAttemptError({ attemptName: name });
        }
        console.warn(
          `Attempt ${name} returns undefined. Is it a work in progress?`
        );
      }
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function retryThenRecover(
    error: Error | MadcapError /*, retry, retryTimes, recover*/
  ) {
    console.log(error);
    // if (error.retry && error.retriedCount) {
    // }
  }

  function createStrategy(strategyDef: StrategyMap): Strategy {
    const strategyMap = new Map(strategyDef);
    const strategy: Strategy = (error: Error): void => {
      let resolvedStrategy;
      const match = Array.from(strategyMap.keys()).find(
        (constr: Function) => error instanceof constr
      );
      if (match) {
        resolvedStrategy = strategyMap.get(match);
      } else {
        if (!strategy.__default__) return;
        resolvedStrategy = strategy.__default__;
      }
      resolvedStrategy!(error);
    };

    strategy.add = (constr: Error, handler: ErrorHandler) =>
      strategyMap.set(constr, handler);
    strategy.remove = (constr: Error, handler: ErrorHandler) =>
      strategyMap.delete(constr);
    strategy.setDefault = (handler: ErrorHandler): ErrorHandler => {
      strategy.__default__ = handler;
      return handler;
    };

    return strategy;
  }

  function createReportStrategy(strategyDef: StrategyMap): Strategy {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault!(reportToConsole);
    return strategy;
  }

  function createHandleStrategy(strategyDef: StrategyMap): Strategy {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault!(retryThenRecover);
    return strategy;
  }

  const api = {
    attempt,
    configure,
    createError,
    createReportStrategy,
    createHandleStrategy
  };
  // if (typeof window !== 'undefined') {
  //   Object.assign(api, { cleanStack, prepareError, config });
  // }

  if (typeof window !== 'undefined') {
    // const coreApi = init();
    // const {
    //   cleanStack,
    //   prepareError,
    //   config,
    //   ...browserApi
    // } = coreApi as CoreApi;

    // Madcap = browserApi;
    // Madcap = browserApi.configure;
    // Object.assign(Madcap, browserApi);

    window.onerror = (msg, url, line, col, error: MadcapError) => {
      if (error && !error.attempts) {
        error.isHandled = true;
        StackTrace.fromError(error, { filter: cleanStack })
          .then(prepareError.bind(null, error))
          .then(config.report!.bind(null, error))
          .then(config.handle!.bind(null, error));
      }
      // Return true to prevent the browser from further handling the error
      return true;
    };

    window.addEventListener(
      'unhandledrejection',
      (e: PromiseRejectionEvent) => {
        e.preventDefault();
        const error = e.reason;
        if (error.isHandled) return;
        StackTrace.fromError(error, { filter: cleanStack })
          .then(prepareError.bind(null, error))
          .then(config.report!.bind(null, error))
          .then(config.handle!.bind(null, error));
      }
    );
  }

  return api;
}
