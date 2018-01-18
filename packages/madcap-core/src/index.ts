import * as StackTrace from 'stacktrace-js';
import { MadcapError, createError } from './lib/createError';
import { consoleReporter } from './reporters';
import { retryThenRecover } from './handlers';
import { UndefinedAttemptError } from './errors/UndefinedAttemptError';
import {
  StrategyMap,
  isStrategyMap,
  createReportStrategy,
  createHandleStrategy,
  ErrorHandler,
  Strategy
} from './lib/strategy';

export interface MadcapApi {
  configure(newConfig: Partial<Config>): Config;
  attempt(
    name: AttemptName,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
  cleanStack(
    stackFrame: StackTrace.StackFrame,
    index?: number,
    stackFrames?: StackTrace.StackFrame[],
    removeFirst?: boolean
  ): boolean;

  config: Partial<Config>;
}

export declare type AttemptName = string;

export declare type Attempt = {
  name: AttemptName;
  function: AttemptFunction;
  stackFrames: StackTrace.StackFrame[];
  context: any;
};

export interface Retry {
  count: number;
  returnValue: any;
  error?: MadcapError;
}

export interface AttemptFactory {
  (name: AttemptName, fn: AttemptFunction, pastAttempts?: Attempt[]): Promise<
    any
  >;
  (
    name: AttemptName,
    context: any,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
  (
    name: AttemptName,
    contextOrFn?: any,
    fnOrPastAttempts?: Attempt[] | AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
}

export interface AttemptFunction {
  (attemptFactory: AttemptFactory): any;
}

export interface Config {
  report: ErrorHandler | Strategy;
  handle: ErrorHandler | Strategy;
  allowUndefinedAttempts?: boolean;
  stackTraceLimit?: number;
}

export type AttemptsMap = Map<AttemptFunction, Attempt[]>;

function warnToConfigureHandle(): void {
  console.warn('You need to configure a handler');
}

function isAttemptFunction(a: any): a is AttemptFunction {
  return typeof a === 'function';
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

function Madcap(initConfig: Config): MadcapApi | Partial<MadcapApi> {
  /*
   * A Map instance with shape Map<AttemptFunction, Attempt[]>, held in the
   * Madcap function closure, that stores attempt data. This data supplies
   * the .attemptRoot (Function) and .attempts (Attempt[]) properties to errors.
   */
  const attemptsMap: AttemptsMap = new Map();

  const config: Config = {
    report: consoleReporter,
    handle: warnToConfigureHandle,
    allowUndefinedAttempts: false
  };

  if (typeof initConfig === 'object') {
    configure(initConfig);
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
    error.attempts = attempts;
    return error;
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
        // Just nag instead. No throwing nonsense.
        console.warn(
          `Attempt ${name} returns undefined. Is it a work in progress?`
        );
      }
      return ret;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  if (typeof window !== 'undefined') {
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

  // Public Madcap strategy API
  return {
    attempt,
    configure
  };
}

const reporters = {
  consoleReporter
};

const handlers = {
  retryThenRecover
};

const errors = {};

export {
  Madcap as default,
  createError,
  createReportStrategy,
  createHandleStrategy,
  reporters,
  handlers
};
