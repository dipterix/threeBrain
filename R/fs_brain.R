#' @title Function to check whether `FreeSurfer` folder has everything we need
#' @param fs_subject_folder character, path to `fs` project directory or `RAVE` subject directory
#' @param autoinstall_template logical, whether `N27` brain should be installed if missing
#' @param return_path logical, whether to return `FreeSurfer` path
#' @param check_volume logical, whether to check volume data
#' @param check_surface logical, whether to check surface data (not implemented yet)
#' @return logical whether the directory is valid or, if \code{return_path} is true,
#' return `FreeSurfer` path
#' @export
check_freesurfer_path <- function(
    fs_subject_folder, autoinstall_template = FALSE,
    return_path = FALSE, check_volume = FALSE, check_surface = FALSE){
  pass_test <- FALSE
  if( dir.exists(fs_subject_folder) ){

    if( dir.exists(file.path(fs_subject_folder, 'surf')) ){
      path_subject <- fs_subject_folder
    }else if( dir.exists(file.path(fs_subject_folder, 'fs')) ){
      path_subject <- file.path(fs_subject_folder, 'fs')
    }else if( dir.exists(file.path(fs_subject_folder, 'rave')) ){
      path_subject <- file.path(fs_subject_folder, 'rave', 'fs')
    }else{
      path_subject <- fs_subject_folder
    }

    path_t1 <- file.path(path_subject, 'mri', 'T1.mgz')
    path_brain_finalsurf <- file.path(path_subject, 'mri', 'brain.finalsurfs.mgz')
    path_brain_automask <- file.path(path_subject, 'mri', 'brainmask.auto.mgz')
    path_brain_mask <- file.path(path_subject, 'mri', 'brainmask.mgz')

    path_xform <- file.path(path_subject, 'mri', 'transforms', 'talairach.xfm')
    # path_surf = file.path(path_subject, 'surf')

    if( !check_volume && !check_surface ){
      # check if surf dir exists
      pass_test <- TRUE
    }
    if( !pass_test && check_volume ){
      if( any(file.exists(c(path_t1, path_brain_finalsurf, path_brain_automask, path_brain_mask))) && file.exists(path_xform) ){
        pass_test <- TRUE
      }
    }

    if( !pass_test && check_surface ){
      # Not implemented yet
      pass_test <- TRUE

    }


  }

  if( autoinstall_template && !pass_test ){
    # check if this is N27 subject
    subject_code <- unlist(stringr::str_split(fs_subject_folder, '/|\\\\'))
    if( subject_code[length(subject_code)] == 'N27' ){
      download_N27()
    }
  }

  if( pass_test ){
    dir_create(file.path(path_subject, 'mri', 'transforms'))
    dir_create(file.path(path_subject, 'surf'))
    # dir_create(file.path(path_subject, 'SUMA'))
    dir_create(file.path(path_subject, 'RAVE'))
    if( return_path ){ return( path_subject ) } else { return(TRUE) }
  }
  if( return_path ){ return( NULL ) } else { return(FALSE) }
}

electrode_mapped_141 <- function(position = c(0,0,0), is_surface, vertex_number, surf_type, hemisphere){
  surface_mapping <- FALSE

  if( sum(position^2) == 0 ){
    return(TRUE)
  }

  if( isTRUE(is_surface) &&
      length(vertex_number) == 1 && vertex_number >= 0 &&
      length(surf_type) == 1 &&!is.na(surf_type) &&
      length(hemisphere) == 1 && hemisphere %in% c('right', 'left')){
    surface_mapping <- TRUE
  }
  if( length(surf_type) == 1 && (is.na(surf_type) || surf_type == 'NA') ){
    # No need to map to surface as there is no surface
    surface_mapping <- TRUE
  }
  return(surface_mapping)
}



load_surface_asc_gii <- function(file){

  if( stringr::str_ends(stringr::str_to_lower(file), '\\.asc') ){
    surf <- read_fs_asc(file)
    surf$vertices <- surf$vertices[,1:3]
    surf$faces <- surf$faces[,1:3]
  }else if( stringr::str_ends(stringr::str_to_lower(file), '\\.gii') ){
    # Check if python version is available
    surf <- read_gii2(file)

  }else{
    # Use freesurferformats:::read.fs.surface
    tryCatch({
      tmp <- freesurferformats::read.fs.surface(file)

      faces <- tmp$faces[, 1:3]
      fdim <- dim(faces)
      faces <- as.integer(faces - min(faces))
      dim(faces) <- fdim

      surf <- list(
        header = c(nrow(tmp$vertices), nrow(tmp$faces)),
        vertices = tmp$vertices[, 1:3],
        faces = faces
      )
    }, error = function(e){
      stop('Unknown type - Only support ASCII, Gifti, or native FS formats (if freesurferformats is installed).')
    })

  }
  return(surf)
}

load_fs_surface <- function(dir, surf_t = 'pial', quiet = FALSE){
  # dir = "/Users/beauchamplab/rave_data/data_dir/congruency/YAB/rave/fs/SUMA"
  lh_file <- list.files( dir, pattern = sprintf('^lh\\.%s\\.(asc|gii|nii)', surf_t), full.names = TRUE)
  rh_file <- list.files( dir, pattern = sprintf('^rh\\.%s\\.(asc|gii|nii)', surf_t), full.names = TRUE)
  if(any( length(lh_file) == 0, length(rh_file) == 0 )){
    if(!quiet){
      cat2('Cannot find FreeSurfer brain from ', dir, level = 'ERROR')
    }
    return(invisible())
  }
  lh_file <- sort(lh_file)[1]
  rh_file <- sort(rh_file)[1]

  lh_surf <- load_surface_asc_gii(lh_file)
  rh_surf <- load_surface_asc_gii(rh_file)

  return(list(
    type = surf_t,
    sub_type = 'fs',
    left = lh_surf,
    right = rh_surf
  ))
}



load_141_surface <- function(dir, surf_t = 'pial', quiet = FALSE){
  # dir = "/Users/beauchamplab/rave_data/data_dir/congruency/YAB/rave/fs/SUMA"
  lh_file <- list.files( dir, pattern = sprintf('^std\\.141\\.lh\\.%s\\.(asc|gii|nii)', surf_t), full.names = TRUE)
  rh_file <- list.files( dir, pattern = sprintf('^std\\.141\\.rh\\.%s\\.(asc|gii|nii)', surf_t), full.names = TRUE)

  if(any( length(lh_file) == 0, length(rh_file) == 0 )){
    if(!quiet){
      cat2('Cannot find 141 brain from ', dir, level = 'ERROR')
    }
    return(invisible())
  }

  lh_file <- sort(lh_file)[1]
  rh_file <- sort(rh_file)[1]


  lh_surf <- load_surface_asc_gii(lh_file)
  rh_surf <- load_surface_asc_gii(rh_file)

  return(list(
    type = surf_t,
    sub_type = 'std.141',
    left = lh_surf,
    right = rh_surf
  ))

}
