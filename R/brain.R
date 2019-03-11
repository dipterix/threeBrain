#' R6 Class - Generate Brain Object
#'
#' @name Brain
NULL


#' @export
Brain <- R6::R6Class(
  classname = 'Brain',
  portable = TRUE,
  cloneable = FALSE,
  public = list(
    groups = NULL,
    subjects = NULL,
    default_surfaces = NULL,
    multiple_subject = FALSE,
    .blankgeom = NULL,

    initialize = function(multiple_subject = FALSE, default_surfaces = 'pial'){

      self$default_surfaces = default_surfaces
      self$.blankgeom = list()

      # Create environment for groups
      self$groups = new.env(parent = emptyenv())

      g = GeomGroup$new(name = 'Left Hemisphere', layer = 0)
      g$group_data$.gui_params = list()
      self$groups[['Left Hemisphere']] = g
      self$.blankgeom[[1]] = BlankGeom$new(group = g)

      g = GeomGroup$new(name = 'Right Hemisphere', layer = 0)
      g$group_data$.gui_params = list()
      self$groups[['Right Hemisphere']] = g
      self$.blankgeom[[2]] = BlankGeom$new(group = g)

      # Create storage to load subject information
      self$subjects = new.env(parent = emptyenv())

      self$set_multiple_subject( multiple_subject )


    },

    set_multiple_subject = function(is_multiple){
      self$multiple_subject = is_multiple
      if(is_multiple && !'N27' %in% names(self$subjects)){
        # Check N27 Surface is there
        self$add_subject('N27')

        for(s in n27_surfaces[n27_surfaces %in% self$default_surfaces]){

          g = get_n27_surface(
            group_left = self$groups[['Left Hemisphere']],
            group_right = self$groups[['Right Hemisphere']],
            surface = s
          )
          self$subjects$N27$surface[[s]] = g

          self$groups[['Left Hemisphere']]$group_data$.gui_params$N27[[s]] = c(g$left$name, g$right$name)
          self$groups[['Right Hemisphere']]$group_data$.gui_params$N27[[s]] = c(g$left$name, g$right$name)

        }

      }

      if(!is_multiple){
        self$remove_subject('N27')
      }
    },

    remove_subject = function(subject_name){
      if(!is.list(self$subjects[[subject_name]])){
        return(TRUE)
      }
      group_name = sprintf('electrodes-%s', subject_name)
      self$groups[[group_name]] = NULL


      rm(list = subject_name, envir = self$subjects)

      self$groups[['Left Hemisphere']]$group_data$.gui_params[[subject_name]] = NULL
      self$groups[['Right Hemisphere']]$group_data$.gui_params[[subject_name]] = NULL
      subs = self$groups[['Left Hemisphere']]$group_data$.subjects
      subs = subs[!subs %in% subject_name]
      self$groups[['Left Hemisphere']]$group_data$.subjects = subs
      self$groups[['Right Hemisphere']]$group_data$.subjects = subs
      return(TRUE)
    },

    add_subject = function(subject_name){
      stopifnot2(!is.list(self$subjects[[subject_name]]), msg = 'Subject already exists, no need to add!')

      group_name = sprintf('electrodes-%s', subject_name)
      self$groups[[group_name]] = GeomGroup$new(name = group_name, layer = 1)

      self$subjects[[subject_name]] = list(
        `.__template__` = NULL,
        electrodes = list(),
        group_name = group_name,
        surface = list()
      )
      self$groups[['Left Hemisphere']]$group_data$.gui_params[[subject_name]] = list()
      self$groups[['Right Hemisphere']]$group_data$.gui_params[[subject_name]] = list()
      self$groups[['Left Hemisphere']]$group_data$.subjects = names(self$subjects)
      self$groups[['Right Hemisphere']]$group_data$.subjects = names(self$subjects)
    },


    # subject_name will be used to diff other subs
    # surface_name can be anything like normal, inflated, std141...
    # If as_template, then I assume this is a 141 brain surface and all electrodes
    # will be mapped to according to this surface
    add_surface = function(
      subject_name, surface_name = 'pial', is_standard = FALSE,
      lh_surface = NULL, rh_surface = NULL,
      lh_surface_cache = NULL, rh_surface_cache = NULL
    ){
      # subject_name = 'Complete/YAB'
      # surface_name = 'std.141'
      # as_template = T
      # lh_surface = '~/rave_data/data_dir/Complete/YAB/rave/suma/lh.pial.asc'
      # rh_surface = '~/rave_data/data_dir/Complete/YAB/rave/suma/rh.pial.asc'
      # lh_surface_cache = sprintf('~/rave_data/data_dir/Complete/YAB/rave/viewer/lh_surface_%s.json', surface_name)
      # rh_surface_cache = sprintf('~/rave_data/data_dir/Complete/YAB/rave/viewer/rh_surface_%s.json', surface_name)

      self$subjects[[subject_name]][['surface']][[surface_name]] = list()
      gui_params = c()

      # ----- First, check left hemisphere ------
      load_data = TRUE
      name = sprintf('lh - %s (%s)', surface_name, subject_name)
      if(length(lh_surface_cache)==1){
        if(file.exists(lh_surface_cache)){
          g = FreeGeom$new(name = name, cache_file = lh_surface_cache, group = self$groups[['Left Hemisphere']])
          load_data = FALSE
        }
      }
      if(load_data){
        dat = read_fs_asc(lh_surface)
        g = FreeGeom$new(name = name, cache_file = lh_surface_cache,
                         vertex = dat$vertices[,1:3],
                         face = dat$faces[, 1:3], group = self$groups[['Left Hemisphere']])
      }

      g$layer = 29
      # Add this geom to subject
      self$subjects[[subject_name]][['surface']][[surface_name]][['left']] = g
      gui_params = c(gui_params, g$name)

      # ----- Next, check right hemisphere ------
      load_data = TRUE
      name = sprintf('rh - %s (%s)', surface_name, subject_name)
      if(length(rh_surface_cache)==1){
        if(file.exists(rh_surface_cache)){
          g = FreeGeom$new(name = name, cache_file = rh_surface_cache, group = self$groups[['Right Hemisphere']])
          load_data = FALSE
        }
      }
      if(load_data){
        dat = read_fs_asc(rh_surface)
        g = FreeGeom$new(name = name, cache_file = rh_surface_cache,
                         vertex = dat$vertices[,1:3],
                         face = dat$faces[, 1:3], group = self$groups[['Right Hemisphere']])
      }

      g$layer = 29
      # Add this geom to subject
      self$subjects[[subject_name]][['surface']][[surface_name]][['right']] = g
      gui_params = c(gui_params, g$name)

      if(is_standard){
        self$subjects[[subject_name]]$.__template__ = surface_name
        self$groups[['Left Hemisphere']]$group_data$.__template__ = surface_name
        self$groups[['Right Hemisphere']]$group_data$.__template__ = surface_name
      }


      # Add registration to gui controls
      self$groups[['Left Hemisphere']]$group_data$.gui_params[[subject_name]][[surface_name]] = gui_params
      self$groups[['Right Hemisphere']]$group_data$.gui_params[[subject_name]][[surface_name]] = gui_params


    },



    add_electrode = function(subject_name, name, x, y, z, sub_cortical = FALSE,
                             surface_type = 'pial', hemisphere = NULL, vertex_number = -1,...){

      group_name = self$subjects[[subject_name]]$group_name

      g = ElectrodeGeom$new(name = name, position = c(x,y,z), group = self$groups[[group_name]], ...)
      g$layer = 29
      g$sub_cortical = sub_cortical

      # Check hemisphere and vertex_number
      if(!length(hemisphere) || vertex_number < 0 || !hemisphere %in% c('left', 'right')){
        # My idea was to calculate nearest vertex to the electrodes using js
        # however, that will cause problems and really JS is not the place to handle logic
        # stuff. It's required to calculate the results and send it here
        # otherwise electrodes won't be mapped to template brain!

        surfaces = self$subjects[[subject_name]]$surface[[surface_type]]
        if(length(surfaces) == 2){
          g$search_geoms = sapply(surfaces, function(s){ s$name }, USE.NAMES = T, simplify = F)
        }else{
          # stopifnot2(length(surfaces) == 2, msg = paste('Cannot find surface type -', surface_type))
          # cat2('Cannot find surface ', surface_type, '. Cannot map to template brain.', level = 'WARNING', sep = '')
        }

      }else{
        g$hemisphere = hemisphere
        g$vertex_number = vertex_number
      }

      g$surface_type = surface_type

      self$subjects[[subject_name]][['electrodes']][[name]] = g
    },

    set_tranform = function(subject_name, mat){
      group_name = self$subjects[[subject_name]]$group_name
      self$groups[[group_name]]$set_transform(mat)
    },




    view = function(
      template_subject,
      control_presets = c('subject', 'surface_type', 'lh_material', 'rh_material',
                          'electrodes', 'attach_to_surface', 'color_group'),
      optionals = list(), ...){

      optionals$map_to_template = self$multiple_subject

      subject_names = names(self$subjects)

      if(missing(template_subject)){
        template_subject = subject_names[1]
      }

      if(self$multiple_subject){
        # TODO if multiple subjects

        surfaces = self$subjects[[template_subject]]$surface
        # template = self$subjects[[template_subject]]$.__template__
        # if(!length(template)){
        #   if(self$multiple_subject && 'N27_pial' %in% names(surfaces)){
        #     template = 'N27_pial'
        #   }else if{
        #
        #   }
        #   if()
        # }

        electrodes = lapply(self$subjects, function(s){
          lapply(s$electrodes, function(e){
            e$layer = 1;
            e$use_template = TRUE
            e$group$disable_trans_mat = TRUE
            e
          })
        })

        electrodes = unlist(electrodes)
        names(electrodes) = NULL

      }else{
        # case if single subject

        electrodes = self$subjects[[template_subject]]$electrodes
        electrodes = unlist(electrodes)
        names(electrodes) = NULL
        lapply(electrodes, function(e){
          e$layer = 1; e$use_template = FALSE
          e$group$disable_trans_mat = FALSE
        })

      }

      # template surfaces
      surfaces = lapply(names(self$subjects), function(subj){
        self$subjects[[subj]][['surface']]
      })
      surfaces = unlist(surfaces)

      lapply(unlist(surfaces), function(p){
        p$layer = 29;
      })

      names(surfaces) = NULL

      threejs_brain(.list = unlist(c(self$.blankgeom, surfaces, electrodes)), control_presets = control_presets, optionals = optionals, ...)
    },


    print = function(...){
      return(self$view(...))
    },
    map_to_template = function(){
      # For each subjects, calculate electrode location link to the nearest mesh node
      subjects = names(self$subjects)

      for(sub in subjects){
        sub_data = self$subjects[[sub]]
        template_surface = sub_data$.__template__
        stopifnot2(length(template_surface) == 1 && template_surface %in% names(sub_data$surface), msg = sprintf('Subject %s standard 141 brain is not set. Please use brain$add_surface(..., is_standard=TRUE) when adding 141 brain.'))

        # Get electrode locations

        # get 141 brain
        surface_141 = sub_data$surface[[template_surface]]

        g = surface_141$left
        vert_left = t(g$get_data(sprintf('free_vertices_%s', g$name)))
        g = surface_141$right
        vert_right = t(g$get_data(sprintf('free_vertices_%s', g$name)))

        sapply(sub_data$electrodes, function(e){

          # Convert position to freesurfer space
          pos = e$position
          mm = e$group$trans_mat
          if(is.matrix(mm)){
            pos = mm %*% c(pos, 1)
            pos = pos[1:3]
          }

          dist_left = colSums((vert_left - pos)^2)
          dist_right = colSums((vert_right - pos)^2)

          ind_l = which.min(dist_left)
          ind_r = which.min(dist_right)
          ind = ind_l
          linked_geom = 'left'
          if(dist_left[ind_l] > dist_right[ind_r]) { ind = ind_r; linked_geom = 'right' }

          e$vertex_number = ind
          e$linked_geom = surface_141[[linked_geom]]
        })

      }
    }

  )
)
