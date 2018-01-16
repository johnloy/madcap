/*
fetch('/users/1', {
  validateResponse(parsedResponse) {
    // cause a FetchError to throw with a .message of the return value
    return parsedResponse.errorMessage;
    // rejects the fetch with this error
    throw new FetchError('something went wrong');
    // rejects the fetch with a FetchError, using the message from the custom error, with an error prop of the AuthenticationError
    throw new AuthenticationError('wrong password');
  }
});
*/
//# sourceMappingURL=FetchError.js.map