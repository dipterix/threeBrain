#/bin/bash

cd inst/three-brain-js

npm run build

cd ../../

# git submodule update --recursive --remote

Rscript -e "devtools::install(upgrade = 'never')"
