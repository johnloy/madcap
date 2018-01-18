import { consoleReporter } from '../reporters/console';
import { retryThenRecover } from '../handlers/retryThenRecover';
export function isStrategyMap(strategy) {
    return strategy && (Array.isArray(strategy) || strategy instanceof Map);
}
export function createStrategy(strategyDef) {
    const strategyMap = new Map(strategyDef);
    const strategy = (error) => {
        let resolvedStrategy;
        const match = Array.from(strategyMap.keys()).find((constr) => error instanceof constr);
        if (match) {
            resolvedStrategy = strategyMap.get(match);
        }
        else {
            if (!strategy.__default__)
                return;
            resolvedStrategy = strategy.__default__;
        }
        resolvedStrategy(error);
    };
    strategy.add = (constr, handler) => strategyMap.set(constr, handler);
    strategy.remove = (constr, handler) => strategyMap.delete(constr);
    strategy.setDefault = (handler) => {
        strategy.__default__ = handler;
        return handler;
    };
    return strategy;
}
export function createReportStrategy(strategyDef) {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault(consoleReporter);
    return strategy;
}
export function createHandleStrategy(strategyDef) {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault(retryThenRecover);
    return strategy;
}
//# sourceMappingURL=strategy.js.map