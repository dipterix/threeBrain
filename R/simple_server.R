ensure_simple_server <- function(dir = file.path(tempdir(), "threeBrainViewer")) {
  app <- getOption("threeBrain.viewer.app", NULL)
  if(!is.list(app) || !isTRUE(app$is_threeBrain_viewer_app)) {
    if(!dir.exists(dir)) { dir.create(dir) }
    app <- tryCatch({
      port <- getOption("threeBrain.viewer.port", servr::random_port(n = 200))
      app <- servr::httd(dir = dir, browser = FALSE, port = port)
      app
    }, error = function(e) {
      message("Trying another port.")
      app <- servr::httd(dir = dir, browser = FALSE)
      app
    })
    app$is_threeBrain_viewer_app <- TRUE
    options("threeBrain.viewer.app" = app)
    options("threeBrain.viewer.port" = app$port)
  }

  # app might be stopped, hence we need to restart if that's true
  server <- get('server', envir = environment(app$start_server))
  is_running <- server$isRunning()
  if( is_running ) {
    # use servr to check if port is available. The server might be shutdown but
    # the flag is still on
    tryCatch({
      servr::random_port(port = app$port, n = 0)
      is_running <- FALSE
    }, error = function(e) {
    })
  }
  if( !is_running ) {
    # the server has stopped running, start a new server
    app <- tryCatch({
      port <- getOption("threeBrain.viewer.port", servr::random_port(n = 200))
      app <- servr::httd(dir = dir, browser = FALSE, port = port)
      app
    }, error = function(e) {
      message("Trying another port.")
      app <- servr::httd(dir = dir, browser = FALSE)
      app
    })
    app$is_threeBrain_viewer_app <- TRUE
    options("threeBrain.viewer.app" = app)
    options("threeBrain.viewer.port" = app$port)
  }

  app
}
