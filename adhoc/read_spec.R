# SUMA IO

# Script to parse a SUMA spec file

# Debug use

afni_tools <- function(){
  wrapper_env = new.env(parent = baseenv())
  parse_tools = function(){
    `.__env` = new.env(parent = wrapper_env)
    `.__env`$`<<-` = function(lhs, rhs){
      nm = as.character(substitute(lhs))
      wrapper_env[[nm]] = rhs
    }
    `.__expr` = parse(file = system.file('pkg_tools/AFNIio.R', package = 'threeBrain'))
    eval(`.__expr`, envir = `.__env`)
    `.__env`
  }
  re = parse_tools()
  return(re)
}


load_spec_file <- function(
  spec_file, surfvol_maps = c('std.141.lh.pial.asc', 'std.141.rh.pial.asc')
){
  spec_dir = dirname(spec_file)

  try_get_afni_file = function(path){
    # Convert path to lower case to see if .head or .brik is in the file name
    path_lo = stringr::str_to_lower(path)

    if(!stringr::str_detect(path_lo, '\\.(head)|(brik)$')){
      path = paste0(path, '.HEAD')
    }else if(stringr::str_detect(path_lo, '\\.brik$')){
      path = stringr::str_replace(path, '\\.[\\w]{4}$', '.HEAD')
    }

    # try to locate path
    if(file.exists(path)){
      absolute_path = normalizePath(path = path)

      # try to find relative path
      p1 = stringr::str_split(absolute_path, '/|\\\\')[[1]]
      p2 = stringr::str_split(spec_dir, '/|\\\\')[[1]]
      p1 = p1[p1!='']
      p2 = p2[p2!='']
      min_len = min(length(p1), length(p2))
      for(ii in 1:min_len){
        if(p1[ii] != p2[ii]){
          break
        }
      }
      if(min_len == ii && p1[ii] == p2[ii]){
        ii = ii + 1
      }
      if(ii > 1){
        p1 = p1[-seq_len(ii-1)]
        p2 = p2[-seq_len(ii-1)]
      }
      p2[] = '..'
      relative_path = paste(c(p2, p1), collapse = .Platform$file.sep)

      return(list(
        spec_dir = spec_dir,
        relative_path = relative_path,
        absolute_path = absolute_path
      ))

    }else{
      # find path from SUMA path
      path = stringr::str_split(path, '/|\\\\')[[1]]
      path = Reduce(file.path, path, accumulate = T, right = T)
      abs_path = file.path(spec_dir, path)
      fe = file.exists(abs_path)
      if(any(fe)){
        e = which(fe)[1]
        relative_path = path[e]
        absolute_path = abs_path[e]
        return(list(
          spec_dir = spec_dir,
          relative_path = relative_path,
          absolute_path = absolute_path
        ))
      }else{
        return(NULL)
      }
    }

  }

  ss = readLines(spec_file)

  # Trim strings
  ss = stringr::str_trim(ss)

  # Remove commented lines
  ss = ss[!stringr::str_detect(ss, '^#')]

  # Remove ''
  ss = ss[ss != '']

  # Spec file should be parsed line-by-line
  env = new.env()
  nothing = function(...){}
  env$surfaces = new.env()

  parser = list(
    'statedef' = function(v){env$state = v},
    'surfaceformat' = function(v){env$current_sf$format = v},
    'surfacetype' = function(v){env$current_sf$type = v},
    'freesurfersurface' = function(v){env$current_sf$name = v},
    'surfacename' = function(v){env$current_sf$name = v},
    'surfacevolume' = function(v){
      # Try to load file
      env$current_sf$paths = try_get_afni_file(v)
    },
    'surfacestate' = function(v){env$current_sf$state = v},
    'embeddimension' = function(v){env$current_sf$embeddimension = as.integer(v)},
    'anatomical' = function(v){env$current_sf$anatomical = v},
    'hemisphere' = function(v){env$current_sf$hemisphere = v},
    'newsurface' = function(...){
      # write current surface to env
      if(!is.null(env$current_sf)){
        csf = env$current_sf

        if(length(csf) && length(csf$name)){
          # Check if the surface volume is valid
          if(length(csf$hemisphere) || length(csf$paths)){
            csf$valid = TRUE

            csf_name_lower = stringr::str_to_lower(csf$name)

            if(stringr::str_detect(csf_name_lower, '^[lr]h.pial')){
              which_pial = stringr::str_sub(csf_name_lower, end = 1)
              sv_ae = csf$paths

              # Read
              # dat = afni_fn$read.AFNI(sv_ae$absolute_path, verb = )

              env[[paste0(which_pial, 'h_surfvol')]] = sv_ae
            }

          }else{
            csf$valid = FALSE
          }

          env$surfaces[[csf$name]] = csf
        }

      }

      env$current_sf = list()
      env$current_sf$valid = FALSE
    }
  )

  parser$newsurface()
  parser_names = names(parser)
  for(s in ss){
    s = stringr::str_split_fixed(s, '=', 2)
    s = stringr::str_trim(s)
    s[1] = stringr::str_to_lower(s[1])
    if(s[1] %in% parser_names){
      parser[[s[1]]](s[[2]])
    }
  }
  parser$newsurface()


  # Load surface volume file
  sv = NULL

  # stopifnot2(all(surfvol_maps %in% names(env$surfaces)), msg = 'surfvol_maps do not all exist.')
  for(surfvol_file in surfvol_maps){
    if(surfvol_file %in% names(env$surfaces)){
      sv = c(sv, env$surfaces[[surfvol_file]]$paths$absolute_path)
    }
  }

  env

}













