
#' @title Query the 'FreeSurfer' labels
#'
#' @details The 'FreeSurfer' atlases use
#' \url{https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/AnatomicalROI/FreeSurferColorLUT}
#' look-up table to query indexes. The 'threeBrain' electrode localization
#' also uses this table to export electrode 'FSLabel'. If volume type is
#' set to \code{'aparc_aseg'}, then please also use this table to filter.
#'
#' @examples
#'
#' freesurfer_lut$from_key(0:10)
#'
#' freesurfer_lut$get_key("ctx-lh-supramarginal")
#'
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




