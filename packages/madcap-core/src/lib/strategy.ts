import { MadcapError } from '../lib/createError';
import { consoleReporter } from '../reporters/console';
import { retryThenRecover } from '../handlers/retryThenRecover';

export type StrategyMap =
  | Map<Partial<MadcapError>, ErrorHandler>
  | [[Partial<MadcapError>, ErrorHandler]];

export interface ErrorHandler {
  (error: MadcapError): MadcapError | void;
}

export interface Strategy extends ErrorHandler {
  __default__?: ErrorHandler;
  add?: (constr: Error, strategy: ErrorHandler) => void;
  remove?: (constr: Error, strategy: ErrorHandler) => void;
  setDefault?: (strategy: ErrorHandler) => ErrorHandler;
}
export function isStrategyMap(strategy: any): strategy is StrategyMap {
  return strategy && (Array.isArray(strategy) || strategy instanceof Map);
}

export function createStrategy(strategyDef: StrategyMap): Strategy {
  const strategyMap = new Map(strategyDef);
  const strategy: Strategy = (error: MadcapError): MadcapError | void => {
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

export function createReportStrategy(strategyDef: StrategyMap): Strategy {
  const strategy = createStrategy(strategyDef);
  strategy.setDefault!(consoleReporter);
  return strategy;
}

export function createHandleStrategy(strategyDef: StrategyMap): Strategy {
  const strategy = createStrategy(strategyDef);
  strategy.setDefault!(retryThenRecover);
  return strategy;
}
