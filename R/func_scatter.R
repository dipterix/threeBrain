# Normal usage of 3D plots


# @title 3D Scatter Plot
# @author Zhengjia Wang
# @param x,y,z numeric vectors with the same length \code{n}.
# @param size size for each point.
# @param col color vector/matrix, can be either numeric or factor.
#            Its length (vector) or nrow (matrix) must be either \code{n} or 1.
# @param label text label of each observation.
# @param group categorical group names of each points.
# @param timestamp numeric vector, length of 0 or \code{ncol(col)}.
# @param pal color palette, vector of colors, can be integers.
# @param scale 'auto', \code{NULL}, or numeric, rescale the final coordinates.
#              Default 1, no re-scale.
# @param axis logical, draw axis.
# @param control_panel logical, show sidebar (control panel).
# @param control_presets if control_panel is true, which widgets to show.
# @param camera_pos initial camera position, auto assign if missing.
# @param ... other arguments passing to \code{threejs_brain}.
# @examples
#
# # Continuous color example:
#
# data("iris")
# three_scatter(x = iris$Sepal.Length, y = iris$Sepal.Width,
#               z = iris$Petal.Length, size = 0.1,
#               col = iris$Petal.Width, group = iris$Species,
#               pal = c('orange', 'blue3', 'darkgreen'),
#               start_zoom = 12, axis = FALSE)
#
#
# # Discrete example:
#
# x = rnorm(26, c(10, 10, -20))
# y = rnorm(26, c(10, -10, 10))
# z = rnorm(26, c(10, 40, -10))
# three_scatter(x, y, z, size = 1, col = sample(letters[1:3], 20, TRUE),
#               pal = c('orange', 'blue3', 'darkgreen'))
#
# @export
# three_scatter <- function(
#   x, y, z, size = 1, col = 1, label = NULL, group = 1, timestamp = NULL, pal = NULL,
#   scale = 1, control_panel = TRUE, control_presets = NULL, camera_pos, ...
# ){
#   maxl <- max(length(x),length(y),length(z))
#   rec <- function(d, max_len = maxl){
#     if(length(d) == 0){
#       return(seq_len(max_len))
#     }
#     if(is.matrix(d)){
#       if(nrow(d) > max_len){
#         return(d[seq_len(max_len),,drop=FALSE])
#       }
#       nrep <- ceiling(max_len / nrow(d))
#       if(nrep > 1){
#         d <- apply(d, 2, function(dd){
#           rep(dd, nrep)[seq_len(max_len)]
#         })
#       }
#     }else{
#       if(length(d) > max_len){
#         return(d[seq_len(max_len)])
#       }
#       nrep <- ceiling(max_len / length(d))
#       if(nrep > 1){
#         d <- rep(d, nrep)[seq_len(max_len)]
#       }
#     }
#
#     d
#
#   }
#
#   if(length(scale)){
#     scale <- scale[[1]]
#     if(scale == 'auto'){
#       scale <- 50 / max(abs(range(x,y,z)))
#     }
#   }else{
#     scale <- 1
#   }
#
#   x <- rec(x)
#   y <- rec(y)
#   z <- rec(z)
#   size <- rec(size)
#   label <- rec(label)
#   group <- rec(as.character(group))
#
#   groups <- sapply(sort(unique(group)), function(gname){
#     GeomGroup$new(name = gname)
#   }, USE.NAMES = TRUE, simplify = FALSE)
#
#
#   if(!is.numeric(col)){
#     col <- as.factor(col)
#   }
#
#   col <- as.matrix(rec(col))
#   timestamp <- rec(timestamp, ncol(col))
#
#   geoms <- lapply(seq_len(maxl), function(ii){
#     if(length(groups) > 1){
#       nm <- sprintf('%s (%s)', label[ii], group[[ii]])
#     }else{
#       nm <- label[ii]
#     }
#     g <- SphereGeom$new(name = nm, position = c(x[ii], y[ii], z[ii]) * scale,
#                        radius = size[ii], group = groups[[group[[ii]]]])
#     g$set_value(value = col[ii,], time_stamp = timestamp, name = 'Value')
#
#     if(scale != 1){
#       g$custom_info <- sprintf('Rescale: %.2f x', 1/scale)
#     }
#
#
#     g
#   })
#
#
#   camera_center <- c(mean(range(x)),mean(range(y)),mean(range(z))) * scale
#
#   span <- c(max(x), max(y), max(z))
#   span <- sqrt(max(sum(span^2), sum((span - camera_center)^2)))
#
#
#   if(missing(camera_pos)){
#     camera_pos <- camera_center + c(0,0,2*span)
#   }
#
#   threejs_brain(.list = geoms,
#                 control_panel = control_panel, control_presets = control_presets,
#                 palettes = list('Value' = pal),
#                 camera_center = camera_center,
#                 camera_pos = camera_pos* scale,
#                 ...)
#
# }



