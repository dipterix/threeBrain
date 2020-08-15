# Load rave.yaml and load demo subject if needed
# Function to load rave.yaml
load_rave_yaml <- function(){
  path = get_path('inst', 'rave.yaml', mustWork = T)
  conf = read_yaml(path)

  conf
}

# Load DESCRIPTION
load_pkg_description <- function(check_dependencies = c('cran', 'Remotes'), force_update_remote = FALSE){
  path = get_path('DESCRIPTION', mustWork = T)
  desc = read_yaml(path)

  if('cran' %in% check_dependencies){
    devtools::install_dev_deps(get_root_dir(), dependencies = TRUE)
  }



  if(!is.null(desc$Imports)){
    pkgs = devtools::parse_deps(desc$Imports)
    desc$Imports = pkgs$name
  }

  if(!is.null(desc$Suggests)){
    pkgs = devtools::parse_deps(desc$Suggests)
    desc$Suggests = pkgs$name
  }

  if(!is.null(desc$Remotes)){
    desc$Remotes = stringr::str_split(desc$Remotes, ',')[[1]]
    desc$Remotes = stringr::str_trim(desc$Remotes)
    pkgs = stringr::str_match(
      desc$Remotes,
      pattern = '(?:(^[a-zA-Z0-9_]*)::|)([\\w]*)/([a-zA-Z0-9_]*)(?:(@[\\w]+)|)$'
    )
    pkgs[is.na(pkgs[,2]),2] = 'github'
    pkgs[is.na(pkgs[,5]),5] = ''
    desc$Remotes = pkgs[,4]
    if(!force_update_remote){
      # Check if packages are installed
      not_installed = check_installed_packages(pkgs[,4], auto_install = F)
      pkgs = pkgs[pkgs[,4] %in% not_installed,, drop=FALSE]
    }
    if('Remotes' %in% check_dependencies && nrow(pkgs)){
      # install
      cmds = paste0('devtools::install_', pkgs[,2], '("',  pkgs[,3], '/',  pkgs[,4], pkgs[,5], '")')
      for(cmd in cmds){
        eval(parse(text = cmd))
      }
    }
  }




  desc
}


# Load demo subject for dev use
mount_demo_subject <- function(subject_code, project_name,
                               force_reload_subject = FALSE, ..., download_url){
  if(!force_reload_subject && rave:::any_subject_loaded()){
    if(!'rave_data' %in% search()){
      rave::attachDefaultDataRepository()
    }
    return(invisible())
  }
  force_reload_subject = force_reload_subject || !rave:::any_subject_loaded()
  env = new.env()
  conf = load_rave_yaml()

  conf$dev_subject$electrodes = parse_svec(conf$dev_subject$electrodes)
  conf$dev_subject$time_range = c(conf$dev_subject$time_range$pre, conf$dev_subject$time_range$post)

  list2env(conf$dev_subject, envir = env)

  if(missing(project_name) || missing(subject_code)){
    subject_code = conf$dev_subject$subject_code
    project_name = conf$dev_subject$project_name
    download_url = conf$dev_subject$download_url
  }



  # If subject_code and project_name are not missing
  if(!subject_code %in% rave::get_subjects(project_name)){
    download_url %?<-% 'Not given :/'
    ans = ask_question(
      title = 'This action requires downloading subject.',
      message = paste0(
        'Project Name: ', project_name, '\n',
        'Subject Code: ', subject_code, '\n',
        'Remote URL: \n\t', download_url
      )
    )
    if(ans){
      # download subject
      download_subject_data(download_url, override_project = project_name, override_subject = subject_code)
    }else{
      stop('Action aborted because no [', project_name, '/', subject_code, '] found.')
    }
  }

  # subject exists, load it
  env$subject_code = subject_code
  env$project_name = project_name
  list2env(list(...), envir = env)

  # Create subject instance
  subject = rave::Subject$new(project_name = env$project_name,
                              subject_code = env$subject_code,
                              reference = env$reference)

  cat2('Loading subject. Please wait...', level = 'INFO')

  rave::rave_prepare(
    subject = subject, electrodes = env$electrodes, epoch = env$epoch,
    time_range = env$time_range, reference = env$reference, frequency_range = env$frequency_range,
    data_types = env$data_types, load_brain = env$load_brain, attach = T)

  return(invisible())
}

# Function to reload package
load_dev_env <- function(){
  # First check description
  desc = load_pkg_description(NULL)
  pkgs = c(desc$Imports, desc$Suggests, desc$Remotes)
  installed = package_installed(pkgs, all = T)
  if(!installed){
    load_pkg_description()
  }

  # # Disable RAVE startup check to speed up
  # startup_checks = rave::rave_options('disable_startup_speed_check')
  # on.exit({
  #   rave::rave_options(disable_startup_speed_check = startup_checks)
  # })
  # rave::rave_options(disable_startup_speed_check = FALSE)

  for(p in pkgs){
    require(p, character.only = T)
  }
}

get_module_label <- function(module_id){
  conf = load_rave_yaml()
  module_label = lapply(conf$modules, function(comp){
    if(comp$module_id == module_id){
      return(comp$module_label)
    }
    return(NULL)
  })
  module_label = unlist(module_label)
  module_label %?<-% 'Unknown Module'
  module_label = module_label[1]
  module_label
}



#
