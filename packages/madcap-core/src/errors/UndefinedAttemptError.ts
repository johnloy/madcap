import { createError, MadcapError } from '../lib/createError';

export const UndefinedAttemptError = createError(
  'UndefinedAttempError',
  Error,
  {
    attemptName: '',
    message: (e: MadcapError) => {
      return `Attempt "${e.attemptName}" failed because undefined was returned`;
    }
  }
);
