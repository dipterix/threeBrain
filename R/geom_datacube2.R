#' R6 Class - Generate Data Cube Geometry via 3D Volume Texture
#' @description
#' Volumetric data cube geometry rendered via a 3D texture lookup.
#' Extends \code{DataCubeGeom} with four-channel color map support and opacity
#' thresholding.
#' @author Zhengjia Wang
#' @name DataCubeGeom2
NULL

#' @export
DataCubeGeom2 <- R6::R6Class(
  classname = "DataCubeGeom2",
  inherit = DataCubeGeom,
  public = list(

    #' @field type Geometry type string (\code{"datacube2"}).
    type = "datacube2",
    #' @field clickable Logical; always \code{FALSE} for volume geometry.
    clickable = FALSE,
    #' @field threshold Opacity threshold: voxel values below this level are
    #'   rendered as transparent.  Default \code{0.6}.
    threshold = 0.6,
    #' @field color_format WebGL texture format string; either
    #'   \code{"RGBAFormat"} or \code{"RedFormat"}.
    color_format = "RGBAFormat",
    #' @field color_map Named list describing the four-channel color map applied
    #'   to the volume, or \code{NULL}.
    color_map = NULL,

    # if trans_mat is specified, the matrix transfers `trans_space_from` to tkrRAS
    # default is to "model, alternatively `scannerRAS`
    #' @field trans_space_from Coordinate space of the input data before
    #'   applying the transformation matrix; either \code{"model"} (default)
    #'   or \code{"scannerRAS"}.
    trans_space_from = "model",

    #' @description
    #' Create a new data cube geometry using a 3D texture.
    #' @param name Unique character name.
    #' @param value Integer vector of voxel values (0-255).
    #' @param dim Integer vector of length 3: dimensions of the volume.
    #' @param half_size Numeric vector of length 3: half-extents of the
    #'   bounding box in world-space units.  Default \code{c(128, 128, 128)}.
    #' @param group \code{GeomGroup} used to store the voxel data.
    #' @param position Numeric vector of length 3: geometry origin.
    #' @param color_format WebGL texture format: \code{"RGBAFormat"} (default)
    #'   or \code{"RedFormat"}.
    #' @param cache_file Path to a JSON cache file, \code{TRUE} for a
    #'   temporary file, or \code{NULL} to keep data in memory.
    #' @param layer Camera layer.  Default \code{8} (main camera only).
    #' @param digest Logical; compute a content digest for cache validation.
    #' @param ... Additional arguments forwarded to \code{DataCubeGeom}.
    initialize = function(name, value, dim = dim(value),
                          half_size = c(128, 128, 128),
                          group = GeomGroup$new(name = "default"),
                          position = c( 0, 0, 0),
                          color_format = c("RGBAFormat", "RedFormat"),
                          cache_file = NULL,
                          layer = 8, digest = TRUE, ...) {
      # Make sure value is from 0 to 255
      if (missing(value)) {
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

    #' @description Serialize the texture data cube geometry to a named list
    #'   for JSON export, adding \code{threshold}, \code{color_format},
    #'   \code{color_map}, \code{isDataCube2}, and \code{trans_space_from}.
    to_list = function() {
      re <- super$to_list()
      re$threshold <- self$threshold
      re$color_format <- self$color_format
      re$color_map <- self$color_map
      re$isDataCube2 <- self$is_datacube2
      re$trans_space_from <- self$trans_space_from
      re
    }
  ),
  active = list(
    #' @field is_datacube2 Logical flag; always \code{TRUE} for
    #'   \code{DataCubeGeom2} instances.
    is_datacube2 = function() { TRUE }
  )
)

VolumeGeom2 <- R6::R6Class(
  classname = "VolumeGeom2",
  inherit = AbstractGeom,
  public = list(
    type = "datacube2",
    clickable = FALSE,
    threshold = 0.6,
    color_format = "RGBAFormat",
    color_map = NULL,
    trans_space_from = "model",
    initialize = function(
      name, path, group = GeomGroup$new(name = "default"), layer = 8,
      color_format = c("RGBAFormat", "RedFormat"), ...) {

      color_format <- match.arg(color_format)
      abspath <- normalizePath(path, mustWork = TRUE)
      super$initialize(name, position = c(0, 0, 0), layer = layer, ...)
      self$group <- group

      re <- list(
        path = path,
        absolute_path = abspath,
        file_name = filename(abspath),
        is_nifti = TRUE,
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      group$set_group_data("volume_data", value = re, is_cached = TRUE)
      self$color_format <- color_format

    },

    to_list = function() {
      re <- super$to_list()
      re$threshold <- self$threshold
      re$color_format <- self$color_format
      re$isDataCube2 <- self$is_datacube2
      re$isVolumeCube2 <- self$is_volumecube2
      re$color_map <- self$color_map
      re$trans_space_from <- self$trans_space_from
      re
    }
  ),
  active = list(
    is_datacube2 = function() { TRUE },
    is_volumecube2 = function() { TRUE }
  )
)
