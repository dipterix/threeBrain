
# fs_dir = '~/rave_data/others/three_brain/YCQ/'
# ct_path = '~/rave_data/others/three_brain/YCQ/RAVE/coregistration/ct2t1.nii.gz'
# subject_code = 'YCQ'

#' View CT with T1 image
#' @description View aligned CT scan with T1 images
#' @param subject_code subject code
#' @param fs_path FreeSurfer subject path
#' @param ct_path where CT file is stored, require NIFTI format
#' @export
view_ct_t1 <- function(subject_code, fs_path, ct_path = file.path(fs_path, 'RAVE','coregistration','ct2t1.nii.gz')){
  brain = threeBrain::freesurfer_brain2(
    fs_subject_folder = fs_path, subject_name = subject_code,
    surface_types = c('white', 'pial-outer-smoothed'), ct_path = ct_path)

  ui <- shiny::fillPage(
    title = 'RAVE Viewer',
    threeBrain::threejsBrainOutput('widget', width = '100%',
                                   height = '100vh', reportSize = FALSE)
  )

  server <- function(input, output, session) {

    output$widget <- threeBrain::renderBrain({
      brain$plot(control_presets = c('electrode_localization', 'ct_visibility'),
                 controllers = list(
                   'Overlay Coronal' = TRUE,
                   'Overlay Axial' = TRUE,
                   'Overlay Sagittal' = TRUE,
                   'Align CT to T1' = TRUE
                 ))
    })

    shiny::observeEvent(input$widget_ct_threshold, {
      signal = input$widget_ct_threshold
      current_subject = signal$current_subject
      thred = signal$threshold
      n_elec = signal$n_electrodes
      progress = dipsaus::progress2(title = 'Guessing electrodes',
                                    max = 4, shiny_auto_close = TRUE)
      progress$inc('Fetching volume data...')

      # obtain CT cube
      ct_data = brain$volumes$ct.aligned.t1$object$get_data(
        sprintf('datacube_value_ct.aligned.t1 (%s)', current_subject))
      size = brain$volumes$ct.aligned.t1$object$get_data(
        sprintf('datacube_dim_ct.aligned.t1 (%s)', current_subject))
      dim(ct_data) = size

      progress$inc('Thresholding to get RAS...')
      xyz = t(which(ct_data >= thred, arr.ind = TRUE)) - size/2
      xyz = t(xyz)
      progress$inc('Clustering..')

      hclust = stats::hclust( stats::dist(xyz), method = 'single')
      k = ceiling(n_elec)

      cuts = tryCatch({
        stats::cutree(hclust, k = k)
      }, error = function(e){
        showNotification(p('Number of electrodes set too high. ', br(),e$message),
                         duration = NULL, type = 'error')
        NULL
      })

      if(!length(cuts)){
        return()
      }


      progress$inc('Generating results...')

      centers = sapply(sort(unique(cuts)), function(ii){
        pos = colMeans(xyz[cuts == ii,, drop = FALSE])
        names(pos) = NULL
        pos
      })
      # sort centers by RAS
      centers = centers[, order(centers[1, ] + centers[2, ] + centers[3, ]), drop = FALSE]
      centers = lapply(seq_len(ncol(centers)), function(ii){
        pos = centers[,ii]
        list(
          electrode = ii,
          label = 'NA',
          position = pos,
          is_surface = TRUE,
          surface_type = 'pial'
        )
      })


      session$sendCustomMessage('widget__shiny', list(
        command = 'loc_add_electrodes',
        data = centers,
        reset = TRUE
      ))
    })
  }

  shiny::shinyApp(ui, server, options = list(launch.browser=TRUE))

}

