% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/fs_brain.R
\name{check_freesurfer_path}
\alias{check_freesurfer_path}
\title{Function to check whether `FreeSurfer` folder has everything we need}
\usage{
check_freesurfer_path(fs_subject_folder, autoinstall_template = TRUE)
}
\arguments{
\item{fs_subject_folder}{character, path to `fs` project directory or `RAVE` subject directory}

\item{autoinstall_template}{logical, whether `N27` brain should be installed is missing}
}
\value{
logical whether the directory is valid
}
\description{
Function to check whether `FreeSurfer` folder has everything we need
}