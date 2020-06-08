ViewerProxy <- R6::R6Class(
  portable = TRUE,
  cloneable = FALSE,
  classname = 'ViewerProxy',
  private = list(
    outputId = character(0),
    session = NULL,
    ensure_session = function(){
      if(is.null(private$session)){
        session = shiny::getDefaultReactiveDomain()
        private$session = session
      }
      stopifnot2(!is.null(private$session), msg = 'cannot find shiny reactive session')
    },
    get_value = function(name, default = NULL){
      private$ensure_session()
      re = private$session$input[[paste0(private$outputId, '_', name)]]
      if(is.null(re)){
        re = default
      }
      re
    },
    set_value = function(name, value){
      private$ensure_session()
      message_type = sprintf('threeBrain-RtoJS-%s', private$session$ns(private$outputId))

      private$session$sendCustomMessage(message_type, list(
        name = name,
        value = value
      ))
    }
  ),
  public = list(
    print = function(...){
      cat(c(
        '<threeBrain Viewer Proxy>',
        'Fields are:',
        '  $main_camera        - main camera position, up, and zoom',
        '  $background         - background color in hex code',
        '  $side_display       - whether side canvas is visible',
        '  $surface_type       - surface type (pial, white, ...)',
        '  $display_variable   - data to visualize',
        '  $plane_position     - sagittal, coronal, axial position (RAS)',
        'Methods are:',
        '  $isolate(<field>)   - get fields but avoid shiny reactive events',
        ''
      ), sep = '\n')
    },
    initialize = function(outputId, session = shiny::getDefaultReactiveDomain()){
      private$outputId = outputId
      if(is.null(session)){
        warning('please run proxy in shiny reactive environment.')
      }else{
        private$session = session
      }

    },
    isolate = function(name){
      shiny::isolate(self[[name]])
    },

    get_controllers = function(){
      shiny::isolate(private$get_value('controllers', list()))
    },

    set_controllers = function(ctrl){
      private$set_value('controllers', ctrl)
    },

    set_background = function(col){
      private$set_value('background', dipsaus::col2hexStr(col))
    },

    set_zoom_level = function( zoom ){
      stopifnot2(zoom > 0, msg = 'zoom level must be strictly positive')
      private$set_value('zoom_level', zoom)
    },

    set_camera = function(position, up){
      dis = sqrt(sum(position^2))
      stopifnot2(dis > 0, msg = 'camera position cannot be at origin')
      position = position / dis
      if(missing(up)){
        up = c(0,0,1)
      }
      private$set_value('camera', list(
        position = position * 500,
        up = up
      ))
    },

    set_display_data = function(variable = '', range = NULL){
      if(variable == '' && length(range) != 2){ return() }
      private$set_value('display_data', list(
        variable = variable,
        range = sort(as.numeric(range))
      ))
    },

    set_focused_electrode = function( subject_code, electrode ){
      stopifnot2(
        is.character(subject_code) && length(subject_code) == 1
        && length(electrode) == 1,
        msg = 'subject_code must be character and electrode length must be one.'
      )
      private$set_value('focused_electrode', list(
        subject_code = subject_code,
        electrode = as.integer(electrode)
      ))
    },

    set_cex = function( cex = 1 ){
      stopifnot2(cex > 0, msg = 'cex must be positive')
      private$set_value('font_magnification', cex)
    },

    set_values = function( name, target_object, data_type,
                           value, palette = rainbow(64), symmetric = FALSE,
                           time = ifelse(length(value)==1, 0, stop('time must match length with value')),
                           value_range = NULL, time_range = NULL, value_names = NULL,
                           switch_display = FALSE){
      data_type = data_type[[1]]
      stopifnot2(data_type %in% c('continuous', 'discrete'), msg = paste(
        'data_type must be either', sQuote('continuous'), 'or', sQuote('discrete')
      ))

      geom = ElectrodeGeom$new(name = '')
      if(length(time) == 1){
        time = rep(time, length(value))
      }
      geom$set_value(value = value, name = name, time_stamp = time)
      kf = geom$keyframes[[1]]
      l = kf$to_list()
      cmap = ColorMap$new(name = name, symmetric = symmetric, geom)
      cmap$value_type = data_type

      cmap$set_colors(colors = palette)
      cl = cmap$to_list()

      # const clip_name = args.clip_name,
      # mesh_name = args.target,
      # data_type = args.data_type,
      # value = args.value,
      # time = args.time || 0,
      # value_names = args.value_names || [''],
      # value_range = args.value_range || [0,1];
      # time_range = args.time_range || [0,0],
      # color_keys = to_array( args.color_keys ),
      # color_vals = to_array( args.color_vals ),
      # n_levels = args.n_levels,
      # focusui = args.focus || false;


      if(length(value_range) < 2 && data_type == 'continuous'){
        value_range = cl$value_range
      }
      if(symmetric && data_type == 'continuous'){
        value_range = c(-1,1) * max(abs(value_range))
      }

      private$set_value('add_clip', list(
        clip_name = kf$name,
        target = target_object,
        data_type = data_type,
        value = l$value,
        time = l$time,
        value_names = unique(c(value_names, cl$value_names)),
        value_range = range(value_range, na.rm = TRUE),
        time_range = range(cl$time_range, time_range),
        n_levels = length(cl$value_names),
        color_keys = cl$color_keys,
        color_vals = cl$color_vals,
        focusui = switch_display
      ))
    }

  ),
  active = list(
    # canvas background color
    background = function(){
      private$get_value('background', '#FFFFFF')
    },
    # get main camera
    main_camera = function(){
      camera = private$get_value('main_camera', NULL)
      if(!is.list(camera)){ camera = list() }

      # make sure position exists
      if(length(camera$position) != 3){ camera$position = c(500, 0, 0) }

      # make sure up exists
      if(length(camera$up) != 3){ camera$position = c(0, 0, 1) }

      # make sure zoom exists
      if(!length(camera$zoom)){ camera$zoom = 1 }

      camera
    },

    # visibility
    side_display = function(){
      private$get_value('side_display', NULL)
    },

    # side depth
    surface_type = function(){
      private$get_value('surface_type', 'pial')
    },

    # display name
    display_variable = function(){
      private$get_value('clip_name', '[None]')
    },

    plane_position = function(){
      private$ensure_session()
      sagittal_depth = private$get_value('sagittal_depth', 0)
      coronal_depth = private$get_value('coronal_depth', 0)
      axial_depth = private$get_value('axial_depth', 0)
      re = c(sagittal_depth, coronal_depth, axial_depth)
      names(re) = c('R', 'A', 'S')
      re
    },

    mouse_event_double_click = function(){
      private$get_value('mouse_dblclicked', list())
    },

    mouse_event_click = function(){
      private$get_value('mouse_clicked', list())
    },

    controllers = function(){
      private$get_value('controllers', list())
    },

    sync = function(){
      private$get_value('sync', '')
    }

  )
)

#' Shiny Proxy for Viewer
#' @param outputId shiny output ID
#' @param session shiny session, default is current session (see \code{\link[shiny]{getDefaultReactiveDomain}})
#' @return \code{R6} class \code{ViewerProxy}
#' @export
brain_proxy <- function(outputId, session = shiny::getDefaultReactiveDomain()){
  ViewerProxy$new(outputId, session)
}


