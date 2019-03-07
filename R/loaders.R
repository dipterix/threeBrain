n27_surfaces <- c('pial', 'white', 'sphere', 'smoothwm', 'inflated')

get_n27_surface <- function(
  group_left, group_right, surface = 'pial', force_cache = FALSE,
  n27_dir = getOption('threeBrain.n27_dir', '~/rave_data/others/three_brain/N27')
){
  stopifnot2(surface %in% c('pial', 'white', 'sphere', 'smoothwm', 'inflated'),
             msg = "surface can only be one of the followings: 'pial', 'white', 'sphere', 'smoothwm', 'inflated'")
  fs = file.path(n27_dir, sprintf('std.141.%sh.%s.asc', c('l', 'r'), surface))
  if(any(!file.exists(fs))){
    download_N27_surface(surfaces = surface)
  }

  if(missing(group_left)){
    group_left = GeomGroup$new(name = 'N27 Left Hemisphere')
  }
  if(missing(group_right)){
    group_right = GeomGroup$new(name = 'N27 Right Hemisphere')
  }


  cache_file = file.path(n27_dir, sprintf('N27_std_141_lh_%s.json', surface))
  if(force_cache){
    unlink(cache_file)
  }

  name = sprintf('lh - %s (Template N27)', surface)

  if(file.exists(cache_file)){
    left_hemisphere = FreeGeom$new(
      name = name,
      cache_file = cache_file,
      group = group_left
    )
  }else{
    dat = read_fs_asc(fs[[1]])
    left_hemisphere = FreeGeom$new(
      name = name,
      cache_file = cache_file,
      vertex = dat$vertices[,1:3],
      face = dat$faces[, 1:3],
      group = group_left
    )
  }

  cache_file = file.path(n27_dir, sprintf('N27_std_141_rh_%s.json', surface))
  if(force_cache){
    unlink(cache_file)
  }

  name = sprintf('rh - %s (Template N27)', surface)
  if(file.exists(cache_file)){
    right_hemisphere = FreeGeom$new(
      name = name,
      cache_file = cache_file,
      group = group_right
    )
  }else{
    dat = read_fs_asc(fs[[2]])
    right_hemisphere = FreeGeom$new(
      name = name,
      cache_file = cache_file,
      vertex = dat$vertices[,1:3],
      face = dat$faces[, 1:3],
      group = group_right
    )
  }



  return(list(
    left = left_hemisphere,
    right = right_hemisphere
  ))

}


#' Download N27 Brain Surfaces From URL
#' @param url_root URL address to store the meshes
#' @param surfaces which surface(s) to download
#' @param reset reset downloads?
#' @param n27_dir download to
#' @export
download_N27_surface <- function(
  url_root = 'https://s3.amazonaws.com/rave-data/sample-data/N27/',
  surfaces = c('pial', 'white', 'sphere', 'smoothwm', 'inflated'),
  reset = FALSE, n27_dir = getOption('threeBrain.n27_dir', '~/rave_data/others/three_brain/N27')
){

  cat2('Downloading N27 Brain - Surface(s):', paste(surfaces, collapse = ', '), level = 'INFO')

  dir = n27_dir

  options('threeBrain.n27_dir' = n27_dir)

  dir.create(dir, showWarnings = F, recursive = T)


  url_root = stringr::str_remove(url_root, '/$')
  stopifnot2(all(surfaces %in% c('pial', 'white', 'sphere', 'smoothwm', 'inflated')),
             msg = "surfaces can only be one or more of the followings: 'pial', 'white', 'sphere', 'smoothwm', 'inflated'")

  fnames = lapply(surfaces, function(s){
    sapply(c('l', 'r'), function(d){
      sprintf('std.141.%sh.%s.asc', d, s)
    })
  })
  fnames = unlist(fnames)

  for(f in fnames){
    a = file.path(dir, f)
    b = sprintf('%s/%s', url_root, f)
    if(reset || !file.exists(f)){
      download.file(url = b, destfile = a, quiet = F, cacheOK = T)
    }
  }

}
