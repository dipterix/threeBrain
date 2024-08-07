require(dipsaus)
control_presets <- 'localization'
controllers <- list()
controllers[["Highlight Box"]] <- FALSE

brain <- raveio::rave_brain('devel/PAV010')

# ct_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAW.nii"
# ct_transmat <- as.matrix(read.table("~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/CT_RAS_to_MR_RAS.txt"))

ct_path <- "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/mri/aparc+aseg.mgz"
ct_transmat <- diag(1,4)

threeBrain:::add_nifti(brain, "CT", path = ct_path, color_format = "RGBAFormat")

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
controllers[["Edit Mode"]] %?<-% "CT/volume"
brain$plot(
  control_presets = control_presets,
  controllers = controllers,
  debug = TRUE
  # voxel_colormap = cmap
)
