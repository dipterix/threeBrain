## Installation (temporary)

install.packages("remotes")
install.packages("DT")
remotes::install_github("dipterix/threeBrain")
remotes::install_github("beauchamplab/raveio")

## (Usage)

library(threeBrain)

subject_code = "YBA"
subfolder <- "/Volumes/BeauchampServe/rave_data/raw/YBA/"
ctniifile <-
  "/Volumes/BeauchampServe/rave_data/raw/YBA/iELVis_Localization/YBA/elec_recon/ctINt1.nii.gz"
  # "/Volumes/BeauchampServe/rave_data/raw/YBA/iELVis_Localization/YBA_CT.nii"
ct2t1mat <- '/Volumes/BeauchampServe/rave_data/raw/YBA/iELVis_Localization/YBA/elec_recon/ct2t1.mat'
ct2t1 <- as.matrix(read.table(ct2t1mat))


subject_code = "YAS"
subfolder <- "~/Downloads/iELVis_Localization/YAS/"
ctniifile <-
  "~/Downloads/iELVis_Localization/YAS/elec_recon/postInPre.nii.gz"

# Case 1: with CT
module <- localization_module(
  subject_code = subject_code,
  fs_path = subfolder,
  ct_path = ctniifile
)
print(module$app)

library(threeBrain)
brain <- freesurfer_brain2(subfolder, subject_code)
ct <- threeBrain:::read_nii2(ctniifile)
cmap <- threeBrain::create_colormap(gtype = "volume", dtype = "continuous",
                                    key = seq(0, max(ct$get_range())),
                                    value = seq(0, max(ct$get_range())),
                                    color = c("white", 'green'))

ct_shift <- ct$get_center_matrix()
# ct_shift[1:3,4] <- ct$get_shape() / 2
ct_qform <- ct$get_qform()
# sign <- sign(ct_qform[1:3,4])
# ct_shift[sign > 0] <- -ct_shift[sign > 0]
# ct_shift[4,4] <- 1
diag(ct_qform) <- sign(diag(ct_qform))
mat <-
  brain$Torig %*% solve(brain$Norig) %*% ct2t1 %*% ct_qform %*% ct_shift


threeBrain::add_voxel_cube(brain, "AA", ct$get_data(), size = ct$get_size(), trans_mat = mat)
brain$plot(
  control_presets = "localization",
  voxel_colormap = cmap,
  controllers = list(
    "Voxel Min" = 3000,
    "Voxel Type" = "AA",
    "Edit Mode" = "CT/volume"
  ))

