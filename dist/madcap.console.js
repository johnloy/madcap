(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["console"] = factory();
	else
		root["Madcap"] = root["Madcap"] || {}, root["Madcap"]["reporters"] = root["Madcap"]["reporters"] || {}, root["Madcap"]["reporters"]["console"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ({

/***/ 2:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Attempt = /** @class */ (function () {
    function Attempt(fn) {
        this.location = '';
    }
    return Attempt;
}());
function reportToConsole(error) {
    if (__DEBUG__) {
        console.group('%c%s', 'color: red', error.message);
        console.error(error);
        console.log("Location: " + error.fileName + ":" + error.lineNumber + ":" + error.columnNumber + "\n");
        var attemptsReportStr = error.attempts.reduce(function (report, attempt, index) {
            report += '%d)    Name: %s\n';
            report += '   Context: %O\n';
            report += "  Function: %O\n";
            report += '\n';
            return report;
        }, '');
        var attemptsReportLogValues = error.attempts.reduce(function (report, attempt, index) {
            report.push(index + 1);
            report.push(attempt.name);
            report.push(attempt.context || 'none provided');
            report.push(new Attempt(attempt.function));
            return report;
        }, []);
        console.log.apply(console, ["Attempts:\n\n" + attemptsReportStr].concat(attemptsReportLogValues));
    }
}
exports.default = reportToConsole;


/***/ })

/******/ });
});
//# sourceMappingURL=madcap.console.js.map