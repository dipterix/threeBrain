# Shiny example

library(shiny)
library(threeBrain)

ui <- fluidPage(
  actionButton('dd', 'ddddddddd'),
  threejsBrainOutput('vis')
)
# brain <- raveio::rave_brain("demo/DemoSubject")
brain <- raveio::rave_brain('devel/PAV006')

server <- function(input, output, session) {
  output$vis = renderBrain({
    input$dd
    brain$localize(
      ct_path = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/derivative/CT_RAW.nii.gz",
      mri_path = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/derivative/MRI_RAW.nii",
      transform_matrix = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/derivative/transform-ctIJK2mrRAS.txt",
      transform_space = "ijk2ras",
      # start_zoom = 10,
      # background = "#ccff99",
      # cex = 2,
      # side_canvas = FALSE,
      # width,height"  TODO
      # timestamp = FALSE,
      # side_width = 400,
      side_shift = c(50,50),
      # side_display = FALSE,
      side_zoom = 2,
      # show_modal = TRUE,
      # custom_javascript = "console.log('yoooooo')",
      # control_panel = FALSE,
      # control_display = FALSE,
      # camera_pos = c( 0,0, 1),
      symmetric = FALSE,
      debug = TRUE,
      title = 'adadasddasdas asda'
    )
  })
  observe({
    assign("ss", print(shiny::reactiveValuesToList(input)), globalenv())
  })
}

print(shinyApp(ui, server, options = list(launch.browser = TRUE)))

# 'vis_main_camera', vis_canvas_state, vis_mouse_dblclicked, vis_controllers, vis_localization_table
#
# > names(ss)
# [1] "vis_axial_depth"         "vis_current_subject"    ""
# [7] "vis_atlas_type"         vis_localization_table
