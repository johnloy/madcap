/// <reference types="stacktrace-js" />
import * as StackTrace from 'stacktrace-js';

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
export declare type Attempt = [AttemptName, StackTrace.StackFrame[]];
export interface MadcapError extends Error {
  trace?: StackTrace.StackFrame[];
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  attemptsRoot: AttemptFunction;
}
export interface AttemptFactory {
  (name: AttemptName, fn: AttemptFunction, pastAttempts?: Attempt[]): Promise<
    any
  >;
}
export interface AttemptFunction {
  (attemptFactory: AttemptFactory): any;
}
export interface Config {
  report(
    error: MadcapError,
    stackframes: StackTrace.StackFrame[],
    attempts: Attempt[]
  ): void;

  handle(
    error: MadcapError,
    stackframes: StackTrace.StackFrame[],
    attempts: Attempt[]
  ): void;

  stackTraceLimit?: number;
}

export type AttemptsMap = Map<AttemptFunction, Attempt[]>;

export interface MadcapError extends Error {
  trace?: StackTrace.StackFrame[];
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  attemptsRoot: AttemptFunction;
}

export type StrategyMap = Map<Error, ErrorHandler> | [[Error, ErrorHandler]];

export interface ErrorHandler {
  (
    error: Error,
    stackframes?: StackTrace.StackFrame[],
    attempts?: Attempt[]
  ): void;
}

export interface Strategy extends ErrorHandler {
  __default__?: ErrorHandler;
  add?: (constr: Error, strategy: ErrorHandler) => void;
  remove?: (constr: Error, strategy: ErrorHandler) => void;
  setDefault?: (strategy: ErrorHandler) => ErrorHandler;
}
