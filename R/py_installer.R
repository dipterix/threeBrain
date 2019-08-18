#' @name ravepy
#' @title Manage Python Environment from RAVE
NULL

#' @rdname ravepy
#' @usage ravepy_remove(conda = TRUE)
#' @param conda logical, is your environment created using \code{conda}?
ravepy_remove <- function(conda = TRUE){
  if(conda){
    cat2('Removing RAVEPy from conda', level = 'INFO')
    reticulate::conda_remove('RAVEPy')
  }else{
    cat2('Removing RAVEPy from virtualenv', level = 'INFO')
    reticulate::virtualenv_remove('RAVEPy', confirm = FALSE)
  }
  cat2("Please restart R", level = 'INFO')
}

#' @rdname ravepy
#' @usage ravepy_check(quiet = FALSE)
#' @param quiet logical, suppress printing information.
ravepy_check <- function(quiet = FALSE){
  if(quiet){
    cat2 = function(...){}
  }

  found_ravepy = FALSE

  if('RAVEPy' %in% reticulate::virtualenv_list()){
    cat2('Found RAVE-Python3 environment as a virtual environment.', level = 'INFO')
    # stop('RAVE-Python3 environment is not set up. Please run \n\n\trave_config_python()')
    found_ravepy = TRUE
  }

  if(!found_ravepy){
    try({
      if('RAVEPy' %in% reticulate::conda_list()$name){
        cat2('Found RAVE-Python3 environment as a conda environment.', level = 'INFO')
        found_ravepy = TRUE
      }
    }, silent = TRUE)
  }

  if(!found_ravepy){
    stop('RAVE-Python3 environment is not set up. Please \n
         Install Miniconda Python 3.x at
         \thttps://docs.conda.io/en/latest/miniconda.html\n
         first, and run
         \trave::ravepy_conda_install()')
  }


  # Test if current python is 'RAVEPy'
  using_ravepy = FALSE
  virtual_wrapper = ''
  try({
    reticulate::use_condaenv('RAVEPy', required = TRUE)
    using_ravepy = TRUE
    virtual_wrapper = 'conda'
  }, silent = TRUE)

  try({
    reticulate::use_virtualenv('RAVEPy', required = TRUE)
    using_ravepy = TRUE
    virtual_wrapper = 'virtualenv'
  }, silent = TRUE)

  if(!using_ravepy){
    stop('Please run \n\n\trave::ravepy_register() \n\nand restart R.')
  }

  h5py = reticulate::import('h5py')
  h5ver = h5py$version$hdf5_version
  if(utils::compareVersion(h5ver, '1.10.0') < 0){
    warning(sprintf('Your system HDF5 version is too low (>= 1.10.0 required but %s is found)', h5ver))
  }

  return(virtual_wrapper)
}

#' @rdname ravepy
#' @usage ravepy_register()
ravepy_register <- function(){
  # Create startup file
  if(!length(startup::find_rprofile())){
    startup::install()
  }

  p = normalizePath(startup::find_rprofile(all = FALSE), mustWork = FALSE)
  if(file.exists(p)){
    s = readLines(p)
    if(length(s)){
      start = stringr::str_detect(s, '^# >>>> RAVEPy reticulate setup')
      end = stringr::str_detect(s, '^# <<<< RAVEPy reticulate setup')
      if(any(start) && any(end)){
        start = which(start)[1]
        end = which(end); end = end[length(end)]
        s = s[-(start : end)]
      }
    }
  }else{
    s = ''
  }
  s = c(
    s,
    '\n# >>>> RAVEPy reticulate setup',
    deparse(quote({
      local({
        pkg_installed <- function(pkg) {
          system.file('', package = pkg) != ''
        }
        if(pkg_installed('rave') && pkg_installed('reticulate')){
          tryCatch({
            if('RAVEPy' %in% reticulate::conda_list()$name){
              reticulate::use_condaenv('RAVEPy')
            }else if('RAVEPy' %in% reticulate::virtualenv_list()){
              reticulate::use_virtualenv('RAVEPy', required = TRUE)
            }
          }, error = function(e){
            if('RAVEPy' %in% reticulate::virtualenv_list()){
              reticulate::use_virtualenv('RAVEPy', required = TRUE)
            }
          })
        }
      })
    })),
    '# <<<< RAVEPy reticulate setup'
  )

  writeLines(s, p)
  cat2('Finished. Please restart R', level = 'INFO')
}


#' @rdname ravepy
#' @usage ravepy_virtualenv_install(python_path = NULL)
#' @param python_path character, python path, auo-detected if \code{NULL}. Please specify \code{Python3} path
ravepy_virtualenv_install <- function(python_path = NULL){
  # Try to config virtual environment with reticulate
  cat2('Creating RAVE-Python3 environment', level = 'INFO')

  if(length(python_path) != 1){
    cat2('Search for Python3 path...', level = 'INFO')
    # Search for pythons
    v = reticulate::py_discover_config(required_module = 'h5py', use_environment = 'virtual')

    python_path = NULL
    for(path in v$python_versions){
      res = system2(path, args = '--version', stdout = TRUE, stderr = TRUE)
      if(length(res)){
        res = stringr::str_trim(res[1])
        sub_version = stringr::str_match(res, 'Python 3\\.([0-9]+)')[2]
        if(!is.na(sub_version)){
          sub_version = as.integer(sub_version)
          if(sub_version >= 5){
            python_path = c(python_path, path)
          }
        }
      }
    }
  }

  if(!length(python_path)){
    stop('No python detected. Please download Python3 via this url:\n\n\thttps://www.python.org/downloads/\n')
  }

  instaled = FALSE
  for(py_path in python_path){
    cat2('Try to use Python - ', py_path, level = 'INFO')
    try({
      py_path = reticulate::virtualenv_create('RAVEPy', python = py_path)
      cat2('Creating virtual environment - RAVEPy', level = 'INFO')
      instaled = TRUE
      break
    }, silent = TRUE)
  }

  if(!instaled){
    virtualenv = Sys.which('virtualenv')
    if(length(virtualenv) && virtualenv != ''){
      cat2('Cannot find pip or virtualenv from system, trying system command')
      system2(virtualenv, args = c(sprintf('--python=%s', normalizePath(py_path)), normalizePath('~/.virtualenvs/RAVEPy/')))
      py_path = reticulate::virtualenv_create('RAVEPy', python = py_path)
      cat2('Creating virtual environment - RAVEPy', level = 'INFO')
      instaled = TRUE
    }

  }

  if(!instaled){
    stop('Cannot install Python3 virtual environment. Please check \n\thttps://github.com/dipterix/howtos/blob/master/Install-miniconda.md')
  }


  # Install pacakges
  cat2('[RAVEPy] Installing packages', level = 'INFO')
  pypkgs = c('numpy', 'pandas', 'h5py', 'jupyter', 'mkl_fft', 'pyfftw', 'nibabel', 'matplotlib')
  reticulate::virtualenv_install('RAVEPy', pypkgs, ignore_installed = FALSE)

  # reticulate::virtualenv_install('RAVEPy', 'openmpi', ignore_installed = FALSE)
  # reticulate::virtualenv_install('RAVEPy', 'mpi4py', ignore_installed = FALSE)
  #
  # path = file.path(Sys.getenv("WORKON_HOME", unset = "~/.virtualenvs"), 'RAVEPy')

  ravepy_register()
}

#' @rdname ravepy
#' @usage ravepy_conda_install(python_path = NULL)
ravepy_conda_install <- function(){

  # If you have more than one conda, you probably know to type command
  #

  cat2('Locating conda path', level = 'INFO')
  reticulate::conda_binary()

  cat2('Creating conda environment - RAVEPy', level = 'INFO')
  reticulate::conda_create('RAVEPy', 'python=3')

  cat2('Looking for latest OpenMPI library', level = 'INFO')
  reticulate::conda_install('RAVEPy', packages = 'mpi4py', forge = TRUE)

  # reticulate::conda_install('RAVEPy', packages = 'h5py', forge = TRUE)

  cat2('Installing dependencies', level = 'INFO')
  try({
    reticulate::conda_install('RAVEPy', 'accelerate')
  })
  pypkgs = c('mkl_fft', 'pyfftw', 'numpy', 'pandas', 'h5py', 'jupyter', 'nibabel', 'matplotlib')
  reticulate::conda_install('RAVEPy', pypkgs)



  ravepy_register()
  cat2('Finished. Please restart R', level = 'INFO')

}

ravepy_install <- function(module){
  wrapper = ravepy_check(quiet = TRUE)
  if(wrapper == 'conda'){
    reticulate::conda_install('RAVEPy', module)
  }else if(wrapper == 'virtualenv'){
    reticulate::virtualenv_install('RAVEPy', module)
  }else{
    stop('No virtual environment nor conda environment called RAVEpy exists. Please run `ravepy_conda_install()` or `ravepy_virtualenv_install()` to install')
  }
}


#' @rdname ravepy
#' @usage ravepy_info(quiet = FALSE, return_libs = FALSE)
#' @param return_libs logical, return python modules?
ravepy_info <- function(quiet = FALSE, return_libs = FALSE){
  if(quiet){
    verbose = function(...){}
  }else{
    print(reticulate::py_discover_config())
    verbose = cat
  }

  has_h5py = FALSE
  has_pandas = FALSE
  has_numpy = FALSE

  # Locate h5py
  tryCatch({
    h5py = reticulate::import('h5py')
    verbose('h5py API version:', h5py$version$api_version, '\n')
    verbose('HDF5 Library version:', h5py$version$hdf5_version, '\n')
    has_h5py = TRUE
  }, error = function(e){
    verbose('No h5py detected\n')
  })

  tryCatch({
    pd = reticulate::import('pandas')
    verbose('Pandas Library version:', pd$`__version__`, '\n')
    has_pandas = TRUE
  }, error = function(e){
    verbose('No pandas detected\n')
  })

  tryCatch({
    np = reticulate::import('numpy')
    verbose('Numpy Library version:', np$`__version__`, '\n')
    has_numpy = TRUE
  }, error = function(e){
    verbose('No numpy detected\n')
  })

  has_nibabel = FALSE
  tryCatch({
    nibabel = reticulate::import('nibabel')
    verbose('Nibabel (Neuroimaging IO) Library version:', nibabel$`__version__`, '\n')
    has_nibabel = TRUE
  }, error = function(e){
    verbose('No nibabel detected\n')
  })

  fft_lib = NULL
  try({
    fft_lib = reticulate::import_from_path('accelerate')
    verbose('FFTW accelerated by: accelerate.mkl.fftpack\n')
  }, silent = TRUE)

  if(!length(fft_lib)){
    try({
      fft_lib = reticulate::import_from_path('mkl_fft._numpy_fft')
      verbose('FFTW accelerated by: mkl_fft._numpy_fft\n')
    }, silent = TRUE)
  }

  if(!length(fft_lib)){
    try({
      fft_lib = reticulate::import_from_path('pyfftw.interfaces.numpy_fft')
      verbose('FFTW accelerated by: pyfftw.interfaces.numpy_fft\n')
    }, silent = TRUE)
  }

  if(!length(fft_lib)){
    try({
      fft_lib = reticulate::import_from_path('numpy.fft')
      verbose('FFTW is from default library: numpy.fft\n')
    }, silent = TRUE)
  }

  has_fftw = !is.null(fft_lib)

  if(!has_fftw){
    verbose('No fftw libraries detected\n')
  }

  if(return_libs){
    re = list()
    if(has_h5py){
      re$h5py = h5py
    }
    if(has_pandas){
      re$pandas = pd
    }
    if(has_numpy){
      re$numpy = np
    }
    if(has_fftw){
      re$fftw = fft_lib
    }
    if(has_nibabel){
      re$nibabel = nibabel
    }
  }else{
    re = c(
      h5py = has_h5py,
      pandas = has_pandas,
      numpy = has_numpy,
      fftw = has_fftw,
      nibabel = has_nibabel
    )
  }

  invisible(re)
}
