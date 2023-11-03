# surface = BrainSurface$new('YAB', surface_type = 'pial', mesh_type = 'std.141', left_hemisphere = s$left, right_hemisphere = s$right)
# volume = BrainVolume$new(subject_code = 'YAB', volume_type = 'brain.finalsurf', volume = env$volume)


Brain2 <- R6::R6Class(
  classname = 'rave-brain',
  portable = FALSE,
  cloneable = TRUE,
  private = list(
    .subject_code = '',
    .base_path = NULL,
    .available_surfaces = NULL
  ),
  public = list(


    meta = NULL,

    # Stores a list of BrainSurface objects
    surfaces = NULL,

    # Stores a list of BrainVolume objects
    volumes = NULL,

    # Stores a list of BrainAtlas objects
    atlases = NULL,

    #Stores a list of BrainElectrodes objects
    electrodes = NULL,

    globals = NULL,
    misc = NULL,

    ## Transforms

    # Talairach transform. What freesurfer uses by default is linear transform from scanner coords to MNI305 space
    xfm = diag(rep(1, 4)),

    # Norig and Torig are usually combined together to calculate libear transform from scanner to volume coords (CRS)
    Norig = diag(rep(1, 4)),
    Torig = diag(rep(1, 4)),

    initialize = function(subject_code, xfm, Norig, Torig){
      stopifnot2( length(xfm) == 16 && length(dim(xfm)) == 2 && sum(dim(xfm)) == 8,
                  msg = 'xfm must be 4x4 matrix')
      stopifnot2( length(Norig) == 16 && length(dim(Norig)) == 2 && sum(dim(Norig)) == 8,
                  msg = 'Norig must be 4x4 matrix')
      stopifnot2( length(Torig) == 16 && length(dim(Torig)) == 2 && sum(dim(Torig)) == 8,
                  msg = 'Torig must be 4x4 matrix')

      private$.subject_code <- subject_code
      self$misc <- list()

      self$xfm <- xfm
      self$Norig <- Norig
      self$Torig <- Torig

      self$volumes <- list()
      self$surfaces <- list()
      self$electrodes <- BrainElectrodes$new(subject_code = subject_code)
      self$meta <- list()

      # TODO: put all brain global data (transform etc...) here
      self$globals <- BlankGeom$new(
        group = GeomGroup$new(name = sprintf('_internal_group_data_%s', subject_code)),
        name = sprintf('_misc_%s', subject_code)
      )
    },

    add_surface = function(
      surface,
      vertex_color_types = c("sulc", "curv", "thickness", "volume"),
      template_subject = unname(getOption('threeBrain.template_subject', 'N27'))
    ){
      if(!inherits(surface, 'brain-surface')) {

        stopifnot2( is.character(surface), msg = 'surface must be a brain-surface object or character')

        fs_path <- self$base_path
        if(!isTRUE(file.exists(fs_path))) { return() }
        subject_code <- private$.subject_code


        left_vcolor <- NULL
        right_vcolor <- NULL
        has_vcolor <- FALSE
        if(!endsWith(surface, "outer-smoothed")) {
          for(vc_type in vertex_color_types) {
            path_left_vcolor <- file.path(fs_path, "surf", sprintf("lh.%s", vc_type))
            path_right_vcolor <- file.path(fs_path, "surf", sprintf("rh.%s", vc_type))

            if( file.exists(path_left_vcolor) && file.exists(path_right_vcolor) ) {
              path_left_vcolor <- normalizePath(path_left_vcolor, winslash = "/")
              path_right_vcolor <- normalizePath(path_right_vcolor, winslash = "/")
              left_vcolor <- list(
                path = path_left_vcolor,
                absolute_path = path_left_vcolor,
                file_name = basename(path_left_vcolor),
                is_new_cache = FALSE,
                is_cache = TRUE
              )
              right_vcolor <- list(
                path = path_right_vcolor,
                absolute_path = path_right_vcolor,
                file_name = basename(path_right_vcolor),
                is_new_cache = FALSE,
                is_cache = TRUE
              )
              has_vcolor <- TRUE
              break
            }
          }
        }

        surface_name <- surface
        if( tolower(surface_name) == "pial.t1" ) {
          surface_name <- "pial"
        }
        available_surfaces_lower <- tolower(private$.available_surfaces)
        # surface_type might be symlink since fs 7.0 (e.g., pial)
        surface_type <- c(surface_alternative_types[[surface_name]], surface_name)
        surface_type <- surface_type[tolower(surface_type) %in% available_surfaces_lower]
        if(!length(surface_type)) { return() }

        surface_type <- surface_type[[1]]

        path_left <- normalizePath(file.path(fs_path, "surf", sprintf("lh.%s", surface_type)), winslash = "/", mustWork = FALSE)
        path_right <- normalizePath(file.path(fs_path, "surf", sprintf("rh.%s", surface_type)), winslash = "/", mustWork = FALSE)

        if( !file.exists(path_left) || !file.exists(path_right) ) { return() }

        group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surface_name, subject_code))
        group$.cache_name <- sprintf("%s/surf", subject_code)
        group$set_group_data('template_subject', template_subject)
        group$set_group_data('surface_type', surface_name)
        group$set_group_data('subject_code', subject_code)
        group$set_group_data('surface_format', 'fs')

        if( has_vcolor ) {
          group$set_group_data( "lh_primary_vertex_color", is_cached = TRUE, value = left_vcolor )
          group$set_group_data( "rh_primary_vertex_color", is_cached = TRUE, value = right_vcolor )
        }

        surf_lh <- FreeGeom$new(
          name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surface_name, subject_code),
          position = c(0,0,0), cache_file = path_left, group = group, layer = 8
        )
        surf_rh <- FreeGeom$new(
          name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surface_name, subject_code),
          position = c(0,0,0), cache_file = path_right, group = group, layer = 8
        )
        surface <- BrainSurface$new(subject_code = subject_code, surface_type = surface_name, mesh_type = 'fs',
                                    left_hemisphere = surf_lh, right_hemisphere = surf_rh)


      }

      if( !isTRUE(surface$has_hemispheres) ) {
        warning('surface miss mesh objects')
        return()
      }

      if( surface$mesh_type == 'std.141' ){
        surface$set_group_position( self$scanner_center )

        offset_x <- switch (
          surface$surface_type,
          'inflated' = { offset_x <- 50 },
          'sphere' = { offset_x <- 128 },
          { 0 }
        )
        surface$left_hemisphere$position <- c(-offset_x, 0, 0)
        surface$right_hemisphere$position <- c(offset_x, 0, 0)

      }else if( surface$mesh_type == 'fs' ){
        surface$set_group_position( 0, 0, 0 )
      }

      surface$set_subject_code( self$subject_code )
      self$surfaces[[ surface$surface_type ]] <- surface

    },

    remove_surface = function(surface_types){
      if(missing(surface_types)){
        surface_types <- self$surface_types
      }
      for( s in surface_types){
        self$surfaces[[ s ]] <- NULL
      }
    },

    remove_volume = function(volume_types){
      if(missing(volume_types)){
        volume_types <- self$volume_types
      }
      for( s in volume_types){
        self$volumes[[ s ]] <- NULL
      }
    },

    add_volume = function(volume){
      stopifnot2( R6::is.R6( volume ) && 'brain-volume' %in% class( volume ),
                 msg = 'volume must be a brain-volume object')

      stopifnot2( volume$has_volume, msg = 'volume miss datacube objects')

      volume$set_subject_code( self$subject_code )
      self$volumes[[ volume$volume_type ]] <- volume

    },

    remove_atlas = function(atlas_types){
      if(missing(atlas_types)){
        atlas_types <- self$atlas_types
      }
      for( s in atlas_types){
        self$atlases[[ s ]] <- NULL
      }
    },

    add_atlas = function(atlas, color_format = c("RGBAFormat", "RedFormat"),
                         trans_space_from = c("model", "scannerRAS")){

      color_format <- match.arg(color_format)
      trans_space_from <- match.arg(trans_space_from)

      if(!inherits(atlas, 'brain-atlas')) {

        stopifnot2(is.character(atlas), msg = 'atlas must be a brain-atlas object or valid atlas name from FreeSurfer folder')
        atlas <- gsub("_", "+", atlas)
        path_atlases <- file.path( self$base_path, "mri", as.vector(rbind(
          sprintf("%s.mgz", atlas),
          sprintf("%s.nii.gz", atlas),
          sprintf("%s.nii", atlas)
        )) )
        atlas_path <- path_atlases[file.exists(path_atlases)]
        if(!length(atlas_path)) { return() }
        atlas_path <- atlas_path[[ 1 ]]

        atlas_geom <- VolumeGeom2$new(
          name = sprintf("Atlas - %s (%s)", atlas, subject_code),
          path = atlas_path, color_format = color_format, trans_mat = NULL
        )
        atlas_geom$trans_space_from <- trans_space_from
        atlas_instance <- BrainAtlas$new(
          subject_code = private$.subject_code,
          atlas_type = atlas,
          position = c(0, 0, 0),
          atlas = atlas_geom
        )
        atlas_instance$group$.cache_name <- sprintf("%s/mri", private$.subject_code)
        atlas <- atlas_instance
      }

      atlas$set_subject_code( self$subject_code )
      self$atlases[[ atlas$atlas_type ]] <- atlas

    },

    # special: must be cached path
    add_vertex_color = function(name, path, lazy = TRUE){
      path <- normalizePath(path)
      self$globals$group$set_group_data(
        name = name,
        value = list(
          path = path,
          absolute_path = path,
          file_name = filename(path),
          is_new_cache = FALSE,
          is_cache = TRUE,
          lazy = lazy
        ),
        is_cached = TRUE
      )
    },

    set_electrodes = function(electrodes){
      if( R6::is.R6(electrodes) && 'brain-electrodes' %in% class(electrodes)){
        self$electrodes <- electrodes
        self$electrodes$set_subject_code( self$subject_code )
      }else{
        self$electrodes$set_electrodes( electrodes )
      }
    },

    set_electrode_values = function(table_or_path){
      self$electrodes$set_values(table_or_path = table_or_path)
    },

    calculate_template_coordinates = function(save_to = 'auto', hemisphere = TRUE){
      table <- self$electrodes$raw_table
      if( !is.data.frame(table) || !nrow(table) ){
        return(invisible())
      }
      # Electrode   Coord_x   Coord_y  Coord_z Label are guaranteed
      n <- nrow(table)
      surface_types <- self$surface_types

      tempenv <- new.env(parent = emptyenv())
      tempenv$has_change <- FALSE

      rows <- lapply(seq_len(n), function(ii){
        row <- table[ii, ]
        fs_position <- c(row$Coord_x, row$Coord_y, row$Coord_z)

        if( all(fs_position == 0) ){
          # this electrode is supposed to be hidden
          return(row)
        }

        is_surface_electrode <- row$SurfaceElectrode
        surf_t <- row$SurfaceType

        if( isTRUE(is_surface_electrode) ){

          if( is.na(surf_t) || surf_t == 'NA' ){
            surf_t <- 'pial'
          }

          # Check if mapped to 141
          mapped <- electrode_mapped_141(position = fs_position, is_surface = TRUE,
                                        vertex_number = row$VertexNumber, surf_type = surf_t,
                                        hemisphere = row$Hemisphere)
          if( !mapped && surf_t %in% surface_types ){
            # load vertices
            lh_vert <- self$surfaces[[ surf_t ]]$group$get_data(sprintf('free_vertices_Standard 141 Left Hemisphere - %s (%s)', surf_t, self$subject_code))
            rh_vert <- self$surfaces[[ surf_t ]]$group$get_data(sprintf('free_vertices_Standard 141 Right Hemisphere - %s (%s)', surf_t, self$subject_code))

            # Needs to get mesh center from hemisphere group. This step is critical as we need to calculate
            # nearest node from global position
            mesh_center <- self$surfaces[[ surf_t ]]$group$position
            lh_dist <- colSums((t(lh_vert) - (fs_position - mesh_center))^2)
            rh_dist <- colSums((t(rh_vert) - (fs_position - mesh_center))^2)

            lh_node <- which.min(lh_dist)
            lh_dist <- lh_dist[ lh_node ]

            rh_node <- which.min(rh_dist)
            rh_dist <- rh_dist[ rh_node ]

            if(hemisphere || !isTRUE(row$Hemisphere %in% c('left', 'right'))){
              # need to calculate hemisphere
              # default is right
              node <- rh_node - 1
              hemisphere <- 'right'

              if( lh_dist < rh_dist ){
                # left
                node <- lh_node - 1
                hemisphere <- 'left'
              }


            } else {
              # do not override hemisphere
              hemisphere <- row$Hemisphere

              if(hemisphere == 'right'){
                node <- rh_node - 1
              } else {
                node <- lh_node - 1
              }
            }

            row$Hemisphere <- hemisphere
            row$VertexNumber <- node
            tempenv$has_change <- TRUE

          }
        }

        # calculate MNI305 position
        mni_position <- c(row$MNI305_x, row$MNI305_y, row$MNI305_z)
        if( all(mni_position == 0) ){
          # need to calculate MNI position
          mni_position <- self$vox2vox_MNI305 %*% c(fs_position, 1)
          row$MNI305_x <- mni_position[1]
          row$MNI305_y <- mni_position[2]
          row$MNI305_z <- mni_position[3]
          tempenv$has_change <- TRUE
        }
        row
      })

      rows <- do.call(rbind, rows)
      nms <- unique(c("Electrode","Coord_x","Coord_y","Coord_z","Label","MNI305_x","MNI305_y","MNI305_z",
                     "SurfaceElectrode","SurfaceType","Radius","VertexNumber","Hemisphere", names(rows)))
      rows <- rows[, nms]

      raw_path <- self$electrodes$raw_table_path
      if( isTRUE( save_to == 'auto' ) ){
        save_to <- raw_path
      }

      if(tempenv$has_change && length(save_to) == 1 && is.character(save_to)){
        safe_write_csv(rows, save_to)

        self$electrodes$set_electrodes(save_to)
        return(invisible(rows))
      }

      self$electrodes$set_electrodes(rows)
      self$electrodes$raw_table_path <- raw_path

      invisible(rows)
    },

    get_geometries = function(volumes = TRUE, surfaces = TRUE, electrodes = TRUE, atlases = TRUE){

      geoms <- list(self$globals)

      if( is.logical(volumes) ){
        if(isTRUE(volumes)){ volumes <- self$volume_types }else{ volumes <- NULL }
      }else{
        volumes <- volumes[ volumes %in% self$volume_types ]
      }

      for( v in volumes ){ geoms <- c( geoms , self$volumes[[ v ]]$object ) }

      if( is.logical(atlases) ){
        if(isTRUE(atlases)){ atlases <- self$atlas_types }else{ atlases <- NULL }
      }else{
        atlases <- atlases[ atlases %in% self$atlas_types ]
      }

      for( a in atlases ){ geoms <- c( geoms , self$atlases[[ a ]]$object ) }

      if( is.logical(surfaces) ){
        if(isTRUE(surfaces)){ surfaces <- self$surface_types }else{ surfaces <- NULL }
      }else{
        surfaces <- surfaces[ surfaces %in% self$surface_types ]
      }

      for( s in surfaces ){
        geoms <- c( geoms , self$surfaces[[ s ]]$left_hemisphere, self$surfaces[[ s ]]$right_hemisphere )
      }

      if( isTRUE(electrodes) && !is.null(self$electrodes) ){
        # self$electrodes$set_values()
        geoms <- c(geoms, self$electrodes$objects)
      }

      geoms <- c(geoms, self$misc)

      return( unlist( geoms ) )

    },

    print = function( ... ){

      cat('Subject -', self$subject_code, end = '\n')

      cat('Transforms:\n\n- FreeSurfer TalXFM [from scanner to MNI305]:\n')
      base::print( self$xfm )
      cat('\n- Torig [Voxel IJK/CRS to FreeSurfer space tkrRAS, vox2ras-tkr]\n')
      base::print( self$Torig )
      cat('\n- Norig [Voxel IJK/CRS to Scanner space, vox2ras]\n')
      base::print( self$Norig )

      cat('\n- Scanner origin in FreeSurfer tkrRAS coordinate\n')
      base::print( self$scanner_center )
      cat('\n- FreeSurfer RAS to MNI305, vox2vox-MNI305\n')
      base::print( self$vox2vox_MNI305 )

      cat(sprintf('Surface information (total count %d)\n', length( self$surfaces )))
      lapply( self$surfaces, function( surface ){
        s <- sprintf( '  %s [ %s ]',  surface$surface_type, surface$mesh_type)
        v <- 'invalid'
        level <- 'WARNING'
        if( surface$has_hemispheres ){
          v <- ''
          level <- 'INFO'
        }
        cat2(s, v , level = level)
        invisible()
      })

      cat(sprintf('Volume information (total count %d)\n', length( self$volumes )))
      lapply( self$volumes, function( volume ){
        s <- sprintf( '  %s',  volume$volume_type)
        v <- 'invalid'
        level <- 'WARNING'
        if( volume$has_volume ){
          v <- ''
          level <- 'INFO'
        }
        cat2(s, v , level = level)
        invisible()
      })

      return(invisible(self))
    },

    localize = function(
      ct_path,
      transform_matrix = NULL,
      transform_space = c("resampled", "ijk2ras", "ras2ras", "fsl"),
      mri_path = NULL,
      col = c("gray80", 'darkgreen'),
      controllers = list(),
      control_presets = NULL,
      voxel_colormap = NULL,
      ...,
      coregistered_ct
    ){
      control_presets <- c('localization', control_presets)
      controllers[["Highlight Box"]] <- FALSE
      controllers[["Outlines"]] %?<-% "on"

      # Backward compatible
      if(missing(ct_path)) {
        if(!missing(coregistered_ct)) {
          ct_path <- coregistered_ct
        } else {
          ct_path <- NULL
        }
      }

      # Localize without CT
      if( !length(ct_path) ) {
        # No CT scan, use 3 planes to localize
        controllers[["Edit Mode"]] %?<-% "MRI slice"
        controllers[["Overlay Coronal"]] <- TRUE
        controllers[["Overlay Axial"]] <- TRUE
        controllers[["Overlay Sagittal"]] <- TRUE
        controllers[["Left Opacity"]] <- 0.1
        controllers[["Right Opacity"]] <- 0.1
        return(self$plot(
          control_presets = control_presets,
          controllers = controllers,
          # custom_javascript = "canvas.controls.noPan=true;",
          ...
        ))
      }

      # Localize with CT instance object
      transform_space <- match.arg(transform_space)

      if( inherits(ct_path, "threeBrain.nii") ) {
        # CT data has been loaded, use loaded CT
        ct <- ct_path
        ct_shape <- ct$get_shape()

        # calculate from CT model to tkrRAS:
        #   from CT geometry model to CT IJK, then to MR RAS, then to tkrRAS
        switch(
          transform_space,
          resampled = {
            trans_mat <- diag(rep(1, 4))
            trans_mat[1:3, 4] <- ct_shape / 2
            trans_mat <- ct$get_IJK_to_tkrRAS(self) %*% trans_mat
          },
          ijk2ras = {
            trans_mat <- diag(rep(1, 4))
            trans_mat[1:3, 4] <- ct_shape / 2
            if(length(transform_matrix) == 1 && is.character(transform_matrix)) {
              transform_matrix <- as.matrix(read.table(transform_matrix, header = FALSE))
            }
            if(length(transform_matrix) != 16L || !is.numeric(transform_matrix)) {
              stop("brain$localize: `transform_matrix` must be a valid path (e.g. path to ct2ti.mat) or a 4x4 affine matrix.")
            }

            trans_mat <- self$Torig %*% solve(self$Norig) %*% transform_matrix %*% trans_mat

          },
          ras2ras = {
            trans_mat <- diag(rep(1, 4))
            trans_mat[1:3, 4] <- ct_shape / 2
            if(length(transform_matrix) == 1 && is.character(transform_matrix)) {
              transform_matrix <- as.matrix(read.table(transform_matrix, header = FALSE))
            }
            if(length(transform_matrix) != 16L || !is.numeric(transform_matrix)) {
              stop("brain$localize: `transform_matrix` must be a valid path (e.g. path to ct2ti.mat) or a 4x4 affine matrix.")
            }
            ct_ijk2ras <- ct$get_IJK_to_RAS()$matrix
            trans_mat <- self$Torig %*% solve(self$Norig) %*% transform_matrix %*% ct_ijk2ras %*% trans_mat

          },
          fsl = {
            trans_mat <- diag(rep(1, 4))
            trans_mat[1:3, 4] <- ct_shape / 2
            ct_ijk2fsl <- ct$get_IJK_to_FSL()

            if(length(transform_matrix) == 1 && is.character(transform_matrix)) {
              transform_matrix <- as.matrix(read.table(transform_matrix, header = FALSE))
            }
            if(length(transform_matrix) != 16L || !is.numeric(transform_matrix)) {
              stop("brain$localize: `transform_matrix` must be a valid path (e.g. path to ct2ti.mat) or a 4x4 affine matrix.")
            }
            if(!inherits(mri_path, "threeBrain.nii")) {
              mri <- read_nii2( normalizePath(mri_path, mustWork = TRUE), head_only = TRUE )
            } else {
              mri <- mri_path
            }
            mri_ijk2fsl <- mri$get_IJK_to_FSL()
            mri_ijk2ras <- mri$get_IJK_to_RAS()$matrix

            # ct_ijk2fsl: CT IJK to FSL
            # transform_matrix CT FSL to MRI FSL
            # solve(mri_ijk2fsl): MRI FSL to MRI IJK
            # mri_ijk2ras: MRI IJK to RAS
            trans_mat <- self$Torig %*% solve(self$Norig) %*% mri_ijk2ras %*% solve(mri_ijk2fsl) %*% transform_matrix %*% ct_ijk2fsl %*% trans_mat
          }
        )

        add_voxel_cube(self, "CT", ct$get_data(), size = ct_shape,
                       trans_mat = trans_mat, color_format = "RedFormat")
      } else {

        # CT is not loaded, ct_path is a nifti file
        ct_path <- normalizePath(ct_path, mustWork = TRUE)
        ct <- read_nii2( ct_path, head_only = TRUE )
        ct_shape <- ct$get_shape()

        if( transform_space != "resampled" ) {
          if(length(transform_matrix) == 1 && is.character(transform_matrix)) {
            transform_matrix <- as.matrix(read.table(transform_matrix, header = FALSE))
          }
          if(length(transform_matrix) != 16L || !is.numeric(transform_matrix)) {
            stop("brain$localize: `transform_matrix` must be a valid path (e.g. path to ct2ti.mat) or a 4x4 affine matrix.")
          }
        }

        # Calculate transform from CT RAS to tkrRAS
        switch(
          transform_space,
          resampled = {
            # from nifti RAS to tkrRAS
            trans_mat <- self$Torig %*% solve(self$Norig)
          },
          ijk2ras = {
            # assume in CT RAS, we need to show in tkrRAS
            # transform_matrix is from CT IJK to MR RAS
            ct_ijk2ras <- ct$get_IJK_to_RAS()$matrix
            trans_mat <- self$Torig %*% solve(self$Norig) %*% transform_matrix %*% solve(ct_ijk2ras)
          },
          ras2ras = {
            # assume in CT RAS, we need to show in tkrRAS
            # transform_matrix is from CT RAS to MR RAS
            trans_mat <- self$Torig %*% solve(self$Norig) %*% transform_matrix
          },
          fsl = {
            # assume in CT RAS, we need to show in tkrRAS
            # transform_matrix is from CT FSL to MR FSL

            if(!inherits(mri_path, "threeBrain.nii")) {
              mri <- read_nii2( normalizePath(mri_path, mustWork = TRUE), head_only = TRUE )
            } else {
              mri <- mri_path
            }
            mri_ijk2fsl <- mri$get_IJK_to_FSL()
            mri_ijk2ras <- mri$get_IJK_to_RAS()$matrix
            ct_ijk2fsl <- ct$get_IJK_to_FSL()
            ct_ijk2ras <- ct$get_IJK_to_RAS()$matrix

            # ct_ijk2fsl: CT IJK to FSL
            # transform_matrix CT FSL to MRI FSL
            # solve(mri_ijk2fsl): MRI FSL to MRI IJK
            # mri_ijk2ras: MRI IJK to RAS
            trans_mat <- self$Torig %*% solve(self$Norig) %*% mri_ijk2ras %*% solve(mri_ijk2fsl) %*% transform_matrix %*% ct_ijk2fsl %*% solve(ct_ijk2ras)
          }
        )

        # add_voxel_cube(self, "CT", ct$get_data(), size = ct_shape,
        #                trans_mat = trans_mat, color_format = "RedFormat")
        add_nifti(self, "CT", path = ct_path,
                  color_format = "RedFormat", trans_mat = trans_mat,
                  trans_space_from = "scannerRAS")
      }

      key <- seq(0, 5000)
      cmap <- create_colormap(
        gtype = 'volume', dtype = 'continuous',
        key = key, value = key,

        # using RedFormat so color map is the color intensity in gray
        color = c("black", "white"),

        bias = 0.2,

        # automatically re-scale the color map
        auto_rescale = TRUE
      )

      # Set CT color map
      self$atlases$CT$object$color_map <- cmap
      controllers[["Left Opacity"]] <- 0.4
      controllers[["Right Opacity"]] <- 0.4
      controllers[["Voxel Type"]] <- "CT"
      controllers[["Voxel Display"]] <- "normal"
      controllers[["Voxel Min"]] <- 3000
      controllers[["Edit Mode"]] %?<-% "CT/volume"

      # check if surface exists
      if(!length(self$surfaces)) {
        controllers[["Overlay Coronal"]] %?<-% TRUE
        controllers[["Overlay Axial"]] %?<-% TRUE
        controllers[["Overlay Sagittal"]] %?<-% TRUE
      }

      # Also add other atlases
      self$add_atlas("aparc+aseg")
      self$add_atlas("aparc.DKTatlas+aseg")
      self$add_atlas("aparc.a2009s+aseg")
      self$add_atlas("aseg")

      # Add other Surfaces for surface mapping
      if(!is.null(self$add_surface("pial-outer-smoothed"))) {
        self$add_surface("sphere.reg")
      }

      self$plot(
        control_presets = control_presets,
        controllers = controllers,
        # custom_javascript = "canvas.controls.noPan=true;",
        ...
      )
    },

    plot = function( # Elements
      volumes = TRUE, surfaces = TRUE, atlases = TRUE, start_zoom = 1, cex = 1,
      background = '#FFFFFF',

      # Layouts
      side_canvas = TRUE, side_width = 250, side_shift = c(0, 0), side_display = TRUE,
      control_panel = TRUE, control_display = TRUE, default_colormap = NULL,

      # Legend and color
      palettes = NULL,

      # For control panels = TRUE
      control_presets = NULL,
      # Animation, also needs control panels = TRUE
      time_range = NULL, val_ranges = NULL, value_alias = NULL,

      value_ranges = val_ranges, controllers = list(),

      width = NULL, height = NULL, debug = FALSE, token = NULL, browser_external = TRUE,
      additional_geoms = NULL, ... ){


      # collect volume information
      geoms <- self$get_geometries( volumes = volumes, surfaces = surfaces, electrodes = TRUE, atlases = atlases )
      geoms <- c(geoms, additional_geoms)

      is_r6 <- vapply(geoms, function(x){ 'AbstractGeom' %in% class(x) }, FALSE)
      geoms <- geoms[is_r6]
      names(geoms) <- NULL

      global_data <- self$global_data


      control_presets <- unique(
        c( 'subject2', 'surface_type2', 'hemisphere_material', 'surface_color',
           'map_template', 'electrodes', 'voxel', control_presets, 'animation',
           'display_highlights')
      )

      if( !length(self$volumes) ){
        side_display <- FALSE
      }

      # check if surface exists
      if(!length(self$surfaces)) {
        controllers <- as.list(controllers)
        controllers[["Overlay Coronal"]] %?<-% TRUE
        controllers[["Overlay Axial"]] %?<-% TRUE
        controllers[["Overlay Sagittal"]] %?<-% TRUE
      }

      threejs_brain(
        .list = geoms,
        palettes = palettes, controllers = controllers, value_alias = value_alias,
        side_canvas = side_canvas,  side_width = side_width, side_shift = side_shift,
        control_panel = control_panel, control_presets = control_presets,
        control_display = control_display, value_ranges = value_ranges,
        default_colormap = default_colormap, side_display = side_display,
        width = width, height = height, debug = debug, token = token,
        browser_external = browser_external, global_data = global_data,
        start_zoom = start_zoom, cex = cex, background = background, ...)
    },

    render = function(
      outputId, ..., controllers = list(), show_modal = FALSE,
      session = shiny::getDefaultReactiveDomain()
    ) {
      if(!is.environment(session)) {
        session <- shiny::MockShinySession$new()
      }
      proxy <- brain_proxy(outputId, session = session)

      user_controllers <- as.list(controllers)
      controllers <- user_controllers
      main_camera <- list()

      # get controller and camera information
      tryCatch({
        shiny::isolate({
          main_camera <- as.list(proxy$main_camera)
          controllers <- as.list(proxy$get_controllers())
          for(nm in names(user_controllers)) {
            controllers[[ nm ]] <- user_controllers[[ nm ]]
          }
        })
      }, error = function(...){})

      # remember background
      background <- controllers[["Background Color"]]
      if(length(background) != 1) {
        background <- "#FFFFFF"
      }

      # remember zoom-level
      zoom_level <- main_camera$zoom
      if(length(zoom_level) != 1 || zoom_level <= 0) {
        zoom_level <- 1
      }

      # remember camera position
      position <- as.numeric(unname(unlist(main_camera$position)))
      up <- as.numeric(unname(unlist(main_camera$up)))
      if(length(position) != 3 || length(up) != 3 ||
         all(position == 0) || all(up == 0) ||
         any(is.na(position)) || any(is.na(up))) {
        position <- c(0, 0, 500)
        up <- c(0, 1, 0)
      } else {
        position <- position / sqrt(sum(position^2)) * 500
        up <- up / sqrt(sum(up^2))
      }

      # remember variable names
      dnames <- names(self$electrodes$value_table)
      dnames <- dnames[!dnames %in% c("Project", "Subject", "Electrode", "Time", "Label")]
      dname <- controllers[["Display Data"]]
      if(length(dname) != 1 || !dname %in% dnames) {
        dname <- NULL
        if(length(dnames)) {
          dname <- dnames[[1]]
        }
      }

      # set variable name and reset range if inconsistent
      if(!identical(controllers[["Display Data"]], dname) && length(dname)) {
        controllers[["Display Data"]] <- dname
        controllers[["Display Range"]] <- ""
      }

      # remember side panel options
      if(!isTRUE(controllers[["Show Panels"]])) {
        controllers[["Show Panels"]] <- FALSE
      }

      self$plot(
        show_modal = show_modal,
        background = background,
        controllers = controllers,
        start_zoom = zoom_level,
        # send signals to update parameters such as camera, zoom-level...
        custom_javascript = sprintf(
          '
          // Remove the focus box
          if( canvas.focus_box ) {
            canvas.focus_box.visible = false;
          }

          // set camera
          canvas.mainCamera.position.set( %f , %f , %f );
          canvas.mainCamera.up.set( %f , %f , %f );
          canvas.mainCamera.updateProjectionMatrix();

          // Let shiny know the viewer is ready
          if( window.Shiny ) {
            window.Shiny.setInputValue("%s", "%f");
          }

          // Force render one frame (update the canvas)
          canvas.needsUpdate = true;
          ',
          position[[1]], position[[2]], position[[3]],
          up[[1]], up[[2]], up[[3]],
          session$ns( outputId ),
          Sys.time()
        ),
        ...
      )

    }

  ),
  active = list(
    subject_code = function(v){
      if(!missing(v)){
        stop('Cannot set subject code. This attribute cannot be changed once you initialize Brain2 object.')
      }
      private$.subject_code
    },
    vox2vox_MNI305 = function(){
      self$xfm %*% self$Norig %*% solve(self$Torig)
    },
    scanner_center = function(){
      # RAS - 0,0,0
      # inv(Torig) * RAS_origin -> RAS origin in FS space
      # Norig * inv(Torig) * RAS_origin -> RAS origin in scanner space
      #

      -(self$Norig %*% solve( self$Torig ) %*% c(0,0,0,1))[1:3]

      # It's the same as the following transform
      # (self$Torig %*% solve( self$Norig ) %*% c(0,0,0,1))[1:3]

    },
    surface_types = function(){
      names(self$surfaces)
    },
    surface_mesh_types = function(){
      sapply(self$surface_types, function(st){ self$surfaces[[st]]$mesh_type }, simplify = FALSE, USE.NAMES = TRUE)
    },
    volume_types = function(){
      names(self$volumes)
    },
    atlas_types = function(){
      names(self$atlases)
    },
    global_data = function(){
      re <- structure(list(list(
        Norig = self$Norig,
        Torig = self$Torig,
        xfm = self$xfm,
        vox2vox_MNI305 = self$vox2vox_MNI305,
        scanner_center = self$scanner_center,
        atlas_types = self$atlas_types,
        volume_types = self$volume_types
      )), names = self$subject_code)
      re$.subject_codes <- self$subject_code
      re
    },
    base_path = function(v) {
      if(missing(v)) {
        if(length(private$.base_path)) {
          if(!file.exists(private$.base_path)) {
            private$.base_path <- character(0L)
          }
        }
        return(private$.base_path)
      }
      if(length(v) == 0) {
        private$.base_path <- character(0L)
        return(private$.base_path)
      }
      if(length(v) != 1 || is.na(v) || !file.exists(v)) {
        stop("Cannot assign brain$base_path: file path must be length(1) and must exist")
      }
      private$.base_path <- normalizePath(v)
      fs_path <- private$.base_path
      surface_filenames <- list.files(file.path(fs_path, "surf"), pattern = "^[lr]h\\.", ignore.case = TRUE)
      available_surfaces <- unique(gsub("^[l|r]h\\.", "", surface_filenames, ignore.case = TRUE))
      available_surfaces <- available_surfaces[!grepl("^(sulc|thick|volume|jacob|curv|area)", available_surfaces, ignore.case = TRUE)]
      available_surfaces <- available_surfaces[!grepl("(crv|mgh|curv|labels|label)$", available_surfaces, ignore.case = TRUE)]
      private$.available_surfaces <- available_surfaces
      return(private$.base_path)
    },
    available_surfaces = function() {
      private$.available_surfaces
    }
  )
)


