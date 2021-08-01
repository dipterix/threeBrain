brain <- threeBrain::freesurfer_brain2(
  '/Users/dipterix/Downloads/iELVis_Localization/YAS',
  'YAS'
)
tmp <- threeBrain:::read_nii2('/Users/dipterix/Downloads/iELVis_Localization/YAS/elec_recon/postInPre.nii.gz')
tmp$get_shape()
transmat <- read.table('/Users/dipterix/Downloads/iELVis_Localization/YAS/elec_recon/')

cat(sprintf("%.2f", as.matrix(transmat)), sep = ',')

data <- tmp$get_data()
data <- threeBrain:::reorient_volume(data, Torig = brain$Torig)
threeBrain::add_voxel_cube(brain, "CT", data)

key = seq(0, max(data))
cmap <- threeBrain::create_colormap(
  gtype = 'volume', dtype = 'continuous',
  key = key, value = key,
  color = rainbow(64)
)
brain$plot(
  control_presets = 'localization',
  voxel_colormap = cmap
)
