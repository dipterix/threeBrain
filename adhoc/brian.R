
path <- "~/Downloads/summary_for_RAVE.csv"
template_subject <- 'fsaverage'
# read table
tbl <- read.csv(path)
tbl$Coord_x <- tbl$MNI305_x
tbl$Coord_y <- tbl$MNI305_y
tbl$Coord_z <- tbl$MNI305_z
tbl$Subject <- template_subject
tbl$Electrode <- seq_len(nrow(tbl))
tbl$Radius[tbl$Radius <= 2] <- 0.6
tbl$Radius[tbl$Radius > 2] <- 1
tbl$Label <- sprintf("%s%.0f-%s", tbl$Type, tbl$ContactPair, tbl$Orientation)
tbl <- tbl[order(tbl$Type), ]

brain <- threeBrain:::merge_brain(template_subject = template_subject)

# generate lines
brain$template_object$misc <- lapply(
  split(tbl, tbl$ContactPair),
  function(sub) {
    print(sub)
    line <- threeBrain::LineSegmentsGeom$new(name = sprintf("pair-%s", sub$ContactPair), dynamic = FALSE)
    line$set_color(sub$ContactPair[[1]])
    # line$set_vertices(
    #   list(subject_code = template_subject, electrode = sub$Electrode[[1]]),
    #   list(subject_code = template_subject, electrode = sub$Electrode[[2]])
    # )
    positions <- data.matrix(sub[, paste0("Coord_", c("x", "y", "z"))])
    distance <- sqrt(sum((positions[1, ] - positions[2, ])^2))
    n_vertices <- ceiling(distance * 10)
    line$set_vertices( t(positions) )
    if(n_vertices > 1) {
      tmp1 <- approx(positions[,1], n = n_vertices)
      tmp2 <- approx(positions[,2], n = n_vertices)
      tmp3 <- approx(positions[,3], n = n_vertices)
      interpolated_positions <- rbind(tmp1$y, tmp2$y, tmp3$y)
      idx <- seq_len(n_vertices - 1)
      idx <- as.vector(rbind(idx, idx + 1))
      line$set_vertices( interpolated_positions[, idx] )

      sizes <- rep(2, n_vertices)
      idx <- min(8, n_vertices)
      sizes[1:idx] <- seq(8, 2, length.out = n_vertices)[seq_len(idx)]
      sizes[n_vertices + 1 - (1:idx)] <- seq(16, 2, length.out = n_vertices)[seq_len(idx)]
      line$set_size(sizes)
    }

    line
  }
)

tbl$ContactPair <- as.factor(tbl$ContactPair)
brain$template_object$set_electrodes(tbl)
brain$template_object$set_electrode_values(tbl)


brain$plot()


