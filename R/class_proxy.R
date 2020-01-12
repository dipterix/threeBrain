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

    set_cex = function( cex = 1 ){
      stopifnot2(cex > 0, msg = 'cex must be positive')
      private$set_value('font_magnification', cex)
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
      private$get_value('clip_name', '[No Color]')
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


