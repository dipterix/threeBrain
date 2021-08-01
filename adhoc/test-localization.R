file.copy('inst/htmlwidgets/lib/dipterixThreeBrain-1.0.1/', to = '/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/htmlwidgets/lib/', overwrite = TRUE, recursive = TRUE)
file.copy('inst/palettes/datacube2/', to = '/Users/dipterix/Library/R/arm64/4.1/library/threeBrain/palettes/', overwrite = TRUE, recursive = TRUE)

brain <- threeBrain::freesurfer_brain2(
  '/Users/dipterix/Downloads/iELVis_Localization/YAS',
  'YAS'
)
brain$localize('/Users/dipterix/Downloads/iELVis_Localization/YAS/elec_recon/postInPre.nii.gz', debug=F)
# tmp <- threeBrain:::read_nii2('/Users/dipterix/Downloads/iELVis_Localization/YAS/elec_recon/postInPre.nii.gz')
# tmp$get_shape()
#
# cat(sprintf("%.2f", as.matrix(transmat)), sep = ',')
#
# data <- tmp$get_data()
# data <- threeBrain:::reorient_volume(data, Torig = brain$Torig)
# threeBrain::add_voxel_cube(brain, "CT", data)
#
# key = seq(0, max(data))
# cmap <- threeBrain::create_colormap(
#   gtype = 'volume', dtype = 'continuous',
#   key = key, value = key,
#   color = rainbow(64)
# )
# brain$plot(
#   control_presets = 'localization',
#   voxel_colormap = cmap
# )
