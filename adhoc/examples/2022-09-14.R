#' @author Zhengjia Wang
#' @date Sept. 14, 2022
#' @license Do whatever you like with this file
#'
#' This script provides demos to view the RAVE 3D viewer from R Shiny
NULL


# --- Global settings ----------------------------------------------------------

#' @param subject_code required by 3D viewer to distinguish different subjects
#' in the group analyses
subject_code <- "DemoSubject"

#' @param fs_path brain FreeSurfer directory
fs_path <- "~/rave_data/data_dir/demo/DemoSubject/fs/"

#' @param electrode_path electrode coordinate file in csv
electrode_path <- "~/rave_data/data_dir/demo/DemoSubject/rave/meta/electrodes.csv"

# --- Example 2: 3D viewers in R Shiny -----------------------------------

# Some example-based data
#' @param electrode_values values for electrodes, you can store them in a csv
#' file or in-memory as a data.frame
electrode_values <- data.frame(
  Subject = "DemoSubject",
  Electrode = c(13, 14, 15, 16, 24),
  ContinuousValue = rnorm(5),
  Categorical = c("A", "A", "B", "B", "C"),
  PValues = c(0.01, 0.05, 0.5, 0.6, 0.0001)
)

# Create `brain` instance
brain <- threeBrain::freesurfer_brain2(
  fs_subject_folder = fs_path,
  subject_name = subject_code
)

# Load electrodes
brain$set_electrodes(electrode_path)

# Set values
brain$set_electrode_values(electrode_values)


# Utility function, pretty-print numbers
collapse_number <- function(..., collapse = ", ", formats = "%.2f") {
  paste(sprintf(formats, unlist(c(...))), collapse = collapse)
}


shiny::shinyApp(
  options = list("launch.browser" = TRUE),
  shiny::fluidPage(
    shiny::fluidRow(
      shiny::column(
        width = 12L,
        # 3D viewer with 70% of entire height
        threeBrain::threejsBrainOutput("viewer", height = "70vh")
      )
    ),
    shiny::fluidRow(
      shiny::column(
        width = 6L,
        shiny::verbatimTextOutput("proxy_get", placeholder = TRUE)
      ),
      shiny::column(
        width = 6L,
        shiny::actionButton("btn1", "Change Background"),
        shiny::actionButton("btn2", "Change Camera"),
        shiny::actionButton("btn3", "Show Anatomical Slicers"),
        shiny::actionButton("btn4", "Hide Surfaces"),
        shiny::actionButton("btn5", "Set crosshair (random)"),
      )
    )
  ),
  function(input, output, session) {
    # Basic output
    output$viewer <- threeBrain::renderBrain({
      brain$plot(
        show_modal = FALSE
      )
    })

    # Proxy (driver)
    proxy <- threeBrain::brain_proxy("viewer")

    output$proxy_get <- shiny::renderPrint({

      camera <- proxy$main_camera
      controllers <- as.list(proxy$controllers)
      clicked <- proxy$mouse_event_click
      dblclicked <- proxy$mouse_event_double_click
      current_subject <- proxy$current_subject


      cat(
        "Current subject: ", current_subject$subject_code, "\n"
      )
      print(current_subject[c("Norig", "Torig", "xfm")])

      # Get crosshair position at different space
      cat(
        sep = "",
        "---------------\n",
        "Crosshair: \n",
        "  T1 RAS: ", collapse_number(proxy$get_crosshair_position("scanner")), "\n",
        "  MNI305: ", collapse_number(proxy$get_crosshair_position("MNI305")), "\n",
        "  MNI152: ", collapse_number(proxy$get_crosshair_position("MNI152")), "\n",
        "  Voxel indices: ", collapse_number(proxy$get_crosshair_position("CRS"), formats = "%.0f"), "\n",
        "  FreeSurfer tkrRAS: ", collapse_number(proxy$get_crosshair_position("tkrRAS")), "\n"
      )

      cat(
        "---------------\n",
        "Camera position: ", collapse_number(camera$position), "\n",
        "Camera up: ", collapse_number(camera$up), "\n",
        "Zoom-level: ", collapse_number(camera$zoom), "\n",
        "---------------\n", sep = ""
      )

      if(length(clicked)) {
        cat(
          sep = "",
          "Last click information: \n",
          "  Name: ", clicked$name, "\n",
          "  Type: ", clicked$object$type, "\n",
          "  Electrode #: ", clicked$electrode_number, "\n",
          "  Position: ", collapse_number(clicked$position), "\n",
          "  Subject code: ", clicked$subject, "\n",
          "  Radius: ", clicked$object$radius, "\n",
          "  MNI305:", collapse_number(clicked$object$MNI305_position), "\n",
          "  Displaying: ", clicked$current_clip, "\n",
          "  Animation time: ", clicked$current_time, "\n",
          "---------------\n"
        )
      }

      if(length(dblclicked)) {
        cat(
          sep = "",
          "Last double-click information: \n",
          "  Name: ", dblclicked$name, "\n",
          "  Type: ", dblclicked$object$type, "\n",
          "  Electrode #: ", dblclicked$electrode_number, "\n",
          "  Position: ", collapse_number(dblclicked$position), "\n",
          "  Subject code: ", dblclicked$subject, "\n",
          "  Radius: ", dblclicked$object$radius, "\n",
          "  MNI305:", collapse_number(dblclicked$object$MNI305_position), "\n",
          "  Displaying: ", dblclicked$current_clip, "\n",
          "  Animation time: ", dblclicked$current_time, "\n",
          "---------------\n"
        )
      }

      for(nm in names(controllers)) {
        cat(sprintf("Controller [%s]: %s\n", nm, controllers[[nm]]))
      }

    })

    shiny::bindEvent(
      shiny::observe({
        proxy$set_background(sample(10,1))
      }),
      input$btn1,
      ignoreInit = TRUE, ignoreNULL = TRUE
    )

    shiny::bindEvent(
      shiny::observe({
        proxy$set_camera(
          position = c(0, 0, 500), up = c(0, 1, 0)
        )
      }),
      input$btn2,
      ignoreInit = TRUE, ignoreNULL = TRUE
    )

    shiny::bindEvent(
      shiny::observe({
        proxy$set_controllers(list(
          "Overlay Coronal" = TRUE,
          "Overlay Axial" = TRUE,
          "Overlay Sagittal" = TRUE
        ))
      }),
      input$btn3,
      ignoreInit = TRUE, ignoreNULL = TRUE
    )

    shiny::bindEvent(
      shiny::observe({
        proxy$set_controllers(list(
          "Left Hemisphere" = "hidden",
          "Right Hemisphere" = "hidden"
        ))
      }),
      input$btn4,
      ignoreInit = TRUE, ignoreNULL = TRUE
    )

    shiny::bindEvent(
      shiny::observe({
        # This example set crosshair from MNI152 space
        corsshair <- sample(100, 3) - 50
        proxy$set_crosshair_position(corsshair, space = "MNI305")
      }),
      input$btn5,
      ignoreInit = TRUE, ignoreNULL = TRUE
    )
  }
)

