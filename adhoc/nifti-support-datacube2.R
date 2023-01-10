require(dipsaus)
brain <- raveio::rave_brain('devel/PAV006')
formalArgs(threeBrain::threejs_brain)
brain$localize(
  ct_path = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/coregistration/CT_RAW.nii",
  mri_path = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/coregistration/MRI_RAW.nii",
  transform_matrix = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV006/rave-imaging/coregistration/ct2t1.mat",
  transform_space = "fsl",
# brain$plot(
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
  debug = FALSE,
  title = 'adadasddasdas asda'
)

# [21] "default_colormap"         "palettes"
# [23] "value_ranges"             "value_alias"
# [25] "show_inactive_electrodes" "surface_colormap"
# "videos"
# [33] "controllers"

# control_presets <- 'localization'
# controllers <- list()
# controllers[["Highlight Box"]] <- FALSE
#
# # ct_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAW.nii"
# # ct_transmat <- as.matrix(read.table("~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAS_to_MR_RAS.txt"))
#
# ct_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/ct_in_t1.nii"
# ct_transmat <- brain$Torig %*% solve(brain$Norig)
#
# threeBrain:::add_nifti(brain, "CT", path = ct_path, color_format = "AlphaFormat", trans_mat = ct_transmat)
#
# key <- seq(0, 5000)
# cmap <- threeBrain:::create_colormap(
#   gtype = 'volume', dtype = 'continuous',
#   key = key, value = key,
#
#   # using AlphaFormat so color map is the color intensity in gray
#   color = c("black", "white"),
#   auto_rescale = TRUE
# )
# brain$atlases$CT$object$color_map <- cmap
# controllers[["Left Opacity"]] <- 0.4
# controllers[["Right Opacity"]] <- 0.4
# controllers[["Voxel Type"]] <- "CT"
# controllers[["Voxel Display"]] <- "normal"
# controllers[["Voxel Min"]] <- 3000
# controllers[["Edit Mode"]] %?<-% "CT/volume"
# brain$plot(
#   control_presets = control_presets,
#   controllers = controllers,
#   debug = TRUE
#   # voxel_colormap = cmap
# )
