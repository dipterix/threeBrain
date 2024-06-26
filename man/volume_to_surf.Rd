% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/utils_generate_subcortical_surf.R
\name{volume_to_surf}
\alias{volume_to_surf}
\title{Generate surface file from \code{'nii'} or \code{'mgz'} volume files}
\usage{
volume_to_surf(
  volume,
  save_to = NA,
  lambda = 0.2,
  degree = 2,
  threshold_lb = 0.5,
  threshold_ub = NA,
  format = "auto"
)
}
\arguments{
\item{volume}{path to the volume file, or object from \code{\link{read_volume}}.}

\item{save_to}{where to save the surface file; default is \code{NA} (no save).}

\item{lambda}{\code{'Laplacian'} smooth, the higher the smoother}

\item{degree}{\code{'Laplacian'} degree; default is \code{2}}

\item{threshold_lb}{lower threshold of the volume (to create mask); default is \code{0.5}}

\item{threshold_ub}{upper threshold of the volume; default is \code{NA} (no upper bound)}

\item{format}{The format of the file if \code{save_to} is a valid path,
choices include
\describe{
\item{\code{'auto'}}{Default, supports \code{'FreeSurfer'} binary format and
       \code{'ASCII'} text format, based on file name suffix}
\item{\code{'bin'}}{\code{'FreeSurfer'} binary format}
\item{\code{'asc'}}{\code{'ASCII'} text format}
\item{\code{'ply'}}{'Stanford' \code{'PLY'} format}
\item{\code{'off'}}{Object file format}
\item{\code{'obj'}}{\code{'Wavefront'} object format}
\item{\code{'gii'}}{\code{'GIfTI'} format. Please avoid using \code{'gii.gz'} as the file suffix}
\item{\code{'mz3'}}{\code{'Surf-Ice'} format}
\item{\code{'byu'}}{\code{'BYU'} mesh format}
\item{\code{'vtk'}}{Legacy \code{'VTK'} format}
}
\code{'gii'}, otherwise \code{'FreeSurfer'} format. Please do not use
\code{'gii.gz'} suffix.}
}
\value{
Triangle \code{'rgl'} mesh (vertex positions in native \code{'RAS'}). If \code{save_to} is a valid path, then the mesh will be saved to this location.
}
\description{
Generate surface file from \code{'nii'} or \code{'mgz'} volume files
}
\examples{

library(threeBrain)
N27_path <- file.path(default_template_directory(), "N27")
if(dir.exists(N27_path)) {
  aseg <- file.path(N27_path, "mri", "aparc+aseg.mgz")

  # generate surface for left-hemisphere insula
  mesh <- volume_to_surf(aseg, threshold_lb = 1034,
                         threshold_ub = 1036)

  if(interactive()) {
    ravetools::rgl_view({
      ravetools::rgl_call("shade3d", mesh, color = "yellow")
    })
  }
}


}
\seealso{
\code{\link{read_volume}}, \code{\link[ravetools]{vcg_isosurface}},
\code{\link[ravetools]{vcg_smooth_implicit}}
}
