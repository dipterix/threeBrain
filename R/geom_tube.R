#' R6 Class - Generate Tube Geometry
#' @description
#' Tube geometry that sweeps a circular cross-section along a curved path
#' defined by control points.  Used to render electrode shafts and tract
#' trajectories in the three-brain viewer.
#' @author Zhengjia Wang
#' @name TubeGeom
NULL


#' @export
TubeGeom <- R6::R6Class(
  classname = "TubeGeom",
  inherit = AbstractGeom,
  public = list(

    #' @field type Geometry type string (\code{"tube"}).
    type = "tube",

    # n segments along circle
    #' @field radial_segments Number of segments around the tube circumference.
    radial_segments = 10,
    #' @field tubular_segments Number of segments along the tube path.
    tubular_segments = 100,

    # control points: rows = x y z t radius, columns = points
    # t = 0 -> target; t = 1 -> entry
    #' @field control_data Flattened numeric vector (row-major) of control
    #'   points; each row encodes \code{x}, \code{y}, \code{z}, \code{t}
    #'   (normalized path position 0-1), and \code{radius}.
    control_data = NULL,

    # texture
    #' @field image_uri Base64 data URI of the tube texture image, or
    #'   \code{NULL} for a plain color.
    image_uri = NULL,

    #' @description
    #' Create a new tube geometry.
    #' @param name Unique character name.
    #' @param control_data Numeric matrix with 5 columns: \code{x}, \code{y},
    #'   \code{z}, \code{t} (path position), \code{radius}.  Must have at
    #'   least 2 rows.
    #' @param image_uri Optional base64 data URI string for a texture image.
    #' @param ... Additional arguments forwarded to \code{AbstractGeom}.
    initialize = function(name, control_data, image_uri = NULL, ...) {
      super$initialize(name, position = c(0, 0, 0), ...)

      other_args <- list(...)

      self$radial_segments <- get2("radial_segments", other_args, ifnotfound = 10)
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
      dif <- v[-1] - v[-length(v)]
      dif <- dif[ dif > 0.002 ]
      if (length(dif)) {
        if ( length(v) > 100 ) {
          self$tubular_segments <- 500
        } else {
          self$tubular_segments <- length(v)
        }
      } else {
        self$tubular_segments <- min(ceiling(1 / min(dif)), 500)
      }
      if ( self$tubular_segments < 2 ) {
        self$tubular_segments <- 2
      }
    },

    #' @description Serialize the tube geometry to a named list for JSON
    #'   export.
    to_list = function() {
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
