require(rave)
require(threeBrain)

# nibabel$aff2axcodes(brik$affine)

# threeBrain:::ravepy_remove(F)
# threeBrain:::ravepy_virtualenv_install()
# threeBrain:::ravepy_install('nibabel')

modules = threeBrain:::ravepy_info(return_libs = T)
nibabel = modules$nibabel

dat = nibabel$load('/Volumes/data/UT/YAI/iELVis_Localization/YAI/mri/brain.finalsurfs.mgz')
dat$header
# Orientation   : LIA
# Primary Slice Direction: coronal

dat = nibabel$load('./adhoc/brain.finalsurfs.mgz')

cube = dat$get_data()

cube = aperm(cube, c(1,3,2))
cube = cube[256:1,,256:1]

dat = nibabel$load(normalizePath('~/Dropbox/sfn receipt/YCQ/mri/orig/001.mgz'))
cube = dat$get_data(); range(cube)
cube = cube / max(cube); cube = floor(cube*255)

# image((cube[256:1,256:1,190]), col = gray.colors(256), useRaster = F)

paste(as.vector(dat$header$get_vox2ras_tkr()), collapse = ',')


unlink('~/Desktop/junk/test.json')

surf_center = -1 * c(1,1,-1) * (c(0,0,256) - abs(dat$header$get_vox2ras()[1:3,4])) + c(-128,-128,-128)
surf_center

g = threeBrain:::DataCubeGeom$new(name = 'cube', value = cube, dim = dim(cube), half_size = c(120,120,84),
                                  cache_file = '~/Desktop/junk/test.json', position = -surf_center)




# Load pials
group = GeomGroup$new(name = 'surf', position = surf_center[] * 0, layer = 0)
pial = nibabel$load('./adhoc/std.141.lh.pial.gii')
# tmp = threeBrain::read_fs_asc(normalizePath('~/Dropbox/sfn receipt/YCQ/surf/lh.pial.asc'))
vertex = pial$darrays[[1]]$data
face = pial$darrays[[2]]$data
lh = geom_freemesh('lh', vertex, face, group = group, cache_file = '~/Desktop/junk/lh.json', layer = 8)

pial = nibabel$load('./adhoc/std.141.rh.pial.gii')
# tmp = threeBrain::read_fs_asc(normalizePath('~/Dropbox/sfn receipt/YCQ/surf/lh.pial.asc'))
vertex = pial$darrays[[1]]$data
face = pial$darrays[[2]]$data
rh = geom_freemesh('rh', vertex, face, group = group, cache_file = '~/Desktop/junk/rh.json', layer = 8)



threeBrain::threejs_brain(
  lh, rh, g,
  geom_sphere('ele', 1.5, c(0,90,20)),
  # control_presets = c('subject', 'surface_type', 'lh_material', 'rh_material',
                      # 'electrodes', 'attach_to_surface', 'color_group', 'animation'),
  optionals = list(),
  debug = T,
  browser_external = T, side_camera = T,
  side_camera_zoom = 1.4
)


# subject = rave::Subject$new('Compatibility', 'YCQ', strict = FALSE)
#
# env = rave::rave_brain2()
# env$load_surfaces(subject)
# env$load_electrodes(subject)
#
# # env$set_electrode_value(subject = 'Compatibility/YCQ', electrode = 46, value = rnorm(10), time = -2:7)
#
# brain = env$get_object()
# brain$view(
#   template_subject = 'Compatibility/YCQ',
#   control_presets = c('subject', 'surface_type', 'lh_material', 'rh_material',
#                       'electrodes', 'attach_to_surface', 'color_group', 'animation'),
#   optionals = list(),
#   debug = T,
#   value_range = c(-10,10),
#   browser_external = T, side_camera = T, g,
#   geom_sphere('ele', 1.5, c(0,70,20)),
#   side_camera_zoom = 1.4
# )

threeBrain::save_brain(wg, directory = '~/junk/brain')
