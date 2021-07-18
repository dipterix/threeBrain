# This file contains S3 methods for R6 classes



#' Create a geometry group containing multiple geometries
#' @author Zhengjia Wang
#' @param name string, name of the geometry
#' @param position x,y,z location of the group
#' @param layer layer of the group. reserved
#' @return a GeomGroup instance
#' @details A geometry group is a container of multiple geometries. The geometries
#' within the same group share the same shift and rotations (see example 1).
#' In ECoG/iEEG world, you might have 'MRI', 'CT', 'FreeSurfer' that have
#' different orientations. For example, if you want to align MRI to FreeSurfer,
#' Instead of calculating the position of each geometries, you can just put
#' all MRI components into a group, and then set transform of this group,
#' making the group aligned to FreeSurfer.
#'
#' GeomGroup also can be used to store large data. To generate 3D viewer,
#' `threeBrain` needs to dynamically serialize data into JSON format,
#' which can be read by browsers. However, a FreeSurfer brain might be ~30 MB.
#' This is a very large size and might take ~5 seconds to serialize.
#' To solve this problem, GeomGroup supports cache in its `set_group_data`
#' method. This method supports caching static serialized data into a JSON file,
#' and allows the files to be loaded as static data objects. By "static", I mean
#' the data is not supposed to be dynamic, and it should be "read-only".
#' In JavaScript code, I also optimized such that you don't need to load these
#' large datasets repeatedly. And this allows you to load multiple subjects'
#' brain in a short time.
#' @examples
#' # Example 1: relative position
#'
#' # create group
#' g = create_group('Group A')
#'
#' # create two spheres at 10,0,0, but s2 is relative to group A
#' s1 = geom_sphere('Sphere 1', radius = 2, position = c(10,0,0))
#' s2 = geom_sphere('Sphere 2', radius = 2, position = c(10,0,0), group = g)
#'
#' # set transform (rotation)
#' g$set_transform(matrix(c(
#'   0,1,0,0,
#'   1,0,0,0,
#'   0,0,1,0,
#'   0,0,0,1
#' ), byrow = TRUE, ncol = 4))
#'
#' # global position for s2 is 0,10,0
#' threejs_brain(s1, s2)
#'
#' # Example 2: cache
#'
#' \dontrun{
#'
#' # download N27 brain
#' # Make sure you have N27 brain downloaded to `default_template_directory()`
#' # download_N27()
#'
#' template_dir <- default_template_directory()
#'
#' dat = threeBrain::read_fs_asc(
#'   file.path(template_dir, 'N27/surf/lh.pial.asc')
#' )
#' vertex = dat$vertices[,1:3]
#' face = dat$faces[,1:3]
#'
#' # 1. dynamically serialize
#' mesh = geom_freemesh('lh', vertex = vertex, face = face, layer = 1)
#' pryr::object_size(mesh) # ~10 MB
#' threejs_brain(mesh) # ~3 seconds to serialize
#'
#' # 2. cache
#' # Create group, all geometries in this group are relatively positioned
#' tmp_file = tempfile()
#' mesh = geom_freemesh('Left Hemisphere cached', vertex = vertex,
#'                      face = face, cache_file = tmp_file)
#' pryr::object_size(mesh) # ~0.5 MB
#' threejs_brain(mesh) # serialize at once, load in browser
#'
#' }
#' @export
create_group <- function(name, position = c(0,0,0), layer = 1){
  GeomGroup$new(name = name,layer = layer,position = position)
}


#' Create sphere geometry
#' @author Zhengjia Wang
#' @param name unique string in a scene to tell apart from different objects
#' @param radius size of sphere
#' @param position x,y,z location of the sphere
#' @param layer visibility of the geometry, used when there are multiple cameras 1 is visible for all cameras
#' @param group a GeomGroup object
#' @param value,time_stamp color of the sphere, used for animation/color rendering
#' @examples
#' # Create a sphere with animation
#' g = lapply(1:10, function(ii){
#'   v = rep(ii, 10)
#'   v[1:ii] = 1:ii
#'   geom_sphere(paste0('s', ii), ii, value = v, position = c(11 * ii, 0,0), time_stamp = (1:10)/10)
#' })
#' threejs_brain(.list = g)
#' @export
geom_sphere <- function(name, radius, position = c(0,0,0), layer=1, group = NULL, value = NULL, time_stamp = NULL){
  SphereGeom$new(name = name, position = position, radius = radius, group = group, value = value, time_stamp = time_stamp, layer = layer)
}

#' Creates any mesh geometry given vertices and face indices
#' @author Zhengjia Wang
#' @param name unique string in a scene to tell apart from different objects
#' @param vertex position of each vertices (3 columns)
#' @param face face indices indicating which 3 vertices to be linked (3 columns)
#' @param position x,y,z location of the geometry
#' @param layer visibility of the geometry, used when there are multiple cameras 1 is visible for all cameras
#' @param group a GeomGroup object, if null, then the group will be generated automatically
#' @param cache_file cache vertex and face data into group
#' @details When generating a free mesh internally, a group must be specified,
#' therefore if group is \code{NULL} here, then a group will be generated.
#' However, it's always recommended to pass a group to the free mesh.
#' @examples
#' \dontrun{
#' # Make sure you have N27 brain downloaded to `default_template_directory()`
#' # threeBrain::download_N27()
#'
#' n27_dir = file.path(default_template_directory(), "N27")
#' surf_type = 'pial'
#'
#' # Locate mesh files
#' lh = read_fs_asc(file.path(n27_dir, sprintf('surf/lh.%s.asc', surf_type)))
#' rh = read_fs_asc(file.path(n27_dir, sprintf('surf/rh.%s.asc', surf_type)))
#'
#' # Create groups
#' group = create_group(name = sprintf('Surface - %s (N27)', surf_type))
#'
#' # create mesh
#' lh_mesh = geom_freemesh(
#'   name = sprintf('FreeSurfer Left Hemisphere - %s (N27)', surf_type),
#'   vertex = lh$vertices[,1:3],
#'   face = lh$faces[,1:3],
#'   group = group
#' )
#' rh_mesh = geom_freemesh(
#'   name = sprintf('FreeSurfer Right Hemisphere - %s (N27)', surf_type),
#'   vertex = rh$vertices[,1:3],
#'   face = rh$faces[,1:3],
#'   group = group
#' )
#'
#'
#' # Render
#' threejs_brain(lh_mesh, rh_mesh)
#'
#'
#'
#' }
#' @export
geom_freemesh <- function(name, vertex = NULL,face = NULL, position = c(0,0,0), layer = 1, cache_file = NULL, group = NULL){
  if(is.null(group)){
    group <- create_group(paste(name, '(group)'))
  }
  if(!is.null(cache_file) && file.exists(cache_file)){
    FreeGeom$new(name = name, position = position, group = group, cache_file = cache_file,layer = layer)
  }else{
    FreeGeom$new(name = name, position = position, vertex = vertex,
                 face = face, group = group,cache_file = cache_file,layer = layer)
  }

}




