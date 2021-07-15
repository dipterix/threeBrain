
BrainAtlas <- R6::R6Class(
  classname = 'brain-atlas',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = '',

    # which atlas type to visualize
    # 'aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg'
    atlas_type = 'aparc_aseg',

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

      self$atlas_type <- stringr::str_replace_all(atlas_type, '[\\W]', '_')

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

#' @export
add_voxel_cube <- function(brain, name, cube){
  re <- brain
  if("multi-rave-brain" %in% class(brain)){
    brain <- brain$template_object
  }
  subject <- brain$subject_code
  nm <- sprintf("Atlas - %s (%s)", name, subject)
  group <- GeomGroup$new(name = nm)
  group$subject_code <- subject

  geom <- DataCubeGeom2$new(
    name = nm, dim = dim(cube),
    half_size = c(128,128,128), group = group,
    position = c(0,0,0), value = cube)
  geom$subject_code <- subject

  obj <- threeBrain:::BrainAtlas$new(
    subject_code = subject, atlas_type = name,
    atlas = geom, position = c(0, 0, 0 ))

  brain$add_atlas( atlas = obj )
  invisible(re)
}

#' @export
create_voxel_cube <- function(mni_ras, value, colormap,
                       keys = colormap$get_key(value),
                       dimension = c(256,256,256)){
  stopifnot2(length(dimension) == 3, msg = "`voxel_cube`: dimension length must be 3")
  stopifnot2(max(abs(mni_ras)) < 128, msg = "`voxel_cube`: mni_ras should range from -127 to 127")
  stopifnot2(nrow(mni_ras) == length(keys), msg = "`voxel_cube`: data value must be consistent with MNI RAS")
  if(!is.matrix(mni_ras)){
    mni_ras <- as.matrix(mni_ras)
  }
  mni_ras <- mni_ras + 128

  cube <- array(0L, dimension)
  ratio = dimension / c(256, 256, 256)
  for(i in seq_len(nrow(mni_ras))){
    tmp <- round((mni_ras[i,]) * ratio)
    if(cube[tmp[1], tmp[2], tmp[3]] == 0){
      cube[tmp[1], tmp[2], tmp[3]] <- keys[[i]]
    }
  }
  add_to_brain = function(brain, name){
    add_voxel_cube(brain, name, cube)
  }

  re <- list(
    cube = cube,
    dimension = dimension,
    add_to_brain = add_to_brain
  )
  if(!missing(colormap)){
    re$colormap <- colormap
  }
  re
}
