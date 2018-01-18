"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createError_1 = require("../lib/createError");
exports.UndefinedAttemptError = createError_1.createError('UndefinedAttempError', Error, {
    attemptName: '',
    message: (e) => {
        return `Attempt "${e.attemptName}" failed because undefined was returned`;
    }
});
//# sourceMappingURL=UndefinedAttemptError.js.map