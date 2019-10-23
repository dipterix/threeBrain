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

    # not yet implemented
    value = NULL,

    clickable = FALSE,

    # for brain surfaces only
    hemisphere = NULL,
    surface_type = NULL,

    set_value = function(value = NULL, time_stamp = 0, name = 'Value',
                         target = '.geometry.attributes.color.array', ...){
      stopifnot2(name != '[No Color]', msg = 'name cannot be "[No Color]", it\'s reserved')

      # Check length
      if(length(value) == 0){
        # Delete animation keyframe
        self$keyframes[[name]] = NULL
        return(invisible())
      }
      value = as.vector(value)

      kf = KeyFrame2$new(name = name, value = value, time = time_stamp,
                        dtype = ifelse( isTRUE(is.numeric(value)), 'continuous', 'discrete'),
                        target = '.geometry.attributes.color.array', ...)


      if(length(self$cache_file)){
        cf = stringr::str_replace(self$cache_file, '\\.json$', paste0('__', name, '.json'))
      }

      dname = sprintf('free_vertex_colors_%s_%s', name, self$name)
      kf$use_cache(path = cf, name = dname)

      re = list(
        path = cf,
        absolute_path = normalizePath(cf),
        file_name = filename(cf),
        is_new_cache = FALSE,
        is_cache = TRUE
      )
      self$keyframes[[name]] = kf
      self$group$set_group_data(dname, value = re, is_cached = TRUE)

    },

    initialize = function(name, position = c(0,0,0), vertex, face, group,
                          ..., cache_file = NULL){
      # cache_file = '~/rave_data/data_dir/Complete/YAB/rave/viewer/lh_normal.json'


      super$initialize(name, position = position, ...)

      # Must specify a group, vertices and faces will be stored within the group
      self$group = group

      if(length(cache_file)){
        self$cache_file = cache_file

        if(missing(vertex) || missing(face)){
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
          stopifnot2(ncol(vertex) == 3, msg = 'vertex must have 3 columns')
          stopifnot2(ncol(face) == 3, msg = 'face must have 3 columns')

          data = list( vertex = vertex, face = face )
          names(data) = sprintf(c('free_vertices_%s', 'free_faces_%s'), name)

          re = json_cache(path = cache_file, data = data)
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
      re = super$to_list()
      re$hemisphere = self$hemisphere
      re$surface_type = self$surface_type
      return( re )
    }
  )
)
