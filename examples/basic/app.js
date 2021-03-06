/**
 * Toggle production-like behaviors
 * - Minified code
 * - Hidden source maps
 * - Logging to a back end (special dev environment)
 *
 * Might either be QA or live production
 */
window.__PRODUCTION__ = true;

/**
 * Production behavior, but with diagnostic utilities
 * not intended for production
 */
window.__STAGING__ = true;

/**
 * Fail fast and loud
 */
window.__DEVELOPMENT__ = !__PRODUCTION__ && !__STAGING__;

/**
 * Gather data for debugging, and either fail fast and loud
 * or recover and report errors quietly
 */
window.__DEBUG__ = __DEVELOPMENT__ || __STAGING__;

const demoNumberMatch = location.search.match(/demo=(\d+)/);
const demoNumber = demoNumberMatch ? parseInt(demoNumberMatch[1], 10) : null;

const { attempt, createError } = Madcap;

const DemoError = createError('DemoError', Error, {
  message: ({ order, where }) => `(${order}) ${where}`,
  order: 0,
  where: ''
});

// DemoError.configure({
//   message: ({ order, where }) => `(${order}) ${where}`
// });

Madcap({
  allowUndefinedAttempts: false,
  handle: [
    [
      DemoError,
      error => {
        if (__DEBUG__) {
          const errorOverlayHTML = `
            <div class="error-overlay">
                <div class="error-message">${error.message}</div>
            </div>
          `;
          const errorOverlayFrag = document
            .createRange()
            .createContextualFragment(errorOverlayHTML);
          document.body.insertAdjacentHTML('afterbegin', errorOverlayHTML);
        }
      }
    ]
  ]
});

function doSomethingAsync(attempt) {
  if (demoNumber === 4) {
    throw new DemoError({
      order: 4,
      where: 'in sync function returning a promise back to a parent attempt'
    });
  }
  const concurrentAttempt1 = attempt('concurrent attempt #1', attempt => {
    if (demoNumber === 5) {
      throw new DemoError({
        order: 5,
        where: 'in concurrent attempt callback #1'
      });
    }
    return attempt('example with setTimeout', async () => {
      if (demoNumber === 7) {
        throw new DemoError({
          order: 7,
          where: 'in nested attempt callback'
        });
      }

      return new Promise((resolve, reject) => {
        if (demoNumber === 8) {
          throw new DemoError({
            order: 8,
            where: 'error in promise executor'
          });
        }
        if (demoNumber === 9) {
          reject(
            new DemoError({
              order: 9,
              where: 'reject in promise executor'
            })
          );
        }

        setTimeout(() => {
          if (demoNumber >= 10) {
            // throw new DemoError({
            //   order: 10,
            //   where: 'in a setTimeout callback'
            // });
            reject(
              new DemoError({
                order: 10,
                where: 'Promise rejection in a setTimeout callback'
              })
            );
          }
          resolve('Promise resolution in a setTimeout callback');
        }, 300);
      });
    });
  });

  const concurrentAttempt2 = attempt('concurrent attempt #2', () => {
    if (demoNumber === 6) {
      throw new DemoError({
        order: 6,
        where: 'in concurrent attempt callback #2'
      });
    }
    return true;
  });

  return Promise.all([concurrentAttempt1, concurrentAttempt2]);
}

function bootstrap(attempt) {
  const state = {
    isBoostrapped: false
  };

  if (demoNumber === 2) {
    throw new DemoError({
      order: 2,
      where: 'in root attempt callback function'
    });
  }

  return attempt('async bootstrap step', async attempt => {
    if (demoNumber === 3) {
      throw new DemoError({
        order: 3,
        where: 'in subattempt callback function (async)'
      });
    }
    await doSomethingAsync(attempt)
      .then(
        () => {
          if (demoNumber === 11) {
            throw new DemoError({
              order: 11,
              where: 'error in a Promise then'
            });
          }
        },
        error => {
          if (demoNumber > 11) {
            throw new DemoError({
              order: 11,
              where: 'error in a Promise then error callback'
            });
          }
          throw error;
        }
      )
      .catch(error => {
        if (demoNumber === 13) {
          throw new DemoError({
            order: 13,
            where: 'error in a Promise catch'
          });
        }
        if (demoNumber === 14) {
          console.log('handle failure in doSomethingAsync Promise chain');
        }
        throw error;
      });
  });
}

if (demoNumber === 1) {
  throw new DemoError({
    order: 1,
    where: 'before bootstrap'
  });
}

// attempt('foo', () => {}).then(ret => {
//   debugger;
//   let foo = 'bar';
// });

attempt('bootstrap', { foo: 'bar' }, bootstrap, {
  precondition: context => {}, // throw error if context is mutated
  postcondition: (output, context) => {}, // throw error if output or context is mutated
  invariant: context => {}
});
