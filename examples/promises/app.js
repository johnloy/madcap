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

const attempt = Madcap.core.attempt;

function doSomethingAsync(attempt) {
  // throw new Error(
  //   'in sync function returning an attempt promise back to a parent attempt'
  // );
  // 2) called doSomethingAsync()
  const firstAttempt = attempt('something async', attempt => {
    // throw new Error('in attempt callback, before returning another attempt'); // 2.
    // 5) return Promise with an async operation
    return attempt('wait', () => {
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
