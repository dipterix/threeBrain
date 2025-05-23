#' @title Read `FreeSurfer` surface and volume files
#' @author Zhengjia Wang
#' @details This function is under FreeSurfer license.
#' 1. Volumes:
#' 3D viewer uses `mri/T1.mgz` from `FreeSurfer` to show the
#' volume information. `T1.mgz` results from step 1 to 5 in `FreeSurfer`
#' command `recon-all -autorecon1`, which aligns the original `DICOM` image to `RAS` coordinate
#' system, resamples to volume with \code{256x256x256} voxels (tri-linear by default,
#' check \url{https://surfer.nmr.mgh.harvard.edu/fswiki/recon-all}
#' for more information).
#'
#' 2. Surface:
#' Please use 'FreeSurfer' surfaces
#'
#' 3. Electrode registration and transforms
#' This package provides two ways to map electrodes to standard space. For surface
#' electrodes, if standard 141 brain is provided, then the first option is to snap
#' electrodes to the nearest vertices in subject space. The key is the vertex number
#' matches across different subjects, hence the location of corresponding vertices
#' at template brain are the mapped electrode coordinates.
#' If standard 141 brain is missing, or the electrode type is `stereo EEG`, then
#' the second option is volume mapping. The idea is to map electrodes to `MNI305`
#' brain. The details can be found at \url{https://surfer.nmr.mgh.harvard.edu/fswiki/CoordinateSystems}.
#' To perform volume mapping, we need `FreeSurfer` folder `mri/transforms`.
#' Currently, only linear `Talairach` transform matrix is supported (located at
#' `talairach.xfm`).
#'
#' 4. Coordinates
#' The 3D viewer in this package uses the center of volume as the origin (0, 0, 0).
#'
#' @param fs_subject_folder character, `FreeSurfer` subject folder, or `RAVE` subject folder
#' @param subject_name character, subject code to display with only letters and digits
#' @param additional_surfaces character array, additional surface types to load, such as `white`, `smoothwm`
#' @param aligned_ct character, path to `ct_aligned_mri.nii.gz`, used for electrode localization
#' @param use_cache logical, whether to use cached `json` files or from raw `FreeSurfer` files
#' @param use_141 logical, whether to use standard 141 brain for surface file, default is \code{getOption('threeBrain.use141', TRUE)}
#'
#' @examples
#' \dontrun{
#' # Please run `download_N27()` if `N27` is not at `default_template_directory()`
#'
#' # Import from `FreeSurfer` subject folder
#' brain = threeBrain::freesurfer_brain(
#'   fs_subject_folder = file.path(default_template_directory(), 'N27'),
#'   subject_name = 'N27',
#'   additional_surfaces = c('white', 'smoothwm')
#' )
#'
#' # Visualize. Alternatively, you can use brain$plot(...)
#' plot( brain )
#' }
#' @name freesurfer_brain
#' @export
freesurfer_brain <- function(fs_subject_folder, subject_name,
                             additional_surfaces = NULL,
                             aligned_ct = NULL,
                             use_cache = TRUE, use_141 = getOption('threeBrain.use141', TRUE)){
  # Naming conventions
  #
  # Volume group:   Volume (YAB)
  # Volume:         brain.finalsurfs (YAB), T1 (YAB)
  #
  # Surface group:  Surface - pial (YAB)
  # Surface         Standard 141 Right Hemisphere - pial (YAB)
  #
  # Electrode container: Electrodes (YAB)
  # Electrode          : YAB, 1 - NA

  ##### Load volume and surface ####
  # fs_subject_folder = '~/rave_data/data_dir/congruency/YAB/rave/fs/'
  # fs_subject_folder = '/Volumes/data/rave_data/ent_data/congruency/YAB/'
  # aligned_ct_nii = '~/rave_data/data_dir/congruency/YAB/rave/fs/RAVE/ct_aligned_mri.nii.gz'
  # subject_name = 'YAB'
  mustWork <- TRUE

  # Find folders
  if( dir.exists(file.path(fs_subject_folder, 'surf')) ){
    path_subject <- normalizePath(fs_subject_folder, mustWork = mustWork)
  }else if( dir.exists(file.path(fs_subject_folder, 'fs')) ){
    path_subject <- normalizePath(file.path(fs_subject_folder, 'fs'), mustWork = mustWork)
  }else if( dir.exists(file.path(fs_subject_folder, 'rave')) ){
    path_subject <- normalizePath(file.path(fs_subject_folder, 'rave', 'fs'), mustWork = mustWork)
  }else{
    path_subject <- normalizePath(fs_subject_folder, mustWork = mustWork)
  }
  path_cache <- file.path(path_subject, 'RAVE')

  # Find target files
  # path_brainfinal = normalizePath(file.path(path_subject, 'mri', 'brain.finalsurfs.mgz'), mustWork = mustWork)
  path_mri <- function(fname, mw = FALSE){ normalizePath(file.path(path_subject, 'mri', fname), mustWork = mw) }
  path_rawavg <- path_mri('rawavg.mgz')
  path_t1 <- path_mri('T1.mgz')
  path_brain_finalsurf <- path_mri('brain.finalsurfs.mgz')
  path_aseg <- path_mri('aseg.mgz')
  path_brainmask <- path_mri('brainmask.mgz')
  path_brain_automask <- path_mri('brainmask.auto.mgz')

  path_xform <- normalizePath(file.path(path_subject, 'mri', 'transforms', 'talairach.xfm'), mustWork = FALSE)
  path_suma <- normalizePath(file.path(path_subject, 'SUMA'), mustWork = FALSE)
  path_surf <- normalizePath(file.path(path_subject, 'surf'), mustWork = FALSE)

  # Get general information from fs output
  path_mri_volumes <- c(path_brain_finalsurf, path_brainmask, path_brain_automask, path_t1)
  fe <- file.exists(path_mri_volumes)

  # get talairach tranform
  xfm <- diag(c(1,1,1,1))
  has_volume <- FALSE
  if( file.exists(path_xform) ){
    ss <- readLines(path_xform)
    ss <- stringr::str_match(ss, '^[ ]{0,}([-]{0,1}[0-9.]+)[ ]{1,}([-]{0,1}[0-9.]+)[ ]{1,}([-]{0,1}[0-9.]+)[ ]{1,}([-]{0,1}[0-9.]+)[;]{0,1}[ ]{0,}$')
    ss <- ss[!is.na(ss[,1]), -1, drop = FALSE]
    if( nrow(ss) >= 3 ){
      ss <- ss[1:3,1:4]
    }else{
      cat2('Cannot parse file talairach.xfm properly.', level = 'WARNING')
      ss <- cbind(diag(c(1,1,1)), 0)
    }
    ss <- as.numeric(ss)
    dim(ss) <- c(3,4)
    xfm <- rbind(ss, c(0,0,0,1))
    has_volume <- TRUE
  }


  # Get Norig and Torig
  if(any(fe)){
    brain_t1 <- read_mgz(path_mri_volumes[fe][1])
    # get Norig
    Norig <- brain_t1$header$get_vox2ras()
    Torig <- brain_t1$header$get_vox2ras_tkr()
  }else{
    Norig <- Torig <- diag(c(1,1,1,1))
  }
  # if( file.exists(path_rawavg) ){
  #   rawavg = read_mgz(path_rawavg)
  #   Norig_raw = rawavg$header$get_vox2ras()
  #   Torig_raw = rawavg$header$get_vox2ras_tkr()
  #   Torig_raw %*% solve( Norig_raw )
  # }


  # Generate brain object to return
  brain <- Brain2$new(subject_code = subject_name, xfm = xfm, Norig = Norig, Torig = Torig)
  brain$meta$path <- list(
    path_subject = path_subject,
    path_cache = path_cache,
    path_t1 = path_t1,
    path_xform = path_xform,
    path_suma = path_suma,
    path_surf = path_surf
  )


  ##### get volume 256x256x256 ####
  dir_create(path_cache)

  geom_brain_t1 <- NULL

  if( has_volume ){
    volume_shape <- as.integer(brain_t1$get_shape())
    group_volume <- GeomGroup$new(name = sprintf('Volume - T1 (%s)', subject_name))
    group_volume$subject_code <- subject_name
    cache_volume <- file.path(path_cache, sprintf('%s_t1.json', subject_name))
    # Read from cache
    if( use_cache && file.exists(cache_volume) ){
      # TODO: Read volume cache
      geom_brain_t1 <- DataCubeGeom$new(
        name = sprintf('T1 (%s)', subject_name), value = array(NA, dim = volume_shape),
        dim = volume_shape, half_size = volume_shape / 2, group = group_volume,
        position = c(0,0,0), cache_file = cache_volume, digest = FALSE)
    }else{
      unlink(cache_volume)
    }
    if(is.null(geom_brain_t1)){
      volume <- fill_blanks(brain_t1$get_data(), niter=2)

      # Also try to load aseg to fill inner brains
      # if( file.exists(path_brainmask) ){
      #   path_brainmask
      #   brainmask = read_mgz(path_brainmask)
      #   volume_brainmask = brainmask$get_data()
      #   volume[ volume == 0 & volume_brainmask != 0 ] = 1
      # }

      # Re-order the data according to Norig, map voxels to RAS coord - anatomical
      # order_index = round((Norig %*% c(1,2,3,0))[1:3])
      # volume = aperm(volume, abs(order_index))
      # sub = sprintf(c('%d:1', '1:%d')[(sign(order_index) + 3) / 2], dim(volume))
      # volume = eval(parse(text = sprintf('volume[%s]', paste(sub, collapse = ','))))
      volume <- reorient_volume( volume, Torig )

      geom_brain_t1 <- DataCubeGeom$new(
        name = sprintf('T1 (%s)', subject_name), value = volume, dim = volume_shape,
        half_size = volume_shape / 2, group = group_volume, position = c(0,0,0),
        cache_file = cache_volume)
      rm(volume)
    }
    geom_brain_t1$subject_code <- subject_name

    geom_brain_t1 <- BrainVolume$new(
      subject_code = subject_name, volume_type = 'T1',
      volume = geom_brain_t1, position = c(0, 0, 0 ))

    brain$add_volume( volume = geom_brain_t1 )
  }




  #### Load aligned CT if required
  if( !is.null(aligned_ct) ){

    group_ct <- GeomGroup$new(name = sprintf('Volume - ct.aligned.t1 (%s)', subject_name))
    group_ct$subject_code <- subject_name
    cache_ct <- file.path(path_cache, sprintf('%s_ct_aligned_t1.json', subject_name))


    geom_brain_ct <- NULL
    # Check whether cache exists
    if( use_cache && file.exists(cache_ct) && file.size(cache_ct) > 4096 ){
      # Load from original file
      # ct = read_nii2( aligned_ct, head_only = TRUE )

      # get volume data
      ct_shape <- c(2,2,2); #as.integer(unlist( ct$get_shape() ))

      geom_brain_ct <- DataCubeGeom2$new(
        name = sprintf('ct.aligned.t1 (%s)', subject_name),
        value = array(NA, dim = ct_shape), dim = ct_shape,
        half_size = ct_shape / 2, group = group_ct, position = c(0,0,0),
        cache_file = cache_ct, digest = FALSE)
    }else{
      unlink( cache_ct )
    }


    # Load from original nii
    if( is.null(geom_brain_ct) && file.exists(aligned_ct) ){
      # Load from original file
      ct <- read_nii2( aligned_ct )

      # get volume data
      ct_data <- ct$get_data()
      ct_shape <- as.integer(unlist( ct$get_shape() ))

      # re-orient to RAS
      ct_data <- reorient_volume( ct_data, Torig )

      geom_brain_ct <- DataCubeGeom2$new(
        name = sprintf('ct.aligned.t1 (%s)', subject_name),
        value = ct_data, dim = ct_shape,
        half_size = ct_shape / 2, group = group_ct, position = c(0,0,0),
        cache_file = cache_ct)

      rm( ct, ct_data )
    }

    if( !is.null(geom_brain_ct) ){
      geom_brain_ct <- BrainVolume$new(
        subject_code = subject_name, volume_type = 'ct.aligned.t1',
        volume = geom_brain_ct, position = c(0,0,0)
      )
      brain$add_volume( volume = geom_brain_ct )
    }



  }

  #### Read surface files ####
  surface_type <- unique(c('pial', additional_surfaces))

  for( surf_t in surface_type ){
    tryCatch({
      surf_lh <- NULL
      surf_rh <- NULL
      surf_group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surf_t, subject_name),
                                 position = c( 0, 0, 0 ))
      surf_group$subject_code <- subject_name
      surface <- NULL
      loaded <- FALSE

      if( use_141 ){
        # Load surface from 141 cache
        cache_lh <- file.path(path_cache, sprintf('%s_std_141_lh_%s.json', subject_name, surf_t))
        cache_rh <- file.path(path_cache, sprintf('%s_std_141_rh_%s.json', subject_name, surf_t))
        if( file.exists(cache_lh) && file.size(cache_lh) < 4096 ){ unlink(cache_lh) }
        if( file.exists(cache_rh) && file.size(cache_rh) < 4096 ){ unlink(cache_rh) }
        if( use_cache && file.exists(cache_lh) && file.exists(cache_rh) ){
          surf_lh <- FreeGeom$new(name = sprintf('Standard 141 Left Hemisphere - %s (%s)', surf_t, subject_name),
                                 position = c(0,0,0), cache_file = cache_lh, group = surf_group, layer = 8)
          surf_rh <- FreeGeom$new(name = sprintf('Standard 141 Right Hemisphere - %s (%s)', surf_t, subject_name),
                                 position = c(0,0,0), cache_file = cache_rh, group = surf_group, layer = 8)
          surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'std.141',
                                     left_hemisphere = surf_lh, right_hemisphere = surf_rh)
          loaded <- TRUE
        }else{
          unlink(cache_lh)
          unlink(cache_rh)
        }
        if( !loaded ){
          # try to locate std.141.lh.xxx in SUMA folder
          surf <- load_141_surface( path_suma, surf_t = surf_t, quiet = TRUE )
          if( is.null(surf) ){
            # Cannot find any surface
            use_141 <- FALSE
          }else{
            surf_lh <- FreeGeom$new(name = sprintf('Standard 141 Left Hemisphere - %s (%s)', surf_t, subject_name),
                                   position = c(0,0,0), vertex = surf$left$vertices, face = surf$left$faces,
                                   cache_file = cache_lh, group = surf_group, layer = 8)
            surf_rh <- FreeGeom$new(name = sprintf('Standard 141 Right Hemisphere - %s (%s)', surf_t, subject_name),
                                   position = c(0,0,0), vertex = surf$right$vertices, face = surf$right$faces,
                                   cache_file = cache_rh, group = surf_group, layer = 8)
            surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'std.141',
                                       left_hemisphere = surf_lh, right_hemisphere = surf_rh)
            loaded <- TRUE
          }
          rm(surf)
        }

      }

      if( !use_141 ){
        cache_lh <- file.path(path_cache, sprintf('%s_fs_lh_%s.json', subject_name, surf_t))
        cache_rh <- file.path(path_cache, sprintf('%s_fs_rh_%s.json', subject_name, surf_t))
        # Check file size
        if( file.exists(cache_lh) && file.size(cache_lh) < 4096 ){ unlink(cache_lh) }
        if( file.exists(cache_rh) && file.size(cache_rh) < 4096 ){ unlink(cache_rh) }
        if( use_cache && file.exists(cache_lh) && file.exists(cache_rh) ){
          surf_lh <- FreeGeom$new(name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surf_t, subject_name),
                                 position = c(0,0,0), cache_file = cache_lh, group = surf_group, layer = 8)
          surf_rh <- FreeGeom$new(name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surf_t, subject_name),
                                 position = c(0,0,0), cache_file = cache_rh, group = surf_group, layer = 8)

          surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'fs',
                                     left_hemisphere = surf_lh, right_hemisphere = surf_rh)
          loaded <- TRUE
        }else{
          unlink(cache_lh)
          unlink(cache_rh)
        }
        if( !loaded ){
          # load from fs
          surf <- load_fs_surface( path_surf, surf_t = surf_t, quiet = TRUE )
          if( length(surf) ){
            surf_lh <- FreeGeom$new(name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surf_t, subject_name),
                                   position = c(0,0,0), vertex = surf$left$vertices, face = surf$left$faces,
                                   cache_file = cache_lh, group = surf_group, layer = 8)
            surf_rh <- FreeGeom$new(name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surf_t, subject_name),
                                   position = c(0,0,0), vertex = surf$right$vertices, face = surf$right$faces,
                                   cache_file = cache_rh, group = surf_group, layer = 8)
            surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'fs',
                                       left_hemisphere = surf_lh, right_hemisphere = surf_rh)
            loaded <- TRUE
          }
          rm(surf)
        }
      }

      if( 'brain-surface' %in% class(surface) ){

        # This step will automatically adjust position for std.141 mesh
        brain$add_surface( surface = surface )
      }
    }, error = function(e){
      cat2('Cannot import surface type', surf_t, 'for subject', subject_name, level = 'WARNING')
      cat2(e)
    })

  }

  surface_type <- brain$surface_types
  if( !'pial' %in% surface_type ){
    cat2('Cannot find pial surface. Please make sure fs/SUMA/std.141.[lr]h.pial.asc or fs/surf/[lr]h.pial.asc exists', level = 'WARNING')
  }

  ##### return an environment ####
  return(brain)

}

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
