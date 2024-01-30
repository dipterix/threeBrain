ensure_simple_server <- function(dir = file.path(tempdir(), "threeBrainViewer")) {
  app <- getOption("threeBrain.viewer.app", NULL)
  is_served <- is.list(app) && isTRUE(app$is_threeBrain_viewer_app)
  host <- getOption("threeBrain.viewer.host", "127.0.0.1")
  if( !is_served || !identical(app$host, host) ) {
    if(!dir.exists(dir)) { dir.create(dir) }
    if( is_served ) {
      tryCatch({ app$stop_server() }, error = function(e) {})
    }
    app <- tryCatch({
      port <- getOption("threeBrain.viewer.port", servr::random_port(n = 200))
      app <- servr::httd(host = host, dir = dir, browser = FALSE, port = port)
      app
    }, error = function(e) {
      message("Trying another port.")
      app <- servr::httd(host = host, dir = dir, browser = FALSE)
      app
    })
    app$is_threeBrain_viewer_app <- TRUE
    options("threeBrain.viewer.app" = app)
    options("threeBrain.viewer.port" = app$port)
    options("threeBrain.viewer.host" = app$host)
  }

  # app might be stopped, hence we need to restart if that's true
  server <- get('server', envir = environment(app$start_server))
  is_running <- server$isRunning()
  if( is_running ) {
    # use servr to check if port is available. The server might be shutdown but
    # the flag is still on
    tryCatch({
      servr::random_port(host = host, port = app$port, n = 0)
      is_running <- FALSE
    }, error = function(e) {
    })
  }
  if( !is_running ) {
    # the server has stopped running, start a new server
    app <- tryCatch({
      port <- getOption("threeBrain.viewer.port", servr::random_port(n = 200))
      app <- servr::httd(host = host, dir = dir, browser = FALSE, port = port)
      app
    }, error = function(e) {
      message("Trying another port.")
      app <- servr::httd(host = host, dir = dir, browser = FALSE)
      app
    })
    app$is_threeBrain_viewer_app <- TRUE
    options("threeBrain.viewer.app" = app)
    options("threeBrain.viewer.port" = app$port)
    options("threeBrain.viewer.host" = app$host)
  }

  app
}
