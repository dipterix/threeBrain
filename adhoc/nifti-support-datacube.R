require(dipsaus)
require(threeBrain)
brain <- raveio::rave_brain('devel/PAV010')
geom_brain_t1 <- threeBrain:::NiftiGeom$new(
  name = sprintf('T1 (%s)', brain$subject_code),
  path = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/derivative/MRI_RAW.nii',
  group = GeomGroup$new(name = sprintf('Volume - T1 (%s)', brain$subject_code))
)
geom_brain_t1$threshold <- 4
# geom_brain_t1 <- DataCubeGeom$new(
#   name = sprintf('T1 (%s)', subject_name), value = array(NA, dim = volume_shape),
#   dim = volume_shape, half_size = volume_shape / 2, group = group_volume,
#   position = c(0,0,0), cache_file = cache_volume, digest = FALSE)
geom_brain_t1$subject_code <- brain$subject_code
geom_brain_t1 <- threeBrain:::BrainVolume$new(
  subject_code = brain$subject_code, volume_type = 'T1',
  volume = geom_brain_t1, position = c(0, 0, 0 ))

brain$add_volume( volume = geom_brain_t1 )
brain$plot(debug = TRUE)
