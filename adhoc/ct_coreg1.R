library(threeBrain)

module <- localization_module(
  subject_code = "YAS",
  fs_path = '~/Downloads/iELVis_Localization/YAS/',
  ct_path = "~/Downloads/iELVis_Localization/CT_highresRAI_res_al.nii"
)
print(module$app)

brain <- threeBrain::freesurfer_brain2(
  '~/Downloads/iELVis_Localization/YAS/', 'YAS'
)
ct <- threeBrain:::read_nii2("~/Downloads/iELVis_Localization/CT_highresRAI_res_al.nii")
a <- ct$get_data()
# a <- threeBrain:::reorient_volume(ct$get_data(), brain$Torig)
key <- seq(0, max(a))
cmap <- threeBrain::create_colormap(gtype = "volume", dtype = "continuous",
                                    key = key, value = key, color = c("white", 'green'))

ct2t1 <- matrix(as.numeric(read.table('~/Downloads/iELVis_Localization/CT_highresRAI_res_shft_al_mat.aff12.1D')), ncol = 4, byrow = TRUE)
ct2t1 <- rbind(ct2t1, c(0,0,0,1))

ct_shift <- ct$get_center_matrix()
ct_qform <- ct$get_qform()
ct$get_voxel_size()
matrix_world <- brain$Torig %*% solve(brain$Norig) %*% solve(ct2t1) %*% ct_qform %*% ct_shift
add_voxel_cube(brain, "CT", ct$get_data(), size = ct$get_size(),
               matrix_world = matrix_world)

# get trans_mat
ct_vox2ras <- oro.nifti::qform(ct$header)
# ct_vox2ras[1:2,] <- -ct_vox2ras[1:2,]

# calculate actual matrix
ct_crs_orig <- -abs(ct_vox2ras[1:3, 4])
dm <- oro.nifti::dim_(ct$header)[2:4]
vox_dim <- oro.nifti::voxdim(ct$header)
start <- ct_crs_orig
end <- dm * vox_dim + ct_crs_orig

half_size <- (end - start) / 2
mat <- diag(rep(1,4))
mat[1:3,4] <- half_size
# trans_mat <- ct_vox2ras %*% mat # to T1

ct2t1 <- matrix(as.numeric(read.table('~/Downloads/iELVis_Localization/CT_highresRAI_res_shft_al_mat.aff12.1D')), ncol = 4, byrow = TRUE)
ct2t1 <- rbind(ct2t1, c(0,0,0,1))

shift <- matrix(as.numeric(read.table('~/Downloads/iELVis_Localization/CT_highresRAI_shft.1D')), ncol = 4, byrow = TRUE)
shift <- rbind(shift, c(0,0,0,1))

trans_mat <- ct2t1 %*% (ct_vox2ras %*% mat)

trans_mat <- solve(ct2t1) %*% ct_vox2ras %*% mat

# shift <- matrix(as.numeric(read.table('~/Downloads/iELVis_Localization/CT_highresRAI_shft.1D')), ncol = 4, byrow = TRUE)
# shift <- rbind(shift, c(0,0,0,1))
#
# trans_mat <- solve(shift) %*% trans_mat

# t1 <- threeBrain:::read_nii2("~/Downloads/iELVis_Localization/temp_ANAT.nii")
# oro.nifti::qform()

# trans_mat <- brain$xfm %*% trans_mat


# ct <- threeBrain:::read_nii2("~/rave_data/data_dir/test1/YAB/fs/elec_recon/postInPre.nii.gz")
# a <- ct$get_data()
threeBrain::add_voxel_cube(brain, "AA", drop(a))
brain$atlases$AA$group$group_data$`datacube_half_size_Atlas - AA (YAS)` <- half_size
brain$atlases$AA$group$trans_mat <- trans_mat
# brain$atlases$AA$group$trans_mat[4, 1:3] <- 0

brain$plot(
  control_presets = "localization",
  voxel_colormap = cmap,
  controllers = list(
    "Background Color" = "#000000",
    "Voxel Min" = 3000,
    "Voxel Type" = "CT",
    "Edit Mode" = "CT/volume"
  ))
