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
import { StackFrame } from 'stacktrace-js';

// export { default as createError } from './createError';

declare var __DEBUG__: boolean;
declare var Madcap: BrowserApi;

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
  }
}

function warnToConfigureHandle(): void {
  console.warn('You need to configure a handler');
}

export function init(): CoreApi | Partial<CoreApi> {
  const attemptsMap: AttemptsMap = new Map();

  const config: Config = {
    report: reportToConsole,
    handle: warnToConfigureHandle
  };

  function configure(mergeConfig: Partial<Config>): Config {
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
      attemptsMap.get(error.attemptsRoot) ||
      [...Array.from(attemptsMap.values())][0] ||
      [];
    const attemptName =
      (attempts[0] && attempts[0][0]) || 'before first attempt';

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

  async function attempt(
    name: AttemptName,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any> {
    const stackFrames = await StackTrace.fromError(new Error(), {
      filter: cleanAttemptStack
    });

    let attempts = pastAttempts || attemptsMap.get(fn) || [];

    if (!attempts.length) {
      attempts = [[name, stackFrames]];
      attemptsMap.set(fn, attempts);
      const ret = attempt(name, fn).catch(async (error: MadcapError) => {
        if (!error.trace) {
          error.trace = await StackTrace.fromError(error, {
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
          config.handle(error, stackFrames!, attempts);
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

  function retryThenRecover(
    error: Error | MadcapError /*, retry, retryTimes, recover*/
  ) {
    console.log(error);
    // if (error.retry && error.retriedCount) {
    // }
  }

  function createStrategy(strategyDef: StrategyMap): Strategy {
    const strategyMap = new Map(strategyDef);
    const strategy: Strategy = (
      error: Error,
      stackFrames: StackFrame[],
      attempts: Attempt[]
    ): void => {
      let resolvedStrategy;
      if (!strategyMap.has((error as any).constructor)) {
        if (!strategy.__default__) return;
        resolvedStrategy = strategy.__default__;
      } else {
        resolvedStrategy = strategyMap.get((error as any).constructor);
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
    createReportStrategy,
    createHandleStrategy
  };
  if (typeof window !== 'undefined') {
    Object.assign(api, { cleanStack, prepareError, config });
  }

  return api;
}

if (typeof window !== 'undefined') {
  const coreApi = init();
  const {
    cleanStack,
    prepareError,
    config,
    ...browserApi
  } = coreApi as CoreApi;

  Madcap = browserApi;

  window.onerror = (msg, url, line, col, error) => {
    if (error) {
      StackTrace.fromError(error, { filter: cleanStack })
        .then(prepareError.bind(null, error))
        .then(config.report!.bind(null, error));
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
      StackTrace.fromError(error, { filter: cleanStack }).then(
        prepareError.bind(null, error)
      );
    }
  });
}
