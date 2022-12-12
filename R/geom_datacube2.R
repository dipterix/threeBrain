#' R6 Class - Generate Data Cube Geometry via 3D Volume Texture
#' @author Zhengjia Wang
#' @name DataCubeGeom2
NULL

#' @export
DataCubeGeom2 <- R6::R6Class(
  classname = 'DataCubeGeom2',
  inherit = DataCubeGeom,
  public = list(

    type = 'datacube2',

    threshold = 0.6,

    color_format = "RGBAFormat",

    initialize = function(name, value, dim = dim(value),
                          half_size = c(128,128,128),
                          group = GeomGroup$new(name = 'default'),
                          position = c( 0, 0, 0),
                          color_format = c("RGBAFormat", "AlphaFormat"),
                          cache_file = NULL,
                          layer = 8, digest = TRUE, ...){
      # Make sure value is from 0 to 255
      if(missing(value)){
        super$initialize(name = name, dim = dim, half_size = half_size,
                         group = group, position = position,
                         cache_file = cache_file,
                         layer = layer, digest = digest, ...)
      } else {
        value <- as.integer(value)
        super$initialize(name = name, value = value, dim = dim, half_size = half_size,
                         group = group, position = position,
                         cache_file = cache_file,
                         layer = layer, digest = digest, ...)
      }

      color_format <- match.arg(color_format)
      self$color_format <- color_format

    },

    to_list = function(){
      re <- super$to_list()
      c(
        re,
        list(
          threshold = self$threshold,
          color_format = self$color_format
        )
      )
    }
  )
)
