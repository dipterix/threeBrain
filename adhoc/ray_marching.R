nibabel = reticulate::import('nibabel')
aligned = nibabel$load('/Users/beauchamplab/Dropbox/rave_data/congruency/YAB/fs/elec_recon/ctINt1.nii.gz')
aligned$header
dat = aligned$get_data()

tmp = nibabel$load('/Users/beauchamplab/Dropbox/rave_data/congruency/YAB/fs/YAB_CT.nii')
dat = tmp$get_fdata()


threeBrain:::DataCubeGeom$new(
  name = 'cube', value = dat
)

read.table('/Users/beauchamplab/Dropbox/rave_data/congruency/YAB/fs/elec_recon/ct2t1.mat')


group_volume = threeBrain:::GeomGroup$new(name = sprintf('Volume - aligned.ct (%s)', 'YAB'))

unlink('~/Desktop/junk/ct.json')
brain = threeBrain::freesurfer_brain('~/rave_data/data_dir/congruency/YAB/rave/fs/', 'YAB')


volume = aligned$get_data()
volume_shape = dim(volume)

Norig = brain$Norig
order_index = round((Norig %*% c(1,2,3,0))[1:3])
volume = aperm(volume, abs(order_index))
sub = sprintf(c('%d:1', '1:%d')[(sign(order_index) + 3) / 2], dim(volume))
volume = eval(parse(text = sprintf('volume[%s]', paste(sub, collapse = ','))))


geom_brain_aligned_ct = threeBrain:::DataCubeGeom2$new(
  name = sprintf('ct.aligned.t1 (%s)', 'YAB'), value = volume, dim = volume_shape,
  half_size = volume_shape / 2, group = group_volume, position = c(0,0,0),
  cache_file = '~/Desktop/junk/ct.json')
geom_brain_aligned_ct$subject_code = 'YAB'

threeBrain:::threejs_brain(geom_brain_aligned_ct, side_canvas = TRUE, debug = T, .list = brain$get_geometries())

threeBrain:::threejs_brain(
  geom_brain_aligned_ct, debug = T, control_presets = c(
    'ct_visibility', 'electrode_localization', 'hemisphere_material'),
  side_canvas = T,
  .list = brain$get_geometries())

brain$scanner_center
brain$set_electrodes()
