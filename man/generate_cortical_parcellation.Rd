% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/template_cortical-annotation.R
\name{generate_cortical_parcellation}
\alias{generate_cortical_parcellation}
\title{Generate cortical annotations from template using surface mapping}
\usage{
generate_cortical_parcellation(
  brain,
  template_subject = "fsaverage",
  annotation = "Yeo2011_7Networks_N1000",
  add_annotation = TRUE
)
}
\arguments{
\item{brain}{Brain object}

\item{template_subject}{template subject where the annotation is stored}

\item{annotation}{annotation name in the label folder; default is
\code{'Yeo2011_7Networks_N1000'}, standing for
\code{'lh.Yeo2011_7Networks_N1000.annot'} and
\code{'rh.Yeo2011_7Networks_N1000.annot'}.}

\item{add_annotation}{whether to add annotation to \code{brain}}
}
\value{
\code{brain} with the annotation added if \code{add_annotation}
is true
}
\description{
This is a low-level function. Use \code{brain$add_annotation} instead.
}
