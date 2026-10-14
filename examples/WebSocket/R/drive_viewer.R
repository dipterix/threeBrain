# Drives a connected viewer: background, camera, panel settings, electrode
# values, a selected contact and a title, then saves a screenshot.
#
#   cd examples/WebSocket/R
#   Rscript drive_viewer.R
#
# The hub must be running and a viewer connected to it (see ../README.md). The
# electrode part expects the demo viewer from the README (subject N27, contacts
# 1-8). Set THREEBRAIN_PASSKEY when the hub uses another port or a key.

source("hub_client.R")

hub <- hub_connect()
viewers <- hub$viewers()
if (length(viewers) == 0) {
  stop("No viewer is connected: in the viewer's control panel, enter the passkey in \"Passkey\" and click \"Connect\".")
}
viewer <- viewers[[1]]$id
cat("Driving viewer", viewer, "showing", paste(unlist(viewers[[1]]$subjects), collapse = ", "), "\n")

hub$command(viewer, "background", "#000000")
# look from the left, slightly zoomed in
hub$command(viewer, "camera", list(position = c(-500, 0, 0), up = c(0, 0, 1)))
hub$command(viewer, "zoom_level", 1.5)
# any control panel value, by its name in the panel
hub$command(viewer, "controllers", list(
  "Show Panels" = FALSE, "Right Hemisphere" = "hidden", "Left Opacity" = 0.4
))
# a new variable for the contacts, shown right away
hub$command(viewer, "set_electrode_data", list(
  data = list(Electrode = 1:8, Subject = rep("N27", 8), Score = 8:1),
  updateDisplay = TRUE
))
hub$command(viewer, "focused_electrode", list(subject_code = "N27", electrode = 3))
hub$command(viewer, "title", "Driven from R")

state <- hub$command(viewer, "get_state")
cat("Camera position:", unlist(state$cameraState$position), "\n")

shot <- hub$command(viewer, "capture")
writeBin(jsonlite::base64_dec(sub("^data:image/png;base64,", "", shot$dataURI)), "viewer.png")
cat("Saved viewer.png\n")

hub$close()
