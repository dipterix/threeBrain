
# g0 = SphereGeom$new(name = 's1', position = c(0,100,0), radius = 10, group = group)
# g0$set_value(10)
#
#
# g1 = SphereGeom$new(name = 's2', position = c(0,100,10), radius = 10, group = group)
#
# g2 = SphereGeom$new(name = 's3', position = c(0,100,100), radius = 10, group = NULL)
#
# geoms = list(g1,g2,g0)
#
# threejs_brain(g1,g2,g0, side_camera = TRUE)


# root_dir = '/Volumes/data/rave_data/ent_data/congruency/YAB/rave'
root_dir = '~/rave_data/data_dir/Complete/YAB/rave/'
afni_fn = rave::afni_tools(F)

group = threeBrain:::GeomGroup$new(name = 'Hemisphere', layer = 1, position = c(0,0,0))

dat = afni_fn$read.AFNI(file.path(root_dir, 'suma/fs_SurfVol_Alnd_Exp+orig.HEAD'), forcedset = F)
mat = matrix(c(dat$header$VOLREG_MATVEC_000000, 0,0,0,1), nrow = 4, ncol = 4, byrow = T)

dat = threejsr::read.freesurf.asc(file.path(root_dir, 'suma/rh.pial.asc'))
rh = FreeGeom$new(name = 'Right Hemisphere', vertex = dat$vertices[,1:3], face = dat$faces[,1:3], group = group, cache_file = file.path(root_dir, 'viewer/rh_pial.json'))

dat = threejsr::read.freesurf.asc(file.path(root_dir, 'suma/lh.pial.asc'))
lh = FreeGeom$new(name = 'Left Hemisphere', vertex = dat$vertices[,1:3], face = dat$faces[,1:3], group = group, cache_file = file.path(root_dir, 'viewer/lh_pial.json'))


dat = as.matrix(read.csv(file.path(root_dir, 'meta/electrodes.csv'))[,c('Coord_x', 'Coord_y', 'Coord_z')])
eg = threeBrain:::GeomGroup$new(name = 'electrodes-YAB', layer = 1, position = c(0,0,0))
elecs = sapply(seq_len(nrow(dat)), function(ii){
  x = dat[ii,]
  g = SphereGeom$new(name = sprintf('el_%d', ii), position = x[1:3], radius = 2, group = eg)
  g$layer = 1
  g
})

# dat = threejsr::read.freesurf.asc(file.path(root_dir, 'suma/electrodes.asc'))
# elec_orig = FreeGeom$new(name = 'electrodes_orig', vertex = dat$vertices[,1:3], face = dat$faces[,1:3], group = eg)

# mm = mat
# # mat %?<-% dat$header$ALLINEATE_MATVEC_B2S_000000
#
mm = diag(c(-1,-1,1, 0)) %*% mat;
mm[,4] = -mm[,4]
mm[4,4] = 1

mm = solve(mm)
eg$set_transform(mat = mm)


# # group$set_transform(mat = solve(mm))
# eg$trans_mat
#
# eg$set_transform(mat = NULL)
#
# dd = group$group_data$free_vertices_rh_pial[1:10,1:3]
# m1 = (mat %*% t(cbind(dd, -1))) * c(-1,-1,1, 0)
# # m2 = diag(c(-1,-1,1, 0)) %*% mat %*% t(cbind(dd, -1))
# mm = diag(c(-1,-1,1, 0)) %*% mat; mm[,4] = -mm[,4]
# m3 = mm %*% t(cbind(dd, 1))
# m1-m3
#
lh$layer = 1
rh$layer = 1

# lh$clickable = FALSE
threejs_brain(lh, rh, .list = elecs, side_camera = TRUE, control_presets = c('lh-pial', 'rh-pial', 'electrodes'))
# threejs_brain(lh, rh, elec_orig, .list = elecs, side_camera = TRUE)
#
# elec_orig

# Electrode

canvas.mesh.lh_pial.visible=false;
