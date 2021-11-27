# surface = BrainSurface$new('YAB', surface_type = 'pial', mesh_type = 'std.141', left_hemisphere = s$left, right_hemisphere = s$right)
# volume = BrainVolume$new(subject_code = 'YAB', volume_type = 'brain.finalsurf', volume = env$volume)


Brain2 <- R6::R6Class(
  classname = 'rave-brain',
  portable = FALSE,
  cloneable = TRUE,
  private = list(
    .subject_code = ''
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

      self$xfm <- xfm
      self$Norig <- Norig
      self$Torig <- Torig

      self$volumes <- list()
      self$surfaces <- list()
      self$electrodes <- BrainElectrodes$new(subject_code = subject_code)
      self$meta <- list()

      # TODO: put all brain global data (transform etc...) here
      self$misc <- BlankGeom$new(
        group = GeomGroup$new(name = sprintf('_internal_group_data_%s', subject_code)),
        name = sprintf('_misc_%s', subject_code)
      )
    },

    add_surface = function(surface){
      stopifnot2( R6::is.R6( surface ) && 'brain-surface' %in% class( surface ),
                  msg = 'surface must be a brain-surface object')

      stopifnot2( surface$has_hemispheres, msg = 'surface miss mesh objects')

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

    add_atlas = function(atlas){
      stopifnot2( R6::is.R6( atlas ) && 'brain-atlas' %in% class( atlas ),
                  msg = 'atlas must be a brain-atlas object')

      stopifnot2( atlas$has_atlas, msg = 'atlas miss datacube2 objects')

      atlas$set_subject_code( self$subject_code )
      self$atlases[[ atlas$atlas_type ]] <- atlas

    },

    # special: must be cached path
    add_vertex_color = function(name, path, lazy = TRUE){
      path <- normalizePath(path)
      self$misc$group$set_group_data(
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

      geoms <- list(self$misc)

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

      return( unlist( geoms ) )

    },

    print = function( ... ){

      cat('Subject -', self$subject_code, end = '\n')

      cat('Transforms:\n\n- FreeSurfer TalXFM [from scanner to MNI305]:\n')
      base::print( self$xfm )
      cat('\n- Torig [Voxel CRS to FreeSurfer origin, vox2ras-tkr]\n')
      base::print( self$Torig )
      cat('\n- Norig [Voxel CRS to Scanner center, vox2ras]\n')
      base::print( self$Norig )

      cat('\n- Scanner center relative to FreeSurfer origin\n')
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
      coregistered_ct,
      col = c("white", "green", 'darkgreen'),
      controllers = list(),
      control_presets = NULL,
      voxel_colormap = NULL,
      ...
    ){
      control_presets <- c('localization', control_presets)

      if(!missing( coregistered_ct )){
        ct <- read_nii2( normalizePath(coregistered_ct, mustWork = TRUE) )
        cube <- reorient_volume( ct$get_data(), self$Torig )
        add_voxel_cube(self, "CT", cube)

        key <- seq(0, max(cube))
        cmap <- create_colormap(
          gtype = 'volume', dtype = 'continuous',
          key = key, value = key,
          color = col
        )
        controllers[["Left Opacity"]] <- 0.4
        controllers[["Right Opacity"]] <- 0.4
        controllers[["Voxel Type"]] <- "CT"
        controllers[["Voxel Min"]] <- 3000
        controllers[["Edit Mode"]] <- "CT/volume"
        self$plot(
          control_presets = control_presets,
          voxel_colormap = cmap,
          controllers = controllers,
          # custom_javascript = "canvas.controls.noPan=true;",
          ...
        )
      } else {
        # No CT scan, use 3 planes to localize
        controllers[["Edit Mode"]] <- "MRI slice"
        controllers[["Overlay Coronal"]] <- TRUE
        controllers[["Overlay Axial"]] <- TRUE
        controllers[["Overlay Sagittal"]] <- TRUE
        controllers[["Left Opacity"]] <- 0.1
        controllers[["Right Opacity"]] <- 0.1
        self$plot(
          control_presets = control_presets,
          controllers = controllers,
          # custom_javascript = "canvas.controls.noPan=true;",
          ...
        )
      }
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

      width = NULL, height = NULL, debug = FALSE, token = NULL, browser_external = TRUE, ... ){


      # collect volume information
      geoms <- self$get_geometries( volumes = volumes, surfaces = surfaces, electrodes = TRUE, atlases = atlases )

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

      # # check if curvature files exist
      # global_files =

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
    }
  )
)


