#' R6 Class - Generate Geometry from Vertices and Face Indices
#'
#' @name FreeGeom
NULL

#' @export
FreeGeom <- R6::R6Class(
  classname = 'FreeGeom',
  inherit = AbstractGeom,
  public = list(
    cache_file = NULL,

    type = 'free',

    value = NULL,
    time_stamp = NULL,

    clickable = FALSE,

    # for brain surfaces only
    hemisphere = NULL,
    surface_type = NULL,

    subcortical_info = NULL,

    set_value = function(value, colormap, time_stamp = 0, key = colormap$get_key(value)){
      self$value <- as.integer(key)
      self$time_stamp <- time_stamp
    },

    set_value2 = function(value = NULL, time_stamp = 0, name = 'Value',
                         target = '.geometry.attributes.color.array',
                         temporary = FALSE, ...){
      stopifnot2(name != '[None]', msg = 'name cannot be "[None]", it\'s reserved')

      # Check length
      if(length(value) == 0){
        # Delete animation keyframe
        self$keyframes[[name]] <- NULL
        return(invisible())
      }
      value <- as.vector(value)

      kf <- KeyFrame2$new(name = name, value = value, time = time_stamp,
                        dtype = ifelse( isTRUE(is.numeric(value)), 'continuous', 'discrete'),
                        target = '.geometry.attributes.color.array', ...)


      if(length(self$cache_file) && !temporary ){
        cf <- stringr::str_replace(self$cache_file, '\\.json$', paste0('__', name, '.json'))
      } else {
        cf <- tempfile(fileext = '.json')
        if(file.exists(cf)){
          cf <- tempfile(fileext = '.json')
        }
      }

      dname <- sprintf('free_vertex_colors_%s_%s', name, self$name)
      kf$use_cache(path = cf, name = dname, auto_unbox = TRUE)

      re <- list(
        path = cf,
        absolute_path = normalizePath(cf),
        file_name = filename(cf),
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      self$keyframes[[name]] <- kf
      self$group$set_group_data(dname, value = re, is_cached = TRUE)

    },

    set_annotation = function(name, path) {

      abspath <- normalizePath(path, winslash = "/", mustWork = TRUE)
      # # make sure it's fs format
      # if(!endsWith(tolower(abspath), ".annot")) {
      #   stop(filename(abspath), " is not a FreeSurfer annotation file. Please convert it.")
      # }

      hemi <- tolower(self$hemisphere)

      cache <- list(
        path = path,
        absolute_path = abspath,
        file_name = filename(abspath),
        is_new_cache = FALSE,
        is_cache = TRUE,
        hemisphere = hemi,
        is_fs_annot = TRUE
      )

      if( !name %in% self$group$group_data$annotation_list ) {
        self$group$group_data$annotation_list <- c(self$group$group_data$annotation_list, name)
      }

      if(startsWith(hemi, "l")) {
        cache_key <- sprintf("lh_annotation_%s", name)
      } else {
        cache_key <- sprintf("rh_annotation_%s", name)
      }

      self$group$set_group_data(cache_key, value = cache, is_cached = TRUE)

      invisible()

    },

    initialize = function(name, position = c(0,0,0), vertex, face, group,
                          ..., cache_file = NULL){
      # cache_file = '~/rave_data/data_dir/Complete/YAB/rave/viewer/lh_normal.json'


      super$initialize(name, position = position, ...)

      # Must specify a group, vertices and faces will be stored within the group
      self$group <- group

      if(length(cache_file)){
        self$cache_file <- cache_file

        if(missing(vertex) || missing(face)){
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
          stopifnot2(ncol(vertex) == 3, msg = 'vertex must have 3 columns')
          stopifnot2(ncol(face) == 3, msg = 'face must have 3 columns')

          data <- list( vertex = vertex, face = face )
          names(data) <- sprintf(c('free_vertices_%s', 'free_faces_%s'), name)

          re <- json_cache(path = cache_file, data = data)
        }

        group$set_group_data(sprintf('free_vertices_%s', name), value = re, is_cached = TRUE)
        group$set_group_data(sprintf('free_faces_%s', name), value = re, is_cached = TRUE)

      }else{

        stopifnot2(ncol(vertex) == 3, msg = 'vertex must have 3 columns')
        stopifnot2(ncol(face) == 3, msg = 'face must have 3 columns')

        group$set_group_data(sprintf('free_vertices_%s', name), value = vertex)
        group$set_group_data(sprintf('free_faces_%s', name), value = face)


      }

      # self$set_value(
      #   value = get2('value', other_args, ifnotfound = NULL),
      #   time_stamp = get2('time_stamp', other_args, ifnotfound = NULL)
      # )



    },
    to_list = function(){
      re <- super$to_list()
      re$hemisphere <- self$hemisphere
      re$surface_type <- self$surface_type
      re$subcortical_info <- self$subcortical_info
      return( re )
    }
  )
)
