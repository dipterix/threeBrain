# TODO: Might need to migrate to rave
#' @export
Brain <- R6::R6Class(
  classname = 'Brain',
  portable = TRUE,
  cloneable = FALSE,
  public = list(
    groups = NULL,
    subjects = NULL,
    multiple_subject = FALSE,



    initialize = function(multiple_subject = FALSE){

      self$multiple_subject = multiple_subject

      # Create environment for groups
      self$groups = new.env(parent = emptyenv())

      g = GeomGroup$new(name = 'Left Hemisphere', layer = 0)
      g$group_data$.gui_params = list()
      self$groups[['Left Hemisphere']] = g

      g = GeomGroup$new(name = 'Right Hemisphere', layer = 0)
      g$group_data$.gui_params = list()
      self$groups[['Right Hemisphere']] = g

      # Create storage to load subject information
      self$subjects = new.env(parent = emptyenv())

    },

    add_subject = function(subject_name){
      stopifnot2(!is.list(self$subjects[[subject_name]]), msg = 'Subject already exists, no need to add!')

      group_name = sprintf('electrodes-%s', subject_name)
      self$groups[[group_name]] = GeomGroup$new(name = group_name, layer = 1)

      self$subjects[[subject_name]] = list(
        `.__template__` = NULL,
        electrodes = list(),
        group_name = group_name,
        pial = list()
      )
    },


    # subject_name will be used to diff other subs
    # pial_name can be anything like normal, inflated, std141...
    # If as_template, then I assume this is a 141 brain surface and all electrodes
    # will be mapped to according to this surface
    add_pial = function(
      subject_name, pial_name = 'normal', is_standard = FALSE,
      lh_pial = NULL, rh_pial = NULL,
      lh_pial_cache = NULL, rh_pial_cache = NULL
    ){
      # subject_name = 'Complete/YAB'
      # pial_name = 'std.141'
      # as_template = T
      # lh_pial = '~/rave_data/data_dir/Complete/YAB/rave/suma/lh.pial.asc'
      # rh_pial = '~/rave_data/data_dir/Complete/YAB/rave/suma/rh.pial.asc'
      # lh_pial_cache = sprintf('~/rave_data/data_dir/Complete/YAB/rave/viewer/lh_pial_%s.json', pial_name)
      # rh_pial_cache = sprintf('~/rave_data/data_dir/Complete/YAB/rave/viewer/rh_pial_%s.json', pial_name)

      self$subjects[[subject_name]][['pial']][[pial_name]] = list()
      gui_params = c()

      # ----- First, check left hemisphere ------
      load_data = TRUE
      name = sprintf('lh - %s (%s)', pial_name, subject_name)
      if(length(lh_pial_cache)==1){
        if(file.exists(lh_pial_cache)){
          g = FreeGeom$new(name = name, cache_file = lh_pial_cache, group = self$groups[['Left Hemisphere']])
          load_data = FALSE
        }
      }
      if(load_data){
        dat = read_fs_asc(lh_pial)
        g = FreeGeom$new(name = name, cache_file = lh_pial_cache,
                         vertex = dat$vertices[,1:3],
                         face = dat$faces[, 1:3], group = self$groups[['Left Hemisphere']])
      }

      g$layer = 29
      # Add this geom to subject
      self$subjects[[subject_name]][['pial']][[pial_name]][['left']] = g
      gui_params = c(gui_params, g$name)

      # ----- Next, check right hemisphere ------
      load_data = TRUE
      name = sprintf('rh - %s (%s)', pial_name, subject_name)
      if(length(rh_pial_cache)==1){
        if(file.exists(rh_pial_cache)){
          g = FreeGeom$new(name = name, cache_file = rh_pial_cache, group = self$groups[['Right Hemisphere']])
          load_data = FALSE
        }
      }
      if(load_data){
        dat = read_fs_asc(rh_pial)
        g = FreeGeom$new(name = name, cache_file = rh_pial_cache,
                         vertex = dat$vertices[,1:3],
                         face = dat$faces[, 1:3], group = self$groups[['Right Hemisphere']])
      }

      g$layer = 29
      # Add this geom to subject
      self$subjects[[subject_name]][['pial']][[pial_name]][['right']] = g
      gui_params = c(gui_params, g$name)

      if(is_standard){
        self$subjects[[subject_name]]$.__template__ = pial_name
        brain$groups[['Left Hemisphere']]$group_data$.__template__ = pial_name
        brain$groups[['Right Hemisphere']]$group_data$.__template__ = pial_name
      }


      # Add registration to gui controls
      brain$groups[['Left Hemisphere']]$group_data$.gui_params[[pial_name]] = gui_params
      brain$groups[['Right Hemisphere']]$group_data$.gui_params[[pial_name]] = gui_params


    },



    add_electrode = function(subject_name, name, x, y, z, ...){

      group_name = self$subjects[[subject_name]]$group_name

      g = LinkedSphereGeom$new(name = name, position = c(x,y,z), group = self$groups[[group_name]], ...)
      g$layer = 29

      self$subjects[[subject_name]][['electrodes']][[1+length(self$subjects[[subject_name]][['electrodes']])]] = g
    },

    set_tranform = function(subject_name, mat){
      group_name = self$subjects[[subject_name]]$group_name
      self$groups[[group_name]]$set_transform(mat)
    },


    map_to_template = function(){
      # For each subjects, calculate electrode location link to the nearest mesh node
      subjects = names(self$subjects)

      for(sub in subjects){
        sub_data = self$subjects[[sub]]
        template_pial = sub_data$.__template__
        stopifnot2(length(template_pial) == 1 && template_pial %in% names(sub_data$pial), msg = sprintf('Subject %s standard 141 brain is not set. Please use brain$add_pial(..., is_standard=TRUE) when adding 141 brain.'))

        # Get electrode locations

        # get 141 brain
        pial_141 = sub_data$pial[[template_pial]]

        g = pial_141$left
        vert_left = t(g$get_data(sprintf('free_vertices_%s', g$name)))
        g = pial_141$right
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
          e$linked_geom = pial_141[[linked_geom]]
        })

      }
    },


    print = function(template_subject, ...){

      subject_names = names(self$subjects)

      if(missing(template_subject)){
        template_subject = subject_names[1]
      }

      if(self$multiple_subject){
        # TODO if multiple subjects

        pials = self$subjects[[template_subject]]$pial
        template = self$subjects[[template_subject]]$.__template__
        pial_left = pials[[template]]$left
        pial_right = pials[[template]]$right

        electrodes = lapply(self$subjects, function(s){
          lapply(s$electrodes, function(e){
            e$layer = 1;
            e$use_link = TRUE

            if(e$linked_geom$group$name == pial_left$group$name){
              e$linked_geom = pial_left
            }else{
              e$linked_geom = pial_right
            }

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
          e$layer = 1; e$use_link = FALSE
          e$group$disable_trans_mat = FALSE
        })

      }

      # template pials
      template = self$subjects[[template_subject]]$.__template__
      pials = self$subjects[[template_subject]][['pial']]

      lapply(unlist(pials), function(p){
        p$layer = 29;
      })

      if(length( template ) && template %in% names(pials)){
        lapply(pials[[template]], function(g){
          g$layer = 1;
        })
      }

      pials = unlist(pials)
      names(pials) = NULL


      base::print(threejs_brain(.list = unlist(c(pials, electrodes)), ...))

      # threejs_brain(.list = unlist(c(pials[1:2], electrodes)), control_presets = c('pial_type', 'electrodes'))

      # self$subjects$`congruency/YAH`$electrodes[[1]]$use_link

    }




  )
)
