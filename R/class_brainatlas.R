
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

#' @name voxel_cube
#' @title Generate volume data from 'MNI' coordinates
#' @param mni_ras 'MNI' 'RAS' coordinates, should be a \code{n}-by-3 matrix
#' @param keys integer color-keys generated from a color map with length of \code{n}; alternatively, you could specify \code{value} and \code{colormap} to generate keys automatically
#' @param value data values (length \code{n}); used if \code{keys} is missing
#' @param colormap a color map generated from \code{create_colormap}; see \code{\link{voxel_colormap}} for details
#' @param dimension volume dimension; default is a \code{256 x 256 x 256} array cube; must be integers and have length of 3
#' @param brain a 'threeBrain' brain object generated from \code{\link{freesurfer_brain2}} or \code{\link{merge_brain}}. If you have \code{'rave'} package installed, the brain can be generated from \code{rave::rave_brain2}
#' @param name the name of voxel cube, only letters, digits and \code{'_'} are allowed; other characters will be replaced by \code{'_'}
#' @param cube a 3-mode array; see the following example
#'
#' @returns \code{create_voxel_cube} returns a list of cube data and other informations;
#' \code{add_voxel_cube} returns the \code{brain} object
#'
#' @examples
#'
#' # requires N27 brain to be installed
#' # use `download_N27()` to download template Collins brain
#'
#'
#' # sample MNI coords
#' tbl <- read.csv(system.file(
#'   'sample_data/example_cube.csv', package = 'threeBrain'
#' ))
#' head(tbl)
#'
#' # load colormap
#' cmap <- load_colormap(system.file(
#'   'palettes/datacube2/Mixed.json', package = 'threeBrain'
#' ))
#'
#' x <- create_voxel_cube(
#'   mni_ras = tbl[, c('x', 'y', 'z')],
#'   keys = tbl$key,
#'   dimension = c(128, 128, 128)
#' )
#'
#'
#' n27_path <- file.path(default_template_directory(), "N27")
#' if( dir.exists(n27_path) ) {
#'   brain <- merge_brain()
#'
#'   # or add_voxel_cube(brain, 'example', x$cube)
#'   x$add_to_brain(brain, 'example')
#'
#'   brain$plot(controllers = list(
#'     "Voxel Type" = 'example',
#'     'Right Opacity' = 0.3,
#'     'Left Opacity' = 0.3,
#'     'Background Color' = '#000000'
#'   ), voxel_colormap = cmap)
#' }
#'
NULL

#' @rdname voxel_cube
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

  obj <- BrainAtlas$new(
    subject_code = subject, atlas_type = name,
    atlas = geom, position = c(0, 0, 0 ))

  brain$add_atlas( atlas = obj )
  invisible(re)
}

#' @rdname voxel_cube
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
  ratio <- dimension / c(256, 256, 256)
  for(i in seq_len(nrow(mni_ras))){
    tmp <- round((mni_ras[i,]) * ratio)
    if(cube[tmp[1], tmp[2], tmp[3]] == 0){
      cube[tmp[1], tmp[2], tmp[3]] <- keys[[i]]
    }
  }
  add_to_brain <- function(brain, name){
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
