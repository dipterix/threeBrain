#' Create a Threejs Brain
#' @param ...,.list geometries inherit from AbstractGeom
#' @param widget_id unique identifier for the widget. Use it when you have
#'   multiple widgets in one website (shiny for example)
#' @param time_range used to calculate animation time (not yet implemented)
#' @param value_range used to generate colors
#' @param symmetric default 0, color center will be mapped to this value
#' @param side_camera enable side cameras to view objects from fixed perspective
#' @param control_panel enable control panels for the widget
#' @param control_presets presets to be shown in control panels
#' @param camera_center position where camera should focus at
#' @param camera_pos XYZ position of camera
#' @param start_zoom numeric, positive number indicating start zoom level
#' @param color_ramp used to generate color ramps
#' @param color_type 'continuous' or 'discrete'
#' @param n_color how many colors in the color ramp (used by continuous legend)
#' @param color_names color names (used by discrete legend)
#' @param show_legend show legend in control panel?
#' @param legend_title legend title
#' @param tmp_dirname internally used
#' @param token used to identify widgets in JS localStorage
#' @param debug internally used for debugging
#' @param optionals internally used
#' @param width,height width and height of the widget. By default width="100%",
#'   and height varies.
#' @param coords \code{NULL} to hide coordinates or numeric vector of three.
#' @param browser_external use system default browser (default) or builtin one.
#' @export
threejs_brain <- function(
  ..., widget_id = 'threebrain_data', time_range = NULL,
  value_range = NULL, symmetric = 0, side_camera = FALSE,
  control_panel = TRUE, control_presets = NULL, camera_center = c(0,0,0),
  camera_pos = c(0,0,500), start_zoom = 1,
  color_ramp = c('navyblue', '#e2e2e2', 'red'), color_type = 'continuous',
  n_color = 64,
  color_names = seq_along(color_ramp),
  show_legend = TRUE, legend_title = 'Value',
  tmp_dirname = NULL, width = NULL, height = NULL, optionals = list(),
  debug = FALSE, token = NULL, coords = NULL,
  browser_external = FALSE,
  .list = list()){

  stopifnot2(length(camera_center) == 3 && is.numeric(camera_center), msg = 'camera_center must be a numeric vector of 3')
  stopifnot2(length(coords) == 0 || (length(coords) == 3 && is.numeric(coords)), msg = 'corrds must be NULL or a vector length of 3')
  stopifnot2(length(camera_pos) == 3 && is.numeric(camera_pos) && sum(abs(camera_pos)) > 0, msg = 'camera_pos must be a vector length of 3 and cannot be origin')


  # Create element list
  geoms = c(list(...), .list)
  groups = unique(lapply(geoms, '[[', 'group'))
  groups = groups[!vapply(groups, is.null, FUN.VALUE = FALSE)]

  # Check elements
  geoms = lapply(geoms, function(g){ g$to_list() })

  # Check cached json files
  if(length(tmp_dirname) != 1){
    tmp_dirname = paste(sample(c(letters, LETTERS, 0:9), 10), collapse = '')
  }
  tmp_dir = file.path(tempdir(), 'threebrain_cache', tmp_dirname)
  dir.create(tmp_dir, recursive = TRUE, showWarnings = FALSE)

  lapply(groups, function(g){
    if(length(g$cached_items)){
      dir.create(file.path(tmp_dir, g$cache_name()), recursive = TRUE, showWarnings = FALSE)
      for(f in g$cached_items){
        re = g$group_data[[f]]
        file.copy(re$absolute_path, to = file.path(tmp_dir, g$cache_name(), re$file_name))
      }
    }
  })

  # This is a tricky part, if the widget is created from shiny, there might be multiple instance running and we cannot have any cross talk
  # TODO: Need to think on how to resolve conflicts.
  widget_id = stringr::str_replace_all(widget_id, '[^a-zA-Z0-9]', '_')

  dependencies = htmltools::htmlDependency(
    name = widget_id,
    version = '0',
    src = tmp_dir,
    all_files = TRUE
  )

  # Get groups
  groups = lapply(groups, function(g){ g$to_list() })


  # Extract timestamp
  if(length(time_range) < 2){
    time_range = unlist(lapply(geoms, '[[', 'time_stamp'))
    if(length(time_range) != 0){
      time_range = range(time_range)
    }else{
      time_range = c(0,1)
      show_legend = FALSE
    }
    if(time_range[2] == time_range[1]){
      time_range[2] = time_range[1] + 1
    }
  }else{
    time_range = range(time_range)
  }

  # Extract value range
  v_count = unlist(lapply(geoms, function(g){ length(g$value )}))
  if(length(v_count)){
    v_count = max(v_count)
  }else{
    v_count = 0
  }
  if(length(value_range) < 2){
    value_ranges = unlist(lapply(geoms, '[[', 'value'))
    if(length(value_range) != 0){
      value_range = range(value_range)
    }else{
      value_range = c(-1,1) + symmetric
    }
    if(value_range[2] == value_range[1]){
      value_range = c(-1,1) + symmetric
    }
  }else{
    value_range = range(value_range)
  }

  # generate color ramp
  if(color_type == 'continuous'){
    if(!is.function(color_ramp)){
      color_ramp = grDevices::colorRampPalette(color_ramp)
    }
    n_color = 2^ceiling(log2(n_color))
    hex_colors = color_ramp(n_color)
  }else{

    stopifnot2(length(color_names) == length(color_ramp), msg = 'In discrete mode, color_names must be specified and its length must equals to color_ramp')
    stopifnot2(!is.function(color_ramp), msg = 'In discrete mode, color_ramp must be a vector')

    n_color = length(color_ramp) * 10
    n_color = 2^ceiling(log2(n_color))
    value_range = c(1, length(color_ramp))

    color_ramp = grDevices::colorRampPalette(color_ramp)
    hex_colors = color_ramp(n_color)

  }

  colors = gsub('^#', '0x', hex_colors)
  colors = cbind(seq(0, 1, length.out = length(colors)), colors)

  color_scale = (n_color-1) / (value_range[2] - value_range[1]);
  color_shift = value_range[1];


  if(is.null(shiny::getDefaultReactiveDomain())){
    lib_path = 'lib/'
  }else{
    lib_path = ''
    if(is.null(token)){
      session = shiny::getDefaultReactiveDomain()
      token = session$userData$rave_id
    }
  }



  # Generate settings
  settings = list(
    side_camera = side_camera,
    time_range = time_range,
    value_range = value_range,
    hide_controls = !control_panel,
    control_center = as.vector(camera_center),
    camera_pos = camera_pos,
    start_zoom = ifelse(start_zoom > 0, start_zoom, 1),
    colors = colors,
    color_scale = color_scale, # color_index = floor((value - color_shift) * color_scale)
    color_shift = color_shift,
    color_type = color_type,
    color_names = color_names,
    show_legend = show_legend,
    control_presets = control_presets,
    cache_folder = paste0(lib_path, widget_id, '-0/'),
    optionals = optionals,
    debug = debug,
    has_animation = v_count > 1,
    token = token,
    coords = coords
  )

  # Generate external file
  # sapply(names(external_files) , function(nm){
  #   data_uri(file = external_files[[nm]]);
  # }, simplify = F, USE.NAMES = T)


  x = list(
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
#' @name threejsBrainOutput
#' @param outputId unique identifier for the widget
#' @param width,height width and height of the widget. By default width="100%",
#'   and height="500px".
NULL

#' @export
threejsBrainOutput <- function(outputId, width = '100%', height = '500px'){
  htmlwidgets::shinyWidgetOutput(outputId, "threejs_brain", width, height, package = "threeBrain")
}


#' Shiny Renderer for threeBrain Widgets
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
  dir.create(directory, showWarnings = F, recursive = T)
  cat2('Generating 3D Viewer...')

  # Need to save json data to datapath. Must be a relative path
  dir.create(file.path(directory, datapath), recursive = TRUE, showWarnings = FALSE)
  dir.create(file.path(directory, assetpath), recursive = TRUE, showWarnings = FALSE)
  datapath = stringr::str_replace_all(datapath, '[/]{0}$', '/')
  datapath = stringr::str_replace_all(datapath, '[/\\\\]+', '/')
  datapath = stringr::str_replace_all(datapath, '^/', '')

  assetpath = stringr::str_replace_all(assetpath, '[/]{0}$', '/')
  assetpath = stringr::str_replace_all(assetpath, '[/\\\\]+', '/')
  assetpath = stringr::str_replace_all(assetpath, '^/', '')

  widget$x$settings$cache_folder = datapath
  htmlwidgets::saveWidget(
    widget,
    file = file.path(directory, filename),
    selfcontained = F,
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

  s = c(
    '#!/bin/bash',
    'DIRECTORY=`dirname $0`',
    'cd $DIRECTORY',
    "Rscript -e '{if(system.file(\"\",package=\"servr\")==\"\"){install.packages(\"servr\",repos=\"https://cloud.r-project.org\")};servr::httd(browser=TRUE)}'"
  )
  sh_file = file.path(directory, 'launch.sh')
  writeLines(s, sh_file)
  sh_file = normalizePath(sh_file)
  system(sprintf('chmod a+x "%s"', sh_file), wait = F)

  sh_file = file.path(directory, 'launch.command')
  writeLines(s, sh_file)
  sh_file = normalizePath(sh_file)
  system(sprintf('chmod a+x "%s"', sh_file), wait = F)

  if(as_zip){
    wd = getwd()
    on.exit({
      setwd(wd)
    })
    setwd(directory)
    directory = normalizePath(directory)
    zipfile = 'compressed.zip'
    utils::zip(zipfile, files = c('./lib', filename, 'launch.sh', 'launch.command'))
  }
  directory = normalizePath(directory, mustWork = F)
  return(structure(list(
    directory = directory,
    index = file.path(directory, filename),
    zipfile = file.path(directory, 'compressed.zip'),
    has_zip = as_zip
  ), class = 'threeBrain_saved'))

}


#' @export
print.threeBrain_saved <- function(x, ...){

  index = x$index

  grey_col = crayon::make_style('grey60')
  green_col = crayon::make_style('#1d9f34')
  red_col = crayon::make_style('#ec942c')

  if(!file.exists(index)){
    warning('Cannot find index file at: ', index)
    return(invisible())
  }
  s = paste(readLines(index), collapse = '\n')
  s = stringr::str_replace_all(s, '\\n', '')

  m = stringr::str_match(s, '<head(.*?)</head>')
  if(length(m)){
    m = m[1,2]
    css = unlist(stringr::str_extract_all(m, '<link[^>]*>'))
    js = unlist(stringr::str_extract_all(m, '<script[^>]*></script>'))
  }else{
    css = NULL
    js = NULL
  }

  cat(grey_col('<!---------- Instructions to Embed 3D viewer in your own websites --------->\n'))

  cat(grey_col('\n<!-- Step 1: In HTML header (<head>...</head>), add the following lines -->\n'))
  headers = c(css, js)
  if(length(headers)){
    cat(green_col(headers), sep = '\n')
  }

  json = stringr::str_match(s, '<script type="application/json" data-for=[^>]*>(.*)</script>')
  if(length(json)){
    json = json[1,2]
  }else{
    json = NULL
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
