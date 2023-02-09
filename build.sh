#/bin/bash

cd inst/three-brain-js

npm run build

cd ../../

cp -r inst/three-brain-js/dist inst/threeBrainJS

# git submodule update --recursive --remote

Rscript -e "devtools::install(upgrade = 'never')"
