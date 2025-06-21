#' Launch a 'shiny' application to localize electrodes
#' @description
#' If 'RAVE' has been installed, please use 'RAVE' modules. This function
#' is purely for demonstration purposes.
#'
#' @param subject_code subject code
#' @param fs_path the subject's 'FreeSurfer' path
#' @param ct_path the file path of 'CT' scans that have already been aligned
#' to 'T1'; must be in 'NIFTI' format
#' @param surfaces which surfaces to load
#' @param use_141 whether to try 'SUMA' standard 141 surface; default is true
#' @param shiny_options shiny application options; see \code{options} in
#' \code{\link[shiny]{shinyApp}}
#' @param ... other parameters to pass into \code{\link{threeBrain}}
#' @param control_presets,side_display,controllers passed to
#' \code{\link{threejs_brain}}
#' @param save_path a temporary file where the electrode table should be
#' cached; this file will be used to keep track of changes in case the
#' application is crashed or shutdown
#' @return A list of \code{'ui'} elements, \code{'server'} function, and
#' a stand-alone \code{'app'}
#' @examples
#'
#' # This example require N27 template brain to be installed
#' # see `?download_N27` for details
#'
#' # using N27 to localize
#' fs_path <- file.path(default_template_directory(), "N27")
#' if(interactive() && dir.exists(fs_path)){
#'   module <- localization_module("N27", fs_path)
#'
#'   print(module$app)
#' }
#'
#' @export
localization_module <- function(
  subject_code, fs_path, ct_path = NULL, surfaces = "pial", use_141 = TRUE,
  shiny_options = list(launch.browser = TRUE),
  save_path = tempfile(pattern = "electrode", fileext = ".csv"),
  ..., control_presets = NULL, side_display = FALSE, controllers = list()
){

  message("This function is for demonstration purpose. Please check more sophisticated localization integration with RAVE at\n  https://rave.wiki")
  if(!package_installed("DT")){
    stop("Package `DT` is needed to run this module. Please install it by running\n  ",
         "install.packages('DT')")
  }

  fslut_json <- system.file("palettes", "datacube2", "FreeSurferColorLUT.json",
                            package = "threeBrain")
  cmap <- load_colormap(fslut_json)
  cmap <- do.call('rbind', lapply(cmap$map, as.data.frame, stringAsFactors = FALSE))

  brain <- threeBrain(
    path = fs_path,
    subject_code = subject_code,
    surface_types = surfaces,
    # use_141 = use_141,
    # use_cache = TRUE,
    ...
  )
  if(is.null(brain)){
    # use template brain
    brain <- merge_brain(template_surface_types = surfaces, ...)
    brain <- brain$template_object
    localize <- function(){
      brain$localize(
        side_display = side_display,
        control_presets = control_presets,
        show_modal = FALSE
      )
    }
  } else {
    if(is.null(ct_path) || !isTRUE(file.exists(ct_path))){
      localize <- function(){
        brain$localize(
          side_display = side_display,
          control_presets = control_presets,
          show_modal = FALSE
        )
      }
    } else {
      localize <- local({
        control_presets <- c('localization', control_presets)
        ct <- read_nii2( normalizePath(ct_path, mustWork = TRUE) )
        # cube <- reorient_volume( ct$get_data(), brain$Torig )

        # TODO: FIXME
        # calculate matrixWorld
        ct_shape <- ct$get_shape()
        trans_mat <- diag(rep(1, 4))
        trans_mat[1:3, 4] <- ct_shape / 2
        trans_mat <- ct$get_IJK_to_tkrRAS(brain) %*% trans_mat

        add_voxel_cube(brain, "CT", ct$get_data(), size = ct_shape,
                       trans_mat = trans_mat)
        key <- seq(0, max(ct$get_range()))
        cmap <- create_colormap(
          gtype = 'volume', dtype = 'continuous',
          key = key, value = key,
          color = c("white", "green", 'darkgreen')
        )
        controllers[["Left Opacity"]] <- 0.4
        controllers[["Right Opacity"]] <- 0.4
        controllers[["Voxel Type"]] <- "CT"
        controllers[["Voxel Display"]] <- "normal"
        controllers[["Voxel Min"]] <- 3000
        controllers[["Edit Mode"]] <- "CT/volume"
        controllers[["Highlight Box"]] <- FALSE
        function(){
          brain$plot(
            control_presets = control_presets,
            voxel_colormap = cmap,
            controllers = controllers,
            side_display = side_display,
            ...,
            # custom_javascript = "canvas.controls.noPan=true;",
            show_modal = FALSE
          )
        }
      })
    }

  }


  ui <- function(module_id, side_height = 300, height = "100vh"){
    ns <- shiny::NS(module_id)
    shiny::div(
      style = sprintf("width: 100%%; display: flex; flex-flow: column; height: %s;", height),
      shiny::div(
        style = sprintf('flex: 0 0 %spx;', side_height),
        shiny::column(
          width = 9,
          shiny::div(
            style = sprintf("max-height: %dpx; overflow-y: auto; overlow-x: hidden;", side_height),
            DT::DTOutput(ns("table"), width = "100%")
          )
        ),
        shiny::column(
          width = 3,
          style = "padding-top: 10px; ",
          dipsaus::flex_div(
            ncols = 2L,
            shiny::selectizeInput(
              ns("fslut"),
              "FreeSurfer look-up",
              choices = NULL,
              multiple = FALSE,
              selected = character(0),
              width = "100%"
            ),
            shiny::textInput(ns("fslutid"), "Index code", value = "", width = "100%",
                             placeholder = "FreeSurfer index code will be displayed here..."),
            shiny::fileInput(ns("load"), dipsaus::html_asis(" "), width = "100%", buttonLabel = "Import & add"),
            shiny::actionButton(ns("refresh"), "Validate & Update table", width = "100%"),
            shiny::actionButton(ns("clear"), "Clear table", width = "100%"),
            shiny::downloadButton(ns("save"), "Export", style = "width: 100%")
          ),
        )
      ),
      shiny::div(
        style = 'flex: 1 0 auto;',
        threejsBrainOutput(
          ns("viewer"), width = "100%", height = "100%")
      )
    )
  }
  server <- function(input, output, session){
    shiny::updateSelectizeInput(session = session, inputId = "fslut", choices = cmap$Label, server = TRUE)
    # session <- shiny::MockShinySession$new()
    proxy_brain <- brain_proxy(outputId = "viewer", session = session)

    local_reactive <- shiny::reactiveValues(
      table = NULL
    )
    output$viewer <- renderBrain({
      shiny::showNotification(shiny::p("Loading... Please wait"), type = 'message', closeButton = FALSE, duration = NULL, id = "notif")
      on.exit({
        shiny::removeNotification("notif")
      })
      localize()
    })

    shiny::observeEvent(proxy_brain$localization_table, {
      tbl <- proxy_brain$localization_table
      tbl$Electrode[duplicated(tbl$Electrode)] <- ""
      local_reactive$table <- tbl
      try({
        utils::write.csv(tbl, save_path)
      })
    })

    shiny::observeEvent(input$load, {
      print(input$load)
      infile <- input$load
      tryCatch({
        dat <- utils::read.csv(infile$datapath)
        for(i in seq_len(nrow(dat))){
          proxy_brain$add_localization_electrode(dat[i,], i == nrow(dat))
        }

      }, error = function(e){
        shiny::showNotification(shiny::p("Error while trying to load from ", infile$name, ": ",
                                  e$message), type = "error")
      })

    })

    shiny::observeEvent(input$refresh, {
      proxy_brain$set_localization_electrode(
        -1, list(), update_shiny = TRUE)
    })

    shiny::observeEvent(input$fslut, {
      nm <- input$fslut
      if(length(nm) == 1){
        cid <- cmap$ColorID[ cmap$Label == nm ]
        if(length(cid) == 1){
          shiny::updateTextInput(session = session, inputId = 'fslutid', value = cid)
        }
      }
    })

    shiny::observeEvent(input$table_cell_edit, {
      edit <- input$table_cell_edit
      tbl <- local_reactive$table

      nms <- names(tbl)

      # assign('edit', edit, envir = globalenv())

      mode <- sapply(nms, function(nm){ mode(tbl[[nm]]) })
      params <- structure(lapply(seq_along(nms), function(ii){
        re <- edit$value[edit$col == ii]
        mode(re) <- mode[[ii]]
        re
      }), names = nms)

      proxy_brain$set_localization_electrode(
        params$LocalizationOrder, params, update_shiny = FALSE)

    })

    shiny::observeEvent(input$clear, {
      proxy_brain$clear_localization()
    })

    output$table <- DT::renderDT({
      tbl <- local_reactive$table
      shiny::validate(
        shiny::need(
          is.data.frame(tbl) && length(tbl) && nrow(tbl),
          message = "Please click on the CT to localize electrodes first."
        )
      )
      rownames(tbl) <- tbl$LocalizationOrder
      DT::datatable(
        tbl,
        class = "compact cell-border stripe",
        editable = list(target = 'row', disable = list(
          columns = c(1, 3:5, 9, 10:15))),
        selection = "single",
        rownames = TRUE,
        filter = "none",
        options = list(
          dom = 'rtip',
          scrollX = FALSE,
          scrollY = TRUE,
          pageLength = nrow(tbl),
          columnDefs = list(
            list(visible = FALSE, targets = c(1,3:5,7,10:15,19,20))
          )
        )
      )
    })

    output$save <- shiny::downloadHandler(
      filename = "electrode.csv",
      content = function(conn) {
        shiny::showNotification(shiny::p("Generating electrode.csv ..."), type = 'message', duration = NULL, id = "save_notif", closeButton = FALSE)
        tbl <- local_reactive$table

        # calculate template vertex numbers
        # assign("brain", brain, envir = globalenv())
        # assign("tbl", tbl, envir = globalenv())

        on.exit({
          brain$electrodes$raw_table <- NULL
          brain$electrodes$objects <- NULL
        })

        tbl$Hemisphere <- ""
        tbl$Subject <- brain$subject_code
        tbl$Electrode <- as.integer(tbl$Electrode)
        sel <- is.na(tbl$Electrode)
        if(length(tbl$Electrode) && any(sel)){
          if(all(sel)){
            tbl$Electrode <- seq_along(tbl$Electrode)
          } else {
            start <- max(tbl$Electrode, na.rm = TRUE)
            tbl$Electrode[sel] <- seq_len(sum(sel)) + start
          }
        }
        tbl$Hemisphere[grepl("(lh)|(Left)", tbl$FSLabel)] <- "left"
        tbl$Hemisphere[grepl("(rh)|(Right)", tbl$FSLabel)] <- "right"
        tbl$VertexNumber <- -1
        brain$set_electrodes(tbl)
        utils::write.csv(tbl, save_path)
        shiny::removeNotification("save_notif", session = session)
        utils::write.csv(tbl, conn, row.names = FALSE)
      }
    )

    # onSessionEnded(function(){
    #   shiny::stopApp()
    # })
  }
  app <- shiny::shinyApp(ui = shiny::fluidPage(
    title = "Electrode Localization",
    shiny::fluidRow(
      # container
      ui("threeBrain")
    )
  ), server = function(input, output, session){
    shiny::callModule(server, "threeBrain", session = session)
  }, options = shiny_options)

  dipsaus::list_to_fastmap2(list(
    ui = ui,
    server = server,
    app = app
  ))

}
