#' R6 Class - Generate Tube Geometry
#' @author Zhengjia Wang
#' @name TubeGeom
NULL


#' @export
TubeGeom <- R6::R6Class(
  classname = 'TubeGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'tube',

    # render after electrodes
    render_order = 2,


    # js code: gen = threeBrain_GEOMETRY_FACTORY.tube2;
    # g = {'paths' : ['YAB, 14 - G14', 'YAB, 15 - G15'], 'group' : {'group_name' : 'Electrodes (YAB)'}, 'name' : 'test'};
    # inst = gen(g, canvas); inst.finish_init(); inst.set_layer(2); inst.object.visible=true

    # Sphere object radius
    radius = 0.4,

    # n segments along tube
    tubular_segments = 3,

    # n segments along circle
    radial_segments = 6,

    # whether to close the tube
    is_closed = FALSE,

    # character or geometry
    starts = NULL,
    ends = NULL,


    initialize = function(name, position = c(0,0,0), radius = 0.4, ...){
      super$initialize(name, position = position, ...)

      self$radius <- radius
      other_args <- list(...)

      self$tubular_segments <- get2('tubular_segments', other_args, ifnotfound = 3)
      self$radial_segments <- get2('radial_segments', other_args, ifnotfound = 6)
      self$is_closed <- get2('is_closed', other_args, ifnotfound = FALSE)

      self$set_value(
        value = get2('value', other_args, ifnotfound = NULL),
        time_stamp = get2('time_stamp', other_args, ifnotfound = NULL),
        name = get2('name', other_args, ifnotfound = 'default')
      )

    },

    set_start = function( start_geom ){
      if(inherits( start_geom, c('character', 'AbstractGeom' ) )){
        self$starts <- start_geom
      } else {
        stop('TubeGeom$set_start accepts only character or threeBrain geometry object.')
      }
    },

    set_end = function( end_geom ){
      if(inherits( end_geom, c('character', 'AbstractGeom' ) )){
        self$ends <- end_geom
      } else {
        stop('TubeGeom$end_geom accepts only character or threeBrain geometry object.')
      }
    },

    to_list = function(){
      end_name <- self$ends
      if( !inherits(end_name, 'character') ){
        end_name <- end_name$name
      }

      start_name <- self$starts
      if( !inherits(start_name, 'character') ){
        start_name <- start_name$name
      }

      c(
        super$to_list(),
        list(
          radius = self$radius,
          tubular_segments = self$tubular_segments,
          radial_segments = self$radial_segments,
          is_closed = self$is_closed,
          paths = c(start_name, end_name)
        )
      )
    }
  )
)
