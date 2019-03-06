#' @export
BlankGeom <- R6::R6Class(
  classname = 'BlankGeom',
  inherit = AbstractGeom,
  public = list(
    type = 'blank',
    value = NULL,
    clickable = FALSE,
    set_value = function(...){
    },

    initialize = function(group, name = paste(sample(c(LETTERS, letters, 0:9), 16), collapse = ''), ...){
      super$initialize(name = name, ...)
      self$layer = 31
      self$clickable = FALSE
      self$group = group
    },
    to_list = function(){
      super$to_list()
    }
  )
)
