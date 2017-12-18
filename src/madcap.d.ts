/// <reference types="stacktrace-js" />
import * as StackTrace from 'stacktrace-js';
import createError from 'createError';
import reportToConsole from 'reporters/console';

export as namespace Madcap;

export interface BrowserApi {
  configure(newConfig: Partial<Config>): Config;
  attempt(
    name: AttemptName,
    fn: AttemptFunction,
    pastAttempts?: Attempt[]
  ): Promise<any>;
}

export interface CoreApi extends BrowserApi {
  core?: CoreApi | BrowserApi;
  prepareError(
    error: MadcapError,
    stackFrames?: StackTrace.StackFrame[]
  ): MadcapError;

  cleanStack(
    stackFrame: StackTrace.StackFrame,
    index?: number,
    stackFrames?: StackTrace.StackFrame[],
    removeFirst?: boolean
  ): boolean;

  config: Partial<Config>;
}

declare function init(): CoreApi;

export const core: {
  init: typeof init;
};

export declare type AttemptName = string;
export declare type Attempt = {
  name: AttemptName;
  function: AttemptFunction;
  stackFrames: StackTrace.StackFrame[];
  context: any;
};
export interface MadcapError extends Error {
  trace?: StackTrace.StackFrame[];
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  attemptFn: AttemptFunction;
  attempts: Attempt[];
  [key: string]: any;
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
  report: (error: MadcapError) => void | StrategyMap;

  handle: (error: MadcapError) => void | StrategyMap;

  allowUndefinedAttempts?: boolean;

  stackTraceLimit?: number;
}

export type AttemptsMap = Map<AttemptFunction, Attempt[]>;

export interface MadcapError extends Error {
  trace?: StackTrace.StackFrame[];
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  attemptFn: AttemptFunction;
}

export type StrategyMap =
  | Map<Partial<MadcapError>, ErrorHandler>
  | [[Partial<MadcapError>, ErrorHandler]];

export interface ErrorHandler {
  (error: Error): void;
}

export interface Strategy extends ErrorHandler {
  __default__?: ErrorHandler;
  add?: (constr: Error, strategy: ErrorHandler) => void;
  remove?: (constr: Error, strategy: ErrorHandler) => void;
  setDefault?: (strategy: ErrorHandler) => ErrorHandler;
}

export interface MessageBuilder {
  (props: {}): string;
}

export interface CustomErrorProps {
  [key: string]: any;
}

export interface CustomError {
  new (
    message?: MessageBuilder | string | CustomErrorProps,
    props?: CustomErrorProps
  ): Partial<MadcapError>;
  __proto__?: {};
  configure?: (config: {}) => void;
}
