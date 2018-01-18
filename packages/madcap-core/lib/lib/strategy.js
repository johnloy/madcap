"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("../reporters/console");
const retryThenRecover_1 = require("../handlers/retryThenRecover");
function isStrategyMap(strategy) {
    return strategy && (Array.isArray(strategy) || strategy instanceof Map);
}
exports.isStrategyMap = isStrategyMap;
function createStrategy(strategyDef) {
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
exports.createStrategy = createStrategy;
function createReportStrategy(strategyDef) {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault(console_1.consoleReporter);
    return strategy;
}
exports.createReportStrategy = createReportStrategy;
function createHandleStrategy(strategyDef) {
    const strategy = createStrategy(strategyDef);
    strategy.setDefault(retryThenRecover_1.retryThenRecover);
    return strategy;
}
exports.createHandleStrategy = createHandleStrategy;
//# sourceMappingURL=strategy.js.map