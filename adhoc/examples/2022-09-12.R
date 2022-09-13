#' @author Zhengjia Wang
#' @date Sept. 12, 2022
#' @license Do whatever you like with this file
#'
#' This script provides demonstration to generate vanilla RAVE 3D viewer without
#' having to follow the RAVE's file structure. To run this file, please install
#' the CRAN package `threeBrain` using the R command
#'
#'
if(FALSE) {
  install.packages(
    "threeBrain",
    repos = c(
      ropensci = 'https://beauchamplab.r-universe.dev',
      CRAN = 'https://cloud.r-project.org'
    )
  )
}



# --- Global settings ----------------------------------------------------------

#' @param subject_code required by 3D viewer to distinguish different subjects
#' in the group analyses
subject_code <- "DemoSubject"

#' @param fs_path brain FreeSurfer directory
fs_path <- "~/rave_data/data_dir/demo/DemoSubject/fs/"

#' @param electrode_path electrode coordinate file in csv
electrode_path <- "~/rave_data/data_dir/demo/DemoSubject/rave/meta/electrodes.csv"

# --- Example 1: Generate vanilla 3D viewers -----------------------------------

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

brain$plot(
  side_display = FALSE,
  palettes = list(
    Categorical = c("orange", "dodgerblue3", "darkgreen"),

    # p-values are from 0-1, we want to color the small values
    PValues = colorRampPalette(c("red", "yellow", "gray", "white"), bias = 3)(101)
  ),
  value_ranges = list(
    PValues = c(0, 1)
  ),

  # Start camera from left instead of right side
  camera_pos = c(-500, 0, 0),

  controllers = list(
    # Set controller `Display Data` to display `PValues` column
    "Display Data" = "PValues",

    # Hide time as there is no animation (time series)
    "Show Time" = FALSE
  )
)


