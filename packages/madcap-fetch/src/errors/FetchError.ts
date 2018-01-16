import { MadcapError, AttemptFactory, createError } from 'madcap';

type Milliseconds = number | string; // 300 | 300ms
type Seconds = string; // .5s
type IsoDateString = string; // 2017-12-30T13:34:44.327Z
type Timestamp = number; // 1514641029179, e.g. new Date().getTime() =>
type TimeoutOption = Milliseconds | Seconds | IsoDateString | Timestamp | Date;

/*
FetchError
    FetchRedirectError
    FetchNetworkError
    FetchTimeoutError
    FetchInvalidResponseError
        FetchNullResponseError
        FetchContentTypeError
    HttpError
        HttpNotFoundError
        HttpUnauthorizedError

fetch init:
-----------
method
body
mode
cache
redirect 
referrer
referrerPolicy
integrity
keepalive
signal

*/

interface MadcapFetch {
  fetch(input: RequestInfo, init?: MadcapFetchInit): Promise<Response>;
}

interface MadcapFetchInit extends RequestInit {
  attempt: AttemptFactory;
  timeout?: TimeoutOption;
  canRedirect?: boolean; // fails if redirect is true on response
  acceptNullResponse?: boolean;
  gracefulNullResponse?: boolean;
  parseResponse?: (response: Response) => any;
  validateResponse?: (parsedResponse: any) => boolean;
  failStatuses?: number[];
  okStatuses?: number[];
  failContentTypes?: string[];
  okContentTypes?: string[];
}

interface FetchErrorTimingInfo {
  timedOut: boolean;
  request: number;
  response: number;
  parse: number;
  validate: number;
}

interface FetchErrorProps {
  url: USVString;
  status: number;
  statusText: string;
  requestInit: RequestInit;
  request: Request;
  response: Response;
  error: any; // TypeError, AuthenticationError
  timing: FetchErrorTimingInfo;
}

interface FetchError extends FetchErrorProps, MadcapError {
  new (props: FetchErrorProps): FetchError;
}

/*
fetch('/users/1', {
  validateResponse(parsedResponse) {
    // cause a FetchError to throw with a .message of the return value
    return parsedResponse.errorMessage;
    // rejects the fetch with this error
    throw new FetchError('something went wrong');
    // rejects the fetch with a FetchError, using the message from the custom error, with an error prop of the AuthenticationError
    throw new AuthenticationError('wrong password');
  }
});
*/
