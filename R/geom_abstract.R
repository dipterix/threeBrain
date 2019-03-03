# Layers:
# - 0, 2, 3: Especially reserved for main camera
# - 1, Shared by all cameras
# - 4, 5, 6: Reserved for side-cameras
# - 7: reserved for all, system reserved
# - 8: main camera only, system reserved
# - 9 side-cameras 1 only, system reserved
# - 10 side-cameras 2 only, system reserved
# - 11 side-cameras 3 only, system reserved
# - 12 all side-cameras, system reserved
# - 13~31 invisible

#' @export
GeomGroup <- R6::R6Class(
  classname = 'GeomGroup',
  portable = TRUE,
  public = list(
    name = '',
    layer = NULL,
    position = c(0,0,0),
    group_data = NULL,
    trans_mat = NULL,
    cached_items = NULL,
    cache_env = NULL,
    disable_trans_mat = FALSE,
    cache_name = function(){
      stringr::str_replace_all(self$name, '[^a-zA-Z0-9]', '_')
    },
    set_transform = function(mat = NULL){
      if(!length(mat)){
        self$trans_mat = NULL
      }else{
        stopifnot2(length(mat) == 16 && nrow(mat) == 4, msg = 'mat must be a 4x4 matrix')
        self$trans_mat = mat
      }
    },
    initialize = function(name, layer = 0, position = c(0,0,0)){
      self$name = name

      stopifnot2(all(layer %in% 0:13), msg = 'Layer(s) must be from 0 to 12, use 0 for main camera-only, 1 for all cameras, 13 is invisible.')
      self$layer = layer


      stopifnot2(length(position) == 3, msg = 'position must have length of 3.')
      self$position = position

      self$cache_env = new.env(parent = emptyenv())
    },
    set_group_data = function(name, value, is_cached = FALSE){
      if(is.null(self$group_data)){
        self$group_data = list()
      }
      self$group_data[[name]] = value
      if(is_cached){
        self$cached_items = c(self$cached_items, name)
      }
    },
    get_data = function(key, force_reload = FALSE, ifnotfound = NULL){
      re = self$group_data[[key]]

      if(is.null(re)){
        return(ifnotfound)
      }

      if(is.list(re) && isTRUE(re$is_cache)){
        # this is a cache, load from cache!
        if(!force_reload && exists(key, envir = self$cache_env, inherits = FALSE)){
          # search for already cached repo
          return(self$cache_env[[key]])
        }

        # load cache
        cat2('Loading from cache')
        d = from_json(from_file = re$absolute_path)

        for(nm in names(d)){
          self$cache_env[[nm]] = d[[nm]]
        }

        # This is a very special case which shouldn't happen
        stopifnot2(key %in% names(d), msg = paste0('Cannot find key in the cache - ', key, '. Is the cache file correupted?'))

        return(self$cache_env[[key]])

      }

      return(re)
    },
    to_list = function(){
      if(!is.null(self$trans_mat)){
        trans_mat = as.vector(t(self$trans_mat))
      }else{
        trans_mat = NULL
      }
      list(
        name = self$name,
        layer = unique(as.integer(self$layer)),
        position = as.numeric(self$position),
        group_data = self$group_data,
        trans_mat = trans_mat,
        cached_items = self$cached_items,
        cache_name = self$cache_name(),
        disable_trans_mat = self$disable_trans_mat
      )
    }
  )
)


AbstractGeom <- R6::R6Class(
  classname = 'AbstractGeom',
  portable = TRUE,
  public = list(
    name = '',
    type = 'abstract',
    time_stamp = NULL,
    value = NULL,
    position = c(0,0,0),
    group = NULL,
    clickable = TRUE,
    layer = 0,
    use_cache = FALSE,
    initialize = function(name, position = c(0,0,0), time_stamp = NULL, group = NULL, layer = 0, ...){
      self$name = name
      self$time_stamp = time_stamp
      self$set_position(position)
      self$group = group
      stopifnot2(all(layer %in% 0:13), msg = 'Layer(s) must be from 0 to 13, use 0 for main camera-only, 1 for all cameras, 13 is invisible.')
      self$layer = layer
    },
    set_position = function(...){
      pos = c(...)
      stopifnot2(length(pos) == 3, msg = 'Position must be a length of 3 - X,Y,Z')
      self$position = pos
    },
    set_value = function(value = NULL, time_stamp = NULL){
      .NotYetImplemented()
    },
    to_list = function(){
      group_info = NULL
      if(!is.null(self$group)){
        group_info = list(
          group_name = self$group$name,
          group_layer = self$group$layer,
          group_position = as.numeric(self$group$position)
        )
      }
      list(
        name = self$name,
        type = self$type,
        time_stamp = as.numeric(self$time_stamp),
        position = as.vector(self$position),
        value = as.vector(self$value),
        clickable = self$clickable,
        layer = as.integer(self$layer),
        group = group_info,
        use_cache = self$use_cache
      )
    },
    get_data = function(key = 'value', force_reload = FALSE, ifnotfound = NULL){
      if(!is.null(self[[key]])){
        return(self[[key]])
      }
      if(!is.null(self$group) && is.list(self$group$group_data) && !is.null(self$group$group_data[[key]])){
        return(self$group$get_data(key, force_reload = force_reload, ifnotfound = ifnotfound))
      }
      return(ifnotfound)
    }
  )
)


#' @export
as.list.AbstractGeom <- function(x, ...){
  x$to_list()
}
