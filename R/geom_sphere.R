#' R6 Class - Generate Sphere Geometry
#'
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

    # will be used to calculate Color of sphere, can be a single value or a vector (timestamp)
    value = NULL,

    set_value = function(value = NULL, time_stamp = NULL){

      # Check length
      if(length(value) > 1){
        stopifnot2(length(value) == length(time_stamp), msg = 'Please specify time stamp for each color. They should share the same length.')
      }else{
        if(length(value) == 0){
          time_stamp = NULL
          value = NULL
        }else if (length(time_stamp) != 1){
          time_stamp = 0
        }
      }

      stopifnot2(length(time_stamp) == 0 || is.numeric(time_stamp),
                msg = 'time_stamp must be numerical values.')

      self$value = value

      self$time_stamp = time_stamp
    },

    initialize = function(name, position = c(0,0,0), radius = 5, ...){
      super$initialize(name, position = position, ...)

      self$radius = radius
      other_args = list(...)

      self$width_segments = get2('width_segments', other_args, ifnotfound = 10)
      self$height_segments = get2('height_segments', other_args, ifnotfound = 6)

      self$set_value(
        value = get2('value', other_args, ifnotfound = NULL),
        time_stamp = get2('time_stamp', other_args, ifnotfound = NULL)
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
