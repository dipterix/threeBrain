brain = rave::rave_brain2('demo/YAB')
Time = seq(0, 10, 0.1)
phase = seq(0, 2* pi, length.out = 5)
electrodes = brain$electrodes$raw_table$Electrode

values = lapply(1:5, function(ii){
  data.frame(
    Project = 'demo', subject = 'YAB', Electrode = electrodes[[ii]],Time = Time,
    Value = sin(Time + phase[[ii]]) * 100
  )
})
values = do.call(rbind, values)

brain$set_electrode_values(values)

vert = brain$surfaces$pial$left_hemisphere$group$get_data('free_vertices_FreeSurfer Left Hemisphere - pial (YAB)')

coords = as.matrix(brain$electrodes$raw_table[,paste0('Coord_', c('x','y','z'))])

coef = apply(coords, 1, function(x){
  exp(-colSums((t(vert) - x)^2 / 100)/2)
})
Values = sapply(phase, function(p){sin(Time + p) * 100})
val = coef %*% t(Values)

# annot = threeBrain:::read_fs_labels(path = '~/rave_data/data_dir/demo/YAB/fs/label/lh.aparc.annot')

brain$surfaces$pial$left_hemisphere$set_value(value = c(
  # annot$data$R, annot$data$G, annot$data$B
  val
), name = 'Value', time_stamp = Time)#c(0,1,2))
# self = brain$surfaces$pial$left_hemisphere
colp = unique(annot$data$hex); colp[is.na(colp)] = '#000000'
brain$plot(side_display = FALSE, debug=TRUE, palettes = list(
  # Annot = colp
))


# 141 brain cause errors
n27 = threeBrain::merge_brain()
brain = n27$template_object
annot = threeBrain:::read_fs_labels(path = '~/rave_data/others/three_brain/N27/label/rh.aparc.annot')
brain$surfaces$pial$right_hemisphere$set_value(value = c(
  annot$data$Name
), name = 'Annot')
# self = brain$surfaces$pial$left_hemisphere
colp = unique(annot$data$hex); colp[is.na(colp)] = '#000000'
brain$plot(side_display = FALSE, debug=TRUE, palettes = list(
  Annot = colp
))
brain$electrodes$set_electrodes(table_or_path = '~/Box Sync/Shared/KellyBijanki/electrodes.csv')
# MNI305RAS = TalXFM*Norig*inv(Torig)*[tkrR tkrA tkrS 1]'

brain = rave::rave_brain2('demo/YAB')
annot = threeBrain:::read_fs_labels(path = '~/rave_data/data_dir/demo/YAB/fs/label/lh.aparc.annot')
brain$surfaces$pial$left_hemisphere$set_value(value = c(
  annot$data$Name
), name = 'Annot')
# self = brain$surfaces$pial$left_hemisphere
colp = unique(annot$data$hex); colp[is.na(colp)] = '#000000'
brain$plot(side_display = FALSE, debug=TRUE, palettes = list(
  Annot = colp
))



