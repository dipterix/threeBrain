BrainSurface <- R6::R6Class(
  classname = 'brain-surface',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = '',

    # std.141 or fs
    mesh_type = 'fs',

    # which surface type pial, white, inflated ...
    surface_type = 'pial',

    # to store freemesh objects, left, right, in sequential
    left_hemisphere = NULL,
    right_hemisphere = NULL,

    group = NULL,

    set_subject_code = function( subject_code ){
      if( self$has_hemispheres ){

        self$left_hemisphere$subject_code <- subject_code
        self$right_hemisphere$subject_code <- subject_code
        self$group$subject_code <- subject_code

        if( self$mesh_type == 'std.141' ){
          self$left_hemisphere$name <- sprintf("Standard 141 Left Hemisphere - %s (%s)",
                                               self$surface_type, subject_code)
          self$right_hemisphere$name <- sprintf("Standard 141 Right Hemisphere - %s (%s)",
                                                self$surface_type, subject_code)
        }else{
          self$left_hemisphere$name <- sprintf("FreeSurfer Left Hemisphere - %s (%s)",
                                               self$surface_type, subject_code)
          self$right_hemisphere$name <- sprintf("FreeSurfer Right Hemisphere - %s (%s)",
                                                self$surface_type, subject_code)
        }

        self$group$name <- sprintf("Surface - %s (%s)", self$surface_type, subject_code)

      }

      self$subject_code <- subject_code
    },

    set_group_position = function(...){
      pos <- c(...)
      stopifnot2(is.numeric(pos) && length(pos) == 3, msg = "Position must be numeric of length 3")
      self$group$position <- pos
    },

    initialize = function(
      subject_code, surface_type, mesh_type, left_hemisphere, right_hemisphere,
      position = NULL
    ){

      # right now only supports std.141 and fs mesh_type
      stopifnot2(mesh_type %in% c('std.141', 'fs'),
                 msg = 'We only support standard 141 brain or FreeSurfer brain')

      left_hemisphere$hemisphere <- 'left'
      left_hemisphere$surface_type <- surface_type
      self$left_hemisphere <- left_hemisphere

      right_hemisphere$hemisphere <- 'right'
      right_hemisphere$surface_type <- surface_type
      self$right_hemisphere <- right_hemisphere

      if( !identical(left_hemisphere$group,right_hemisphere$group) ){
        for( nm in names( right_hemisphere$group$group_data ) ){
          left_hemisphere$group$group_data[[ nm ]] <- right_hemisphere$group$group_data[[ nm ]]
        }
        right_hemisphere$group <- left_hemisphere$group
      }
      self$group <- left_hemisphere$group
      self$surface_type <- surface_type
      self$mesh_type <- mesh_type

      self$set_subject_code( subject_code )


      # position is set for group
      if( length(position) == 3 ){
        self$set_group_position( position )
      }
    },

    print = function( ... ){

      cat('Subject\t\t:', self$subject_code, end = '\n')
      cat('Surface type\t:', self$surface_type, end = '\n')
      cat('Mesh type\t:', self$mesh_type, end = '\n')

      if( !self$has_hemispheres ){
        warning('No hemisphere found!')
      }

      invisible( self )
    }

  ),
  active = list(
    has_hemispheres = function(){
      valid <- c(FALSE, FALSE)
      if( !is.null(self$left_hemisphere) &&
          R6::is.R6(self$left_hemisphere) &&
          'FreeGeom' %in% class(self$left_hemisphere)){
        valid[1] <- TRUE
      }
      if( !is.null(self$right_hemisphere) &&
          R6::is.R6(self$right_hemisphere) &&
          'FreeGeom' %in% class(self$right_hemisphere)){
        valid[2] <- TRUE
      }

      return(all(valid))
    }
  )
)

