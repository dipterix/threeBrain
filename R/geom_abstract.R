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


#' R6 Class - Generate Group of Geometries
#' @author Zhengjia Wang
#' @name GeomGroup
NULL

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
    cache_path = NULL,
    disable_trans_mat = FALSE,
    parent_group = NULL,
    subject_code = NULL,
    .cache_name = NULL,
    cache_name = function(){
      if(!is.null(self$.cache_name)) {
        return(self$.cache_name)
      }
      stringr::str_replace_all(self$name, '[^a-zA-Z0-9]', '_')
    },
    set_transform = function(mat = NULL){
      if(!length(mat)){
        self$trans_mat <- NULL
      }else{
        stopifnot2(length(mat) == 16 && nrow(mat) == 4, msg = 'mat must be a 4x4 matrix')
        self$trans_mat <- mat
      }
    },
    initialize = function(name, layer = 0, position = c(0,0,0),
                          cache_path = tempfile(), parent = NULL){
      self$name <- name

      stopifnot2(all(layer %in% 0:13), msg = 'Layer(s) must be from 0 to 12, use 0 for main camera-only, 1 for all cameras, 13 is invisible.')
      self$layer <- layer

      if( !is.null(parent) ){
        if(R6::is.R6(parent)){
          parent <- parent$name
        }
        self$parent_group <- parent
      }


      stopifnot2(length(position) == 3, msg = 'position must have length of 3.')
      self$position <- position

      self$cache_env <- new.env(parent = emptyenv())

      self$cache_path <- cache_path
    },
    set_group_data = function(name, value, is_cached = FALSE, cache_if_not_exists = FALSE){
      if(is.null(self$group_data)){
        self$group_data <- list()
      }

      if(cache_if_not_exists && !is_cached){
        dir_create(self$cache_path)
        # cache file path
        path <- file.path(self$cache_path, stringr::str_replace_all(name, '[^\\w.]', '_'))
        if(!file.exists(path)){
          value <- json_cache(path, structure(list(value), names = name))
          is_cached <- TRUE
        }
      }

      self$group_data[[name]] <- value
      if(is_cached){
        self$cached_items <- c(self$cached_items, name)
      }


    },
    get_data = function(key, force_reload = FALSE, ifnotfound = NULL){
      re <- self$group_data[[key]]

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
        d <- from_json(from_file = re$absolute_path)

        for(nm in names(d)){
          self$cache_env[[nm]] <- d[[nm]]
        }

        # This is a very special case which shouldn't happen
        stopifnot2(key %in% names(d), msg = paste0('Cannot find key in the cache - ', key, '. Is the cache file correupted?'))

        return(self$cache_env[[key]])

      }

      return(re)
    },
    to_list = function(){
      if(!is.null(self$trans_mat)){
        trans_mat <- as.vector(t(self$trans_mat))
      }else{
        trans_mat <- NULL
      }
      list(
        name = self$name,
        layer = unique(as.integer(self$layer)),
        position = as.numeric(self$position),
        group_data = self$group_data,
        trans_mat = trans_mat,
        cached_items = self$cached_items,
        cache_name = self$cache_name(),
        disable_trans_mat = self$disable_trans_mat,
        parent_group = self$parent_group,
        subject_code = self$subject_code
      )
    }
  )
)


#' R6 Class - Abstract Class of Geometries
#' @author Zhengjia Wang
#' @name AbstractGeom
NULL

#' @export
AbstractGeom <- R6::R6Class(
  classname = 'AbstractGeom',
  portable = TRUE,
  public = list(
    name = '',
    type = 'abstract',
    render_order = 1,

    # time_stamp and value are deprecated! use keyframe instead
    time_stamp = NULL,
    value = NULL,

    # Animation keyframes
    keyframes = list(),

    position = c(0,0,0),
    trans_mat = NULL,
    disable_trans_mat = FALSE,
    group = NULL,
    clickable = TRUE,
    layer = 0,
    use_cache = FALSE,
    custom_info = '',
    subject_code = NULL,
    initialize = function(name, position = c(0,0,0), group = NULL, layer = 0, trans_mat = NULL, ...){
      self$name <- name
      # self$time_stamp = time_stamp
      self$set_position(position)
      self$group <- group
      stopifnot2(all(layer %in% 0:13), msg = 'Layer(s) must be from 0 to 13, use 0 for main camera-only, 1 for all cameras, 13 is invisible.')
      self$layer <- layer

      if(length(trans_mat) == 16 && is.matrix(trans_mat) && nrow(trans_mat) == 4 && is.numeric(trans_mat)) {
        self$trans_mat <- trans_mat
      }
    },
    set_position = function(...){
      pos <- c(...)
      stopifnot2(length(pos) == 3, msg = 'Position must be a length of 3 - X,Y,Z')
      self$position <- pos
    },
    # set_value = function(value = NULL, time_stamp = NULL){
    #   .NotYetImplemented()
    # },
    set_value = function(value = NULL, time_stamp = NULL, name = 'Value', target = '.material.color', ...){
      stopifnot2(name != '[None]', msg = 'name cannot be "[None]", it\'s reserved')

      # Check length
      if(length(value) > 1){
        stopifnot2(length(value) == length(time_stamp), msg = 'Please specify time stamp for each color. They should share the same length.')
      }else{
        if(length(value) == 0){
          # Delete animation keyframe
          self$keyframes[[name]] <- NULL
          return(invisible())
        }else if (length(time_stamp) != 1){
          time_stamp <- 0
        }
      }

      is_na <- is.na(value)
      if (all(is_na)) {
        self$keyframes[[name]] <- NULL
        return(invisible())
      } else {
        value <- value[!is_na]
        time_stamp <- time_stamp[!is_na]
      }

      kf <- KeyFrame$new(name = name, value = value, time = time_stamp,
                        dtype = ifelse( isTRUE(is.numeric(unlist(value))), 'continuous', 'discrete'),
                        target = '.material.color', ...)

      self$keyframes[[name]] <- kf

    },
    to_list = function(){
      group_info <- NULL
      subject_code <- self$subject_code
      if(!is.null(self$group)){
        group_info <- list(
          group_name = self$group$name,
          group_layer = self$group$layer,
          group_position = as.numeric(self$group$position)
        )
        if(is.null( subject_code )){
          subject_code <- self$group$subject_code
        }
      }

      if(length(self$trans_mat) == 16L) {
        trans_mat <- as.vector(t(self$trans_mat))
      } else {
        trans_mat <- NULL
      }


      list(
        name = self$name,
        type = self$type,
        render_order = self$render_order,
        time_stamp = as.numeric(self$time_stamp),
        position = as.vector(self$position),
        trans_mat = trans_mat,
        disable_trans_mat = self$disable_trans_mat,
        value = as.vector(self$value),
        clickable = self$clickable,
        layer = as.integer(self$layer),
        group = group_info,
        use_cache = self$use_cache,
        custom_info = self$custom_info,
        subject_code = subject_code,
        keyframes = sapply(self$keyframes, function(kf){ kf$to_list() }, USE.NAMES = TRUE, simplify = FALSE)
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
    },
    animation_time_range = function( ani_name ){
      kf <- self$keyframes[[ ani_name ]]
      if(length(kf)){
        return(kf$time_range)
      }
      return(NULL)
    },
    animation_value_range = function( ani_name ){
      kf <- self$keyframes[[ ani_name ]]
      if(length(kf) && kf$is_continuous){
        return(as.numeric(kf$value_range))
      }
      return(NULL)
    },
    animation_value_names = function( ani_name ){
      kf <- self$keyframes[[ ani_name ]]
      if(length(kf) && !kf$is_continuous){
        return(kf$value_names)
      }
      return(NULL)
    }
  ),
  active = list(
    animation_types = function(){
      names(self$keyframes)
    }
  )
)


#' @export
as.list.AbstractGeom <- function(x, ...){
  x$to_list()
}
