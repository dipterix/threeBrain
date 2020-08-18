library(threeBrain)
env = rave:::rave_brain2()

# env$cache('Complete/YAI')

subject = rave:::as_subject('Complete/YAI')

brain = env$get_object()


# surfaces = c('pial', 'white', 'smoothwm')
surfaces = c('pial')
# env$brain$default_surfaces = surfaces
# env$brain$set_multiple_subject(T)
#
#
env$load_surfaces('congruency/YAI')
env$load_electrodes('congruency/YAI')
# env$add_subject('Complete/YAB', surfaces = surfaces)
#
# # env$cache('Complete/YAD')
# env$add_subject('Complete/YAD', surfaces = surfaces)


time = seq(-1, 2, length.out = 300)
env$brain$subjects$`Complete/YAB`$electrodes[[1]]$set_value(
  sin(time), time
)

brain$view(
  control_presets = c('subject', 'surface_type', 'lh_material', 'rh_material',
                      'electrodes', 'attach_to_surface', 'color_group', 'animation'),
  # optionals = list(),
  debug = T
)

wd

export_dir = file.path(subject$dirs$data_dir, subject$project_name, '_group_viewer')
dir.create(export_dir, showWarnings = F, recursive = T)
htmlwidgets::saveWidget(
  wd,
  file = file.path(export_dir, 'index.html'),
  selfcontained = F,
  title = paste('Group Viewer -', subject$project_name),
  libdir = 'lib'
)
# Write bash
sh_file = file.path(export_dir, 'launch.command')
writeLines(c(
  '#!/bin/bash',
  'DIRECTORY=`dirname $0`',
  'cd $DIRECTORY',
  "Rscript -e '{if(system.file(\"\",package=\"servr\")==\"\"){install.packages(\"servr\",repos=\"https://cloud.r-project.org\")};servr::httd(browser=TRUE)}'"
), sh_file)
sh_file = normalizePath(sh_file)
system(sprintf('chmod a+x "%s"', sh_file))
