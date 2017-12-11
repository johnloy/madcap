# madcap
A crazy useful JS error handling toolkit

Catch errors at these points, and throw custom errors
    Before app initialization (likely a syntax error)
    On app bootstrap (can possibly get information from the app)
    On component renders
        Reason: network call
    On user actions (label as a action failure, because of [[reason]])
        Reason: route change
        Reason: network call
        Reason: storage retreival
    Offline event
    In Service Workers?
    Trying to access client storage

Shuttle all errors up to these points for identification, then use window.onerror for handling
Component errors should be recovered from before propagating