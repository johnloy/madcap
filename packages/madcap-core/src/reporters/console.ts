import { MadcapError } from '../lib/createError';

declare var __DEBUG__: boolean;

class Attempt {
  location: string;
  constructor(fn: Function) {
    this.location = '';
  }
}

export function consoleReporter(error: MadcapError): MadcapError | void {
  if (__DEBUG__) {
    console.group('%c%s', 'color: red', error.message);
    console.error(error);
    console.log(
      `Location: ${error.fileName}:${error.lineNumber}:${error.columnNumber}\n`
    );
    if (error.attempts) {
      const attemptsReportStr: string = error.attempts.reduce(
        (report, attempt, index): string => {
          report += '%d)    Name: %s\n';
          report += '   Context: %O\n';
          report += `  Function: %O\n`;
          report += '\n';
          return report;
        },
        ''
      );
      const attemptsReportLogValues: any[] = error.attempts.reduce<any[]>(
        (report, attempt, index): any[] => {
          report.push(index + 1);
          report.push(attempt.name);
          report.push(attempt.context || 'none provided');
          report.push(new Attempt(attempt.function));
          return report;
        },
        []
      );
      console.log(
        `Attempts:\n\n${attemptsReportStr}`,
        ...attemptsReportLogValues
      );
    }
  }
  return error;
}
