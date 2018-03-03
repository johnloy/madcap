import Madcap, { reporters as madcapReporters, createError } from 'madcap';
import { reporters as reactReporters } from 'madcap-react';

const reporters = {
  ...madcapReporters,
  ...reactReporters
};

const { attempt } = Madcap({
  report: reporters.consoleReporter,
  // report: reporters.reactErrorOverlay,
  handle: error => {
    // debugger;
  }
  // eventEmitters: [DOM]
  // mixins: {
  //   fetch,
  //   setTimeout,
  //   setInterval
  // }
});

/*

function* foo {
  try {
    const result yield 

  } catch(e) {

  }
}

const readLines = attempt(function*() {

});

GeneratorError
.attemptName
.values

*/

const DemoError = createError('DemoError', Error, {
  message: ({ order, where }) => `(${order}) ${where}`,
  order: 0,
  where: ''
});

export { attempt, DemoError };
