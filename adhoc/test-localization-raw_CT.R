brain <- threeBrain::freesurfer_brain2("~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/fs/", subject_name = 'PAV010')
brain$localize(
  ct_path = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/inputs/CT/POST_IMPLANT_CT_1_IEEG_HEAD_20221130155104_3.nii',
  mri_path = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/inputs/MRI/PRE_IMPLANT_MRI_AXIAL_T1_MPRAGE_BRAIN_POST_STEALTH_20221023132448_14.nii',
  transform_matrix = "~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/ct2t1.mat",
  transform_space = "fsl"
)
controllers <- list()
control_presets <- 'localization'
controllers[["Highlight Box"]] <- FALSE
# coregistered_ct <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV009/rave-imaging/inputs/CT/POST_IMPLANT_CT_1_STEALTH_20221026135004_2.nii'
# coregistered_ct <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/upsampled.nii.gz'
coregistered_ct <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/inputs/CT/POST_IMPLANT_CT_1_IEEG_HEAD_20221130155104_3.nii'
raw_mri = '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/inputs/MRI/PRE_IMPLANT_MRI_AXIAL_T1_MPRAGE_BRAIN_POST_STEALTH_20221023132448_14.nii'
# raw_mri <- '~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV009/rave-imaging/coregistration/ct_in_t1.nii.gz'
ct2t1 <- as.matrix(read.table("~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/coregistration/ct2t1.mat"))
ct <- threeBrain:::read_nii2(coregistered_ct, reorient = FALSE)
# ct <- threeBrain:::read_nii2("~/Dropbox (PENN Neurotrauma)/RAVE/Samples/raw/PAV010/rave-imaging/inputs/CT/POST_IMPLANT_CT_1_IEEG_HEAD_20221130155104_3.nii")
mri <- threeBrain:::read_nii2(raw_mri, reorient = FALSE)
# cube <- reorient_volume( ct$get_data(), self$Torig )

# TODO: FIXME

# add_voxel_cube(self, "CT", cube)
ct_shape <- ct$get_shape()
matrix_world1 <- diag(rep(1, 4))
matrix_world1[1:3, 4] <- ct_shape / 2
matrix_world2 <- diag(rep(1, 4))
matrix_world2[1:3, 4] <- mri$get_shape() / 2

ijk2fsl <- ct$get_IJK_to_FSL()
ijk2ras <- ct$get_IJK_to_RAS()
ijk2fsl_mri <- mri$get_IJK_to_FSL()
ijk2ras_mri <- mri$get_IJK_to_RAS()
mat1 <- ijk2ras$matrix
mat2 <- ijk2ras_mri$matrix

# mat3 <-  brain$Torig %*% solve(brain$Norig) %*% mat1 %*% solve(ijk2fsl_mri) %*% ijk2fsl %*% matrix_world1
# threeBrain::add_voxel_cube(brain, "CT", mri$get_data(), size = mri$get_shape(),
                           # trans_mat = mat3)

### This `mat3` transform IJK to tkrRAS
mat3 <- brain$Torig %*% solve(brain$Norig) %*% mat2 %*% solve(ijk2fsl_mri) %*% ct2t1 %*% ijk2fsl %*% matrix_world1
threeBrain::add_voxel_cube(brain, "CT", ct$get_data(), size = ct$get_shape(),
                           trans_mat = mat3, color_format = "AlphaFormat")



key <- seq(0, max(ct$get_range()))
cmap <- threeBrain::create_colormap(
  gtype = 'volume', dtype = 'continuous',
  key = key, value = key,
  color = c("white", "green", 'darkgreen')
)
controllers[["Left Opacity"]] <- 1
controllers[["Right Opacity"]] <- 1
controllers[["Voxel Type"]] <- "CT"
controllers[["Voxel Display"]] <- "normal"
controllers[["Voxel Min"]] <- 1000
controllers[["Voxel Opacity"]] <- 0.01
# controllers[["Edit Mode"]] %?<-% "CT/volume"
wg <- brain$plot(
  control_presets = control_presets,
  voxel_colormap = cmap,
  debug = TRUE,
  controllers = controllers,
  background = "#000000"
)
wg
