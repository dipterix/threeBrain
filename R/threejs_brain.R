#' @title Create a Threejs Brain and View it in Browsers
#' @author Zhengjia Wang
#' @param ...,.list geometries inherit from AbstractGeom
#' @param width,height positive integers. Width and height of the widget.
#'   By default width=`100\%`, and height varies.
#' @param background character, background color such as \code{"#FFFFFF"} or \code{"white"}
#' @param cex positive number, relative text magnification level
#' @param default_colormap character, which color map name to display at startup
#' @param palettes named list, names corresponds to color-map names if you want to change color palettes
#' @param value_ranges named list, similar to \code{palettes}, value range for each values
#' @param value_alias named list, legend title for corresponding variable
#' @param show_inactive_electrodes logical, whether to show electrodes with no values
#' @param timestamp logical, whether to show timestamp at the beginning
#' @param side_canvas logical, enable side cameras to view objects from fixed perspective
#' @param side_zoom numerical, if side camera is enabled, zoom-in level, from 1 to 5
#' @param side_width positive integer, side panel size in pixels
#' @param side_shift integer of length two, side panel shift in pixels (`CSS style`: top, left)
#' @param side_display logical, show/hide side panels at beginning
#' @param control_panel logical, enable control panels for the widget
#' @param control_presets characters, presets to be shown in control panels
#' @param control_display logical, whether to expand/collapse control UI at the beginning
#' @param camera_center numerical, length of three, XYZ position where camera should focus at
#' @param camera_pos XYZ position of camera itself, default (0, 0, 500)
#' @param start_zoom numerical, positive number indicating camera zoom level
#' @param coords \code{NULL} to hide coordinates or numeric vector of three.
#' @param symmetric numerical, default 0, color center will be mapped to this value
#' @param tmp_dirname character path, internally used, where to store temporary files
#' @param token unique character, internally used to identify widgets in JS localStorage
#' @param debug logical, internally used for debugging
#' @param controllers list to override the settings, for example \code{proxy$get_controllers()}
#' @param browser_external logical, use system default browser (default) or builtin one.
#' @param global_data,global_files internally use, mainly to store orientation matrices and files.
#' @param widget_id character, internally used as unique identifiers for widgets.
#'   Only use it when you have multiple widgets in one website
#' @export
threejs_brain <- function(
  ..., .list = list(), width = NULL, height = NULL, background = "#FFFFFF",
  cex = 1, timestamp = TRUE,

  # Args for the side panels
  side_canvas = FALSE, side_zoom = 1, side_width = 250, side_shift = c(0, 0),
  side_display = TRUE, # side_background = background,

  # for controls GUI
  control_panel = TRUE, control_presets = NULL, control_display = TRUE,

  # Main camera and scene center
  camera_center = c(0,0,0), camera_pos = c(500,0,0), start_zoom = 1, coords = NULL,

  # For colors and animation
  symmetric = 0, default_colormap = 'Value', palettes = NULL,
  value_ranges = NULL, value_alias = NULL,
  show_inactive_electrodes = TRUE,

  # Builds, additional data, etc (misc)
  widget_id = 'threebrain_data', tmp_dirname = NULL,
  debug = FALSE, token = NULL, controllers = list(),
  browser_external = TRUE, global_data = list(), global_files = list()
){

  stopifnot2(length(camera_center) == 3 && is.numeric(camera_center), msg = 'camera_center must be a numeric vector of 3')
  stopifnot2(length(coords) == 0 || (length(coords) == 3 && is.numeric(coords)), msg = 'corrds must be NULL or a vector length of 3')
  stopifnot2(length(camera_pos) == 3 && is.numeric(camera_pos) && sum(abs(camera_pos)) > 0, msg = 'camera_pos must be a vector length of 3 and cannot be origin')

  # Inject global data
  global_container <- BlankGeom$new(name = '__blank__', group = GeomGroup$new(name = '__global_data'))
  sapply( names(global_data), function(nm){
    global_container$group$set_group_data(
      name = sprintf('__global_data__%s', nm),
      value = global_data[[ nm ]]
    )
  })
  sapply( names(global_files), function(nm){
    file_info <- as.list(global_files[[nm]])
    if(all(c("path", "absolute_path", "file_name", "is_new_cache", "is_cache") %in% names(file_info))){
      global_container$group$set_group_data(
        name = sprintf('__global_data__%s', nm),
        value = file_info,
        is_cached = TRUE,
        cache_if_not_exists = FALSE
      )
    }
  })
  global_container$group$set_group_data(
    name = '__global_data__FreeSurferColorLUT',
    value = list(
      'path' = system.file('FreeSurferColorLUT.json', package = 'threeBrain'),
      'absolute_path' = system.file('FreeSurferColorLUT.json', package = 'threeBrain'),
      'file_name' = 'FreeSurferColorLUT.json',
      'is_new_cache' = FALSE,
      'is_cache' = TRUE
    ),
    is_cached = TRUE,
    cache_if_not_exists = FALSE
  )


  # Create element list
  geoms <- unlist(c(global_container, list(...), .list))
  # Remove illegal geoms
  is_geom <- vapply(geoms, function(x){ R6::is.R6(x) && ('AbstractGeom' %in% class(x)) }, FUN.VALUE = FALSE)
  geoms <- geoms[is_geom]

  groups <- unique(lapply(geoms, '[[', 'group'))
  groups <- groups[!vapply(groups, is.null, FUN.VALUE = FALSE)]

  # get color schema
  animation_types <- unique(unlist( lapply(geoms, function(g){ g$animation_types }) ))
  if(!is.list(palettes)){ palettes <- list() }
  pnames <- names(palettes)
  if(!is.list(value_ranges)){ value_ranges <- list() }

  color_maps <- sapply(animation_types, function(atype){
    c <- ColorMap$new(name = atype, .list = geoms, symmetric = symmetric,
                     alias = value_alias[[atype]])
    if( atype %in% pnames ){
      c$set_colors( palettes[[atype]] )
    }
    if( c$value_type == 'continuous' && length(value_ranges[[atype]]) >= 2 ){
      c$value_range <- value_ranges[[atype]][c(1,2)]
      if( length(value_ranges[[atype]]) >= 4 ){
        c$hard_range <- sort(value_ranges[[atype]][c(3,4)])
      }
    }
    c$to_list()
  }, USE.NAMES = TRUE, simplify = FALSE)

  if( length(animation_types) ){
    if( !length(default_colormap) || !default_colormap %in% animation_types){
      default_colormap <- animation_types[1]
    }
  }else{
    default_colormap <- NULL
  }

  # backgrounds
  background <- dipsaus::col2hexStr(background)
  # side_background = dipsaus::col2hexStr(side_background)



  # Check elements
  geoms <- lapply(geoms, function(g){ g$to_list() })

  # Check lib_path. whether running inside of shiny or standalone
  if(is.null(shiny::getDefaultReactiveDomain())){
    lib_path <- 'lib/'
  }else{
    lib_path <- ''
    if(is.null(token)){
      session <- shiny::getDefaultReactiveDomain()
      token <- session$userData$rave_id
    }

    # If in shiny, token is given or rave_id is given, we use fixed temp path
    # in this way to reduce redundency
    if( !is.null(token) && length(tmp_dirname) != 1 ){
      tmp_dirname <- token
    }
  }

  # Check cached json files
  if(length(tmp_dirname) != 1){
    tmp_dirname <- paste(sample(c(letters, LETTERS, 0:9), 10), collapse = '')
  }
  tmp_dir <- file.path(tempdir(), 'threebrain_cache', tmp_dirname)
  dir_create(tmp_dir)

  lapply(groups, function(g){
    if(length(g$cached_items)){
      dir_create(file.path(tmp_dir, g$cache_name()))
      for(f in g$cached_items){
        re <- g$group_data[[f]]
        file.copy(re$absolute_path, to = file.path(tmp_dir, g$cache_name(), re$file_name))
      }
    }
  })

  # This is a tricky part, if the widget is created from shiny, there might be multiple instance running and we cannot have any cross talk
  # TODO: Need to think on how to resolve conflicts.
  widget_id <- stringr::str_replace_all(widget_id, '[^a-zA-Z0-9]', '_')

  dependencies <- htmltools::htmlDependency(
    name = widget_id,
    version = '0',
    src = tmp_dir,
    all_files = TRUE
  )

  # Get groups
  groups <- lapply(groups, function(g){ g$to_list() })


  # Generate settings
  settings <- list(
    side_camera = side_canvas,
    side_canvas_zoom = side_zoom,
    side_canvas_width = side_width,
    side_canvas_shift = side_shift,
    color_maps = color_maps,
    default_colormap = default_colormap,
    hide_controls = !control_panel,
    control_center = as.vector(camera_center),
    camera_pos = camera_pos,
    font_magnification = ifelse(cex > 0, cex, 1),
    start_zoom = ifelse(start_zoom > 0, start_zoom, 1),
    show_legend = TRUE,
    render_timestamp = isTRUE(timestamp),
    control_presets = control_presets,
    cache_folder = paste0(lib_path, widget_id, '-0/'),
    lib_path = lib_path,
    default_controllers = controllers,
    debug = debug,
    background = background,
    # has_animation = v_count > 1,
    token = token,
    coords = coords,
    show_inactive_electrodes = isTRUE(show_inactive_electrodes),
    side_display = side_display,
    control_display = control_display
  )

  # Generate external file
  # sapply(names(external_files) , function(nm){
  #   data_uri(file = external_files[[nm]]);
  # }, simplify = F, USE.NAMES = T)


  x <- list(
    groups = groups,
    geoms = geoms,
    settings = settings
  )

  attr(x, 'TOJSON_ARGS') <- list(null = 'null', na = 'null')

  htmlwidgets::createWidget(
    name = 'threejs_brain', x = x, width = width, height = height, package = 'threeBrain', sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = '100%',
      browser.external = browser_external,
      defaultHeight = '100vh',
      viewer.paneHeight = 500,
      viewer.suppress = TRUE,
      viewer.fill = TRUE,
      padding = '0px',
    ), dependencies = dependencies)

}

#' Shiny Output for threeBrain Widgets
#' @author Zhengjia Wang
#' @name threejsBrainOutput
#' @param outputId unique identifier for the widget
#' @param width,height width and height of the widget. By default width="100%",
#'   and height="500px".
#' @param reportSize whether to report widget size in shiny
#' \code{session$clientData}
NULL

#' @export
threejsBrainOutput <- function(outputId, width = '100%', height = '500px', reportSize = TRUE){
  htmlwidgets::shinyWidgetOutput(outputId, "threejs_brain", width, height, package = "threeBrain",
                                 reportSize = reportSize, inline = FALSE)
}


#' Shiny Renderer for threeBrain Widgets
#' @author Zhengjia Wang
#' @name renderBrain
#' @param expr R expression that calls three_brain function or Brain object
#' @param env environment of expression to be evaluated
#' @param quoted is expr quoted? Default is false.
NULL


#' @export
renderBrain <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) }
  htmlwidgets::shinyRenderWidget(expr, threejsBrainOutput, env, quoted = TRUE)
}


#' Save threeBrain widgets to local file system
#' @author Zhengjia Wang
#' @param widget generated from function 'threejs_brain'.
#' @param directory directory to save the widget.
#' @param filename default is 'index.html', filename of the widget index file.
#' @param assetpath where to put \code{css} or \code{JavaScript} to,
#' must be relative to \code{directory}.
#' @param datapath where to store data to, must be relative to \code{directory}.
#' @param title widget title.
#' @param as_zip whether to create zip file "compressed.zip".
#' @export
save_brain <- function(widget, directory, filename = 'index.html', assetpath = 'lib/', datapath = 'lib/threebrain_data-0/', title = '3D Viewer', as_zip = FALSE){
  dir_create(directory)
  cat2('Generating 3D Viewer...')

  # Need to save json data to datapath. Must be a relative path
  dir_create(file.path(directory, datapath))
  dir_create(file.path(directory, assetpath))
  datapath <- stringr::str_replace_all(datapath, '[/]{0}$', '/')
  datapath <- stringr::str_replace_all(datapath, '[/\\\\]+', '/')
  datapath <- stringr::str_replace_all(datapath, '^/', '')

  assetpath <- stringr::str_replace_all(assetpath, '[/]{0}$', '/')
  assetpath <- stringr::str_replace_all(assetpath, '[/\\\\]+', '/')
  assetpath <- stringr::str_replace_all(assetpath, '^/', '')

  widget$x$settings$cache_folder <- datapath
  htmlwidgets::saveWidget(
    widget,
    file = file.path(directory, filename),
    selfcontained = FALSE,
    title = title,
    libdir = assetpath
  )

  # Copy data to datapath
  file_move(file.path(directory, assetpath, 'threebrain_data-0/'),
            file.path(directory, datapath))

  # cat2('Copying data...')
  # dependencies = attr(widget, 'threeBrain_dependency')
  # if("html_dependency" %in% class(dependencies)){
  #   lib_name = sprintf('%s-%s', dependencies$name, dependencies$version)
  #   file.copy(dependencies$src$file, file.path(directory, 'lib', lib_name), overwrite = T, recursive = T)
  #   dependencies$
  # }

  # s <- c(
  #   '#!/bin/bash',
  #   'DIRECTORY=`dirname "$0"`',
  #   'cd "$DIRECTORY"',
  #   "Rscript -e '{if(system.file(\"\",package=\"servr\")==\"\"){install.packages(\"servr\",repos=\"https://cloud.r-project.org\")};servr::httd(browser=TRUE)}'"
  # )

  # copy files from inst folder
  cmd_folders <- system.file("commands/", package = "threeBrain")
  fnames <- list.files(cmd_folders, all.files = FALSE, full.names = FALSE, recursive = FALSE)
  for(f in fnames){
    sh_file <- file.path(directory, f)
    file.copy(file.path(cmd_folders, f), sh_file)
    if(!(get_os() == "windows" || endsWith(f, "zip") || endsWith(f, "txt"))){
      system(sprintf('chmod a+x "%s"', normalizePath(sh_file)), wait = FALSE)
    }
  }

  if(as_zip){
    wd <- getwd()
    on.exit({
      setwd(wd)
    })
    setwd(directory)
    directory <- normalizePath(directory)
    zipfile <- 'compressed.zip'
    utils::zip(zipfile, files = c('./lib', filename, 'launch.sh', 'launch.command'))
  }
  directory <- normalizePath(directory, mustWork = FALSE)
  return(structure(list(
    directory = directory,
    index = file.path(directory, filename),
    zipfile = file.path(directory, 'compressed.zip'),
    has_zip = as_zip
  ), class = 'threeBrain_saved'))

}


#' @export
print.threeBrain_saved <- function(x, ...){

  index <- x$index

  grey_col <- crayon::make_style('grey60')
  green_col <- crayon::make_style('#1d9f34')
  red_col <- crayon::make_style('#ec942c')

  if(!file.exists(index)){
    warning('Cannot find index file at: ', index)
    return(invisible())
  }
  s <- paste(readLines(index), collapse = '\n')
  s <- stringr::str_replace_all(s, '\\n', '')

  m <- stringr::str_match(s, '<head(.*?)</head>')
  if(length(m)){
    m <- m[1,2]
    css <- unlist(stringr::str_extract_all(m, '<link[^>]*>'))
    js <- unlist(stringr::str_extract_all(m, '<script[^>]*></script>'))
  }else{
    css <- NULL
    js <- NULL
  }

  cat(grey_col('<!---------- Instructions to Embed 3D viewer in your own websites --------->\n'))

  cat(grey_col('\n<!-- Step 1: In HTML header (<head>...</head>), add the following lines -->\n'))
  headers <- c(css, js)
  if(length(headers)){
    cat(green_col(headers), sep = '\n')
  }

  json <- stringr::str_match(s, '<script type="application/json" data-for=[^>]*>(.*)</script>')
  if(length(json)){
    json <- json[1,2]
  }else{
    json <- NULL
  }


  cat(grey_col('\n<!-- Step 2: In HTML body tags where you want to insert widget into, \n\tcopy-paste the following lines. Please change the highlighted parts. \n\tYour "YOUR-WIDGET-ID" Must be unique across the whole document  -->\n'))

  cat(
    green_col('<div id="htmlwidget_container">\n\t<div id="'),
    red_col('YOUR-WIDGET-ID'),
    green_col('" style="'),
    red_col('width:100%;height:100vh;'),
    green_col('" class="threejs_brain html-widget">\n\t</div>\n</div>'),
    '\n',
    sep = ''
  )

  cat(grey_col('\n<!-- Step 3: At the end of HTML (before </html>), insert the data script\n\tMake sure "YOUR-WIDGET-ID" matches with the previous step. -->\n'))

  cat(green_col('<script type="application/json" data-for="'),
      red_col('YOUR-WIDGET-ID'),
      green_col('">'),
      green_col(json),
      green_col('</script>'),
      '\n',
      sep = '')

  cat(grey_col('<!---------- End of Instructions --------->\n'))


  invisible(x)
}
