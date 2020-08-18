require(threeBrain)

subject = rave::Subject$new('congruency', 'YAB', strict = FALSE)

# Method 1: Native method
brain = freesurfer_brain(subject$dirs$subject_dir, subject$subject_code)
brain$set_electrodes(subject$electrodes)
plot(brain)


# Method 2: RAVE wrapper
brain = rave::rave_brain2(subject = subject)
plot(brain)


# Load into N27 (or any other subjects)

# 1. optional: set template brain
threeBrain::set_default_template(subject_code = 'N27')

# 2. Calculate std 141 and MNI305 position, if done previously, skip this
brain$set_electrodes(subject$electrodes[, c(1:5, 9, 10)])
table = brain$calculate_template_coordinates(save_to = FALSE)
rave::save_meta(table, meta_type = 'electrodes', project_name = subject$project_name,
                subject_code = subject$subject_code)

# 3. create template
template = merge_brain(brain, template_surface_types = 'pial-outer-smoothed')

# 4. view in N27
template$plot()
# To include YAB
template$plot(additional_subjects = 'YAB')

# 5. To change surfaces
template$alter_template(surface_types = c('pial', 'smoothwm', 'inf_200'))
template$plot(debug=T)






nibabel = reticulate::import('nibabel')
aseg = nibabel$load(path.expand('~/rave_data/data_dir/congruency/YAB/rave/fs/mri/aseg.mgz'))
