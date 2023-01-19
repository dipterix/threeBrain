
#' @export
print.threejs_brain <- function (x, ..., view = NULL, browser = getOption("browser", utils::browseURL)) {

  # wrap up files as html object
  html <- htmltools::as.tags(x, standalone = TRUE)

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

  if(!file.exists(file.path(www_dir, "favicon.ico"))) {
    file.copy(
      from = system.file("favicon.ico", package = "threeBrain"),
      to = file.path(www_dir, "favicon.ico")
    )
  }

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
