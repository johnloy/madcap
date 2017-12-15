Web apps. What could go wrong?

A lot, it turns out. It might not be overstating matters to claim that web apps operate in the most hostile of all runtime environments.

These are just some of the high-level actors and factors that need to work in concert for error-free execution:

- User interaction
- Browsers (User Agents)
- Client operating systems
- Client device hardware
- HTML
- Javascript
- CSS
- Servers
- Server operating systems
- Server hardware
- Network
- HTTP

And these are some of the imperatives on which they're expected to collectively deliver
- fast
- secure
- low bandwidth consumption
- low memory utilization
- low processor utilization
- low battery consumption
- cross-platform client compatibility
- progressive enhancement and graceful degradatiokn
- graceful failure

Fall short of this, and chances are high that a user somewhere will think the app has a bug.

Good luck. It might be a good idea to prepare for some failure.

How many web app developers do it, and how effectively?

Not a lot, it turns out.

There's a gaping void in the canon of best practices for writing web apps. Precious little information is available on the web and in literature about error handling best practices.

The value of an error
- Types 
    - development mistake (includes architects, programmers, and QA)
    - runtime dependency failure
    - user misdirection
- The difference between an error and an exception
- Differences of approach in development, testing, and production
- Contract programming
    - preconditions, postconditions, and invariants
- Totally avoidable errors
    - TypeError
- The promised land
    - Full context snapshot
    - Error session playback
Native JavaScript Error
- Types of errors and exceptions present in the browser environment
- Subclassing native Error constructor
- Effectively using stack traces
- Error.captureStackTrace
- function names
- async stack traces
- cross-browser
- minified code
Detecting an exception
When to throw an exception
Try-catch
Catching errors in promise chains
- async/await
Serialization of errors for transmission and logging
Error monitoring services
Addressable errors: https://rauchg.com/2016/addressable-errors
Handling exceptions with assets load failures
- script loading
- script errors
    - Script Error
- stylesheet loading
- stylesheet errors
- image loading
- image errors
- fonts