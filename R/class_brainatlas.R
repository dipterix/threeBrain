
BrainAtlas <- R6::R6Class(
  classname = 'brain-atlas',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = '',

    # which atlas type to visualize
    # 'aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg'
    atlas_type = 'aparc+aseg',

    # to store freemesh objects, left, right, in sequential
    object = NULL,

    group = NULL,

    set_subject_code = function( subject_code ){
      if( self$has_atlas ){
        self$object$subject_code <- subject_code
        self$group$subject_code <- subject_code

        self$object$name <- sprintf('Atlas - %s (%s)', self$atlas_type, subject_code)
        self$group$name <- sprintf('Atlas - %s (%s)', self$atlas_type, subject_code)
      }

      self$subject_code <- subject_code
    },

    set_group_position = function(...){
      pos <- c(...)
      stopifnot2(is.numeric(pos) && length(pos) == 3, msg = "Position must be numeric of length 3")
      self$group$position <- pos
    },

    initialize = function(
      subject_code, atlas_type, atlas, position = NULL
    ){

      self$object <- atlas
      self$group <- atlas$group
      self$set_subject_code( subject_code )

      self$atlas_type <- atlas_type

      # position is set for group
      if( length(position) == 3 ){
        self$set_group_position( position )
      }
    },

    print = function( ... ){

      cat('Subject\t\t:', self$subject_code, end = '\n')
      cat('Atlas type\t:', self$atlas_type, end = '\n')

      if( !self$has_atlas ){
        warning('No atlas found!')
      }

      invisible( self )
    }

  ),
  active = list(
    has_atlas = function(){
      if( !is.null(self$object) &&
          R6::is.R6(self$object) &&
          'DataCubeGeom2' %in% class(self$object)){
        return(TRUE)
      }

      return(FALSE)
    }
  )
)

