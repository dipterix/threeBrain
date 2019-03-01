#' @export
ParticleGeom <- R6::R6Class(
    classname = 'ParticleGeom',
    inherit = AbstractGeom,
    public = list(

      type = 'particle',

      clickable = FALSE,

      # The data can be stored in group!
      paricle_location = NULL,

      # This is special, values will be the same rows as location
      paricle_value = NULL,

      paricle_location_cube = FALSE,

      # Ususally paricle system has lots of points, it's recommended to save to a group
      set_value = function(value = NULL, location = NULL, is_cube = FALSE, to_group = TRUE){
        if(length(value) == 0 || length(location) == 0){
          return(invisible())
        }

        stopifnot2(length(value) <= 64^3, msg = 'Sorry, we do not support a value length greater than 2^18 (or a cube greater than 64 x 64 x 64)')

        if(is_cube){
          stopifnot2(is.array(value), msg = 'value must be a cube (is_cube = true)')
          stopifnot2(is.list(location) && length(location) == 3, msg = 'location must be a list of 3 vectors list(x=,y=,z=...)')
          d = dim(value)
          stopifnot2(length(d) == 3, msg = 'value must be a 3 mode array (dim(value) != 3)')
          stopifnot2(
            length(location$x) == d[1] &&
              length(location$y) == d[2] &&
              length(location$z) == d[3],
            msg = 'location vector lenths does not match with cube.')

        }else{
          stopifnot2(is.matrix(location), msg = 'location must be a matrix')
          stopifnot2(ncol(location) == 3, msg = 'location must have 3 columns (x,y,z)')
          stopifnot2(nrow(location) == length(value), msg = 'length of value must matches with location rows')
        }



        if(!is.null(self$group)){
          self$group$set_group_data('paricle_location', location)
          self$group$set_group_data('paricle_value', value)
          self$group$set_group_data('paricle_location_cube', is_cube)
        }else{
          self$paricle_location = location
          self$paricle_value = value
        }
        self$paricle_location_cube = is_cube

        return(invisible())
      },

      initialize = function(name, position = c(0,0,0), value = NULL, location = NULL, to_group = TRUE, is_cube = FALSE, ...){
        super$initialize(name, position = position, ...)

        self$set_value(value = value, location = location, to_group = to_group, is_cube = is_cube)

        self$clickable = FALSE
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
      get_data = function(key = 'paricle_value', ifnotfound = NULL){
        if(!is.null(self[[key]])){
          return(self[[key]])
        }
        if(!is.null(self$group) && is.list(self$group$group_data) && !is.null(self$group$group_data[[key]])){
          return(self$group$group_data[[key]])
        }
        return(ifnotfound)
      }
    )
  )
