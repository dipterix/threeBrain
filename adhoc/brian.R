
path <- "~/Downloads/summary_for_RAVE.csv"
template_subject <- 'fsaverage'
# read table
tbl <- read.csv(path)
tbl$Coord_x <- tbl$MNI305_x
tbl$Coord_y <- tbl$MNI305_y
tbl$Coord_z <- tbl$MNI305_z
tbl$Subject <- template_subject
tbl$Electrode <- seq_len(nrow(tbl))
tbl$Radius[tbl$Radius <= 2] <- 0.8
tbl$Radius[tbl$Radius > 2] <- 1
tbl$Label <- sprintf("%s%.0f-%s", tbl$Type, tbl$ContactPair, tbl$Orientation)

brain <- threeBrain:::merge_brain(template_subject = template_subject)

# generate lines
brain$template_object$misc <- lapply(
  split(tbl, tbl$ContactPair),
  function(sub) {
    line <- threeBrain::LineSegmentsGeom$new(name = sprintf("pair-%s", sub$ContactPair), dynamic = TRUE)
    line$set_vertices(
      list(subject_code = template_subject, electrode = sub$Electrode[[1]]),
      list(subject_code = template_subject, electrode = sub$Electrode[[2]])
    )
    line$set_color(sub$ContactPair[[1]])
    line
  }
)[1:2]

tbl$ContactPair <- as.factor(tbl$ContactPair)
brain$template_object$set_electrodes(tbl)
brain$template_object$set_electrode_values(tbl)


brain$plot()


