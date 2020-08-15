input = getDefaultReactiveInput()
output = getDefaultReactiveOutput()
session = getDefaultDataRepository()
local_data = reactiveValues()

three_viewer_ui = function(){

  local_data$refresh

  # Returns the customized UI layout

  # For now just the 3D viewer


  # Check if the subject is cached

  elec = rave::load_meta('electrodes', subject_id = subject$id)

  if(!'VertexNumber' %in% names(elec)){
    return(tagList(
      p(actionLink(ns('cache'), 'New subject? Click to load.'))
      # threejs_brain()
    ))
  }

  local_data$render_brain = Sys.time()

  tagList(
    threejsBrainOutput(ns('viewer_output'), height = '80vh'),
    actionButton(ns('asd'), 'asd'),
    threejsBrainOutput(ns('viewer_output2'), height = '80vh')
  )

}


observeEvent(input$cache, {
  # load subject and cache
  brain = rave:::rave_brain2()

  shiny::showNotification(p("Start Loading and Caching..."))

  brain$cache(subject = subject)

  local_data$refresh = Sys.time()
})

observeEvent(input$asd, {
  local_data$render_brain2 = Sys.time()
})


output$viewer_output <- renderBrain({
  local_data$render_brain

  brain = rave:::rave_brain2()
  brain$add_subject(subject = subject, surfaces = c('pial', 'white', 'smoothwm'))

  brain$brain$view(tmp_dirname = 'rave_viewer')
})

output$viewer_output2 <- renderBrain({
  local_data$render_brain2
  brain = rave:::rave_brain2()
  brain$add_subject(subject = subject, surfaces = c('pial', 'white', 'smoothwm')[1: min(3, max(1, local_data$render_brain2))])

  brain$brain$view(tmp_dirname = 'rave_viewer')

})
