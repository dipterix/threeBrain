
#' @rdname freesurfer_brain
#' @param volume_types volume types, right now only support T1 image
#' @param surface_types surface types to load
#' @param curvature curvature data. Only support \code{"sulc"} for current version
#' @param atlas_types atlas types to be loaded, choices are \code{'aparc+aseg'},
#' \code{'aparc.a2009s+aseg'}, \code{'aparc.DKTatlas+aseg'}, \code{'aseg'}
#' @param ct_path an aligned CT file in 'Nifti' format
#' @param ... ignored
#' @export
freesurfer_brain2 <- function(
  fs_subject_folder, subject_name,
  volume_types = 't1', surface_types = 'pial', curvature = 'sulc',
  atlas_types = c('aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg'),
  ct_path = NULL, #file.path(fs_subject_folder, 'RAVE', 'coregistration', 'ct2t1.nii.gz'),
  use_cache = TRUE, use_141 = getOption('threeBrain.use141', TRUE), ...){

  # DIPSAUS DEBUG START
  # fs_subject_folder = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/'
  # subject_name <- "PAV010"; volume_types = 't1'; surface_types = 'pial'; curvature = 'sulc';
  # atlas_types = 'aparc+aseg';
  # ct_path = NULL

  mustWork <- TRUE
  atlas_types <- atlas_types[atlas_types %in% c('aparc+aseg', 'aparc.a2009s+aseg', 'aparc.DKTatlas+aseg', 'aseg')]

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

  # check cache files
  # cached <- validate_digest(src, target)
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
        !(
          isTRUE(cache_version <= common$cache_version) ||
          isTRUE(THREEBRAIN_DATA_VER <= common$THREEBRAIN_DATA_VER)
        ) ){
      digests <- list.files(rave_dir, pattern = "digest$", full.names = TRUE, recursive = FALSE, include.dirs = FALSE)
      lapply(digests, unlink)
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
  if(any(c('t1', 'mri') %in% tolower(volume_types))){
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
  brain$base_path <- fs_subject_folder
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

    # Make sure T1 is up-to-date
    t1_mgh_path <- file.path(fs_subject_folder, "mri", fname_t1)
    if(!identical(fname_t1, "brain.finalsurfs.mgz")) {
      if(file.exists(file.path(fs_subject_folder, "mri", "brain.finalsurfs.mgz"))) {
        t1_mgh_path <- file.path(fs_subject_folder, "mri", "brain.finalsurfs.mgz")
      }
    }

    if( file.exists(t1_mgh_path) ) {
      geom_brain_t1 <- VolumeGeom$new(
        name = sprintf('T1 (%s)', subject_name),
        path = t1_mgh_path,
        group = GeomGroup$new(name = sprintf('Volume - T1 (%s)', subject_name))
      )
    } else {
      geom_brain_t1 <- DataCubeGeom$new(
        name = sprintf('T1 (%s)', subject_name), value = array(NA, dim = volume_shape),
        dim = volume_shape, half_size = volume_shape / 2, group = group_volume,
        position = c(0,0,0), cache_file = cache_volume, digest = FALSE)
    }

    geom_brain_t1$subject_code <- subject_name
    geom_brain_t1 <- BrainVolume$new(
      subject_code = subject_name, volume_type = 'T1',
      volume = geom_brain_t1, position = c(0, 0, 0 ))

    brain$add_volume( volume = geom_brain_t1 )
  }

  # TODO: remove support as there is dedicated $localize() method
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
    ct_data <- reorient_volume( ct_data, Torig )

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
      # Use FreeSurfer

      # try to use FreeSurfer's original files
      left_surf_path_orig <- file.path(fs_subject_folder, "surf", sprintf("lh.%s", surf_t))
      if( !file.exists(left_surf_path_orig) ) {
        left_surf_path_orig <- file.path(fs_subject_folder, "surf", sprintf("lh.%s.T1", surf_t))
      }
      right_surf_path_orig <- file.path(fs_subject_folder, "surf", sprintf("rh.%s", surf_t))
      if( !file.exists(right_surf_path_orig) ) {
        right_surf_path_orig <- file.path(fs_subject_folder, "surf", sprintf("rh.%s.T1", surf_t))
      }
      if( file.exists(left_surf_path_orig) && file.exists(right_surf_path_orig) ) {
        surf_group$set_group_data('surface_format', 'fs')
        surf_lh <- FreeGeom$new(
          name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surf_t, subject_name),
          position = c(0,0,0),
          cache_file = normalizePath(left_surf_path_orig, winslash = "/"),
          group = surf_group, layer = 8)
        surf_rh <- FreeGeom$new(
          name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surf_t, subject_name),
          position = c(0,0,0),
          cache_file = normalizePath(right_surf_path_orig, winslash = "/"),
          group = surf_group, layer = 8)
        surface <- BrainSurface$new(subject_code = subject_name, surface_type = surf_t, mesh_type = 'fs',
                                    left_hemisphere = surf_lh, right_hemisphere = surf_rh)
        loaded <- TRUE
      } else {

        # use cached
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
      }




      # load curvature data
      # pial-outer-smoothed doesn't have sulc as it's calculated based on outer smoothed
      if( surf_t != 'pial-outer-smoothed' ){

        # check if curvature file exists
        left_curv_path <- file.path(fs_subject_folder, "surf", sprintf("lh.%s", curvature))
        right_curv_path <- file.path(fs_subject_folder, "surf", sprintf("rh.%s", curvature))

        if(file.exists(left_curv_path) && file.exists(right_curv_path)) {
          # use original *h.sulc or *h.curv

          surf_group$set_group_data(
            "lh_primary_vertex_color", is_cached = TRUE,
            value = list(
              path = left_curv_path,
              absolute_path = normalizePath(left_curv_path, winslash = "/"),
              file_name = basename(left_curv_path),
              is_new_cache = FALSE,
              is_cache = TRUE
            )
          )
          surf_group$set_group_data(
            "rh_primary_vertex_color", is_cached = TRUE,
            value = list(
              path = right_curv_path,
              absolute_path = normalizePath(right_curv_path, winslash = "/"),
              file_name = basename(right_curv_path),
              is_new_cache = FALSE,
              is_cache = TRUE
            )
          )
        } else {
          surf_group$set_group_data('curvature', curvature)
          curv_lh <- rave_cached(sprintf('%s_fs_lh_%s.json', subject_name, curvature))
          if( file.exists(curv_lh) ){
            vertcolor_name <- sprintf('Curvature - lh.%s (%s)', curvature, subject_name)
            brain$add_vertex_color(
              name = vertcolor_name,
              path = curv_lh
            )
            surf_group$set_group_data(sprintf('default_vertex_lh_%s', surf_t), vertcolor_name)
          }

          curv_rh <- rave_cached(sprintf('%s_fs_rh_%s.json', subject_name, curvature))
          if( file.exists(curv_rh) ){
            vertcolor_name <- sprintf('Curvature - rh.%s (%s)', curvature, subject_name)
            brain$add_vertex_color(
              name = vertcolor_name,
              path = curv_rh
            )
            surf_group$set_group_data(sprintf('default_vertex_rh_%s', surf_t), vertcolor_name)
          }
        }

      }

    }

    if( 'brain-surface' %in% class(surface) ){

      # This step will automatically adjust position for std.141 mesh
      brain$add_surface( surface = surface )
    }

  }

  surface_type <- brain$surface_types


  for(atlas_t in atlas_types){

    # check if fs has mgh/mgz files
    mgz_path <- file.path(fs_subject_folder, "mri", sprintf("%s.mgz", atlas_t))
    if( file.exists(mgz_path) ) {
      nm <- sprintf("Atlas - %s (%s)", atlas_t, subject_name)
      group <- GeomGroup$new(name = nm)
      group$subject_code <- subject_name
      geom <- VolumeGeom2$new(name = nm, path = mgz_path, color_format = "RGBAFormat", trans_mat = NULL)
      geom$subject_code <- subject_name
      geom_atlas <- BrainAtlas$new(
        subject_code = subject_name, atlas_type = atlas_t,
        atlas = geom, position = c(0, 0, 0))
      brain$add_atlas(atlas = geom_atlas)
    } else {
      # check if cache exists
      has_atlas <- FALSE
      atlas_t_alt <- stringr::str_replace_all(atlas_t, '[\\W]', '_')
      atlas_json <- sprintf('%s_%s.json', subject_name, atlas_t_alt)
      atlas_digest <- rave_cached(paste0(atlas_json, '.digest'))
      if(atlas_json %in% common$fs_atlas_files){
        # Atlas is cached and valid (?)
        atlas_header <- from_json(from_file = atlas_digest)
        fname_atlas <- atlas_header$source_name
        Norig <- atlas_header$Norig
        Torig <- atlas_header$Torig
        has_atlas <- TRUE
      }

      geom_atlas <- NULL

      if( has_atlas ){
        atlas_shape <- atlas_header$shape
        group_atlas <- GeomGroup$new(name = sprintf('Atlas - %s (%s)', atlas_t_alt, subject_name))
        group_atlas$subject_code <- subject_name
        cache_atlas <- normalizePath(file.path(rave_dir, atlas_json))

        geom_atlas <- DataCubeGeom2$new(
          name = sprintf('Atlas - %s (%s)', atlas_t_alt, subject_name), dim = atlas_shape,
          half_size = c(1,1,1), group = group_atlas, position = c(0,0,0),
          cache_file = cache_atlas)

        geom_atlas$subject_code <- subject_name
        geom_atlas <- BrainAtlas$new(
          subject_code = subject_name, atlas_type = atlas_t_alt,
          atlas = geom_atlas, position = c(0, 0, 0 ))

        brain$add_atlas( atlas = geom_atlas )
      }
    }
  }

  # Atlas files
  # group_volume <- GeomGroup$new(name = sprintf('Atlas - %s (%s)', atlas_type, subject_name))
  # group_volume$subject_code <- subject_name
  #
  # # Create a datacube geom to force cache
  # dc2 <- DataCubeGeom2$new(
  #   name = sprintf('Atlas - %s (%s)', atlas_type, subject_name), dim = c(256,256,256),
  #   half_size = c(1,1,1), group = group_volume, position = c(0,0,0),
  #   cache_file = sprintf('~/rave_data/others/fs/RAVE/YCQ_%s.json', atlas_type))




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
  #     ct_data = reorient_volume( ct_data, Torig )
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
