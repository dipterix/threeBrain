BrainElectrodes <- R6::R6Class(
  classname = 'brain-electrodes',
  portable = TRUE,
  cloneable = FALSE,
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

    set_electrodes = function(table_or_path){
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

      stopifnot2(all(c('Electrode', 'Coord_x', 'Coord_y', 'Coord_z') %in% names(table)),
                 msg = 'electrode table must contains Electrode (integer), Coord_x,Coord_y,Coord_z in FreeSurfer RAS coordinates')

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

      # Check coordinates
      table$Coord_x <- as.numeric( table$Coord_x )
      table$Coord_y <- as.numeric( table$Coord_y )
      table$Coord_z <- as.numeric( table$Coord_z )
      na_coord <- is.na(table$Coord_x) | is.na(table$Coord_y) | is.na(table$Coord_z)
      if( any(na_coord) ){
        table$Coord_x[ na_coord ] <- 0
        table$Coord_y[ na_coord ] <- 0
        table$Coord_z[ na_coord ] <- 0
      }

      if( all( paste0('MNI305_', c('x','y','z')) %in% names(table) ) ){
        table$MNI305_x <- as.numeric( table$MNI305_x )
        table$MNI305_y <- as.numeric( table$MNI305_y )
        table$MNI305_z <- as.numeric( table$MNI305_z )
        na_coord <- is.na(table$MNI305_x) | is.na(table$MNI305_y) | is.na(table$MNI305_z)
        if( any(na_coord) ){
          table$MNI305_x[ na_coord ] <- 0
          table$MNI305_y[ na_coord ] <- 0
          table$MNI305_z[ na_coord ] <- 0
        }
      }else{
        table$MNI305_x <- 0
        table$MNI305_y <- 0
        table$MNI305_z <- 0
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

      if( !length(table$Hemisphere) ){
        table$Hemisphere <- NA
      }

      self$raw_table <- table

      # Generate objects
      self$objects <- list()


      subject_code <- self$subject_code
      for( ii in seq_len(n) ){
        row <- table[ii, ]
        which_side <- row$Hemisphere
        nearest_vertex <- row$VertexNumber
        mni_305 <- c( row$MNI305_x, row$MNI305_y, row$MNI305_z )
        if(length(mni_305)!=3){ mni_305 <- c(0,0,0) }
        surf_type <- c(row$SurfaceType, 'pial')[1]
        if( is.na(surf_type) ){ surf_type <- 'NA' }
        radius <- row$Radius


        el <- ElectrodeGeom$new(name = sprintf('%s, %d - %s', subject_code, row$Electrode, row$Label),
                                position = c(row$Coord_x, row$Coord_y, row$Coord_z),
                                radius = radius, group = self$group)
        el$is_surface_electrode <- isTRUE( row$SurfaceElectrode )
        el$hemisphere <- which_side
        el$surface_type <- surf_type
        el$vertex_number <- nearest_vertex
        el$subject_code <- subject_code
        el$MNI305_position <- mni_305
        el$set_value( value = as.character(subject_code), name = '[Subject]' )
        self$objects[[ row$Electrode ]] <- el
      }
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
        if( !is.numeric(table[[vn]]) && !is.factor(table[[vn]]) ){
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
