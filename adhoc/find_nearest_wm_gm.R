raveio::raveio_setopt("raw_data_dir", "/Volumes/BeauchampServe/rave_data/raw")
raveio::raveio_setopt("data_dir", "/Volumes/BeauchampServe/rave_data/ent_data/")

read_surface_impl <- function(obj, hemisphere) {
  if(startsWith(tolower(hemisphere), "l")) {
    hemisphere <- "Left"
  } else if(startsWith(tolower(hemisphere), "r")) {
    hemisphere <- "Right"
  } else {
    stop("Invalid `hemisphere`: ", hemisphere)
  }
  freesurferformats::read.fs.surface(obj$group$group_data[[sprintf(
    "free_vertices_FreeSurfer %s Hemisphere - %s (%s)",
    hemisphere, obj$surface_type, obj$subject_code
  )]]$absolute_path)
}

calculate_distances <- function(pos, mesh_left = NULL, mesh_right = NULL) {
  # mesh_left <- pial_left
  # pos <- c(0,0,0)
  pos <- as.vector(pos)

  re <- list()

  if(!is.null(mesh_left)) {
    l_dist_sq <- colSums((t(mesh_left$vertices) - pos)^2)
    l_idx <- which.min(l_dist_sq)
    re$left <- list(
      position = mesh_left$vertices[l_idx, ],
      distance = sqrt(l_dist_sq[l_idx]),
      index = l_idx
    )
  }

  if(!is.null(mesh_right)) {
    r_dist_sq <- colSums((t(mesh_right$vertices) - pos)^2)
    r_idx <- which.min(r_dist_sq)
    re$right <- list(
      position = mesh_right$vertices[r_idx,],
      distance = sqrt(r_dist_sq[r_idx]),
      index = r_idx
    )
  }
  re
}

project_to_pial <- function(pos_orig, pos_white, mesh_pial) {
  # pos_orig <- tkr_ras
  # pos_white <- white[[hemisphere]]$vertices[distaces[[hemisphere]]$index, ]
  # mesh_pial <- pial[[hemisphere]]
  pos_orig <- as.vector(pos_orig)
  vec0 <- as.vector(pos_white) - pos_orig
  vec <- t(mesh_pial$vertices) - pos_orig

  # vec0 is 0
  vec0_len <- sqrt(sum(vec0^2))
  if(vec0_len < 1e-4) {
    dist_sq <- colSums(vec^2)
    idx <- which.min(dist_sq)
    return(list(
      position = mesh_pial$vertices[idx, ],
      index = idx,
      distance = sqrt(dist_sq[idx])
    ))
  }
  vec0 <- vec0 / vec0_len

  inner_prod <- colSums(vec * vec0)
  err <- vec - outer(vec0, inner_prod, FUN = "*")
  dist_sq <- colSums(err^2)
  idx <- which.min(dist_sq)
  list(
    position = mesh_pial$vertices[idx, ],
    index = idx,
    distance = sqrt(sum((vec[, idx])^2))
  )

}

compute_gmpi <- function(subject) {
  brain <- raveio::rave_brain(subject)
  if(is.null(brain)) { return(NULL) }
  electrode_coords <- brain$electrodes$raw_table

  # Run with Coord_xyz
  obj_pial <- brain$add_surface("pial")
  obj_white <- brain$add_surface("smoothwm")
  if(is.null(obj_white)) {
    obj_white <- brain$add_surface("white")
  }
  obj_sphere_reg <- brain$add_surface("sphere.reg")


  # Load surfaces into memory
  pial <- list(
    left = read_surface_impl(obj_pial, "left"),
    right = read_surface_impl(obj_pial, "right")
  )
  white <- list(
    left = read_surface_impl(obj_white, "left"),
    right = read_surface_impl(obj_white, "right")
  )
  sphere_reg <- list(
    left = read_surface_impl(obj_sphere_reg, "left"),
    right = read_surface_impl(obj_sphere_reg, "right")
  )


  # -- LOOP --
  new_table <- lapply(seq_len(nrow(electrode_coords)), function(ii) {
    row <- electrode_coords[ii, ]
    # Only assumes first 5 columns and optional hemisphere
    tkr_ras <- as.double(row[, c("Coord_x", "Coord_y", "Coord_z")])
    row$GMPI <- NA

    # TODO: what if tkrRAS is 0,0,0?
    if(sum(tkr_ras^2) == 0 ) {
      return(row)
    }

    distaces <- calculate_distances(pos = tkr_ras,
                                    mesh_left = pial$left,
                                    mesh_right = pial$right)

    if(distaces$right$distance < distaces$left$distance) {
      hemisphere <- "right"
    } else {
      hemisphere <- "left"
    }

    hemisphere_ <- tolower(row$Hemisphere)
    if(length(hemisphere_) == 1) {
      if( startsWith(hemisphere_, "l") ) {
        hemisphere <- "left"
      } else if ( startsWith(hemisphere_, "r") ) {
        hemisphere <- "right"
      }
    }
    row$Hemisphere <- hemisphere

    pial_proj <- distaces[[hemisphere]]

    distaces <- calculate_distances(pos = tkr_ras,
                                    mesh_left = white$left,
                                    mesh_right = white$right)

    white_proj <- distaces[[hemisphere]]

    # (numpy.dot( (contact-white) , (pial - white) ) / numpy.linalg.norm((pial - white))**2 )
    gmpi <- sum(
      (tkr_ras - white_proj$position) *
        (pial_proj$position - white_proj$position)
    ) / sum((pial_proj$position - white_proj$position)^2)

    # calculate the sphere.reg positions
    sphere_xyz <- sphere_reg[[hemisphere]]$vertices[pial_proj$index, ]

    row$Sphere_x <- sphere_xyz[[1]]
    row$Sphere_y <- sphere_xyz[[2]]
    row$Sphere_z <- sphere_xyz[[3]]
    row$GMPI <- gmpi
    row
  })
  new_table <- data.table:::rbindlist(new_table)
  new_table$Radius <- 1
  new_table$LocationType <- "ECoG"
  new_table$SurfaceElectrode <- TRUE
  new_table$SurfaceType <- "inflated"
  brain$set_electrodes(new_table, priority = "sphere")
  brain$set_electrode_values()
  brain
}

project_name <- "mTurkWords"
subject_codes <- c("YEZ", "PAV007", "PAV008", "PAV010", "PAV011", "PAV013", "PAV018",
                   "PAV019", "PAV025", "PAV026", "PAV033", "YDK", "YDL", "YDM",
                   "YDP", "YDQ", "YDR", "YDT", "YDX", "YDY", "YDZ", "YEC", "YEG",
                   "YEK", "YEN", "YEP", "YEU", "YEW", "YEX", "YEY")

template <- "cvs_avg35_inMNI152"

brain_list <- raveio::lapply_async(subject_codes, function(subject_code) {
  tryCatch({
    subject <- raveio::RAVESubject$new(project_name = project_name, subject_code = subject_code)
    compute_gmpi(subject)
  }, error = function(e) { NULL })
}, callback = I)
brain_list <- dipsaus::drop_nulls(brain_list)


# brain$plot()
template <- threeBrain::merge_brain(.list = brain_list, template_subject = template)
template$template_object$add_surface("inflated")
template$plot()



