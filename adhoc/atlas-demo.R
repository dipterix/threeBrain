require(threeBrain)
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
b <- freesurfer_brain2('~/rave_data/others/templates/fsaverage/', subject_name = 'fsaverage', use_141 = TRUE, atlas_types = 'aseg')
b$plot()



import_from_freesurfer('~/rave_data/others/templates/N27/fs', subject_name = 'N27')
n27 <- freesurfer_brain2('~/rave_data/others/templates/N27/fs', subject_name = 'N27', use_141 = TRUE, atlas_types = 'aparc+aseg')
n27$atlas_types
n27$plot(debug = TRUE)


import_from_freesurfer('~/rave_data/others/templates/KC', subject_name = 'KC')
kc<- freesurfer_brain2('~/rave_data/others/templates/KC', subject_name = 'KC', use_141 = TRUE, atlas_types = 'aparc+aseg', surface_types = c('pial', 'smoothwm'))
kc$atlas_types
wg <- kc$plot(controllers = list('Atlas Type' = 'aparc_aseg', 'Atlas Transparency' = 0.8, 'Atlas Label' = 4,
                           'Overlay Coronal' = TRUE, 'Overlay Axial' = TRUE, 'Overlay Sagittal' = TRUE,
                           'Left Opacity' = 0.2,
                           'Left Hemisphere' = 'wireframe', 'Background Color' = '#000000'))
wg

threeBrain::save_brain(wg, '~/Desktop/junk/raymarching', as_zip = TRUE)


import_from_freesurfer('~/rave_data/others/templates/YAB', subject_name = 'YAB')
YAB<- freesurfer_brain2('~/rave_data/others/templates/YAB', subject_name = 'YAB', use_141 = TRUE, atlas_types = 'aparc+aseg')
YAB$atlas_types
YAB$plot()
