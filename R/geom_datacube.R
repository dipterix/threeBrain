#' R6 Class - Generate Data Cube Geometry
#' @author Zhengjia Wang
#' @name DataCubeGeom
NULL

#' @export
DataCubeGeom <- R6::R6Class(
  classname = 'DataCubeGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'datacube',
    clickable = FALSE,
    initialize = function(name, value, dim = dim(value),
                          group = GeomGroup$new(name = 'default'),
                          position = c(0,0,0),
                          cache_file = NULL,
                          layer = 13, digest = TRUE, ...){
      super$initialize(name, position = position, layer = layer, ...)
      self$group <- group

      if(length(self$trans_mat) == 16L) {
        trans_mat <- as.vector(t(self$trans_mat))
      } else {
        trans_mat <- NULL
      }


      if(length(cache_file)){
        if(isTRUE(cache_file)){
          cache_file <- tempfile(fileext = '.json')
        }

        if(missing(value)){
          # Use cache file only
          stopifnot2(file.exists(cache_file), msg = 'cache_file does not exist!')

          re <- list(
            path = cache_file,
            absolute_path = normalizePath(cache_file),
            file_name = filename(cache_file),
            is_new_cache = FALSE,
            is_cache = TRUE
          )

        }else{

          # Still need to check data
          stopifnot2(
            length(value) == prod(dim) && length(dim) == 3,
            msg = 'length(value) must equals to prod(dim) and dim must have length 3.')

          value <- as.vector(value)

          data <- structure(
            list(value, dim, trans_mat),
            names = sprintf(c(
              'datacube_value_%s', 'datacube_dim_%s',
              'datacube_trans_mat_%s'
            ), name)
          )

          re <- json_cache(path = cache_file, data = data, digest = digest)
        }

        group$set_group_data(sprintf('datacube_value_%s', name), value = re, is_cached = TRUE)
        group$set_group_data(sprintf('datacube_dim_%s', name), value = re, is_cached = TRUE)
        group$set_group_data(sprintf('datacube_trans_mat_%s', name), value = re, is_cached = TRUE)

      }else{
        stopifnot2(length(value) == prod(dim) && length(dim) == 3,
                   msg = 'length(value) must equals to prod(dim) and dim must have length 3.')

        value <- as.vector(value)

        self$group$set_group_data(sprintf('datacube_value_%s', self$name), value)
        self$group$set_group_data(sprintf('datacube_dim_%s', self$name), dim)
        self$group$set_group_data(sprintf('datacube_trans_mat_%s', self$name), trans_mat)

      }

      return(invisible())
    },
    # Ususally paricle system has lots of points, it's forced to save to a group
    set_value = function(value = NULL, dim = dim(value)){

      .NotYetImplemented()
      if(length(value) == 0){
        return(invisible())
      }
      stopifnot2(length(value) == prod(dim) && length(dim) == 3,
                 msg = 'length(value) must equals to prod(dim) and dim must have length 3.')


      value <- as.vector(value)
      self$group$set_group_data(sprintf('datacube_value_%s', self$name), value)
      self$group$set_group_data(sprintf('datacube_dim_%s', self$name), dim)

      return(invisible())
    },
    to_list = function(){
      re <- super$to_list()
      re$isDataCube <- TRUE
      re
    },
    get_data = function(key, force_reload = FALSE, ifnotfound = NULL){
      super$get_data(key = key, force_reload = force_reload, ifnotfound = ifnotfound)
    }
  )
)


VolumeGeom <- R6::R6Class(
  classname = "VolumeGeom",
  inherit = AbstractGeom,
  public = list(
    type = 'datacube',
    clickable = FALSE,
    threshold = 10,
    color_format = "RedFormat",
    color_map = NULL,
    initialize = function(
      name, path, mask = NULL,
      group = GeomGroup$new(name = 'default'), layer = 13,
      color_format = c("RedFormat", "RGBAFormat"), ...){

      color_format <- match.arg(color_format)
      abspath <- normalizePath(path, mustWork = TRUE)
      super$initialize(name, position = c(0, 0, 0), layer = layer, ...)
      self$group <- group

      volume_data <- list(
        path = path,
        absolute_path = abspath,
        file_name = filename(abspath),
        is_nifti = TRUE,
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      group$set_group_data("volume_data", value = volume_data, is_cached = TRUE)
      self$color_format <- color_format

      if(length(mask) == 1 && !is.na(mask) && file.exists(mask)) {
        volume_mask <- list(
          path = mask,
          absolute_path = normalizePath(mask, mustWork = TRUE),
          file_name = filename(mask),
          is_nifti = TRUE,
          is_new_cache = FALSE,
          is_cache = TRUE
        )
        group$set_group_data("volume_mask", value = volume_mask, is_cached = TRUE)
      }

    },

    to_list = function(){
      re <- super$to_list()
      re$isDataCube <- TRUE
      re$isVolumeCube <- TRUE
      re$threshold <- self$threshold
      # re$color_format <- self$color_format
      re
    }
  ),
  active = list(
    is_datacube = function(){ TRUE },
    is_volumecube = function(){ TRUE }
  )
)

