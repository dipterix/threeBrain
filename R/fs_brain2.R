
#' @rdname freesurfer_brain
#' @param volume_types volume types, right now only support T1 image
#' @param surface_types surface types to load
#' @param curvature curvature data. Only support \code{"sulc"} for current version
#' @param ct_path an aligned CT file in 'Nifti' format
#' @param ... ignored
#' @export
freesurfer_brain2 <- function(
  fs_subject_folder,
  subject_name, volume_types = 't1', surface_types = 'pial',
  curvature = 'sulc',
  ct_path = NULL, #file.path(fs_subject_folder, 'RAVE', 'coregistration', 'ct2t1.nii.gz'),
  use_cache = TRUE, use_141 = getOption('threeBrain.use141', TRUE), ...){

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

  # Check if subjet is cached
  rave_dir <- file.path(path_subject, 'RAVE')
  common_file <- file.path(rave_dir, 'common.digest')
  rave_cached <- function(fname){
    file.path(rave_dir, fname)
  }

  has_cache <- TRUE
  if(!file.exists(common_file)){
    has_cache <- FALSE
    dir_create(rave_dir)
  }else{
    common <- from_json(from_file = common_file)
    if( !isTRUE(common$subject == subject_name) ||
        !isTRUE(cache_version <= common$cache_version) ){
      has_cache <- FALSE
    }
  }

  if( !has_cache ){
    import_from_freesurfer(fs_path = path_subject, subject_name = subject_name)
    common <- from_json(from_file = common_file)
  }


  ##### Load volume and surface ####
  rave_dir <- normalizePath(rave_dir)

  # Default transformations
  Norig <- diag(c(1,1,1,1))
  Torig <- diag(c(1,1,1,1))
  xfm <- common$xfm

  # 1. Main Volume (will show in side panels)
  # Get T1 volume data
  fname_t1 <- NULL
  has_t1 <- FALSE
  if(any(c('t1', 'T1') %in% volume_types)){
    vol_json <- sprintf('%s_t1.json', subject_name)
    vol_digest <- rave_cached(paste0(vol_json, '.digest'))
    if(vol_json %in% common$fs_volume_files){
      # We have volume! load digest
      t1_header <- from_json(from_file = vol_digest)
      fname_t1 <- t1_header$source_name
      Norig <- t1_header$Norig
      Torig <- t1_header$Torig
      has_t1 <- TRUE
    }
  }

  # Generate brain object to return
  brain <- Brain2$new(subject_code = subject_name, xfm = xfm, Norig = Norig, Torig = Torig)
  brain$meta$path <- list(
    path_subject = path_subject,
    path_cache = rave_dir,
    path_t1 = file.path(path_subject, 'mri', fname_t1),
    path_xform = file.path(path_subject, 'mri', 'transforms', 'talairach.xfm'),
    path_suma = file.path(path_subject, 'SUMA'),
    path_surf = file.path(path_subject, 'surf')
  )

  ##### get volume 256x256x256 ####

  geom_brain_t1 <- NULL

  if( has_t1 ){
    volume_shape <- t1_header$shape
    group_volume <- GeomGroup$new(name = sprintf('Volume - T1 (%s)', subject_name))
    group_volume$subject_code <- subject_name
    cache_volume <- normalizePath(file.path(rave_dir, vol_json))

    geom_brain_t1 <- DataCubeGeom$new(
      name = sprintf('T1 (%s)', subject_name), value = array(NA, dim = volume_shape),
      dim = volume_shape, half_size = volume_shape / 2, group = group_volume,
      position = c(0,0,0), cache_file = cache_volume, digest = FALSE)
    geom_brain_t1$subject_code <- subject_name
    geom_brain_t1 <- BrainVolume$new(
      subject_code = subject_name, volume_type = 'T1',
      volume = geom_brain_t1, position = c(0, 0, 0 ))

    brain$add_volume( volume = geom_brain_t1 )
  }

  if( length(ct_path) == 1 && file.exists(ct_path) ){

    group_ct <- GeomGroup$new(name = sprintf('Volume - ct.aligned.t1 (%s)', subject_name))
    group_ct$subject_code <- subject_name

    # Never cache CT
    # cache_ct = file.path(rave_dir, sprintf('%s_ct_aligned_t1.json', subject_name))

    # Load from original nii
    ct <- read_nii2( ct_path )
    cache_ct <- file.path(rave_dir, sprintf('%s_ct_aligned_t1.json', subject_name))
    if(file.exists(cache_ct)){
      unlink(cache_ct)
    }

    # get volume data
    ct_data <- ct$get_data()
    ct_shape <- as.integer(unlist( ct$get_shape() ))

    # re-orient to RAS
    ct_data <- reorient_volume( ct_data, Norig )

    # If T1 exists
    if(!is.null(geom_brain_t1)){
      t1_data <- geom_brain_t1$object$group$get_data(
        sprintf("datacube_value_T1 (%s)", subject_name))
      t1_dim <- geom_brain_t1$object$group$get_data(
        sprintf("datacube_dim_T1 (%s)", subject_name))
      dim(t1_data) <- t1_dim
      if(all(t1_dim == ct_shape)){
        ct_data[t1_data == 0 & ct_data > 0] <- 100
      }

    }

    geom_brain_ct <- DataCubeGeom2$new(
      name = sprintf('ct.aligned.t1 (%s)', subject_name),
      value = ct_data, dim = ct_shape,
      half_size = ct_shape / 2, group = group_ct, position = c(0,0,0),
      cache_file = cache_ct)

    rm( ct, ct_data )

    if( !is.null(geom_brain_ct) ){
      geom_brain_ct <- BrainVolume$new(
        subject_code = subject_name, volume_type = 'ct.aligned.t1',
        volume = geom_brain_ct, position = c(0,0,0)
      )
      brain$add_volume( volume = geom_brain_ct )
    }



  }

  #### Read surface files ####
  surface_type <- unique(c('pial', surface_types))
  template_subject <- unname(getOption('threeBrain.template_subject', 'N27'))
  # template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')


  for( surf_t in surface_type ){
    surf_group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surf_t, subject_name),
                               position = c( 0, 0, 0 ))
    surf_group$subject_code <- subject_name
    surface <- NULL
    loaded <- FALSE
    surf_group$set_group_data('template_subject', template_subject)
    surf_group$set_group_data('surface_type', surf_t)
    surf_group$set_group_data('subject_code', subject_name)

    # check if has cache
    cache_lh <- sprintf('%s_std_141_lh_%s.json', subject_name, surf_t)
    cache_rh <- sprintf('%s_std_141_rh_%s.json', subject_name, surf_t)

    if( use_141 && all(c(cache_lh, cache_rh) %in% common$suma_surface_files) ){
      surf_group$set_group_data('surface_format', 'std.141')
      # We can get 141 SUMA brain
      surf_lh <- FreeGeom$new(name = sprintf('Standard 141 Left Hemisphere - %s (%s)', surf_t, subject_name),
                             position = c(0,0,0), cache_file = rave_cached(cache_lh), group = surf_group, layer = 8)
      surf_rh <- FreeGeom$new(name = sprintf('Standard 141 Right Hemisphere - %s (%s)', surf_t, subject_name),
                             position = c(0,0,0), cache_file = rave_cached(cache_rh), group = surf_group, layer = 8)
      surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'std.141',
                                 left_hemisphere = surf_lh, right_hemisphere = surf_rh)
      loaded <- TRUE

      surf_group$set_group_data('curvature', curvature)

      curv_lh <- rave_cached(sprintf('%s_std_141_lh_%s.json', subject_name, curvature))
      # if(!file.exists(curv_lh)){
      #   # FIXME
      #   # use N27 curv file because 141 brain is surface mapping and share vertex count?
      #   curv_lh = file.path(template_dir, template_subject, 'RAVE',
      #                       sprintf('%s_std_141_lh_%s.json', template_subject, curvature))
      #   surf_group$set_group_data('subject_code', template_subject)
      # }
      if( file.exists(curv_lh) ){
        # curv_lh = normalizePath(curv_lh)
        # surf_group$set_group_data(
        #   name = sprintf('Curvature - lh.%s (%s)', curvature, subject_name),
        #   value = list(
        #     path = curv_lh,
        #     absolute_path = curv_lh,
        #     file_name = filename(curv_lh),
        #     is_new_cache = FALSE,
        #     is_cache = TRUE
        #   ),
        #   is_cached = TRUE
        # )
        vertcolor_name <- sprintf('Curvature - std.141.lh.%s (%s)', curvature, subject_name)
        brain$add_vertex_color(
          name = vertcolor_name,
          path = curv_lh
        )
        surf_group$set_group_data(sprintf('default_vertex_lh_%s', surf_t), vertcolor_name)
      }

      curv_rh <- rave_cached(sprintf('%s_std_141_rh_%s.json', subject_name, curvature))
      # if(!file.exists(curv_rh)){
      #   # FIXME
      #   # use N27 curv file because 141 brain is surface mapping and share vertex count?
      #   curv_rh = file.path(template_dir, template_subject, 'RAVE',
      #                       sprintf('%s_std_141_rh_%s.json', template_subject, curvature))
      #   surf_group$set_group_data('subject_code', template_subject)
      # }
      if( file.exists(curv_rh) ){
        # curv_rh = normalizePath(curv_rh)
        # surf_group$set_group_data(
        #   name = sprintf('Curvature - rh.%s (%s)', curvature, subject_name),
        #   value = list(
        #     path = curv_rh,
        #     absolute_path = curv_rh,
        #     file_name = filename(curv_rh),
        #     is_new_cache = FALSE,
        #     is_cache = TRUE
        #   ),
        #   is_cached = TRUE
        # )
        vertcolor_name <- sprintf('Curvature - std.141.rh.%s (%s)', curvature, subject_name)
        brain$add_vertex_color(
          name = vertcolor_name,
          path = curv_rh
        )
        surf_group$set_group_data(sprintf('default_vertex_rh_%s', surf_t), vertcolor_name)
      }
    }
    if( !loaded ){
      cache_lh <- sprintf('%s_fs_lh_%s.json', subject_name, surf_t)
      cache_rh <- sprintf('%s_fs_rh_%s.json', subject_name, surf_t)

      if( all(c(cache_lh, cache_rh) %in% common$fs_surface_files) ){
        surf_group$set_group_data('surface_format', 'fs')
        # We can get FreeSurfer brain
        surf_lh <- FreeGeom$new(name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surf_t, subject_name),
                               position = c(0,0,0), cache_file = rave_cached(cache_lh), group = surf_group, layer = 8)
        surf_rh <- FreeGeom$new(name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surf_t, subject_name),
                               position = c(0,0,0), cache_file = rave_cached(cache_rh), group = surf_group, layer = 8)

        surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'fs',
                                   left_hemisphere = surf_lh, right_hemisphere = surf_rh)
        loaded <- TRUE
      }

      # load curvature data
      # pial-outer-smoothed doesn't have sulc as it's calculated based on outer smoothed
      if( surf_t != 'pial-outer-smoothed' ){

        surf_group$set_group_data('curvature', curvature)

        curv_lh <- rave_cached(sprintf('%s_fs_lh_%s.json', subject_name, curvature))
        if( file.exists(curv_lh) ){
          # curv_lh = normalizePath(curv_lh)
          # surf_group$set_group_data(
          #   name = sprintf('Curvature - lh.%s (%s)', curvature, subject_name),
          #   value = list(
          #     path = curv_lh,
          #     absolute_path = curv_lh,
          #     file_name = filename(curv_lh),
          #     is_new_cache = FALSE,
          #     is_cache = TRUE
          #   ),
          #   is_cached = TRUE
          # )
          vertcolor_name <- sprintf('Curvature - lh.%s (%s)', curvature, subject_name)
          brain$add_vertex_color(
            name = vertcolor_name,
            path = curv_lh
          )
          surf_group$set_group_data(sprintf('default_vertex_lh_%s', surf_t), vertcolor_name)
        }

        curv_rh <- rave_cached(sprintf('%s_fs_rh_%s.json', subject_name, curvature))
        if( file.exists(curv_rh) ){
          # curv_rh = normalizePath(curv_rh)
          # surf_group$set_group_data(
          #   name = sprintf('Curvature - rh.%s (%s)', curvature, subject_name),
          #   value = list(
          #     path = curv_rh,
          #     absolute_path = curv_rh,
          #     file_name = filename(curv_rh),
          #     is_new_cache = FALSE,
          #     is_cache = TRUE
          #   ),
          #   is_cached = TRUE
          # )
          vertcolor_name <- sprintf('Curvature - rh.%s (%s)', curvature, subject_name)
          brain$add_vertex_color(
            name = vertcolor_name,
            path = curv_rh
          )
          surf_group$set_group_data(sprintf('default_vertex_rh_%s', surf_t), vertcolor_name)
        }
      }

    }

    if( 'brain-surface' %in% class(surface) ){

      # This step will automatically adjust position for std.141 mesh
      brain$add_surface( surface = surface )
    }

  }

  surface_type <- brain$surface_types


  # #### Load aligned CT if required ####
  # if( !is.null(aligned_ct) ){
  #
  #   group_ct = GeomGroup$new(name = sprintf('Volume - ct.aligned.t1 (%s)', subject_name))
  #   group_ct$subject_code = subject_name
  #   cache_ct = file.path(path_cache, sprintf('%s_ct_aligned_t1.json', subject_name))
  #
  #
  #   geom_brain_ct = NULL
  #   # Check whether cache exists
  #   if( use_cache && file.exists(cache_ct) && file.size(cache_ct) > 4096 ){
  #     # Load from original file
  #     # ct = read_nii2( aligned_ct, head_only = TRUE )
  #
  #     # get volume data
  #     ct_shape = c(2,2,2); #as.integer(unlist( ct$get_shape() ))
  #
  #     geom_brain_ct = DataCubeGeom2$new(
  #       name = sprintf('ct.aligned.t1 (%s)', subject_name),
  #       value = array(NA, dim = ct_shape), dim = ct_shape,
  #       half_size = ct_shape / 2, group = group_ct, position = c(0,0,0),
  #       cache_file = cache_ct, digest = FALSE)
  #   }else{
  #     unlink( cache_ct )
  #   }
  #
  #
  #   # Load from original nii
  #   if( is.null(geom_brain_ct) && file.exists(aligned_ct) ){
  #     # Load from original file
  #     ct = read_nii2( aligned_ct )
  #
  #     # get volume data
  #     ct_data = ct$get_data()
  #     ct_shape = as.integer(unlist( ct$get_shape() ))
  #
  #     # re-orient to RAS
  #     ct_data = reorient_volume( ct_data, Norig )
  #
  #     geom_brain_ct = DataCubeGeom2$new(
  #       name = sprintf('ct.aligned.t1 (%s)', subject_name),
  #       value = ct_data, dim = ct_shape,
  #       half_size = ct_shape / 2, group = group_ct, position = c(0,0,0),
  #       cache_file = cache_ct)
  #
  #     rm( ct, ct_data )
  #   }
  #
  #   if( !is.null(geom_brain_ct) ){
  #     geom_brain_ct = BrainVolume$new(
  #       subject_code = subject_name, volume_type = 'ct.aligned.t1',
  #       volume = geom_brain_ct, position = c(0,0,0)
  #     )
  #     brain$add_volume( volume = geom_brain_ct )
  #   }
  #
  #
  #
  # }
  #

  ##### return an environment ####
  return(brain)

}
