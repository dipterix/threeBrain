#' R6 Class - Generate Data Cube Geometry
#'
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
                            half_size = c(128,128,128),
                            group = GeomGroup$new(name = 'default'),
                            position = c(0,0,0),
                            cache_file = NULL, ...){
        super$initialize(name, position = position, ...)
        self$group = group

        if(length(cache_file)){
          if(isTRUE(cache_file)){
            cache_file = tempfile(fileext = '.json')
          }

          if(missing(value)){
            # Use cache file only
            stopifnot2(file.exists(cache_file), msg = 'cache_file does not exist!')

            re = list(
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

            value = as.vector(value)

            data = structure(
              list(value, dim, half_size),
              names = sprintf(c(
                'datacube_value_%s', 'datacube_dim_%s', 'datacube_half_size_%s'
              ), name)
            )

            re = json_cache(path = cache_file, data = data)
          }

          group$set_group_data(sprintf('datacube_value_%s', name), value = re, is_cached = TRUE)
          group$set_group_data(sprintf('datacube_dim_%s', name), value = re, is_cached = TRUE)
          group$set_group_data(sprintf('datacube_half_size_%s', name), value = re, is_cached = TRUE)

        }else{
          stopifnot2(length(value) == prod(dim) && length(dim) == 3,
                     msg = 'length(value) must equals to prod(dim) and dim must have length 3.')

          value = as.vector(value)

          self$group$set_group_data(sprintf('datacube_value_%s', self$name), value)
          self$group$set_group_data(sprintf('datacube_dim_%s', self$name), dim)
          self$group$set_group_data(sprintf('datacube_half_size_%s', self$name), half_size)

        }

        return(invisible())
      },
      # Ususally paricle system has lots of points, it's forced to save to a group
      set_value = function(value = NULL, dim = dim(value),
                           half_size = c(128,128,128)){

        .NotYetImplemented()
        if(length(value) == 0){
          return(invisible())
        }
        stopifnot2(length(value) == prod(dim) && length(dim) == 3,
                   msg = 'length(value) must equals to prod(dim) and dim must have length 3.')


        value = as.vector(value)
        self$group$set_group_data(sprintf('datacube_value_%s', self$name), value)
        self$group$set_group_data(sprintf('datacube_dim_%s', self$name), dim)
        self$group$set_group_data(sprintf('datacube_half_size_%s', self$name), half_size)

        return(invisible())
      },
      to_list = function(){
        re = super$to_list()
        re
      },
      get_data = function(key, force_reload = FALSE, ifnotfound = NULL){
        super$get_data(key = key, force_reload = force_reload, ifnotfound = ifnotfound)
      }
    )
  )
