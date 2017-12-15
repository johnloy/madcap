/**
 * Fail fast and loud
 */
window.__DEVELOPMENT__ = true;

/**
 * Toggle production-like behaviors
 * - Minified code
 * - Hidden source maps
 * - Logging to a back end (special dev environment)
 *
 * Might either be QA or live production
 */
window.__PRODUCTION__ = false;

/**
 * Production behavior, but with diagnostic utilities
 * not intended for production
 */
window.__QA__ = false;

/**
 * Gather data for debugging, and either fail fast and loud
 * or recover and report errors quietly
 */
window.__DEBUG__ = __DEVELOPMENT__ || __QA__;

const { attempt, createError } = Madcap;

FetchError = createError('FetchError', Error, {
  message: ({ statusCode }) => {
    return `something went wrong with fetch: ${statusCode}`;
  },
  statusCode: 400
});

BadShitError = createError('BadShitError', FetchError, { message: 'bad shit' });

Madcap.configure({
  report: Madcap.createReportStrategy([
    [
      FetchError,
      error => {
        console.log('yes!!!');
        console.error(error);
      }
    ]
    // [
    //   AssetLoadError,
    //   error => {
    //     let foo;
    //   }
    // ]
  ])
  // handle: Madcap.createHandleStrategy([
  //   [
  //     Error,
  //     error => {
  //       console.log('woops');
  //       console.error(error);
  //     }
  //   ]
  // ])
});

// FetchError.configure({
//   message: ({ statusCode }) => {
//     return `Nope: ${statusCode}`;
//   }
// });

// try {
//   throw new FetchError(null, { statusCode: 500 });
// } catch (err) {
//   debugger;
//   console.error(err);
// }

// class MyError extends Error {}

// try {
//   throw new MyError("blah");
// } catch (err) {
//   console.error(err);
// }

/*
Wrap every point of possible exception in a try catch. 
When not in debug mode, attempt to recover.
When in debug mode, fail noticeably.
When in debug mode use window.onerror to block the UI.
Always use window.onerror for logging.

1. error in sync function executing function returning a promise
handle with 
handle with window.onerror

2. error in sync function returning a promise
handle with window.onerror

3. error in the promise initializer
failure callback

4. error in failure callback for then
.catch

5. error in async function
.onerror
ideally failure callback for then

error in promise then

error in failure callback for the

*/

function doSomethingAsync(attempt) {
  // throw new Error(
  //   'in sync function returning an attempt promise back to a parent attempt'
  // );
  // 2) called doSomethingAsync()
  const firstAttempt = attempt('something async', attempt => {
    // throw new Error('in attempt callback, before returning another attempt'); // 2.
    // 5) return Promise with an async operation
    return attempt('wait', () => {
      throw new FetchError(null, { statusCode: 500 });
      throw new Error('in nested attempt callback'); // 3.

      return new Promise((resolve, reject) => {
        // done
        // throw new Error('error in promise executor') // 3.
        setTimeout(() => {
          try {
            // done
            // throw new Error('error in async operation');
          } catch (error) {
            reject(error);
          }
          // done
          // reject(new Error('[doSomethingAsync] reject in async operation'));
          resolve('[doSomethingAsync] resolve in async operation');
        }, 300);

        // reject(new Error('[doSomethingAsync] reject in promise initializer'));
        // resolve('[doSomethingAsync] resolve in promise initializer');
      });
    });
  });

  const secondAttempt = attempt('sibling attempt', () => {
    // throw new Error('in sibling attempt');
    return true;
  });

  return Promise.all([firstAttempt, secondAttempt]);
}

function bootstrap(attempt) {
  const state = {
    isBoostrapped: false
  };

  //   throw new Error(`in function before first attempt`); // 1.

  return attempt('bootstrap', async attempt => {
    // throw new Error('in root attempt callback function');
    return doSomethingAsync(attempt)
      .then(
        () => {
          throw new Error('error in doSomethingAsync then');
          console.log('success in then');
        }
        // error => {
        //   throw new Error("error in failure callback for then");
        //   console.log("failure callback for then\n", error);
        // }
      )
      .catch(error => {
        throw error;
      });
  });
}

function someUserAction() {
  attempt('user action', () => {
    throw new Error('something broke');
  });
}

// throw new Error('before bootstrap');

attempt('init', bootstrap);

// someUserAction();
