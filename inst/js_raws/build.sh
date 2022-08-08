#!/bin/bash


# cd inst/js_raws
npx webpack && \
  cd ../htmlwidgets/lib/dipterixThreeBrain-1.0.1 && \
  rm *.main.js* && \
  cd ../../../../ && \
  Rscript -e "devtools::install(upgrade = 'never')"




