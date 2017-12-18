import {
  CustomError,
  CustomErrorProps,
  MadcapError,
  MessageBuilder
} from 'madcap.d';

function arePropsValid(props: any): props is CustomErrorProps {
  return (
    typeof props.message === 'string' || typeof props.message === 'function'
  );
}

function validateMessage(props: CustomErrorProps | {}) {
  if (!arePropsValid(props)) {
    throw new TypeError(
      'message either needs to be a string or a function that returns a string'
    );
  }
  return true;
}

function createError(
  name: string,
  ParentError = Error,
  defaultProps: CustomErrorProps = {}
): CustomError {
  if (typeof name !== 'string') {
    throw new TypeError('expected "name" to be a string.');
  }

  if (
    ParentError !== Error &&
    !Error.prototype.isPrototypeOf(ParentError.prototype)
  ) {
    throw new TypeError(
      'expected "ParentError" to extend Error or a subclass of Error'
    );
  }

  validateMessage(defaultProps);

  const {
    message: defaultMessage,
    ...restDefaultProps
  } = defaultProps as CustomErrorProps;

  let getMessage =
    typeof defaultMessage === 'string' ? () => defaultMessage : defaultMessage;

  const CustomError: any = function(
    message?: MessageBuilder | string | CustomErrorProps,
    props?: CustomErrorProps
  ): Partial<MadcapError> {
    if (!(this instanceof CustomError)) {
      return new (CustomError as CustomError)(message, props);
    }

    if (arguments.length === 1) {
      props = message as CustomErrorProps;
      message = props.message;
    }

    const proxy = new ParentError();

    Object.setPrototypeOf(proxy, Object.getPrototypeOf(this));

    if (Error.captureStackTrace) {
      Error.captureStackTrace(proxy, CustomError);
    }

    Object.assign(proxy, props);

    proxy.name = name;

    proxy.message =
      typeof message === 'function'
        ? message(proxy)
        : message || getMessage(proxy);

    return proxy;
  };

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(CustomError, ParentError);
  } else {
    CustomError.__proto__ = ParentError;
  }

  Object.defineProperty(CustomError, 'name', {
    value: name,
    enumerable: false,
    configurable: true,
    writable: false
  });

  CustomError.configure = function(config: CustomErrorProps) {
    validateMessage(config);
    if (
      typeof config.message !== 'string' &&
      typeof config.message !== 'function'
    ) {
      throw new TypeError(
        'message either needs to be a string or a function that returns a string'
      );
    } else {
      getMessage =
        typeof config.message === 'string'
          ? () => config.message
          : config.message;
    }
    const { message, ...configRest } = config;
    Object.assign(CustomError.prototype, configRest);
  };

  CustomError.prototype = Object.create(ParentError.prototype, {
    constructor: {
      value: CustomError,
      enumerable: false,
      configurable: true,
      writable: true
    },
    toString: {
      value: function() {
        return 'foo';
      },
      enumerable: false,
      configurable: true,
      writable: true
    }
  });

  Object.assign(CustomError.prototype, restDefaultProps);

  return CustomError as CustomError;
}

export default createError;
