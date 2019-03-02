#' Create a Threejs Brain
#' @import htmlwidgets
#' @export
threejs_brain <- function(
  ..., time_range = NULL, value_range = NULL, symmetric = 0,
  side_camera = FALSE, control_panel = TRUE, control_presets = NULL, camera_center = c(0,0,30),
  color_ramp = c('navyblue', '#e2e2e2', 'red'), n_color = 100,
  show_legend = TRUE, legend_title = 'Value', legend_expr, at = NULL,
  tmp_dirname = NULL,
  width = NULL, height = NULL,
  .list = list()){

  stopifnot2(length(camera_center) == 3 && is.numeric(camera_center), msg = 'camera_center must be a numeric vector of 3')

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
  dependencies = htmltools::htmlDependency(
    name = 'threebrain_data',
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
    }
    if(time_range[2] == time_range[1]){
      time_range[2] = time_range[1] + 1
    }
  }else{
    time_range = range(time_range)
  }

  # Extract value range
  if(length(value_range) < 2){
    value_range = unlist(lapply(geoms, '[[', 'value'))
    if(length(value_range) != 0){
      value_range = range(value_range)
    }else{
      show_legend = FALSE
      value_range = c(-1,1) + symmetric
    }
    if(value_range[2] == value_range[1]){
      show_legend = FALSE
      value_range = c(-1,1) + symmetric
    }
  }else{
    value_range = range(value_range)
  }

  if(!length(at)){
    at = pretty(value_range)
    at[at > value_range[2]] = value_range[2]
    at[at < value_range[1]] = value_range[1]
    at = unique(at)
  }

  # generate color ramp
  if(!is.function(color_ramp)){
    color_ramp = grDevices::colorRampPalette(color_ramp)
  }

  hex_colors = color_ramp(n_color)

  colors = gsub('^#', '0x', hex_colors)
  colors = cbind(seq(0, 1, length.out = length(colors)), colors)

  color_scale = (n_color-1) / (value_range[2] - value_range[1]);
  color_shift = value_range[1];

  # generate color map from R and pass it as image
  legend_file = tempfile(fileext = '.png')
  png(legend_file, units = 'px', width = 300, height = 150)
  par(mar = c(4.1, 1.1, 3.1, 1.1), bg=NA)
  if(missing(legend_expr)){
    z = seq_len(n_color)
    image(
      x = seq(value_range[1], value_range[2], length.out = n_color),
      y = c(0,1),
      z = cbind(z, z),
      col = hex_colors,
      xlab = '', ylab = '', main = legend_title, asp = 0.1,
      axes=F)

    axis(1, at, at, pos = -1)
  }else{
    legend_expr = substitute(legend_expr)
    parent_frame = parent.frame()
    eval(legend_expr, envir = parent_frame)
  }
  dev.off()

  legend_img = data_uri(file = legend_file)



  # Generate settings
  settings = list(
    side_camera = side_camera,
    time_range = time_range,
    value_range = value_range,
    hide_controls = !control_panel,
    control_center = as.vector(camera_center),
    colors = colors,
    color_scale = color_scale, # color_index = floor((value - color_shift) * color_scale)
    color_shift = color_shift,
    show_legend = show_legend,
    legend_at = at,
    legend_img = legend_img,
    control_presets = control_presets
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
      defaultWidth = '100%',browser.external = TRUE,
      defaultHeight = '100vh',
      viewer.paneHeight = 500,
      viewer.suppress = TRUE,
      viewer.fill = TRUE,
      padding = '0px',
    ), dependencies = dependencies)
}



#' @export
threejsBrainOutput <- function(outputId, width = '100%', height = '500px'){
  htmlwidgets::shinyWidgetOutput(outputId, "threejs_brain", width, height, package = "threeBrain")
}


#' @export
renderBrain <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) }
  htmlwidgets::shinyRenderWidget(expr, threejsBrainOutput, env, quoted = TRUE)
}
