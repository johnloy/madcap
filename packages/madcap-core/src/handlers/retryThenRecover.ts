import { MadcapError } from '../lib/createError';

export function retryThenRecover(
  error: MadcapError /*, retry, retryTimes, recover*/
) {
  console.log(error);
  // if (error.retry && error.retriedCount) {
  // }
}
