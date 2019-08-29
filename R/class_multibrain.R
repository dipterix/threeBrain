
#' @title Create Multi-subject Template
#' @param ...,.list \code{Brain2} objects
#' @param template_subject character, subject code to be treated as template, default is `N27`
#' @param template_dir the parent directory where template subject is stored in
#' @export
merge_brain <- function(
  ..., .list = NULL,
  template_subject = getOption('threeBrain.template_subject', 'N27'),
  template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')
){
  MultiBrain2$new( ... , .list = .list, template_subject = template_subject, template_dir = template_dir)
}


MultiBrain2 <- R6::R6Class(
  classname = 'multi-rave-brain',
  portable = TRUE,
  cloneable = FALSE,
  public = list(

    template_object = NULL,

    # Stores rave-brain
    objects = list(),

    initialize = function(..., .list = NULL,
                          template_subject = getOption('threeBrain.template_subject', 'N27'),
                          template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')){


      l = unlist( c(list(...), .list) )
      self$objects = list()
      for( x in l ){
        if( 'rave-brain' %in% class(x) ){
          if( x$subject_code == template_subject ){
            self$template_object = x
          }else{
            self$add_subject( x )
          }
        }
      }

      if( is.null(self$template_object) ){
        self$alter_template( template_subject, template_dir )
      }
    },

    alter_template = function(template_subject, template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')){
      # test
      template_path = file.path(template_dir, template_subject)
      stopifnot2(check_freesurfer_path(template_path),
                 msg = paste0('Cannot find template subject - ', template_subject,
                              '\nTo install template subject, you can enter:\n\n\t',
                              'threeBrain::download_N27(make_default=TRUE)'))

      surface_types = lapply(self$objects, function(x){ x$surface_types })
      surface_types = unique(unlist(surface_types))

      self$template_object = freesurfer_brain(
        fs_subject_folder = template_path, subject_name = template_subject,
        additional_surfaces = surface_types)
    },

    add_subject = function(x){
      if( 'rave-brain' %in% class(x) && !x$subject_code %in% self$subject_codes){
        self$objects[[ x$subject_code ]] = x
      }
      return(invisible())
    },

    plot = function(
      additional_subjects = NULL, volumes = TRUE, surfaces = TRUE,
      time_range = NULL, value_range = NULL, symmetric = 0, side_camera = TRUE,
      control_panel = TRUE, show_legend = TRUE, legend_title = 'Value',
      color_ramp = c('navyblue', '#e2e2e2', 'red'),
      color_type = 'continuous', n_color = 64, color_names = seq_along(color_ramp),

      control_presets = NULL,
      optionals = list(),
      width = NULL, height = NULL, debug = FALSE, token = NULL, browser_external = TRUE, ...
    ){


      geoms = self$template_object$get_geometries( volumes = volumes, surfaces = surfaces, electrodes = TRUE )

      for( sub in self$subject_codes ){
        s = self$objects[[ sub ]]
        if( !is.null(s) ){
          if( sub %in% additional_subjects ){
            geoms = c(geoms, s$get_geometries(
              volumes = volumes, surfaces = surfaces, electrodes = TRUE ))
          }else{
            geoms = c(geoms, s$get_geometries(
              volumes = FALSE, surfaces = FALSE, electrodes = TRUE ))
          }
        }
      }

      geoms = unlist( geoms )
      is_r6 = vapply(geoms, function(x){ 'AbstractGeom' %in% class(x) }, FALSE)
      geoms = geoms[is_r6]
      names(geoms) = NULL

      global_data = self$global_data
      control_presets = unique(c('subject2', 'surface_type2', 'hemisphere_material',
                                 'map_template', 'animation', control_presets ))

      threejs_brain(
        .list = geoms,
        time_range = time_range, value_range = value_range, symmetric = symmetric,
        side_camera = side_camera,
        control_panel = control_panel, control_presets = control_presets,
        color_ramp = color_ramp, color_type = color_type, n_color = n_color,
        color_names = color_names, show_legend = show_legend, legend_title = legend_title,
        width = width, height = height, debug = debug, token = token,
        browser_external = browser_external, global_data = global_data, ...)

    }

  ),
  active = list(
    template_subject = function(){
      self$template_object$subject_code
    },
    subject_codes = function(){
      re = c( self$template_object$subject_code,
         sapply(self$objects, function(x){ x$subject_code }, USE.NAMES = FALSE, simplify = TRUE))
      names(re) = NULL
      re
    },
    surface_types = function(){
      re = unlist(lapply(self$objects, function(x){ x$surface_types }))
      re = unique( self$template_object$surface_types, re)
    },
    global_data = function(){
      re = list()
      for( s in self$subject_codes ){
        re[[ s ]] = self$objects[[ s ]]$global_data[[ s ]]
      }
      re[[ self$template_subject ]] = self$template_object$global_data[[ self$template_subject ]]
      re
    }
  )
)
