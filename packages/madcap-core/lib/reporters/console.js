"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Attempt {
    constructor(fn) {
        this.location = '';
    }
}
function reportToConsole(error) {
    if (__DEBUG__) {
        console.group('%c%s', 'color: red', error.message);
        console.error(error);
        console.log(`Location: ${error.fileName}:${error.lineNumber}:${error.columnNumber}\n`);
        const attemptsReportStr = error.attempts.reduce((report, attempt, index) => {
            report += '%d)    Name: %s\n';
            report += '   Context: %O\n';
            report += `  Function: %O\n`;
            report += '\n';
            return report;
        }, '');
        const attemptsReportLogValues = error.attempts.reduce((report, attempt, index) => {
            report.push(index + 1);
            report.push(attempt.name);
            report.push(attempt.context || 'none provided');
            report.push(new Attempt(attempt.function));
            return report;
        }, []);
        console.log(`Attempts:\n\n${attemptsReportStr}`, ...attemptsReportLogValues);
    }
}
exports.reportToConsole = reportToConsole;
//# sourceMappingURL=console.js.map