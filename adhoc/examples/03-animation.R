#' @author Zhengjia Wang
#' @date Sept. 18, 2022
#' @license Do whatever you like with this file
#'
#' 3D brain with animation
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
time <- seq(-1, 2, length.out = 100)
electrode_values <- data.frame(
  Subject = "DemoSubject",
  Electrode = c(rep(13, 100), rep(14, 100)),
  Time = c(time, time),
  Value = c(sin(time * 2 * pi), sin(time * 2 * pi + 1))
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
  camera_pos = c(-500, 0, 0),
  controllers = list(
    # Set controller `Display Data` to display `PValues` column
    "Display Data" = "Value",
    "Speed" = "0.5",
    "Play/Pause" = TRUE
  )
)


