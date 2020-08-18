library(threeBrain)
pattern = '(.*)[rl]h\\.(.*)\\.asc'

brain = Brain$new(multiple_subject = T)

# Add subject YAB
subject_name = 'congruency/YAB'
# root_dir = '~/rave_data/data_dir/Complete/YAB/rave/'
root_dir = '/Volumes/data/rave_data/ent_data/congruency/YAB/rave/'
electrode_file = read.csv(file.path(root_dir, 'meta/electrodes.csv'))

brain$add_subject(subject_name)
pretty_name = stringr::str_remove_all(subject_name, '[^a-zA-Z0-9]')

fs = list.files(file.path(root_dir, 'suma'), pattern = pattern)
matches = stringr::str_match(fs, pattern)[,2:3]
if(nrow(matches)){
  matches = unique(matches)
  apply(matches, 1, function(x){
    brain$add_surface(
      subject_name = subject_name, surface_name = paste(x[1], x[2]),
      lh_surface = file.path(root_dir, sprintf('suma/%slh.%s.asc', x[1], x[2])),
      rh_surface = file.path(root_dir, sprintf('suma/%srh.%s.asc', x[1], x[2])),
      lh_surface_cache = file.path(root_dir, sprintf('viewer/%slh_%s_%s.json', x[1], x[2], pretty_name)),
      rh_surface_cache = file.path(root_dir, sprintf('viewer/%srh_%s_%s.json', x[1], x[2], pretty_name))
    )
  })
}

afni_fn = rave::afni_tools()
dat = afni_fn$read.AFNI(file.path(root_dir, 'suma/fs_SurfVol_Alnd_Exp+orig.HEAD'), forcedset = F)
mat = matrix(c(dat$header$VOLREG_MATVEC_000000, 0,0,0,1), nrow = 4, ncol = 4, byrow = T)

# Original way
mm = diag(c(-1,-1,1, 0)) %*% mat; mm[,4] = -mm[,4]; mm[4,4] = 1; mm = solve(mm)
brain$set_tranform(subject_name = subject_name, mat = mm)

apply(electrode_file, 1, function(x){
  print(x[['Electrode']])

  pos = as.numeric(c(x[['Coord_x']], x[['Coord_y']], x[['Coord_z']], 1))
  # pos = mm %*% pos

  brain$add_electrode(
    subject_name = subject_name,name = sprintf('Electrode %s (%s)', x[['Electrode']], x[['Label']]),
    x = pos[[1]],
    y = pos[[2]],
    z = pos[[3]],
    radius = 2
  )
})


# brain$map_to_template()
brain$multiple_subject = FALSE
# brain$print(control_presets = c('surface_type', 'electrodes'))


# Add subject YAH
subject_name = 'congruency/YAH'
root_dir = '~/rave_data/data_dir/Complete/YAH/rave/'
electrode_file = read.csv(file.path(root_dir, 'meta/electrodes.csv'), stringsAsFactors = F)

brain$add_subject(subject_name)
pretty_name = stringr::str_remove_all(subject_name, '[^a-zA-Z0-9]')

surfaces = c('pial', 'pial-outer-smoothed', 'smoothwm', 'sphere', 'sphere.reg', 'white')

for(p in surfaces){

  brain$add_surface(
    subject_name = subject_name, surface_name = p, is_standard = p=='pial', # Make sure at one template surface set!!!
    lh_surface = file.path(root_dir, sprintf('suma/lh.%s.asc', p)),
    rh_surface = file.path(root_dir, sprintf('suma/rh.%s.asc', p)),
    lh_surface_cache = file.path(root_dir, sprintf('viewer/lh_%s_%s.json', p, pretty_name)),
    rh_surface_cache = file.path(root_dir, sprintf('viewer/rh_%s_%s.json', p, pretty_name))
  )
}


afni_fn = rave::afni_tools(F)
dat = afni_fn$read.AFNI(file.path(root_dir, 'suma/fs_SurfVol_Alnd_Exp+orig.HEAD'), forcedset = F)
mat = matrix(c(dat$header$ALLINEATE_MATVEC_S2B_000000, 0,0,0,1), nrow = 4, ncol = 4, byrow = T)

# Original way
mm = diag(c(-1,-1,1, 0)) %*% mat; mm[,4] = -mm[,4]; mm[4,4] = 1; mm = solve(mm)
brain$set_tranform(subject_name = subject_name, mat = mm)

apply(electrode_file, 1, function(x){
  print(x[['Electrode']])

  pos = as.numeric(c(x[['Coord_x']], x[['Coord_y']], x[['Coord_z']], 1))
  # pos = mm %*% pos

  brain$add_electrode(
    subject_name = subject_name,name = sprintf('Electrode %s (%s)', x[['Electrode']], x[['Label']]),
    x = pos[[1]],
    y = pos[[2]],
    z = pos[[3]],
    radius = 2
  )
})


# brain$map_to_template()
brain$multiple_subject = FALSE
# brain$print(control_presets = c('surface_type', 'electrodes'), template_subject = 'congruency/YAH')

# Fun part1
brain$multiple_subject=TRUE
brain$map_to_template()

# brain$subjects$`congruency/YAH`$electrodes[[1]]$
brain$print(control_presets = c('surface_type', 'electrodes'), template_subject = 'congruency/YAH')

brain$print(control_presets = c('surface_type', 'electrodes'), template_subject = 'congruency/YAB')
