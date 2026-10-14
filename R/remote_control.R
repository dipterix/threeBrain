#' Let other programs drive the 3D viewers
#'
#' @description A viewer can join a small hub that runs on this computer;
#' R, \verb{Python} or AI agents then send commands to the viewer through the
#' hub and read back what it shows. These functions start, list and stop hubs.
#' The hub is a \verb{Node.js} program (version 18 or newer) that comes with
#' this package; \code{viewer_hub_path()} gives its location.
#'
#' @details \code{viewer_hub_start()} reuses the hub that already runs on
#' \code{port}, or starts one in the background. It returns the hub's
#' \verb{passkey}: the port, or \code{"port.key"} when the hub requires a key,
#' and stores it in \code{options(threeBrain.remote_passkey)}, so viewers made
#' afterwards show it in their \code{"Passkey"} field. To connect a viewer,
#' click \code{"Connect"} below that field in its control panel; a viewer never
#' connects by itself.
#'
#' Without a key, any program or web page on this computer can connect to the
#' hub; set \code{generate_key = TRUE} (or \code{key}) when that matters. The
#' hub only listens on \verb{127.0.0.1}, so other computers cannot reach it.
#'
#' Running hubs are recorded in \code{tools::R_user_dir("threeBrain", "cache")},
#' where other programs and AI agents find and join them. To let an agent drive
#' the viewers, register the hub's \verb{MCP} mode once, for example with
#' \verb{Claude Code}:
#' \preformatted{claude mcp add threebrain -- node /path/to/threebrain-hub.mjs mcp}
#' where the path is \code{viewer_hub_path()}. The examples in the package
#' repository (\verb{examples/WebSocket}) show how \verb{R} and \verb{Python}
#' scripts send commands.
#'
#' The hub itself does not need R. Collaborators who received a viewer saved
#' with \code{\link{save_brain}} run the same file through an agent plugin
#' (\verb{examples/mcp} in the package repository); their agent starts the hub
#' and gives them the \verb{passkey}.
#'
#' @param port the port of the hub; default is \code{17285}
#' @param key a key that the hub requires (letters, digits, \code{"_"} and
#' \code{"-"}), or \code{NULL} for none
#' @param generate_key whether the hub requires a random key; ignored when
#' \code{key} is given
#' @param idle_minutes the hub stops after this many minutes with nothing
#' connected; \code{0} keeps it running
#' @returns \code{viewer_hub_path()}: the path of the hub script.
#' \code{viewer_hub_start()}: the \verb{passkey}, invisibly.
#' \code{viewer_hub_list()}: a data frame of the running hubs, with columns
#' \code{port}, \code{passkey} (\code{NA} when the key is unknown),
#' \code{keyed}, \code{viewers}, \code{by} (who started it) and \code{started}.
#' \code{viewer_hub_stop()}: nothing.
#' @examples
#' \dontrun{
#'
#' passkey <- viewer_hub_start()
#'
#' brain <- threeBrain(
#'   path = file.path(default_template_directory(), "N27"),
#'   subject_code = "N27", surface_types = "pial"
#' )
#' # In the viewer's control panel, click "Connect"
#' brain$plot()
#'
#' viewer_hub_list()
#' viewer_hub_stop()
#' }
#' @name viewer_hub
NULL

#' @rdname viewer_hub
#' @export
viewer_hub_path <- function() {
  path <- system.file("three-brain-hub", "dist", "threebrain-hub.mjs", package = "threeBrain")
  if (!nzchar(path)) {
    stop("The viewer hub is missing from this installation of threeBrain.", call. = FALSE)
  }
  path
}

#' @rdname viewer_hub
#' @export
viewer_hub_start <- function(port = 17285L, key = NULL, generate_key = FALSE, idle_minutes = 30) {
  port <- as.integer(port)
  if (length(key) && !grepl("^[A-Za-z0-9_-]+$", key)) {
    stop("A key may contain letters, digits, \"_\" and \"-\" only.", call. = FALSE)
  }
  running <- viewer_hub_list(port = port)
  running <- running[running$port == port, , drop = FALSE]
  if (nrow(running)) {
    passkey <- running$passkey[[1]]
    if (is.na(passkey)) {
      stop(sprintf(paste0(
        "A hub that requires a key runs on 127.0.0.1:%d, but its key is unknown. ",
        "Stop it with viewer_hub_stop(%d), or use another port."
      ), port, port), call. = FALSE)
    }
    message(sprintf("A viewer hub is already running on 127.0.0.1:%d.", port))
  } else {
    args <- c("serve", "--detach", "--port", port, "--idle-minutes", idle_minutes, "--by", "R")
    if (length(key)) {
      args <- c(args, "--key", key)
    } else if (isTRUE(generate_key)) {
      args <- c(args, "--generate-key")
    }
    output <- run_hub(args)
    line <- grep("passkey: ", output, value = TRUE, fixed = TRUE)
    if (!length(line)) {
      stop("The viewer hub did not start:\n", paste(output, collapse = "\n"), call. = FALSE)
    }
    passkey <- sub("^.*passkey: ([0-9]+(\\.[A-Za-z0-9_-]+)?)\\).*$", "\\1", line[[1]])
  }
  options(threeBrain.remote_passkey = passkey)
  message(sprintf(
    "To connect a viewer: in its control panel, enter %s in \"Passkey\" and click \"Connect\".",
    passkey
  ))
  invisible(passkey)
}

#' @rdname viewer_hub
#' @export
viewer_hub_list <- function(port = 17285L) {
  output <- run_hub(c("list", "--json", "--port", as.integer(port)))
  hubs <- jsonlite::fromJSON(paste(output, collapse = "\n"), simplifyVector = TRUE)
  if (!length(hubs)) {
    return(data.frame(
      port = integer(0), passkey = character(0), keyed = logical(0),
      viewers = integer(0), by = character(0), started = as.POSIXct(character(0)),
      stringsAsFactors = FALSE
    ))
  }
  data.frame(
    port = as.integer(hubs$port),
    passkey = as.character(hubs$passkey),
    keyed = as.logical(hubs$keyed),
    viewers = as.integer(hubs$viewers),
    by = as.character(hubs$by),
    started = as.POSIXct(as.numeric(hubs$started) / 1000, origin = "1970-01-01"),
    stringsAsFactors = FALSE
  )
}

#' @rdname viewer_hub
#' @export
viewer_hub_stop <- function(port = 17285L) {
  port <- as.integer(port)
  run_hub(c("stop", "--port", port))
  passkey <- getOption("threeBrain.remote_passkey")
  if (length(passkey) && identical(passkey_port(passkey), as.character(port))) {
    options(threeBrain.remote_passkey = NULL)
  }
  invisible()
}

# `remote_passkey` of a widget: NULL, or a checked "port" / "port.key"
check_passkey <- function(passkey) {
  if (!length(passkey)) {
    return(NULL)
  }
  passkey <- trimws(as.character(passkey)[[1]])
  if (!grepl("^[0-9]{1,5}(\\.[A-Za-z0-9_-]+)?$", passkey)) {
    stop("`remote_passkey` must be a port such as \"17285\", or \"port.key\".", call. = FALSE)
  }
  passkey
}

# the port part of a passkey: a saved file may be shared, its key may not
passkey_port <- function(passkey) {
  if (!length(passkey)) {
    return(NULL)
  }
  sub("\\..*$", "", passkey)
}

# The node executable: option `threeBrain.node`, else the PATH, else where the
# installers put it (a desktop IDE may not see the shell's PATH)
hub_node <- function() {
  node <- getOption("threeBrain.node", "")
  if (!nzchar(node)) {
    candidates <- c(Sys.which("node"), "/opt/homebrew/bin/node", "/usr/local/bin/node")
    candidates <- candidates[nzchar(candidates) & file.exists(candidates)]
    node <- c(candidates, "")[[1]]
  }
  if (!nzchar(node) || !file.exists(node)) {
    stop(
      "The viewer hub needs Node.js 18 or newer: install it from https://nodejs.org/ ",
      "or set options(threeBrain.node = \"/path/to/node\").",
      call. = FALSE
    )
  }
  unname(node)
}

run_hub <- function(args) {
  output <- suppressWarnings(system2(
    hub_node(), c(shQuote(viewer_hub_path()), args),
    stdout = TRUE, stderr = TRUE
  ))
  status <- attr(output, "status")
  if (length(status) && status != 0) {
    stop(paste(output, collapse = "\n"), call. = FALSE)
  }
  output
}
