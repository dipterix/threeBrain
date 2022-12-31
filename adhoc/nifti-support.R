require(dipsaus)
brain <- raveio::rave_brain('devel/PAV010')
# brain$localize
# brain$volumes$T1$group$group_data$`datacube_value_T1 (PAV010)` <- list(
#   path = "/Users/dipterix/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/mri/T1.nii",
#   absolute_path = "/Users/dipterix/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/mri/T1.nii",
#   file_name = "T1.nii", is_new_cache = FALSE, is_cache = TRUE
# )
# brain$plot()
#
#
# threeBrain::add_voxel_cube

control_presets <- 'localization'
controllers <- list()
controllers[["Highlight Box"]] <- FALSE

ct_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAW.nii"
ct_transmat <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAS_to_MR_RAS.txt"

threeBrain:::add_nifti(brain, "CT", path = ct_path, color_format = "AlphaFormat", trans_mat = as.matrix(read.table(ct_transmat)))

key <- seq(0, 5000)
cmap <- threeBrain:::create_colormap(
  gtype = 'volume', dtype = 'continuous',
  key = key, value = key,

  # using AlphaFormat so color map is the color intensity in gray
  color = c("black", "white"),
  auto_rescale = TRUE
)
brain$atlases$CT$object$color_map <- cmap
controllers[["Left Opacity"]] <- 0.4
controllers[["Right Opacity"]] <- 0.4
controllers[["Voxel Type"]] <- "CT"
controllers[["Voxel Display"]] <- "normal"
controllers[["Voxel Min"]] <- 3000
controllers[["Edit Mode"]] %?<-% "CT/volume"
brain$plot(
  control_presets = control_presets,
  controllers = controllers,
  debug = TRUE
  # voxel_colormap = cmap
)
