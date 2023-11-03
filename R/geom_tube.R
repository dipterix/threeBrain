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

    # n segments along circle
    radial_segments = 10,
    tubular_segments = 100,

    # control points: rows = x y z t radius, columns = points
    # t = 0 -> target; t = 1 -> entry
    control_data = NULL,

    # texture
    image_uri = NULL,

    initialize = function(name, control_data, image_uri = NULL, ...){
      super$initialize(name, position = c(0, 0, 0), ...)

      other_args <- list(...)

      self$radial_segments <- get2('radial_segments', other_args, ifnotfound = 10)
      self$image_uri <- image_uri

      control_data <- as.matrix(control_data)
      stopifnot(ncol(control_data) == 5)
      stopifnot(nrow(control_data) >= 2)
      dimnames(control_data) <- NULL

      o <- order(control_data[, 4])
      control_data <- control_data[o, ]
      v <- control_data[, 4]
      v <- (v - min(v)) / (max(v) - min(v))
      control_data[, 4] <- v
      self$control_data <- as.vector(t(control_data))

      v <- v[o]
      dif <- v[-1] - v[ - length(v) ]
      dif <- dif[ dif > 0.002 ]
      if(length(dif)) {
        if( length(v) > 100 ) {
          self$tubular_segments <- 500
        } else {
          self$tubular_segments <- length(v)
        }
      } else {
        self$tubular_segments <- min(ceiling(1 / min(dif)), 500)
      }
      if( self$tubular_segments < 2 ) {
        self$tubular_segments <- 2
      }
    },

    to_list = function(){
      c(
        super$to_list(),
        list(
          radius = self$radius,
          radial_segments = self$radial_segments,
          tubular_segments = self$tubular_segments,
          control_data = self$control_data,
          image_uri = self$image_uri
        )
      )
    }
  )
)
