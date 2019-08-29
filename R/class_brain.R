# surface = BrainSurface$new('YAB', surface_type = 'pial', mesh_type = 'std.141', left_hemisphere = s$left, right_hemisphere = s$right)
# volume = BrainVolume$new(subject_code = 'YAB', volume_type = 'brain.finalsurf', volume = env$volume)

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

        self$left_hemisphere$subject_code = subject_code
        self$right_hemisphere$subject_code = subject_code
        self$group$subject_code = subject_code

        if( self$mesh_type == 'std.141' ){
          self$left_hemisphere$name = sprintf("Standard 141 Left Hemisphere - %s (%s)",
                                              self$surface_type, subject_code)
          self$right_hemisphere$name = sprintf("Standard 141 Right Hemisphere - %s (%s)",
                                              self$surface_type, subject_code)
        }else{
          self$left_hemisphere$name = sprintf("FreeSurfer Left Hemisphere - %s (%s)",
                                              self$surface_type, subject_code)
          self$right_hemisphere$name = sprintf("FreeSurfer Right Hemisphere - %s (%s)",
                                               self$surface_type, subject_code)
        }

        self$group$name = sprintf("Surface - %s (%s)", self$surface_type, subject_code)

      }

      self$subject_code = subject_code
    },

    set_group_position = function(...){
      pos = c(...)
      stopifnot2(is.numeric(pos) && length(pos) == 3, msg = "Position must be numeric of length 3")
      self$group$position = pos
    },

    initialize = function(
      subject_code, surface_type, mesh_type, left_hemisphere, right_hemisphere, position = NULL
    ){

      # right now only supports std.141 and fs mesh_type
      stopifnot2(mesh_type %in% c('std.141', 'fs'),
                 msg = 'We only support standard 141 brain or FreeSurfer brain')

      left_hemisphere$hemisphere = 'left'
      left_hemisphere$surface_type = surface_type
      self$left_hemisphere = left_hemisphere

      right_hemisphere$hemisphere = 'right'
      right_hemisphere$surface_type = surface_type
      self$right_hemisphere = right_hemisphere

      if( !identical(left_hemisphere$group,right_hemisphere$group) ){
        for( nm in names( right_hemisphere$group$group_data ) ){
          left_hemisphere$group$group_data[[ nm ]] = right_hemisphere$group$group_data[[ nm ]]
        }
        right_hemisphere$group = left_hemisphere$group
      }
      self$group = left_hemisphere$group
      self$surface_type = surface_type
      self$mesh_type = mesh_type

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
      valid = c(FALSE, FALSE)
      if( !is.null(self$left_hemisphere) &&
          R6::is.R6(self$left_hemisphere) &&
          'FreeGeom' %in% class(self$left_hemisphere)){
        valid[1] = TRUE
      }
      if( !is.null(self$right_hemisphere) &&
          R6::is.R6(self$right_hemisphere) &&
          'FreeGeom' %in% class(self$right_hemisphere)){
        valid[2] = TRUE
      }

      return(all(valid))
    }
  )
)


BrainVolume <- R6::R6Class(
  classname = 'brain-volume',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = '',

    # which surface type pial, white, inflated ...
    volume_type = 'brain.finalsurf',

    # to store freemesh objects, left, right, in sequential
    object = NULL,

    group = NULL,

    set_subject_code = function( subject_code ){
      if( self$has_volume ){
        self$object$subject_code = subject_code
        self$group$subject_code = subject_code

        self$object$name = sprintf('%s (%s)', self$volume_type, subject_code)
        self$group$name = sprintf("Volume - %s (%s)", self$volume_type, subject_code)
      }

      self$subject_code = subject_code
    },

    set_group_position = function(...){
      pos = c(...)
      stopifnot2(is.numeric(pos) && length(pos) == 3, msg = "Position must be numeric of length 3")
      self$group$position = pos
    },

    initialize = function(
      subject_code, volume_type, volume, position = NULL
    ){

      self$object = volume
      self$group = volume$group
      self$set_subject_code( subject_code )

      self$volume_type = volume_type

      # position is set for group
      if( length(position) == 3 ){
        self$set_group_position( position )
      }
    },

    print = function( ... ){

      cat('Subject\t\t:', self$subject_code, end = '\n')
      cat('Volume type\t:', self$volume_type, end = '\n')

      if( !self$has_volume ){
        warning('No volume found!')
      }

      invisible( self )
    }

  ),
  active = list(
    has_volume = function(){
      if( !is.null(self$object) &&
          R6::is.R6(self$object) &&
          'DataCubeGeom' %in% class(self$object)){
        return(TRUE)
      }

      return(FALSE)
    }
  )
)

BrainElectrodes <- R6::R6Class(
  classname = 'brain-electrodes',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    subject_code = NULL,

    # used to store electrode data frame, do not call directly, use set_electrodes
    raw_table = NULL,

    # A list that stores electrodes
    objects = NULL,

    # electrode group
    group = NULL,

    set_subject_code = function( subject_code ){
      if( !is.null(self$group) ){
        self$group$name = sprintf('Electrodes (%s)', subject_code)
      }
      self$set_electrodes( self$raw_table )
      self$subject_code = subject_code
    },

    initialize = function(subject_code){
      self$group = GeomGroup$new(name = sprintf('Electrodes (%s)', subject_code), position = c(0,0,0))
      self$set_subject_code( subject_code )
    },

    set_electrodes = function(table_or_path){
      if( is.null(table_or_path) ){
        return(invisible())
      }
      stopifnot2(is.data.frame(table_or_path) || (length(table_or_path) == 1) && is.character(table_or_path),
                 msg = 'table_or_path must be either data.frame or path to electrodes.csv')
      if(!is.data.frame(table_or_path)){
        # table_or_path = '~/Downloads/YAB_electrodes.csv'
        table = read.csv(table_or_path, stringsAsFactors = FALSE)
      }else{
        table = table_or_path
      }

      stopifnot2(all(c('Electrode', 'Coord_x', 'Coord_y', 'Coord_z') %in% names(table)),
                 msg = 'electrode table must contains Electrode (integer), Coord_x,Coord_y,Coord_z in FreeSurfer RAS coordinates')

      n = nrow(table)

      if( n == 0 ){
        return(invisible())
      }

      # auto generate label
      if( !length(table$Label) ){
        table$Label = sprintf('NoLabel-%d', seq_len(n))
      }

      # Check coordinates
      table$Coord_x = as.numeric( table$Coord_x )
      table$Coord_y = as.numeric( table$Coord_y )
      table$Coord_z = as.numeric( table$Coord_z )
      na_coord = is.na(table$Coord_x) | is.na(table$Coord_y) | is.na(table$Coord_z)
      if( any(na_coord) ){
        table$Coord_x[ na_coord ] = 0
        table$Coord_y[ na_coord ] = 0
        table$Coord_z[ na_coord ] = 0
      }

      if( all( paste0('MNI305_', c('x','y','z')) %in% names(table) ) ){
        table$MNI305_x = as.numeric( table$MNI305_x )
        table$MNI305_y = as.numeric( table$MNI305_y )
        table$MNI305_z = as.numeric( table$MNI305_z )
        na_coord = is.na(table$MNI305_x) | is.na(table$MNI305_y) | is.na(table$MNI305_z)
        if( any(na_coord) ){
          table$MNI305_x[ na_coord ] = 0
          table$MNI305_y[ na_coord ] = 0
          table$MNI305_z[ na_coord ] = 0
        }
      }else{
        table$MNI305_x = 0
        table$MNI305_y = 0
        table$MNI305_z = 0
      }

      if( length(table$SurfaceElectrode) ){
        table$SurfaceElectrode = stringr::str_to_upper(table$SurfaceElectrode) %in% c('T', 'TRUE')
      }else{
        table$SurfaceElectrode = FALSE
      }

      if( !length(table$SurfaceType) ){
        table$SurfaceType = 'pial'
      }
      table$SurfaceType = as.character(table$SurfaceType)

      if( !length(table$Radius) ){
        table$Radius = 2
      }
      table$Radius = as.numeric( table$Radius )
      table$Radius[ is.na(table$Radius) ] = 2

      if( !length(table$VertexNumber) ){
        table$VertexNumber = -1
      }
      table$VertexNumber = as.integer(table$VertexNumber)
      table$VertexNumber[ is.na(table$VertexNumber) ] = -1

      if( !length(table$Hemisphere) ){
        table$Hemisphere = NA
      }

      self$raw_table = table

      # Generate objects
      self$objects = list()


      subject_code = self$subject_code
      for( ii in seq_len(n) ){
        row = table[ii, ]
        which_side = row$Hemisphere
        nearest_vertex = row$VertexNumber
        mni_305 = c( row$MNI305_x, row$MNI305_y, row$MNI305_z );
        if(length(mni_305)!=3){ mni_305 = c(0,0,0) }
        surf_type = c(row$SurfaceType, 'pial')[1]
        if( is.na(surf_type) ){ surf_type = 'NA' }
        radius = row$Radius


        el = ElectrodeGeom$new(name = sprintf('%s, %d - %s', subject_code, row$Electrode, row$Label),
                               position = c(row$Coord_x, row$Coord_y, row$Coord_z),
                               radius = radius, group = self$group)
        el$is_surface_electrode = isTRUE( row$SurfaceElectrode )
        el$hemisphere = which_side
        el$surface_type = surf_type
        el$vertex_number = nearest_vertex
        el$subject_code = subject_code
        el$MNI305_position = mni_305
        self$objects[[ row$Electrode ]] = el
      }
    }
  )
)



Brain2 <- R6::R6Class(
  classname = 'rave-brain',
  portable = TRUE,
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

    #Stores a list of BrainElectrodes objects
    electrodes = NULL,

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

      private$.subject_code = subject_code

      self$xfm = xfm
      self$Norig = Norig
      self$Torig = Torig

      self$volumes = list()
      self$surfaces = list()
      self$electrodes = BrainElectrodes$new(subject_code = subject_code)
      self$meta = list()
    },

    add_surface = function(surface){
      stopifnot2( R6::is.R6( surface ) && 'brain-surface' %in% class( surface ),
                  msg = 'surface must be a brain-surface object')

      stopifnot2( surface$has_hemispheres, msg = 'surface miss mesh objects')

      if( surface$mesh_type == 'std.141' ){
        surface$set_group_position( self$scanner_center )

        offset_x = switch (
          surface$surface_type,
          'inflated' = { offset_x = 50 },
          'sphere' = { offset_x = 128 },
          { 0 }
        )
        surface$left_hemisphere$position = c(-offset_x, 0, 0)
        surface$right_hemisphere$position = c(offset_x, 0, 0)

      }else if( surface$mesh_type == 'fs' ){
        surface$set_group_position( 0, 0, 0 )
      }

      surface$set_subject_code( self$subject_code )
      self$surfaces[[ surface$surface_type ]] = surface

    },

    remove_surface = function(surface_types){
      if(missing(surface_types)){
        surface_types = self$surface_types
      }
      for( s in surface_types){
        self$surfaces[[ s ]] = NULL
      }
    },

    remove_volume = function(volume_types){
      if(missing(volume_types)){
        volume_types = self$volume_types
      }
      for( s in volume_types){
        self$volumes[[ s ]] = NULL
      }
    },

    add_volume = function(volume){
      stopifnot2( R6::is.R6( volume ) && 'brain-volume' %in% class( volume ),
                 msg = 'volume must be a brain-volume object')

      stopifnot2( volume$has_volume, msg = 'volume miss datacube objects')

      volume$set_subject_code( self$subject_code )
      self$volumes[[ volume$volume_type ]] = volume

    },

    set_electrodes = function(electrodes){
      if( R6::is.R6(electrodes) && 'brain-electrodes' %in% class(electrodes)){
        self$electrodes = electrodes
        self$electrodes$set_subject_code( self$subject_code )
      }else{
        self$electrodes$set_electrodes( electrodes )
      }
    },

    get_geometries = function(volumes = TRUE, surfaces = TRUE, electrodes = TRUE){

      geoms = list()

      if( is.logical(volumes) ){
        if(isTRUE(volumes)){ volumes = self$volume_types }else{ volumes = NULL }
      }else{
        volumes = volumes[ volumes %in% self$volume_types ]
      }

      for( v in volumes ){ geoms = c( geoms , self$volumes[[ v ]]$object ) }

      if( is.logical(surfaces) ){
        if(isTRUE(surfaces)){ surfaces = self$surface_types }else{ surfaces = NULL }
      }else{
        surfaces = surfaces[ surfaces %in% self$surface_types ]
      }

      for( s in surfaces ){
        geoms = c( geoms , self$surfaces[[ s ]]$left_hemisphere, self$surfaces[[ s ]]$right_hemisphere )
      }

      if( isTRUE(electrodes) ){
        geoms = c(geoms, self$electrodes$objects)
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
        s = sprintf( '  %s [ %s ]',  surface$surface_type, surface$mesh_type)
        v = 'invalid'
        level = 'WARNING'
        if( surface$has_hemispheres ){
          v = ''
          level = 'INFO'
        }
        cat2(s, v , level = level)
        invisible()
      })

      cat(sprintf('Volume information (total count %d)\n', length( self$volumes )))
      lapply( self$volumes, function( volume ){
        s = sprintf( '  %s',  volume$volume_type)
        v = 'invalid'
        level = 'WARNING'
        if( volume$has_volume ){
          v = ''
          level = 'INFO'
        }
        cat2(s, v , level = level)
        invisible()
      })

      return(invisible(self))
    },

    plot = function( # Elements
      volumes = TRUE, surfaces = TRUE,

      # Layouts
      side_camera = TRUE, control_panel = TRUE,

      # Legend and color
      show_legend = TRUE, legend_title = 'Value',
      color_ramp = c('navyblue', '#e2e2e2', 'red'),   # Palette
      color_type = 'continuous',                      # variable type
      color_names = seq_along(color_ramp),            # For discrete
      n_color = 64,

      # For control panels = TRUE
      control_presets = NULL,
      # Animation, also needs control panels = TRUE
      time_range = NULL, value_range = NULL, symmetric = 0,

      width = NULL, height = NULL, debug = FALSE, token = NULL, browser_external = TRUE, ... ){

      # camera_pos = c(0, 0, 500)
      # start_zoom = 1
      # camera_center = c(0, 0, 0)
      # side_camera_zoom = 1
      # coords = NULL
      # tmp_dirname = NULL

      # collect volume information
      geoms = self$get_geometries( volumes = volumes, surfaces = surfaces, electrodes = TRUE )

      is_r6 = vapply(geoms, function(x){ 'AbstractGeom' %in% class(x) }, FALSE)
      geoms = geoms[is_r6]
      names(geoms) = NULL

      global_data = self$global_data

      control_presets = unique(c( 'subject2', 'surface_type2', 'hemisphere_material',
                                  'map_template', 'animation' ), control_presets)

      threejs_brain(
        .list = geoms,
        time_range = time_range, value_range = value_range, symmetric = symmetric,
        side_camera = side_camera,  control_panel = control_panel, control_presets = control_presets,
        color_ramp = color_ramp, color_type = color_type, n_color = n_color,
        color_names = color_names, show_legend = show_legend, legend_title = legend_title,
        width = width, height = height, debug = debug, token = token,
        browser_external = browser_external, global_data = global_data, ...)
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
    global_data = function(){
      structure(list(list(
        Norig = self$Norig,
        Torig = self$Torig,
        xfm = self$xfm,
        vox2vox_MNI305 = self$vox2vox_MNI305,
        scanner_center = self$scanner_center
      )), names = self$subject_code)
    }
  )
)


