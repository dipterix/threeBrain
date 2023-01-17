require(dipsaus)
require(threeBrain)
brain <- raveio::rave_brain('devel/PAV010')
surf_t <- "pial"; subject_name <- "PAV010"; template_subject <- "N27"

surf_group <- GeomGroup$new(name = sprintf('Surface - %s (%s)', surf_t, subject_name),
                            position = c( 0, 0, 0 ))
surf_group$subject_code <- subject_name
surface <- NULL
loaded <- FALSE
surf_group$set_group_data('template_subject', template_subject)
surf_group$set_group_data('surface_type', surf_t)
surf_group$set_group_data('subject_code', subject_name)

# Use fs
surf_group$set_group_data('surface_format', 'fs')
# We can get FreeSurfer brain
surf_lh <- FreeGeom$new(
  name = sprintf('FreeSurfer Left Hemisphere - %s (%s)', surf_t, subject_name),
  position = c(0,0,0),
  cache_file = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples//raw/PAV010/rave-imaging/fs/surf/lh.pial',
  group = surf_group, layer = 8)

surf_rh <- FreeGeom$new(
  name = sprintf('FreeSurfer Right Hemisphere - %s (%s)', surf_t, subject_name),
  position = c(0,0,0), cache_file = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples//raw/PAV010/rave-imaging/fs/surf/rh.pial.T1', group = surf_group, layer = 8)

surface <- threeBrain:::BrainSurface$new(
  subject_code = subject_name, surface_type = surf_t, mesh_type = 'fs',
  left_hemisphere = surf_lh, right_hemisphere = surf_rh)

# brain$surfaces$pial$left_hemisphere = surf_lh

brain$add_surface(surface)

brain$plot(debug = TRUE)
