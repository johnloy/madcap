import { createError } from '../lib/createError';
export const UndefinedAttemptError = createError('UndefinedAttempError', Error, {
    attemptName: '',
    message: (e) => {
        return `Attempt "${e.attemptName}" failed because undefined was returned`;
    }
});
//# sourceMappingURL=UndefinedAttemptError.js.map