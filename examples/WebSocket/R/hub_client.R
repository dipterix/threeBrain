# A small controller for the threeBrain hub. Packages: websocket, jsonlite, later.
#
#   source("hub_client.R")
#   hub <- hub_connect()                 # passkey from THREEBRAIN_PASSKEY, else "17285"
#   viewer <- hub$viewers()[[1]]$id      # "v1", ...
#   hub$command(viewer, "background", "#000000")
#   hub$close()
#
# Values are sent as JSON with jsonlite::toJSON(auto_unbox = TRUE): a length-1
# vector becomes a scalar, so wrap it in I() when the viewer expects an array.

hub_connect <- function(passkey = Sys.getenv("THREEBRAIN_PASSKEY", "17285"),
                        name = "R", timeout = 10) {
  parts <- strsplit(trimws(passkey), ".", fixed = TRUE)[[1]]
  port <- suppressWarnings(as.integer(parts[1]))
  key <- if (length(parts) > 1) parts[2] else NULL
  if (is.na(port)) stop("Invalid passkey \"", passkey, "\": expected \"17285\" or \"17285.KEY\"")

  state <- new.env()
  state$replies <- list()
  state$listeners <- list()
  state$counter <- 0L

  socket <- websocket::WebSocket$new(sprintf("ws://127.0.0.1:%d/", port), autoConnect = FALSE)
  socket$onOpen(function(event) {
    hello <- list(type = "hello", protocol = 1L, role = "controller", name = name)
    if (!is.null(key)) hello$key <- key
    socket$send(jsonlite::toJSON(hello, auto_unbox = TRUE))
  })
  socket$onMessage(function(event) {
    message <- jsonlite::fromJSON(event$data, simplifyVector = FALSE)
    if (identical(message$type, "welcome")) {
      state$welcome <- message
    } else if (identical(message$type, "result")) {
      state$replies[[message$id]] <- message
    } else if (identical(message$type, "event")) {
      for (listener in state$listeners) listener(message)
    }
  })
  socket$onClose(function(event) state$closed <- event$code)
  socket$onError(function(event) state$error <- event$message)
  socket$connect()

  # R reads the socket only while it waits: this runs the event loop until
  # `done()` is TRUE or `timeout` seconds have passed
  wait <- function(done, timeout) {
    deadline <- Sys.time() + timeout
    while (!done() && Sys.time() < deadline) later::run_now(0.05)
    done()
  }

  wait(function() !is.null(state$welcome) || !is.null(state$closed) || !is.null(state$error), timeout)
  if (is.null(state$welcome)) {
    why <- if (identical(state$closed, 4401L)) "wrong or missing key"
           else if (!is.null(state$error)) state$error
           else "no answer (is the hub running?)"
    stop(sprintf("Cannot join the hub on 127.0.0.1:%d: %s", port, why), call. = FALSE)
  }

  request <- function(message, timeout = 30) {
    state$counter <- state$counter + 1L
    id <- paste0("r", state$counter)
    message$id <- id
    socket$send(jsonlite::toJSON(message, auto_unbox = TRUE, null = "null", digits = NA))
    if (!wait(function() !is.null(state$replies[[id]]), timeout)) {
      stop("No answer from the hub to \"", message$type, "\"", call. = FALSE)
    }
    reply <- state$replies[[id]]
    state$replies[[id]] <- NULL
    if (!isTRUE(reply$ok)) {
      stop(sprintf("%s: %s", reply$error$code, reply$error$message), call. = FALSE)
    }
    reply$value
  }

  list(
    port = port,
    # the viewers connected to the hub: id, title, subjects, origin, ...
    viewers = function() request(list(type = "list")),
    # runs one viewer command; returns its result invisibly
    command = function(viewer, name, value = NULL, timeout = 30) {
      invisible(request(list(type = "command", target = viewer, name = name, value = value), timeout))
    },
    # calls `callback(event)` for viewer events with these names ("*" = all);
    # events arrive while the hub client waits, e.g. in listen()
    subscribe = function(names = "*", callback) {
      state$listeners[[length(state$listeners) + 1]] <- callback
      request(list(type = "subscribe", targets = "*", names = if (identical(names, "*")) "*" else I(names)))
    },
    # handles incoming events for `seconds` (Inf: until interrupted)
    listen = function(seconds = Inf) invisible(wait(function() FALSE, seconds)),
    request = request,
    close = function() socket$close()
  )
}
