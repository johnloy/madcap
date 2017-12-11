// function validateMessage(message) {
//   if (typeof message !== 'string' && typeof message !== 'function') {
//     throw new TypeError(
//       'message either needs to be a string or a function that returns a string'
//     );
//   }
//   return true;
// }
// function createError(name, ParentError = Error, defaultProps = {}) {
//   if (typeof name !== 'string') {
//     throw new TypeError('expected "name" to be a string.');
//   }
//   if (
//     ParentError !== Error &&
//     !Error.prototype.isPrototypeOf(ParentError.prototype)
//   ) {
//     throw new TypeError(
//       'expected "ParentError" to extend Error or a subclass of Error'
//     );
//   }
//   const { message: defaultMessage, ...restDefaultProps } = defaultProps;
//   validateMessage(defaultMessage);
//   let getMessage =
//     typeof defaultMessage === 'string' ? () => defaultMessage : defaultMessage;
//   const CustomError = function(message, props) {
//     if (!(this instanceof CustomError)) {
//       return new CustomError(message, props);
//     }
//     var proxy = new ParentError();
//     Object.setPrototypeOf(proxy, Object.getPrototypeOf(this));
//     if (Error.captureStackTrace) {
//       Error.captureStackTrace(proxy, CustomError);
//     }
//     Object.assign(proxy, props);
//     proxy.name = name;
//     proxy.message =
//       typeof message === 'function'
//         ? message(proxy)
//         : message || getMessage(proxy);
//     return proxy;
//   };
//   if (Object.setPrototypeOf) {
//     Object.setPrototypeOf(CustomError, ParentError);
//   } else {
//     CustomError.__proto__ = ParentError;
//   }
//   delete CustomError.name;
//   Object.defineProperty(CustomError, 'name', {
//     value: name,
//     enumerable: false,
//     configurable: true,
//     writable: false
//   });
//   CustomError.configure = function(config) {
//     if (
//       typeof config.message !== 'string' &&
//       typeof config.message !== 'function'
//     ) {
//       throw new TypeError(
//         'message either needs to be a string or a function that returns a string'
//       );
//     } else {
//       getMessage =
//         typeof config.message === 'string'
//           ? () => config.message
//           : config.message;
//     }
//     const { message, ...configRest } = config;
//     Object.assign(CustomError.prototype, configRest);
//   };
//   CustomError.prototype = Object.create(ParentError.prototype, {
//     constructor: {
//       value: CustomError,
//       enumerable: false,
//       configurable: true,
//       writable: true
//     },
//     toString: {
//       value: function() {
//         return 'foo';
//       },
//       enumerable: false,
//       configurable: true,
//       writable: true
//     }
//   });
//   Object.assign(CustomError.prototype, restDefaultProps);
//   return CustomError;
// }
// export default createError;
// // FetchError = createError('FetchError', Error, {
// //   message: ({ statusCode }) => {
// //     return `something went wrong with fetch: ${statusCode}`;
// //   },
// //   statusCode: 400
// // });
// // BadShitError = createError('BadShitError', FetchError, { message: 'bad shit' });
// // FetchError.configure({
// //   message: ({ statusCode }) => {
// //     return `Nope: ${statusCode}`;
// //   }
// // });
// // try {
// //   throw new BadShitError(null, { statusCode: 500 });
// // } catch (err) {
// //   console.error(err);
// // }
// // class MyError extends Error {}
// // try {
// //   throw new MyError("blah");
// // } catch (err) {
// //   console.error(err);
// // }
//# sourceMappingURL=createError.js.map