"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Attempt {
    constructor(attempt) {
        this.location = attempt.location;
    }
}
function consoleReporter(error) {
    if (__DEBUG__) {
        console.group('%c%s', 'color: red', error.message);
        console.error(error);
        console.log(`Location: ${location.origin}${error.fileName}:${error.lineNumber}:${error.columnNumber}\n`);
        if (error.attempts) {
            const attemptsReportStr = error.attempts.reduce((report, attempt, index) => {
                report += '%d)    Name: %s\n';
                report += '   Context: %O\n';
                report += `  Location: %s\n`;
                report += '\n';
                return report;
            }, '');
            const attemptsReportLogValues = error.attempts.reduce((report, attempt, index) => {
                report.push(index + 1);
                report.push(attempt.name);
                report.push(attempt.context || 'none provided');
                report.push(location.origin + attempt.location);
                return report;
            }, []);
            console.log(`Attempts:\n\n${attemptsReportStr}`, ...attemptsReportLogValues);
        }
    }
    return error;
}
exports.consoleReporter = consoleReporter;
//# sourceMappingURL=console.js.map