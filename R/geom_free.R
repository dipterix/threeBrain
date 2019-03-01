#' @export
FreeGeom <- R6::R6Class(
  classname = 'FreeGeom',
  inherit = AbstractGeom,
  public = list(

    type = 'free',

    # not yet implemented
    value = NULL,

    set_value = function(...){
      # ignored
    },

    initialize = function(name, position = c(0,0,0), vertex, face, group, ...){

      stopifnot2(ncol(vertex) == 3, msg = 'vertex must have 3 columns')
      stopifnot2(ncol(face) == 3, msg = 'face must have 3 columns')

      super$initialize(name, position = position, ...)

      # Must specify a group, vertices and faces will be stored within the group
      self$group = group
      group$set_group_data(sprintf('free_vertices_%s', name), value = vertex)
      group$set_group_data(sprintf('free_faces_%s', name), value = face)


      self$set_value(
        value = get2('value', other_args, ifnotfound = NULL),
        time_stamp = get2('time_stamp', other_args, ifnotfound = NULL)
      )

    },
    to_list = function(){
      super$to_list()
    }
  )
)
