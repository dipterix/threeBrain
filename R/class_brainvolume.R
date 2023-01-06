
BrainVolume <- R6::R6Class(
  classname = 'brain-volume',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = '',

    # which surface type pial, white, inflated ...
    volume_type = 'T1',

    # to store freemesh objects, left, right, in sequential
    object = NULL,

    group = NULL,

    set_subject_code = function( subject_code ){
      if( self$has_volume ){
        self$object$subject_code <- subject_code
        self$group$subject_code <- subject_code

        self$object$name <- sprintf('%s (%s)', self$volume_type, subject_code)
        self$group$name <- sprintf("Volume - %s (%s)", self$volume_type, subject_code)
      }

      self$subject_code <- subject_code
    },

    set_group_position = function(...){
      pos <- c(...)
      stopifnot2(is.numeric(pos) && length(pos) == 3, msg = "Position must be numeric of length 3")
      self$group$position <- pos
    },

    initialize = function(
      subject_code, volume_type, volume, position = NULL
    ){

      self$object <- volume
      self$group <- volume$group
      self$set_subject_code( subject_code )

      self$volume_type <- volume_type

      # position is set for group
      if( length(position) == 3 ){
        self$set_group_position( position )
      }
    },

    print = function( ... ){

      cat('Subject\t\t:', self$subject_code, end = '\n')
      cat('Volume type\t:', self$volume_type, end = '\n')

      if( !self$has_volume ){
        warning('No volume found!')
      }

      invisible( self )
    }

  ),
  active = list(
    has_volume = function(){
      if( !is.null(self$object) &&
          R6::is.R6(self$object) &&
          any(c('DataCubeGeom', 'NiftiGeom') %in% class(self$object))){
        return(TRUE)
      }

      return(FALSE)
    }
  )
)

