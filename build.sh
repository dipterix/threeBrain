#/bin/bash

cd inst/three-brain-js

npm run build

cd ../../

cp -r inst/three-brain-js/dist inst/threeBrainJS

# git submodule update --recursive --remote

Rscript -e "devtools::document(roclets = c('rd', 'collate', 'namespace', 'vignette'))"
source_file=$(Rscript -e "cat(devtools::build(vignettes = FALSE, manual = FALSE, path = './adhoc/', quiet = TRUE))")
R CMD INSTALL --preclean --no-multiarch --with-keep.source "$source_file"
