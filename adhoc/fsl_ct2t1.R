# Function to co-regiater CT to MRI

fs_dir = '/Users/beauchamplab/Dropbox/rave_data/congruency/YAB/fs'

recon_path = file.path(fs_dir, 'RAVE')
dir.create(recon_path, showWarnings = FALSE, recursive = TRUE)

t1_path_mgz = normalizePath(file.path(fs_dir, 'mri', 'T1.mgz'))
t1_path_nii = file.path(fs_dir, 'RAVE', 'T1.nii.gz')
ct_path_nii = '/Users/beauchamplab/Dropbox/rave_data/congruency/YAB/fs/RAVE/CT.nii'
aligned_file = file.path(recon_path, 'aligned.nii.gz')
out_mat = file.path(recon_path, 'ct2t1.txt')

# Creating T1.nii.gz
freesurfer::mri_convert(file = t1_path_mgz, outfile = t1_path_nii, opts = '--out_type nii')

# ???
# echo 'Creating brainmask.nii.gz in elec_recon folder for use with BioImageSuite later.'
# mri_convert $mriPath/brainmask.mgz $elecReconPath/brainmask.nii.gz

# Assume CT.nii exists
# Registering ' $2 ' to T1.nii.gz with a rigid (6 degrees of freedom) transformation that maximizes mutual information between the volumes. This takes awhile....
fslr::flirt(infile = ct_path_nii, reffile = t1_path_nii, outfile = aligned_file,
            omat = out_mat, dof = 6L,
            opts = '-interp trilinear -cost mutualinfo -searchcost mutualinfo -searchrx -180 180 -searchry -180 180 -searchrz -180 180')



  # Make images of CT/MRI coregistration
  slices $elecReconPath/postInPre.nii.gz $elecReconPath/T1.nii.gz
slices $elecReconPath/T1.nii.gz  $elecReconPath/postInPre.nii.gz
# Make gifs of those images
slices $elecReconPath/postInPre.nii.gz $elecReconPath/T1.nii.gz -o $elecReconPath/PICS/COREG/ctINt1_1.gif
slices $elecReconPath/T1.nii.gz  $elecReconPath/postInPre.nii.gz -o $elecReconPath/PICS/COREG/ctINt1_2.gif
