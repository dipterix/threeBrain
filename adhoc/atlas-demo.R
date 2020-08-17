subject_name <- 'YCQ'
atlas_type <- 'aparc_a2009s_aseg'
group_volume <- GeomGroup$new(name = sprintf('Atlas - %s (%s)', atlas_type, subject_name))
group_volume$subject_code <- subject_name

# Create a datacube geom to force cache
dc2 <- DataCubeGeom2$new(
  name = sprintf('Atlas - %s (%s)', atlas_type, subject_name), dim = c(256,256,256),
  half_size = c(1,1,1), group = group_volume, position = c(0,0,0),
  cache_file = sprintf('~/rave_data/others/fs/RAVE/YCQ_%s.json', atlas_type))

# threeBrain::threejs_brain(dc2, debug = TRUE)


b <- threeBrain::freesurfer_brain2('~/rave_data/others/fs/', subject_name = 'YCQ', use_141 = TRUE)
b$plot()
threeBrain::merge_brain(b)$plot()



import_from_freesurfer('~/rave_data/others/templates/fsaverage/', subject_name = 'fsaverage')
b <- freesurfer_brain2('~/rave_data/others/templates/fsaverage/', subject_name = 'fsaverage', use_141 = TRUE, surface_types = 'white', atlas_types = 'aseg')
b$plot()



import_from_freesurfer('~/rave_data/others/templates/N27/fs', subject_name = 'N27')
n27 <- freesurfer_brain2('~/rave_data/others/templates/N27/fs', subject_name = 'N27', use_141 = TRUE, surface_types = 'white', atlas_types = 'aparc+aseg')
n27$atlas_types
n27$plot()
