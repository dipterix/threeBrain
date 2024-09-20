to_html <- function(x, standalone = TRUE, title = "YAEL 3D Brain", knitrOptions = list(), ...) {
  # DIPSAUS DEBUG START
  # x <- threeBrain::merge_brain()$plot()
  # standalone <- TRUE
  # knitrOptions <- list()
  knitrOptions <- as.list(knitrOptions)
  if(length(knitrOptions$out.width)) {
    x$width <- knitrOptions$out.width
  }
  if(length(knitrOptions$out.height)) {
    x$height <- knitrOptions$out.height
  }

  # Random ID to avoid conflict assets
  rand_id <- rand_string(length = 10)

  x$x$settings$cache_folder <- sprintf("#%s/", rand_id)
  # selfcontained = FALSE to save all data information
  tmp_dir <- tempdir(check = TRUE)
  wdir <- tempfile(tmpdir = tmp_dir)
  dir_create(wdir)
  on.exit({unlink(wdir, recursive = TRUE)})

  htmlwidgets::saveWidget(
    x,
    file = file.path(wdir, "_tmp.html"),
    selfcontained = FALSE,
    title = title,
    libdir = "_lib"
  )

  content <- dipsaus::fastqueue2()
  datapath_root <- file.path(wdir, "_lib", 'threebrain_data-0/')
  data_files <- list.files(datapath_root, all.files = FALSE, full.names = FALSE, recursive = TRUE, include.dirs = FALSE)

  # Make sure the parent path exists
  if(length(data_files)) {
    DATAURI_MAX <- floor(65529 / 73 * 54) #72 / 4 * 3
    lapply(data_files, function(data_file) {
      data_abspath <- file.path(datapath_root, data_file)

      data_file <- gsub("[\\\\/]+", "/", x = data_file)
      data_file <- gsub("^[/]+", "", data_file)
      if(endsWith(data_file, "json")) {
        datauri_type <- 'application/json'
      } else {
        datauri_type <- 'application/octet-stream'
      }

      fsize0 <- file.size(data_abspath)
      fsize <- fsize0
      fin <- file(data_abspath, open = "rb")
      ii <- 0
      while(fsize > 0) {
        raws <- readBin(con = fin, what = "raw", n = min(fsize, DATAURI_MAX))
        content$madd(
          sprintf(
            "<script type='text/plain;charset=UTF-8' data-for='#%s/%s' data-partition='%d' data-type='%s' data-size='%.0f' data-start='%.0f' data-parition-size='%.0f'>",
            rand_id, data_file, ii, datauri_type, fsize0, fsize0 - fsize, length(raws)
          ),
          jsonlite::base64_enc(input = raws),
          "</script>"
        )
        fsize <- fsize - length(raws)
        ii <- ii + 1
      }
      close(fin)
    })
  }
  if( content$size() > 0 ) {
    content <- htmltools::HTML(do.call("paste0", content$as_list()))
  } else {
    content <- ""
  }

  widget_tag <- htmltools::as.tags(x, standalone = standalone)
  viewer_tag <- htmltools::as.tags(list(content, widget_tag))

  cls <- class(viewer_tag)
  if(inherits(x, "suppress_viewer")) {
    cls <- c("suppress_viewer", cls)
  }
  class(viewer_tag) <- c("threebrain_to_html", cls)
  viewer_tag
}

#' @export
print.threebrain_to_html <- function(x, ..., viewer = getOption("viewer", utils::browseURL)) {
  # if(inherits(x, "suppress_viewer")) {
  #   viewer <- utils::browseURL
  # }
  htmltools::html_print(x, ..., viewer = viewer)
  invisible(x)
}

#' @export
knit_print.threejs_brain <- function(x, ..., options = NULL) {
  knitr::knit_print(to_html(x, standalone = TRUE, knitrOptions = options),
                    options = options, ...)
}

#' @export
print.threejs_brain <- function (x, ..., embed = NA, viewer = getOption("viewer", utils::browseURL)) {

  if( identical(get_os(), "emscripten") ) {
    # this is in WASM, use save_brain
    digest_string <- dipsaus::digest(x)
    tmp_file <- file.path(tempdir(check = TRUE), sprintf("threeBrain-wasm-%s.html", digest_string))
    save_brain(x, tmp_file, as_zip = FALSE)

    tmp_file <- normalizePath(tmp_file, mustWork = "/")

    # You will have this package when running in WebAssembly.
    webr <- asNamespace("webr")
    webr$eval_js(
      paste0(
        "chan.write({",
        "  type: 'browse',",
        "  data: { url: '", tmp_file, "' },",
        "});"
        # "chan.write({",
        # "  type: 'pager',",
        # "  data: {",
        # "    path: '", tmp_file, "',",
        # "    header: '',",
        # "    title: 'RAVE 3D Viewer', ",
        # "    deleteFile: true,",
        # "  },",
        # "});"
      )
    )

  } else {
    tmp_dir <- tempdir(check = TRUE)

    if(is.na(embed)) {
      embed <- !inherits(x, "suppress_viewer")
    }

    if( embed ) {
      print(to_html(x), viewer = viewer)
    } else {
      # wrap up files as html object
      html <- htmltools::as.tags(x, standalone = TRUE)
      # prepare widget
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

      app <- ensure_simple_server( www_dir )
      url <- gsub("/$", "", app$url)
      url <- sprintf("%s/%s", url, index_name)
      utils::browseURL( url )
    }
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
