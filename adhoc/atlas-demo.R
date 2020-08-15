import_fs('YCQ', fs_path = '~/rave_data/others/fs/', dtype = 'atlas_volume', sub_type = 'aparc+aseg')
subject_name <- 'YCQ'
atlas_type <- 'aparc_a2009s_aseg'
atlas_type <- 'aparc_DKTatlas_aseg'
group_volume <- GeomGroup$new(name = sprintf('Atlas - %s (%s)', atlas_type, subject_name))
group_volume$subject_code <- subject_name

# Create a datacube geom to force cache
dc2 <- DataCubeGeom2$new(
  name = sprintf('Atlas - %s (%s)', atlas_type, subject_name), dim = c(256,256,256),
  half_size = c(1,1,1), group = group_volume, position = c(0,0,0),
  cache_file = sprintf('~/rave_data/others/fs/RAVE/YCQ_%s.json', atlas_type))

# threeBrain::threejs_brain(dc2, debug = TRUE)


b <- threeBrain::freesurfer_brain2('~/rave_data/others/fs/', subject_name = 'YCQ', use_141 = TRUE)

threeBrain::threejs_brain(dc2, b$get_geometries(), debug = TRUE, control_presets = c(
  'subject2', 'surface_type2', 'hemisphere_material',
  'map_template', 'electrodes', 'animation', 'display_highlights', 'atlas',
  'reset_side_panel',
  'side_depth',
  'side_electrode_dist'
))
