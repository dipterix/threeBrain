## Installation (temporary)

install.packages("remotes")
install.packages("DT")
remotes::install_github("dipterix/threeBrain")
remotes::install_github("beauchamplab/raveio")

## (Usage)

library(threeBrain)

# Case 1: with CT
module <- localization_module(
  subject_code = "YAB",
  fs_path = "~/rave_data/data_dir/test1/YAB/fs/",
  ct_path = "~/Downloads/YAB_CT_aligned1.nii"
)
print(module$app)


# Case 2: without CT, but fs is constructed
module <- localization_module(
  subject_code = "YAB",
  fs_path = "~/rave_data/data_dir/test1/YAB/fs/"
)
print(module$app)
