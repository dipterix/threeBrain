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
  if( !server$isRunning() ) {
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

#' @export
print.threejs_brain <- function (x, ..., view = NULL, browser = getOption("browser", utils::browseURL)) {

  # wrap up files as html object
  html <- htmltools::as.tags(x, standalone = FALSE)

  # prepare widget
  tmp_dir <- tempdir()
  www_dir <- file.path(tmp_dir, "threeBrainViewer")
  if( !dir.exists(www_dir) ) {
    dir.create(www_dir, showWarnings = FALSE, recursive = FALSE)
  }
  index_name <- x$x$data_filename
  index_name <- gsub("^config", replacement = "index", index_name)
  index_name <- gsub("json$", "html", index_name)
  index_html <- file.path(www_dir, index_name)

  htmltools::save_html(html, file = index_html, background = "white", libdir = "lib")

  if( is.null(view) ) {
    app <- ensure_simple_server( www_dir )
    url <- gsub("/$", "", app$url)
    url <- sprintf("%s/%s", url, index_name)
    if(is.function(browser)) {
      browser( url )
    }
  } else {
    view( index_html )
  }
  invisible(x)
}


.onUnload <- function(libPath) {
  tryCatch({
    app <- getOption("threeBrain.viewer.app", NULL)
    if(is.list(app) && isTRUE(app$is_threeBrain_viewer_app)) {
      app$stop_server()
    }
  }, error = function(...){})
}
