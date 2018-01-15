import Madcap from 'madcap';
import errorOverlayReporter from 'madcap/es/reporters/reactErrorOverlay';
import consoleReporter from 'madcap/es/reporters/console';

const { attempt, createError } = Madcap({
  // eventEmitters: [DOM]
  // report: consoleReporter
  report: errorOverlayReporter,
  handle: error => {
    debugger;
  }
  // mixins: {
  //   fetch,
  //   setTimeout,
  //   setInterval
  // }
});

const DemoError = createError('DemoError', Error, {
  message: ({ order, where }) => `(${order}) ${where}`,
  order: 0,
  where: ''
});

export { attempt, DemoError };
