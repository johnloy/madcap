import Madcap from 'madcap';
import errorOverlayReporter from 'madcap/es/reporters/reactErrorOverlay';
import consoleReporter from 'madcap/es/reporters/console';

const { attempt } = Madcap({
  // report: consoleReporter
  report: errorOverlayReporter,
  handle: error => {
    debugger;
  }
});

export { attempt };
