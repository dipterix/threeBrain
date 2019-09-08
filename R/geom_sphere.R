#' R6 Class - Generate Sphere Geometry
#' @author Zhengjia Wang
#' @name SphereGeom
NULL


#' @export
SphereGeom <- R6::R6Class(
  classname = 'SphereGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'sphere',

    # Sphere object radius
    radius = 5,

    # This controls how many vertices for each sphere, default is 42 (10 * (6-2) + 2)
    width_segments = 10,
    height_segments = 6,

    initialize = function(name, position = c(0,0,0), radius = 5, ...){
      super$initialize(name, position = position, ...)

      self$radius = radius
      other_args = list(...)

      self$width_segments = get2('width_segments', other_args, ifnotfound = 10)
      self$height_segments = get2('height_segments', other_args, ifnotfound = 6)

      self$set_value(
        value = get2('value', other_args, ifnotfound = NULL),
        time_stamp = get2('time_stamp', other_args, ifnotfound = NULL),
        name = get2('name', other_args, ifnotfound = 'default')
      )

    },
    to_list = function(){
      c(
        super$to_list(),
        list(
          radius = self$radius,
          width_segments = self$width_segments,
          height_segments = self$height_segments
        )
      )
    }
  )
)
