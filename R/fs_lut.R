

#' @export
freesurfer_lut <- local({
  cmap <- NULL

  list(

    get_key = function(value){
      if(is.null(cmap)){
        cmap <<- load_colormap(system.file(
          "palettes", "datacube2", "FreeSurferColorLUT.json", package = 'threeBrain'))
      }

      cmap$get_key(value)

    },

    from_key = function(key, label_only = TRUE){
      if(is.null(cmap)){
        cmap <<- load_colormap(system.file(
          "palettes", "datacube2", "FreeSurferColorLUT.json", package = 'threeBrain'))
      }

      re <- cmap$map[key + 1]

      if( label_only ){
        re <- sapply(re, function(x){
          if(is.null(x)){ return(NA) }
          x$Label
        })
      }
      re
    }


  )

})




