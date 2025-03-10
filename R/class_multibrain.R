

#' @title Create Multi-subject Template
#' @author Zhengjia Wang
#' @param ...,.list \code{Brain2} objects
#' @param template_surface_types which template surface types to load, default is auto-guess
#' @param template_subject character, subject code to be treated as template, default is `N27`
#' @param template_dir the parent directory where template subject is stored in
#' @export
merge_brain <- function(
  ..., .list = NULL,
  template_surface_types = NULL,
  template_subject = unname(getOption('threeBrain.template_subject', 'N27')),
  template_dir = default_template_directory()
){
  MultiBrain2$new( ... , .list = .list, template_subject = template_subject,
                   template_dir = template_dir, template_surface_types = template_surface_types)
}


MultiBrain2 <- R6::R6Class(
  classname = 'multi-rave-brain',
  portable = FALSE,
  cloneable = FALSE,
  public = list(

    template_object = NULL,

    # Stores rave-brain
    objects = list(),

    initialize = function(
      ..., .list = NULL,
      template_surface_types = NULL,
      template_atlas_types = NULL,
      template_annotation_types = "label/aparc.a2009s",
      template_subject = unname(getOption('threeBrain.template_subject', 'N27')),
      template_dir = default_template_directory(),
      use_cache = TRUE, use_141 = unname(getOption('threeBrain.use141', TRUE)) ){


      l <- unlist( c(list(...), .list) )
      self$objects <- list()
      for( x in l ){
        if( 'rave-brain' %in% class(x) ){
          if( x$subject_code == template_subject ){
            self$template_object <- x
          }else{
            self$add_subject( x )
          }
        }
      }

      if( is.null(self$template_object) ){
        self$alter_template( template_subject = template_subject,
                             surface_types = template_surface_types,
                             atlas_types = template_atlas_types,
                             annotation_types = template_annotation_types,
                             template_dir = template_dir,
                             use_cache = use_cache, use_141 = use_141,
                             ... )
      }
    },

    alter_template = function(
      surface_types = NULL,
      atlas_types = NULL,
      annotation_types = "label/aparc.a2009s",
      template_subject = unname(getOption('threeBrain.template_subject', 'N27')),
      template_dir = default_template_directory(),
      use_cache = TRUE, use_141 = unname(getOption('threeBrain.use141', TRUE)),
      ...
    ){
      # test
      template_path <- file.path(template_dir, template_subject)

      if( template_subject == 'N27' ){
        check_freesurfer_path(template_path, autoinstall_template = TRUE)
      }

      # If N27, make sure it's installed
      stopifnot2(check_freesurfer_path(template_path),
                 msg = paste0('Cannot find template subject - ', template_subject,
                              '\nYou might want to download template subject via ',
                              'the following command if the template exists:\n\n\t',
                              sprintf('threeBrain::download_template_subject("%s")', template_subject),
                              '\n\nTo install Collins-N27 template brain, you can use:\n\n\t',
                              'threeBrain::download_N27(make_default=TRUE)'))

      if( !length( surface_types ) ){
        surface_types <- lapply(self$objects, function(x){ x$surface_types })
        surface_types <- unique(unlist(surface_types))
      }
      surface_types <- unique(c('pial', 'pial-outer-smoothed', 'sphere.reg',
                                unlist( surface_types )))

      if( !length(atlas_types) ) {
        atlas_types <- lapply(self$objects, function(x){ x$atlas_types })
        atlas_types <- unique(unlist(atlas_types))
        if(!length(atlas_types)) {
          atlas_types <- "wmparc"
        }
      }

      # check if pial-outer-smoothed exist
      lh_envelope <- file.path(template_path, "surf", 'lh.pial-outer-smoothed')
      rh_envelope <- file.path(template_path, "surf", 'rh.pial-outer-smoothed')
      if(!file.exists(lh_envelope)) {
        surface_path <- file.path(template_path, "surf", 'lh.pial')
        envelope <- generate_smooth_envelope(
          surface_path = surface_path, save_as = lh_envelope,
          verbose = TRUE, save_format = "bin"
        )
      }
      if(!file.exists(rh_envelope)) {
        surface_path <- file.path(template_path, "surf", 'rh.pial')
        envelope <- generate_smooth_envelope(
          surface_path = surface_path, save_as = rh_envelope,
          verbose = TRUE, save_format = "bin"
        )
      }

      self$template_object <- threeBrain(
        path = template_path,
        subject_code = template_subject,
        surface_types = surface_types,
        template_subject = template_subject,
        atlas_types = atlas_types,
        annotation_types = annotation_types,
        ...
      )

      # special treatments
      if( isTRUE(template_subject %in% "cvs_avg35_inMNI152") ) {
        # cvs_avg35_inMNI152 should sit in MNI152 space. However,
        # it seems cvs_avg35_inMNI152 is not MNI152 aligned,
        # possibly using non standard file or template c (c is different than
        # a/b)
        self$template_object$xfm <- solve(MNI305_to_MNI152)
      }

    },

    add_subject = function(x){
      if( 'rave-brain' %in% class(x) && !x$subject_code %in% self$subject_codes){
        self$objects[[ x$subject_code ]] <- x
      }
      return(invisible())
    },

    apply_all = function(fun, ...){
      lapply(c(self$template_object, self$objects), fun, ...)
    },

    localize = function(
      coregistered_ct,
      col = c("gray80", 'darkgreen'),
      controllers = list(),
      control_presets = NULL,
      voxel_colormap = NULL,
      ...
    ){
      control_presets <- c('localization', control_presets)
      controllers[["Edit Mode"]] <- "CT/volume"
      controllers[["Highlight Box"]] <- FALSE
      controllers[["Outlines"]] %?<-% "on"

      if(!missing( coregistered_ct )){
        if(!inherits(coregistered_ct, "threeBrain.nii")) {
          ct <- read_nii2( normalizePath(coregistered_ct, mustWork = TRUE) )
        } else {
          ct <- coregistered_ct
        }

        cube <- reorient_volume( ct$get_data(), self$Torig )
        add_voxel_cube(self, "CT", cube, color_format = "RedFormat")

        key <- seq(0, max(cube))
        cmap <- create_colormap(
          gtype = 'volume', dtype = 'continuous',
          key = key, value = key,
          color = c("black", "white")
        )
        controllers[["Voxel Type"]] <- "CT"
        controllers[["Voxel Display"]] <- "normal"
        controllers[["Voxel Min"]] <- 3000
        controllers[["Left Opacity"]] <- 0.4
        controllers[["Right Opacity"]] <- 0.4

        self$plot(
          control_presets = control_presets,
          voxel_colormap = cmap,
          controllers = controllers,
          ...
        )
      } else {
        # No CT scan, use aparc+aseg
        controllers[["Voxel Type"]] <- "aparc_aseg"
        controllers[["Voxel Display"]] <- "normal"
        controllers[["Left Hemisphere"]] <- "hidden"
        controllers[["Right Hemisphere"]] <- "hidden"
        self$plot(
          control_presets = control_presets,
          controllers = controllers,
          ...
        )
      }
    },

    plot = function(
      additional_subjects = NULL, volumes = TRUE, surfaces = TRUE, atlases = 'aparc+aseg',
      palettes = NULL, val_ranges = NULL, value_alias = NULL,
      side_canvas = TRUE, side_width = 250, side_shift = c(0, 0),
      control_presets = NULL, control_panel = TRUE, controllers = list(),
      width = NULL, height = NULL,
      value_ranges = val_ranges,
      optionals = list(), debug = FALSE, token = NULL, browser_external = TRUE, ...
    ){

      controllers <- as.list(controllers)
      controllers[["Subject"]] <- self$template_object$subject_code

      geoms <- self$template_object$get_geometries( volumes = volumes, surfaces = surfaces, electrodes = TRUE )

      atlases <- stringr::str_replace_all(atlases, '\\W', '_')

      for( sub in self$subject_codes ){
        s <- self$objects[[ sub ]]
        if( !is.null(s) ){
          if( sub %in% additional_subjects ){
            geoms <- c(geoms, s$get_geometries(
              volumes = volumes, surfaces = surfaces, electrodes = TRUE, atlases = atlases ))
          }else{
            geoms <- c(geoms, s$get_geometries(
              volumes = FALSE, surfaces = FALSE, electrodes = TRUE, atlases = FALSE ))
          }
        }
      }

      geoms <- unlist( geoms )
      is_r6 <- vapply(geoms, function(x){ 'AbstractGeom' %in% class(x) }, FALSE)
      geoms <- geoms[is_r6]
      names(geoms) <- NULL

      global_data <- self$global_data
      control_presets <- unique(c(
        'subject2', 'surface_type2', 'hemisphere_material', 'surface_color',
        'map_template', 'electrodes', 'voxel', control_presets, 'animation',
        'display_highlights' ))

      threejs_brain(
        .list = geoms, controllers = controllers, value_alias = value_alias,
        palettes = palettes, value_ranges = value_ranges,
        side_canvas = side_canvas, side_width = side_width, side_shift = side_shift,
        control_panel = control_panel, control_presets = control_presets,
        width = width, height = height, debug = debug, token = token,
        browser_external = browser_external, global_data = global_data, ...)

    },

    set_electrodes = function( ... ){
      self$template_object$set_electrodes( ... )
    },

    set_electrode_values = function(table_or_path){
      stopifnot2(is.data.frame(table_or_path) || (length(table_or_path) == 1) && is.character(table_or_path),
                 msg = 'table_or_path must be either data.frame or path to a csv file')
      if(!is.data.frame(table_or_path)){
        table <- read.csv(table_or_path, stringsAsFactors = FALSE)
      }else{
        table <- table_or_path
      }
      stopifnot2(all(c('Electrode', 'Subject') %in% names(table)),
                 msg = 'value table must contains Electrode (integer), Subject (character)')

      table$Electrode <- as.integer(table$Electrode)
      table <- table[!is.na(table$Electrode), ]
      if( length(table$Time) ){
        table <- table[!is.na(table$Time), ]
      }else{
        table$Time <- 0
      }

      # Make factor or numeric
      var_names <- names(table)
      var_names <- var_names[ !var_names %in% c('Electrode', 'Time') ]

      # Check values
      for( vn in var_names ){
        if( !is.numeric(table[[vn]]) && !is.factor(table[[vn]]) ){
          table[[vn]] <- as.factor(table[[vn]])
        }
      }

      self$apply_all(function(x){
        x$set_electrode_values(table[table$Subject == x$subject_code, ])
      })


    }

  ),
  active = list(
    template_subject = function(){
      self$template_object$subject_code
    },
    subject_codes = function(){
      re <- c( self$template_object$subject_code,
         sapply(self$objects, function(x){ x$subject_code }, USE.NAMES = FALSE, simplify = TRUE))
      names(re) <- NULL
      re
    },
    surface_types = function(){
      re <- unlist(lapply(self$objects, function(x){ x$surface_types }))
      re <- unique( self$template_object$surface_types, re)
      re
    },
    global_data = function(){
      re <- list()
      for( s in self$subject_codes ){
        re[[ s ]] <- self$objects[[ s ]]$global_data[[ s ]]
      }
      re[[ self$template_subject ]] <- self$template_object$global_data[[ self$template_subject ]]
      re$.multiple_subjects <- TRUE
      re$.template_subjects <- self$template_subject
      re$.subject_codes <- self$subject_codes
      re
    }
  )
)
