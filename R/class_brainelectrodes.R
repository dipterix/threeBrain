identity4 <- diag(1.0, nrow = 4, ncol = 4)

guess_hemisphere <- function(which_side, anatomical_label) {
  if(length(which_side) != 1 ||
     !isTRUE(tolower(which_side) %in% c('left', 'right')) &&
     length(anatomical_label) && !is.na(anatomical_label)) {
    label_str <- tolower(anatomical_label)
    if(
      startsWith(label_str, "ctx-lh") ||
      startsWith(label_str, "ctx_lh") ||
      startsWith(label_str, "left")
    ) {
      which_side <- "left"
    } else if(
      startsWith(label_str, "ctx-rh") ||
      startsWith(label_str, "ctx_rh") ||
      startsWith(label_str, "right")
    ) {
      which_side <- "right"
    }
  }
  which_side
}

normalize_electrode_table <- function(table, position_names = c("x", "y", "z"), coord_sys = c("tkrRAS", "scannerRAS", "MNI305", "MNI152")) {
  coord_sys <- match.arg(coord_sys)
  table_colnames <- names(table)
  stopifnot2("Electrode" %in% table_colnames,
             msg = "Electrode table must contains column `Electrode` (case-sensitive, values are channels in integers)")

  table$Electrode <- as.integer(table$Electrode)
  table <- table[!is.na(table$Electrode), ]
  n <- nrow(table)

  if( n == 0 ){
    return(invisible())
  }

  # auto generate label
  if( !length(table$Label) ){
    table$Label <- sprintf('NoLabel-%d', seq_len(n))
  }

  # check if the columns are explicitly specified in the table, for e.g.,
  # if coord_sysis tkrRAS, and `Coord_x` (x,y,z) are in the table columns,
  # then coord_sys arguments is ignored, and xyz will be obtained through Coord_xyz
  explicit <- FALSE
  xyz_names <- position_names
  if(coord_sys == "tkrRAS" && all(c('Coord_x', 'Coord_y', 'Coord_z') %in% table_colnames)) {
    explicit <- TRUE
    xyz_names <- c('Coord_x', 'Coord_y', 'Coord_z')
  }
  if(!explicit && coord_sys == "scannerRAS" &&
     all(c('T1R', 'T1A', 'T1S') %in% table_colnames)) {
    explicit <- TRUE
    xyz_names <- c('T1R', 'T1A', 'T1S')
  }
  if(!explicit && coord_sys == "MNI305" &&
     all(c('MNI305_x', 'MNI305_y', 'MNI305_z') %in% table_colnames)) {
    explicit <- TRUE
    xyz_names <- c('MNI305_x', 'MNI305_y', 'MNI305_z')
  }
  if(!explicit && coord_sys == "MNI152" &&
     all(c('MNI152_x', 'MNI152_y', 'MNI152_z') %in% table_colnames)) {
    explicit <- TRUE
    xyz_names <- c('MNI152_x', 'MNI152_y', 'MNI152_z')
  }
  if(!explicit && !all(xyz_names %in% table_colnames)) {
    stop("Cannot infer electrode coordinates from the electrode table. Please specify `x`, `y`, `z` columns and the corresponding coordinate system.")
  }

  # Calculate tkrRAS
  if(all(c('Coord_x', 'Coord_y', 'Coord_z') %in% table_colnames)) {
    # Check coordinates
    table$Coord_x <- as.numeric( table$Coord_x )
    table$Coord_y <- as.numeric( table$Coord_y )
    table$Coord_z <- as.numeric( table$Coord_z )
  } else {
    ras <- self$apply_transform_points(table[, xyz_names], from = coord_sys, to = "tkrRAS")
    table$Coord_x <- ras[, 1]
    table$Coord_y <- ras[, 2]
    table$Coord_z <- ras[, 3]
  }
  na_coord <- is.na(table$Coord_x) | is.na(table$Coord_y) | is.na(table$Coord_z)
  if( any(na_coord) ){
    table$Coord_x[ na_coord ] <- 0
    table$Coord_y[ na_coord ] <- 0
    table$Coord_z[ na_coord ] <- 0
  }

  # Calculate MNI305 for template brain
  has_mni305 <- FALSE
  if( coord_sys == "MNI305" || all( c('MNI305_x', 'MNI305_y', 'MNI305_z') %in% table_colnames ) ) {
    if( coord_sys == "MNI305" ) {
      xyz_names2 <- xyz_names
    } else {
      xyz_names2 <- c('MNI305_x', 'MNI305_y', 'MNI305_z')
    }
    table$MNI305_x <- as.numeric( table[[ xyz_names2[[1]] ]] )
    table$MNI305_y <- as.numeric( table[[ xyz_names2[[2]] ]] )
    table$MNI305_z <- as.numeric( table[[ xyz_names2[[3]] ]] )
    has_mni305 <- TRUE
  } else if( coord_sys == "MNI152" || all( c('MNI152_x', 'MNI152_y', 'MNI152_z') %in% table_colnames ) ) {
    if( coord_sys == "MNI152" ) {
      ras <- self$apply_transform_points(table[, xyz_names], from = coord_sys, to = "MNI305")
    } else {
      ras <- as.matrix(table[, c('MNI152_x', 'MNI152_y', 'MNI152_z')])
    }
    table$MNI305_x <- as.numeric( ras[, 1] )
    table$MNI305_y <- as.numeric( ras[, 2] )
    table$MNI305_z <- as.numeric( ras[, 3] )
    has_mni305 <- TRUE
  }

  if( has_mni305 ) {
    na_coord <- is.na(table$MNI305_x) | is.na(table$MNI305_y) | is.na(table$MNI305_z)
    if( any(na_coord) ){
      table$MNI305_x[ na_coord ] <- 0
      table$MNI305_y[ na_coord ] <- 0
      table$MNI305_z[ na_coord ] <- 0
    }
  } else {
    table$MNI305_x <- 0
    table$MNI305_y <- 0
    table$MNI305_z <- 0
  }

  if( all( paste0('Sphere_', c('x','y','z')) %in% names(table) ) ){
    table$Sphere_x <- as.numeric( table$Sphere_x )
    table$Sphere_y <- as.numeric( table$Sphere_y )
    table$Sphere_z <- as.numeric( table$Sphere_z )
    na_coord <- is.na(table$Sphere_x) | is.na(table$Sphere_y) | is.na(table$Sphere_z)
    if( any(na_coord) ){
      table$Sphere_x[ na_coord ] <- 0
      table$Sphere_y[ na_coord ] <- 0
      table$Sphere_z[ na_coord ] <- 0
    }
  }else{
    table$Sphere_x <- 0
    table$Sphere_y <- 0
    table$Sphere_z <- 0
  }

  if( length(table$SurfaceElectrode) ){
    table$SurfaceElectrode <- stringr::str_to_upper(table$SurfaceElectrode) %in% c('T', 'TRUE')
  }else{
    table$SurfaceElectrode <- FALSE
  }

  if( !length(table$SurfaceType) ){
    table$SurfaceType <- 'pial'
  }
  table$SurfaceType <- as.character(table$SurfaceType)

  if( !length(table$Radius) ){
    table$Radius <- 2
  }
  table$Radius <- as.numeric( table$Radius )
  table$Radius[ is.na(table$Radius) ] <- 2

  if( !length(table$VertexNumber) ){
    table$VertexNumber <- -1
  }
  table$VertexNumber <- as.integer(table$VertexNumber)
  table$VertexNumber[ is.na(table$VertexNumber) ] <- -1

  # geometry
  if( length(table$Geometry) ) {
    geom <- as.character(table$Geometry)
    geom[is.na(geom)] <- ""
    table$Geometry <- geom

    if(!length(table$ChannelOrder)) {

      table <- do.call("rbind", lapply(split(table, table$Geometry), function(sub) {
        sub$ChannelOrder <- order(sub$Electrode)
        sub
      }))
    }
  }

  if( !length(table$Hemisphere) ){
    table$Hemisphere <- NA
  }

  table <- table[order(table$Electrode), ]
  table
}


BrainElectrodes <- R6::R6Class(
  classname = 'brain-electrodes',
  portable = TRUE,
  cloneable = FALSE,

  active = list(
    Norig = function() {
      if(inherits(self$brain, "rave-brain")) {
        return( self$brain$Norig )
      }
      identity4
    },
    Torig = function() {
      if(inherits(self$brain, "rave-brain")) {
        return( self$brain$Torig )
      }
      identity4
    },
    xfm = function() {
      if(inherits(self$brain, "rave-brain")) {
        return( self$brain$xfm )
      }
      identity4
    }
  ),

  public = list(

    subject_code = NULL,

    # used to store electrode data frame, do not call directly, use set_electrodes
    raw_table = NULL,
    raw_table_path = NULL,

    # A list that stores electrodes
    objects = NULL,

    # a list storing values
    value_table = NULL,

    # electrode group
    group = NULL,

    brain = NULL,

    geometries = NULL,

    set_brain = function( brain ) {
      if(inherits(brain, "rave-brain")) {
        self$brain <- brain
        self$set_subject_code( brain$subject_code )
      } else if(is.character(brain)) {
        self$set_subject_code( brain )
      }
    },

    set_subject_code = function( subject_code ){
      if( !is.null(self$group) ){
        self$group$name <- sprintf('Electrodes (%s)', subject_code)
      }
      self$set_electrodes( self$raw_table )
      self$subject_code <- subject_code
    },

    initialize = function(subject_code){
      self$group <- GeomGroup$new(name = sprintf('Electrodes (%s)', subject_code), position = c(0,0,0))
      self$set_subject_code( subject_code )
      self$geometries <- list()
    },

    load_geometries = function() {
      if( !inherits(self$brain, "rave-brain") ) { return(invisible()) }
      rave_path <- file.path(self$brain$base_path, "RAVE", "geometry")
      if(length(rave_path) != 1 || is.na(rave_path) || !file.exists(rave_path)) { return(invisible()) }
      config_files <- list.files(rave_path, pattern = "\\.json", full.names = FALSE, include.dirs = FALSE, ignore.case = TRUE, recursive = FALSE, all.files = FALSE)
      if(!length(config_files)) { return(invisible()) }
      config_names <- gsub("\\.json", "", config_files, ignore.case = TRUE)
      config_names <- toupper(config_names)
      self$geometries <- structure(
        names = toupper(config_names),
        lapply(seq_along(config_names), function(ii) {
          proto <- new_electrode_prototype(base_prototype = file.path(rave_path, config_files[[ii]]))
          proto$name <- config_names[[ii]]
          proto
        })
      )
    },

    apply_electrodes = function(fun, check_valid = TRUE){
      n_elec <- length(self$objects)
      if(!n_elec){
        return(list())
      }
      lapply(seq_len( n_elec ), function( ii ){
        el <- self$objects[[ii]]
        if( !is.null(el) || !check_valid ){
          return(fun(el, ii))
        }else{
          return(NULL)
        }
      })
    },

    get_transform_to_tkrRAS = function( from = c("tkrRAS", "scannerRAS", "MNI305", "MNI152") ) {
      from <- match.arg(from)
      m <- switch(
        from,
        "tkrRAS" = { diag(1.0, nrow = 4L, ncol = 4L) },
        "scannerRAS" = {
          self$Torig %*% solve(self$Norig)
        },
        "MNI305" = {
          self$Torig %*% solve(self$xfm %*% self$Norig)
        },
        "MNI152" = {
          self$Torig %*% solve(MNI305_to_MNI152 %*% self$xfm %*% self$Norig)
        }
      )
      m
    },

    apply_transform_points = function(positions,
                                      from = c("tkrRAS", "scannerRAS", "MNI305", "MNI152"),
                                      to = c("tkrRAS", "scannerRAS", "MNI305", "MNI152")) {
      from <- match.arg(from)
      to <- match.arg(to)
      positions <- as.matrix(positions)[, seq_len(3), drop = FALSE]
      dimnames(positions) <- NULL
      if( from == to ) { return(positions) }

      # calculate matrix from `from` to `tkrRAS`
      from_to_tkr <- self$get_transform_to_tkrRAS(from = from)
      tkr_to_to <- solve(self$get_transform_to_tkrRAS(from = to))
      from_to_to <- tkr_to_to %*% from_to_tkr

      # from_to_to %*% t(cbind(positions, 1))
      positions <- cbind(positions, 1) %*% t(from_to_to)
      return(positions[, seq_len(3), drop = FALSE])
    },

    get_atlas_labels = function(atlas, radius = 1, lut = NULL) {
      # DIPSAUS DEBUG START
      # self <- raveio::rave_brain("demo/DemoSubject")$electrodes
      # atlas <- "~/rave_data/raw_dir/DemoSubject/rave-imaging/fs/mri/aparc.a2009s+aseg.mgz"
      # lut = NULL

      if(!is.data.frame(self$raw_table)) {
        return(NULL)
      }

      if(!inherits(atlas, "threeBrain.volume")) {
        atlas <- read_volume(atlas)
      }
      if(is.null(lut)) {
        lut <- load_colormap(system.file(
          "palettes", "datacube2", "FreeSurferColorLUT.json",
          package = 'threeBrain'))
      }

      sub_tbl <- as.matrix(self$raw_table[, c("Coord_x", "Coord_y", "Coord_z")])
      dist <- rowSums(sub_tbl^2)
      valids <- !is.na(dist) & dist > 0
      scanner_ras <- self$apply_transform_points(sub_tbl, from = "tkrRAS", to = "scannerRAS")
      ras_to_ijk <- solve(atlas$Norig)

      # IJK starts from 0, 0, 0
      ijk <- round((ras_to_ijk %*% rbind(t(scanner_ras), 1))[seq_len(3), , drop = FALSE])

      atlas_shape <- dim(atlas$data)[seq_len(3)]
      atlas_cumprod <- cumprod(c(1, atlas_shape))
      atlas_n <- atlas_cumprod[[4]]
      atlas_cumprod <- atlas_cumprod[seq_len(3)]

      lut_keys <- names(lut$map)
      if(radius >= 1) {
        deltas <- as.matrix(expand.grid(
          seq.int(-radius, radius),
          seq.int(-radius, radius),
          seq.int(-radius, radius)
        ))
        deltas <- colSums(t(deltas) * atlas_cumprod)
      } else {
        deltas <- 0
      }

      unknown_labels <- data.frame(
        Key1 = 0,
        Label1 = "Unknown",
        Count1 = 0,

        Key2 = 0,
        Label2 = "Unknown",
        Count2 = 0,

        Key3 = 0,
        Label3 = "Unknown",
        Count3 = 0,

        Key4 = 0,
        Label4 = "Unknown",
        Count4 = 0
      )

      labels <- lapply(seq_len(ncol(ijk)), function(ii) {
        if(!valids[[ii]]) {
          return(unknown_labels)
        }
        ijk0 <- sum(ijk[, ii] * atlas_cumprod) + 1
        if(is.na(ijk0) || ijk0 <= 0 || ijk0 > atlas_n) {
          return(unknown_labels)
        }
        idx <- atlas$data[ijk0 + deltas]
        idx <- as.character(idx[!is.na(idx) & idx != 0])
        if(!length(idx)) {
          return(unknown_labels)
        }
        idx_tbl <- table(idx)
        idx_uni <- names(idx_tbl)
        o <- order(idx_tbl, decreasing = TRUE)
        idx_uni <- c(idx_uni[o], "0", "0", "0", "0")[seq_len(4)]
        idx_tbl <- unname(c(idx_tbl[o], 0, 0, 0, 0)[seq_len(4)])

        # labels <- sapply(lut$map[idx_uni], "[[", "Label")
        labels <- sapply(idx_uni, function(id) {
          li <- lut$map[[as.character(id)]]
          if(is.list(li) && is.character(li$Label)) {
            return( li$Label[[1]] )
          } else {
            return( "NA-Label" )
          }
        })
        data.frame(
          Key1 = idx_uni[[1]],
          Label1 = labels[[1]],
          Count1 = idx_tbl[[1]],

          Key2 = idx_uni[[2]],
          Label2 = labels[[2]],
          Count2 = idx_tbl[[2]],

          Key3 = idx_uni[[3]],
          Label3 = labels[[3]],
          Count3 = idx_tbl[[3]],

          Key4 = idx_uni[[4]],
          Label4 = labels[[4]],
          Count4 = idx_tbl[[4]]
        )
      })
      return(do.call("rbind", labels))

    },

    set_electrodes = function(table_or_path, coord_sys = c("tkrRAS", "scannerRAS", "MNI305", "MNI152"),
                              position_names = c("x", "y", "z")){
      coord_sys <- match.arg(coord_sys)
      if( is.null(table_or_path) ){
        return(invisible())
      }
      stopifnot2(is.data.frame(table_or_path) || (length(table_or_path) == 1) && is.character(table_or_path),
                 msg = 'table_or_path must be either data.frame or path to electrodes.csv')
      if(!is.data.frame(table_or_path)){
        # table_or_path = '~/Downloads/YAB_electrodes.csv'
        self$raw_table_path <- table_or_path
        table <- read.csv(table_or_path, stringsAsFactors = FALSE)
      }else{
        self$raw_table_path <- NULL
        table <- table_or_path
      }
      table <- normalize_electrode_table(table, position_names = position_names, coord_sys = coord_sys)
      self$raw_table <- table

      if(!is.data.frame(table)) { return() }
      n <- nrow(table)

      # Generate objects
      self$objects <- list()

      subject_code <- self$subject_code

      for( ii in seq_len(n) ){
        row <- table[ii, ]
        anatomical_label <- row$FSLabel
        which_side <- guess_hemisphere(row$Hemisphere, anatomical_label)

        nearest_vertex <- row$VertexNumber
        mni_305 <- c( row$MNI305_x, row$MNI305_y, row$MNI305_z )
        sphere_xyz <- c( row$Sphere_x, row$Sphere_y, row$Sphere_z )
        if(length(mni_305)!=3){ mni_305 <- c(0,0,0) }
        surf_type <- c(row$SurfaceType, 'pial')[1]
        if( is.na(surf_type) ){ surf_type <- 'NA' }
        radius <- row$Radius

        # obtain geometry
        geometry <- NULL
        if(length(row$Geometry) == 1) {
          geometry <- self$geometries[[toupper(row$Geometry)]]
        }
        if(is.null(geometry)) {
          el <- ElectrodeGeom$new(
            name = sprintf('%s, %d - %s', subject_code, row$Electrode, row$Label),
            position = c(row$Coord_x, row$Coord_y, row$Coord_z),
            radius = radius, group = self$group, subtype = "SphereGeometry")
          el$number <- row$Electrode
          el$is_surface_electrode <- isTRUE( row$SurfaceElectrode )
          el$MNI305_position <- mni_305
          el$sphere_position <- sphere_xyz
          el$vertex_number <- nearest_vertex
        } else {
          containing_els <- table$Electrode[table$Geometry == row$Geometry]
          min_el <- min(containing_els)
          if( min_el == row$Electrode ) {
            label_prefix <- row$LabelPrefix
            if(!length(label_prefix)) {
              label_prefix <- gsub("[0-9]+$", "", row$Label)
            }
            electrode_numbers <- dipsaus::deparse_svec(containing_els)

            el <- ElectrodeGeom$new(
              name = sprintf('%s, %s - %s', subject_code, electrode_numbers, label_prefix),
              position = c(row$Coord_x, row$Coord_y, row$Coord_z),
              radius = radius, group = self$group, subtype = "CustomGeometry", prototype = geometry)
            el$number <- electrode_numbers
            el$is_surface_electrode <- FALSE
            el$vertex_number <- -1
            el$MNI305_position <- c(0, 0, 0)
          } else {
            self$objects[[ row$Electrode ]] <- self$objects[[ min_el ]]
            next
          }
        }

        el$hemisphere <- which_side
        el$anatomical_label <- anatomical_label
        el$surface_type <- surf_type
        el$subject_code <- subject_code
        el$set_value( value = as.character(subject_code), name = '[Subject]' )
        self$objects[[ row$Electrode ]] <- el
      }
      invisible(self)
    },

    fix_electrode_color = function(number, color, names = NULL, inclusive = TRUE) {
      names <- as.character(names)
      inclusive <- as.logical(inclusive)[[1]]
      el <- self$objects[[ number ]]
      if(!is.null(el)) {
        el$fixed_color <- list(
          color[[1]],
          names,
          inclusive
        )
        return(TRUE)
      }
      return(FALSE)
    },

    # function to set values to electrodes
    set_values = function(table_or_path){
      if( missing(table_or_path) ){
        table <- self$value_table
      }else{
        stopifnot2(is.data.frame(table_or_path) || (length(table_or_path) == 1) && is.character(table_or_path),
                   msg = 'table_or_path must be either data.frame or path to a csv file')
        if(!is.data.frame(table_or_path)){
          table <- read.csv(table_or_path, stringsAsFactors = FALSE)
        }else{
          table <- table_or_path
        }
      }
      if( !is.data.frame(table) ){
        return(NULL)
      }


      # an example, electrode and value are mandatory
      # Subject Electrode xxx Time
      # 1     YAB         1     1  0.5
      # 2     YAB         2     2  0.5
      # 3     YAB         3     3  0.5
      # 4     YAB         4     4  0.5
      # 5     YAB         5     5  0.5
      # 6     YAB         6     6  0.5
      stopifnot2(all(c('Electrode') %in% names(table)),
                 msg = 'value table must contains Electrode (integer)')

      if( length(table$Subject) ){
        table <- table[table$Subject %in% self$subject_code, ]
      }
      table$Electrode <- as.integer(table$Electrode)
      table <- table[!is.na(table$Electrode), ]
      var_names <- names(table)

      if( 'Time' %in% var_names ){
        # Sort by time
        table <- table[!is.na(table$Time), ]
        table <- table[order( table$Time ), ]
      }else if( nrow(table) ){
        table$Time <- 0
      }
      # Backup table
      self$value_table <- table

      # Need to figure out what variables to be put into electrodes

      var_names <- var_names[ !var_names %in% c('Electrode', 'Time', 'Note') ]

      # Check values
      for( vn in var_names ){
        if( !is.list(table[[vn]]) && !is.numeric(table[[vn]]) && !is.factor(table[[vn]]) ){
          table[[vn]] <- as.factor(table[[vn]])
        }
      }

      self$apply_electrodes(function(el, ii){
        # set values
        sub <- table[table$Electrode == ii, ]
        lapply(var_names, function(vn){
          # if no subset, then remove keyframes, else set keyframes
          el$set_value(value = sub[[vn]], time_stamp = sub$Time,
                       name = vn, target = '.material.color')
          if( length(sub$Note) && is.character(sub$Note) ){
            el$custom_info <- sub$Note
          }
        })
        NULL
      })

      return(invisible())
    }
  )
)
