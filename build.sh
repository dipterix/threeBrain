#/bin/bash

########## Use the following command to register shortcut ######################
# dipsaus::rs_add_shortcut(5, {
#   dipsaus::rs_focus_console()
#   cwd <- getwd()
#   on.exit({
#     setwd(cwd)
#   })
#   proj_dir <- .rs.getProjectDirectory()
#   build_sh <- file.path(proj_dir, "build.sh")
#   if(file.exists(build_sh)) {
#     system2("bash", shQuote(build_sh), env = c("USE_DIPSAUS=1"))
#   }
#   devtools::load_all(proj_dir)
#   setwd(cwd)
# }, force = TRUE)
################################################################################

cd inst/three-brain-js

npm run build

cd ../../

cp -r inst/three-brain-js/dist inst/threeBrainJS

# git submodule update --recursive --remote
if [[ "$USE_DIPSAUS" != "1" ]]; then
  Rscript -e "devtools::document(roclets = c('rd', 'collate', 'namespace', 'vignette'))"
  source_file=$(Rscript -e "cat(devtools::build(vignettes = FALSE, manual = FALSE, path = './adhoc/', quiet = TRUE))")
  R CMD INSTALL --preclean --no-multiarch --with-keep.source "$source_file"
fi

LAST_RELEASE=$(grep "SHA: " "CRAN-SUBMISSION")
echo "## Changes since last CRAN release" > CHANGELOG.md
git log ${LAST_RELEASE:5}..HEAD --no-merges --graph --pretty=format:'%C(auto)`%h%d`%Creset: %s %C(cyan)(by %cn)%Creset' >> CHANGELOG.md
