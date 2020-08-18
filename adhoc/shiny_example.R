# Shiny example

library(shiny)

ui <- fluidPage(
  actionButton('dd', 'ddddddddd'),
  threejsBrainOutput('vis')
)

server <- function(input, output, session) {
  output$vis = renderBrain({
    input$dd
    brain$print(control_presets = c('surface_type', 'electrodes'), template_subject = 'congruency/YAH', side_camera = TRUE)
  })
}

shinyApp(ui, server)
