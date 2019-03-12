PlaneGeom <- R6::R6Class(
  classname = 'PlaneGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'plane',

    clickable = FALSE,

    # this controls the face normal/rotations
    # by default the plane normal is z-axis, if you want x-axis, quaternion = c(0, 1, 0, pi/2)
    quaternion = NULL,

    # Ususally paricle system has lots of points, it's recommended to save to a group
    set_value = function(value = NULL, location = NULL){

    },

    initialize = function(name, position = c(0,0,0), value = NULL, location = NULL, group, ..., cache_file = NULL){
      # cache_file = '~/rave_data/data_dir/Complete/YAB/rave/viewer/lh_normal.json'

      .NotYetImplemented()
      super$initialize(name, position = position, ...)

      # Must specify a group, vertices and faces will be stored within the group
      self$group = group

      if(length(cache_file)){

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
    },
    to_list = function(){
      re = super$to_list()
      re$value = NULL
      re$paricle_location_cube = self$paricle_location_cube
      if(length(self$paricle_location) && length(self$paricle_value)){
        re$paricle_location = self$paricle_location
        re$paricle_value = self$paricle_value
      }
      re
    },
    get_data = function(key = 'paricle_value', force_reload = FALSE, ifnotfound = NULL){
      super$get_data(key = key, force_reload = force_reload, ifnotfound = ifnotfound)
    }
  )
)
