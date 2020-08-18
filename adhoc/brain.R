brain = Brain$new(multiple_subject = T)

subject_name = 'congruency/YAB'
root_dir = '~/rave_data/data_dir/Complete/YAB/rave/'
electrode_file = read.csv(file.path(root_dir, 'meta/electrodes.csv'))

brain$add_subject(subject_name)

pials = c('pial_2', 'pial-outer-smoothed', 'smoothwm', 'sphere', 'sphere.reg', 'white')

for(p in pials){

  brain$add_pial(
    subject_name = subject_name, pial_name = p, is_standard = p=='pial_2',
    lh_pial = file.path(root_dir, sprintf('suma/lh.%s.asc', p)),
    rh_pial = file.path(root_dir, sprintf('suma/rh.%s.asc', p)),
    lh_pial_cache = file.path(root_dir, sprintf('viewer/lh_%s.json', p)),
    rh_pial_cache = file.path(root_dir, sprintf('viewer/rh_%s.json', p))
  )
}


afni_fn = rave::afni_tools(F)
dat = afni_fn$read.AFNI(file.path(root_dir, 'suma/fs_SurfVol_Alnd_Exp+orig.HEAD'), forcedset = F)
mat = matrix(c(dat$header$VOLREG_MATVEC_000000, 0,0,0,1), nrow = 4, ncol = 4, byrow = T)

# Original way
mm = diag(c(-1,-1,1, 0)) %*% mat; mm[,4] = -mm[,4]; mm[4,4] = 1; mm = solve(mm)
# brain$set_tranform(subject_name = subject_name, mat = mm)

apply(electrode_file, 1, function(x){
  print(x[['Electrode']])

  pos = mm %*% c(x[['Coord_x']], x[['Coord_y']], x[['Coord_z']], 1)

  brain$add_electrode(
    subject_name = subject_name,name = sprintf('Electrode %d (%s)', x[['Electrode']], x[['Label']]),
    x = pos[[1]],
    y = pos[[2]],
    z = pos[[3]],
    radius = 2
  )
})

brain$map_to_template()

# brain$subjects$`congruency/YAB`$electrodes[[1]]$vertex_number

brain$multiple_subject = TRUE
brain$print(control_presets = c('pial_type', 'electrodes'))
