require(threeBrain)

group = GeomGroup$new(name = 'group', layer = 1)

g1 = SphereGeom$new(name = 'g1', radius = 5, group = group, position = c(0, 0, 0))
g2 = SphereGeom$new(name = 'g2', radius = 10, group = group, value = 1, position = c(10, 0, 0))
g3 = SphereGeom$new(name = 'g3', radius = 15, position = c(20, 0, 0))



afni_fn = rave::afni_tools(FALSE)
dat = afni_fn$read.AFNI('/Volumes/data/rave_data/ent_data/congruency/YAB/rave/suma/fs_SurfVol_Alnd_Exp+orig.HEAD')

sel = seq(2, 256, by = 4)


brk = drop(dat$brk)
x = brk[sel,sel,sel]

m = matrix(c(
  1,0,0,
  0,1,0,
  0,0,1,
  1,1,0,
  0,1,1,
  1,0,1,
  1,1,1
), ncol = 3, byrow = T)

nei = apply(rbind(c(0,0,0), m , -m), 1,function(d){
  as.vector(brk[sel+d[1],sel+d[2],sel+d[3]])
})

x = apply(nei, 1, sd)

dim(x) = rep(length(sel), 3)



g = ParticleGeom$new(name = 'p1', value = x, location = list(
  x = sel - 128,
  y = sel - 128,
  z = sel - 128
),is_cube = T, group = group)

threejs_brain(g, g3, side_camera = TRUE, control_panel = TRUE)
