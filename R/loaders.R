#' @name template_subject
#' @author Zhengjia Wang
#' @title Download and Manage Template Subjects
#' @aliases N27
#' @details To view electrodes implanted in multiple subjects, it's highly
#' recommended to view them in a template space The detail mapping method
#' is discussed in function \code{freesurfer_brain}.
#'
#' To map to a template space, one idea is to find someone whose brain is
#' normal. In our case, the choice is subject `N27`, also known as `Colin 27`.
#' function \code{download_N27} provides a simple and easy way to download a
#' partial version from the Internet.
#'
#' If you have any other ideas about template brain, you can use function
#' \code{set_default_template(subject_code, template_dir)} to redirect to
#' your choice. If your template brain is a `Zip` file on the Internet, we
#' provide function \code{download_template_subject} to automatically install it.
NULL

#' @rdname template_subject
#' @param subject_code character with only letters and numbers (Important). Default is `N27`
#' @param url zip file address
#' @param template_dir parent directory where subject's `FreeSurfer` folder should be stored
#' @export
download_template_subject <- function(
  subject_code = 'N27',
  url = 'https://github.com/dipterix/threeBrain-sample/releases/download/1.0.0/N27.zip',
  template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')
){
  dir_create(template_dir)
  dir <- normalizePath(template_dir)

  options('threeBrain.template_dir' = dir)

  cat2(sprintf('Downloading %s brain from\n\t%s\nto\n\t%s', subject_code, url, dir), level = 'INFO')

  destzip <- file.path(dir, sprintf('%s_fs.zip', subject_code))
  utils::download.file(url = url, destfile = destzip, quiet = FALSE, cacheOK = TRUE)

  sub_dir <- file.path(dir, subject_code)
  # sub_dir = dir

  utils::unzip(destzip, exdir = dir, overwrite = TRUE)

  # check if files need move
  if( !'mri' %in% list.dirs(sub_dir, recursive = FALSE, full.names = FALSE) ){
    # Need to locate this dir
    dirs <- list.dirs(sub_dir, recursive = TRUE, full.names = FALSE)
    mri_dir <- dirs[stringr::str_detect(dirs, 'mri[/]{0}$')]

    if( length(mri_dir) ){
      brain_mgz <- list.files(file.path(sub_dir, mri_dir), full.names = TRUE, pattern = 'T1.mgz$')
      dir_from <- dirname(dirname(brain_mgz))
      if(length(dir_from)){
        file_move(dir_from, sub_dir, overwrite = TRUE, clean = TRUE, all_files = TRUE)
      }
    }
  }

  cat2('Subject is located at ', sub_dir, '\nChecking the subject', level = 'INFO')
  # Try to load
  pass_check <- check_freesurfer_path(sub_dir, autoinstall_template = FALSE)
  if( !isTRUE(pass_check) ){
    cat2('Fail the check. Please make sure the following path exist in\n\t', sub_dir, level = 'ERROR')
    cat2('\nmri/T1.mgz\n', level = 'ERROR')
    cat2('mri/surf/\n', level = 'ERROR')
    cat2('mri/SUMA/ (optional)\n', level = 'WARNING')
  }else{
    cat2(sprintf('Congrats! Template subject has passed the check. You can set it as default template subject by entering \n\n\tthreeBrain::set_default_template("%s")', subject_code), level = 'INFO')
  }

}

#' @rdname template_subject
#' @param make_default logical, whether to make `N27` default subject
#' @param ... more to pass to \code{download_template_subject}
#' @export
download_N27 <- function(make_default = FALSE, ...){
  download_template_subject(subject_code = 'N27', ...)

  if(make_default){
    set_default_template('N27', view = FALSE)
  }
}

#' @rdname template_subject
#' @param view whether to view the subject
#' @export
set_default_template <- function(subject_code, view = TRUE,
                                 template_dir = getOption('threeBrain.template_dir', '~/rave_data/others/three_brain')){
  dir <- normalizePath(template_dir, mustWork = TRUE)
  sub_dir <- file.path(dir, subject_code)
  pass_check <- check_freesurfer_path(sub_dir, autoinstall_template = FALSE)

  if( !isTRUE(pass_check) ){
    stop(paste('Fail the check. Please make sure this is FreeSurfer subject folder:\n\t', sub_dir))
  }else{

    # try to load template subject
    x <- freesurfer_brain2(fs_subject_folder = sub_dir, subject_name = subject_code)

    if( !is.null(x) ){
      options('threeBrain.template_dir' = dir)
      options('threeBrain.template_subject' = subject_code)
    }


    if(view){
      plot(x)
    }
  }
}



#' @rdname template_subject
#' @param upgrade whether to check and download 'N27' brain interactively.
#' Choices are 'ask', 'always', and 'never'
#' @param async whether to run the job in parallel to others; default is true
#' @export
threebrain_finalize_installation <- function(upgrade = c('ask', 'always', 'never'), async = TRUE){
  upgrade <- match.arg(upgrade)

  template_dir <- getOption('threeBrain.template_dir', normalizePath('~/rave_data/others/three_brain'))
  n27 <- file.path(template_dir, 'N27')

  has_n27 <- tryCatch({
    check_freesurfer_path(n27, check_volume = TRUE, check_surface = TRUE)
  }, error = function(e){
    FALSE
  })

  if(has_n27 && upgrade %in% c('never')){
    dipsaus::cat2('N27 brain has been installed', level = 'DEFAULT')
    return(invisible())
  }

  if(has_n27 && upgrade %in% c('ask')){
    if(interactive()){
      reinst <- tryCatch({
        dipsaus::ask_yesno('N27 template brain detected at \n  ', template_dir,
                           '\nDo you want to reinstall?', error_if_canceled = FALSE)
      }, error = function(e){
        FALSE
      })
    } else {
      reinst <- TRUE
    }

    if(!isTRUE(reinst)){
      dipsaus::cat2('N27 template brain... skip', level = 'DEFAULT')
      return(invisible())
    }
  }

  # install N27 brain

  if( async ){
    code <- sprintf(
      "{
  dipsaus::cat2('Installing N27 template brain...', level = 'INFO')
  threeBrain::download_N27(template_dir = '%s')

  # load N27
  dipsaus::cat2('Expand the template, creating cache...', level = 'INFO')
  threeBrain::merge_brain(template_subject = 'N27')
  }", template_dir)

    dipsaus::rs_exec(parse(text = code)[[1]], name = 'Finalize threeBrain N27 installation', quoted = TRUE)
  } else {
    dipsaus::cat2('Installing N27 template brain...', level = 'INFO')
    threeBrain::download_N27(template_dir = template_dir)
    # load N27
    dipsaus::cat2('Expand the template, creating cache...', level = 'INFO')
    threeBrain::merge_brain(template_subject = 'N27', template_dir = template_dir)
  }


  return(invisible())
}

