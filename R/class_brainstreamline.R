# Supported streamline file formats, in resolution priority order.
# `vtk`/`vtp` are recognized so we can raise an informative error, but they are
# not renderable: the viewer has no VTK reader.
STREAMLINE_EXTENSIONS <- c("tck", "trk", "trk.gz", "tt", "tt.gz")
STREAMLINE_EXTENSIONS_UNSUPPORTED <- c("vtk", "vtp")

# Normalize for case- and whitespace-insensitive comparison
streamline_normalize_key <- function(x) {
  tolower(trimws(x))
}

#' @noRd
#' @description Parse a streamline key into its circuit group and bundle pattern.
#' The circuit is the \strong{first} component only, so that a key always names
#' exactly one circuit: \code{"motor/AF_left"} is bundle \code{"AF_left"} of
#' circuit \code{"motor"}, and \code{"motor/left/AF"} is bundle
#' \code{"left/AF"} of that same circuit -- a sub-folder narrows the selection
#' without starting a circuit of its own.  \code{"motor/*"} and its shorthand
#' \code{"motor/"} name the whole circuit including its sub-folders;
#' \code{"motor/left/*"} narrows that to one sub-folder; \code{"motor/CST_*"}
#' globs within the circuit.  A key without \code{'/'} belongs to the
#' \code{"default"} group, so \code{"motor"} means \code{"default/motor"}.
#' \code{'*'} is only allowed in the last component.
streamline_parse_key <- function(name) {
  stopifnot2(
    length(name) == 1 && is.character(name) && !is.na(name),
    msg = "`add_streamline`: `name` must be a single character, e.g. 'AF_left', 'motor/AF_left' or 'motor/*'"
  )
  name <- trimws(name)
  name <- gsub("^[/]+", "", name)
  stopifnot2(nzchar(name), msg = "`add_streamline`: `name` cannot be blank")

  # `motor/` is shorthand for `motor/*`, `motor/left/` for `motor/left/*`
  trailing_slash <- endsWith(name, "/")

  parts <- strsplit(name, "/", fixed = TRUE)[[1]]
  parts <- parts[nzchar(parts)]
  stopifnot2(
    length(parts) > 0L,
    msg = "`add_streamline`: `name` cannot be blank"
  )

  if (trailing_slash) {
    parts <- c(parts, "*")
  }

  if (length(parts) == 1) {
    group <- "default"
    pattern_parts <- parts
    explicit_group <- FALSE
  } else {
    # only the first component is the circuit; the rest is a path relative to
    # the circuit folder and becomes the bundle name
    group <- parts[[1]]
    pattern_parts <- parts[-1]
    explicit_group <- TRUE
  }

  stopifnot2(
    nzchar(group),
    msg = "`add_streamline`: circuit group cannot be blank"
  )
  # every component but the last names a folder, and a misspelled folder must
  # fail loudly instead of quietly matching a neighbouring one
  folder_parts <- c(group, pattern_parts[-length(pattern_parts)])
  stopifnot2(
    !any(grepl("*", folder_parts, fixed = TRUE)),
    msg = sprintf(
      paste0(
        "`add_streamline`: `%s` uses '*' in a folder name. Wild cards are only ",
        "allowed in the bundle name, e.g. 'motor/*', 'motor/CST_*' or ",
        "'motor/left/CST_*'."
      ),
      name
    )
  )

  pattern <- paste(pattern_parts, collapse = "/")

  list(
    group = group,
    pattern = pattern,
    explicit_group = explicit_group,
    is_pattern = grepl("*", pattern, fixed = TRUE)
  )
}

#' @noRd
#' @description Case-insensitively resolve a sub-directory of \code{root}.
#' Returns \code{NULL} when no directory matches.
streamline_match_dir <- function(root, group) {
  if (!length(root) || !dir.exists(root)) {
    return(NULL)
  }
  dirs <- list.dirs(root, full.names = FALSE, recursive = FALSE)
  idx <- which(
    streamline_normalize_key(dirs) == streamline_normalize_key(group)
  )
  if (!length(idx)) {
    return(NULL)
  }
  file.path(root, dirs[[idx[[1]]]])
}

#' @noRd
#' @description Case-insensitively resolve a sub-path of \code{root}, one
#' component at a time so the on-disk spelling of each folder is kept. Returns
#' \code{list(path=, name=)} where \code{name} is the resolved sub-path joined by
#' \code{'/'} (empty when \code{subpath} is empty), or \code{NULL} when any
#' component is missing.
streamline_match_subdir <- function(root, subpath) {
  if (!length(root) || !dir.exists(root)) {
    return(NULL)
  }
  parts <- strsplit(subpath, "/", fixed = TRUE)[[1]]
  parts <- parts[nzchar(parts)]
  if (!length(parts)) {
    return(list(path = root, name = ""))
  }

  current <- root
  spelled <- character(0L)
  for (part in parts) {
    current <- streamline_match_dir(current, part)
    if (!length(current)) {
      return(NULL)
    }
    spelled <- c(spelled, filename(current))
  }

  list(path = current, name = paste(spelled, collapse = "/"))
}

#' @noRd
#' @description Case-insensitively resolve a streamline file named \code{name}
#' (without extension) inside \code{dir}. \code{name} may be a path relative to
#' \code{dir}, such as \code{"left/AF"}, in which case the sub-folders are
#' resolved first. Returns a list with the on-disk path and the on-disk spelling
#' of the bundle name -- again relative to \code{dir} -- or \code{NULL}. When the
#' only matches use an unsupported format, this errors out with an explicit
#' message.
streamline_match_file <- function(dir, name) {
  if (!length(dir) || !dir.exists(dir)) {
    return(NULL)
  }

  # keep the key as the caller spelled it, for the unsupported-format message
  full_name <- name
  prefix <- ""
  if (grepl("/", name, fixed = TRUE)) {
    sub_dir <- streamline_match_subdir(dir, dirname(name))
    if (!length(sub_dir)) {
      return(NULL)
    }
    dir <- sub_dir$path
    prefix <- sprintf("%s/", sub_dir$name)
    name <- basename(name)
  }

  fnames <- list.files(dir, full.names = FALSE, recursive = FALSE)
  if (!length(fnames)) {
    return(NULL)
  }

  fnames <- fnames[!dir.exists(file.path(dir, fnames))]
  normalized <- streamline_normalize_key(fnames)
  target <- streamline_normalize_key(name)

  for (ext in STREAMLINE_EXTENSIONS) {
    idx <- which(normalized == sprintf("%s.%s", target, ext))
    if (length(idx)) {
      fname <- fnames[[idx[[1]]]]
      return(list(
        path = file.path(dir, fname),
        # on-disk spelling of the bundle name: the sub-path plus the file name
        # minus extension
        name = sprintf(
          "%s%s",
          prefix,
          substr(fname, 1L, nchar(fname) - nchar(ext) - 1L)
        )
      ))
    }
  }

  for (ext in STREAMLINE_EXTENSIONS_UNSUPPORTED) {
    idx <- which(normalized == sprintf("%s.%s", target, ext))
    if (length(idx)) {
      stop(sprintf(
        paste0(
          "`add_streamline`: `%s` is stored as %s, which the 3D viewer cannot read. ",
          "Supported streamline formats are: %s. Please convert the file."
        ),
        full_name,
        fnames[[idx[[1]]]],
        paste(sprintf("'%s'", STREAMLINE_EXTENSIONS), collapse = ", ")
      ))
    }
  }

  NULL
}

#' @noRd
#' @description Expand a bundle glob (for example \code{"*"}, \code{"CST_*"} or
#' \code{"left/*"}) inside \code{dir}. When \code{recursive} is \code{TRUE} the
#' glob is matched against each file's path relative to \code{dir}, and since
#' \code{'*'} matches \code{'/'} as well, \code{"*"} covers the sub-folders too
#' while \code{"left/*"} narrows the scan to one of them. Returns a list of
#' \code{list(path=, name=)} records, sorted by name so the order is
#' deterministic. Unlike \code{streamline_match_file}, unsupported formats are
#' skipped silently: a stray \code{'vtp'} must not abort a whole-group scan.
#' \code{colormap.csv} is excluded by the extension filter.
streamline_match_files <- function(dir, pattern, recursive = TRUE) {
  if (!length(dir) || !dir.exists(dir)) {
    return(list())
  }
  fnames <- list.files(dir, full.names = FALSE, recursive = recursive)
  if (!length(fnames)) {
    return(list())
  }
  # a recursive listing already excludes directories
  if (!recursive) {
    fnames <- fnames[!dir.exists(file.path(dir, fnames))]
  }
  if (!length(fnames)) {
    return(list())
  }

  normalized <- streamline_normalize_key(fnames)
  regexp <- utils::glob2rx(streamline_normalize_key(pattern))

  re <- list()
  seen <- character(0L)

  # walk the extensions in priority order, so a bundle stored in several formats
  # resolves to the same file `streamline_match_file` would have picked
  for (ext in STREAMLINE_EXTENSIONS) {
    suffix <- sprintf(".%s", ext)
    for (ii in which(endsWith(normalized, suffix))) {
      stem <- substr(fnames[[ii]], 1L, nchar(fnames[[ii]]) - nchar(suffix))
      key <- streamline_normalize_key(stem)
      if (key %in% seen || !grepl(regexp, key)) {
        next
      }
      seen <- c(seen, key)
      re[[length(re) + 1L]] <- list(
        path = file.path(dir, fnames[[ii]]),
        name = stem
      )
    }
  }

  if (!length(re)) {
    return(re)
  }
  re[order(streamline_normalize_key(vapply(
    re,
    function(x) {
      x$name
    },
    ""
  )))]
}

#' @noRd
#' @description Read \code{{fs}/streamline/colormap.csv} if present. Returns a
#' named character vector mapping normalized \code{Filename} entries to colors.
streamline_read_colormap <- function(streamline_root) {
  empty <- structure(character(0L), names = character(0L))
  if (!length(streamline_root) || !dir.exists(streamline_root)) {
    return(empty)
  }

  fnames <- list.files(streamline_root, full.names = FALSE, recursive = FALSE)
  idx <- which(streamline_normalize_key(fnames) == "colormap.csv")
  if (!length(idx)) {
    return(empty)
  }

  tbl <- tryCatch(
    {
      utils::read.csv(
        file.path(streamline_root, fnames[[idx[[1]]]]),
        stringsAsFactors = FALSE,
        colClasses = "character"
      )
    },
    error = function(e) {
      warning("Unable to read streamline `colormap.csv`: ", e$message)
      NULL
    }
  )
  if (!is.data.frame(tbl) || !nrow(tbl)) {
    return(empty)
  }

  headers <- streamline_normalize_key(names(tbl))
  col_fname <- which(headers == "filename")
  col_color <- which(headers == "color")
  if (!length(col_fname) || !length(col_color)) {
    warning(
      "Streamline `colormap.csv` must have `Filename` and `Color` columns; ignored."
    )
    return(empty)
  }

  keys <- streamline_normalize_key(tbl[[col_fname[[1]]]])
  values <- trimws(tbl[[col_color[[1]]]])
  sel <- nzchar(keys) & nzchar(values) & !is.na(keys) & !is.na(values)
  if (!any(sel)) {
    return(empty)
  }

  structure(values[sel], names = keys[sel])
}

#' @noRd
#' @description Resolve the color for one bundle. Priority: explicit \code{color}
#' argument, then \code{colormap.csv} (\code{group/name} > \code{name} > the
#' bundle's bare file name > \code{group/}), then a deterministic color hashed
#' from the bundle name.
streamline_resolve_color <- function(color, group, name, colormap = NULL) {
  if (length(color) == 1 && !is.na(color)) {
    return(streamline_as_hex(color))
  }

  if (length(colormap)) {
    lookups <- streamline_normalize_key(c(
      sprintf("%s/%s", group, name), # most specific
      name,
      # a nested bundle can still be named by its file name alone
      basename(name),
      sprintf("%s/", group) # group entries must carry a trailing slash
    ))
    lookups <- lookups[!duplicated(lookups)]
    for (key in lookups) {
      if (!key %in% names(colormap)) {
        next
      }
      value <- unname(colormap[[key]])
      if (length(value) == 1 && !is.na(value) && nzchar(value)) {
        hex <- tryCatch(streamline_as_hex(value), error = function(e) {
          NULL
        })
        if (length(hex)) {
          return(hex)
        }
      }
    }
  }

  random_color_from_string(name)
}

#' @noRd
#' @description Normalize any R color specification to an upper-case
#' \code{'#RRGGBB'} string.
streamline_as_hex <- function(color) {
  rgb_mat <- grDevices::col2rgb(color)
  toupper(grDevices::rgb(
    red = rgb_mat[1, 1],
    green = rgb_mat[2, 1],
    blue = rgb_mat[3, 1],
    maxColorValue = 255
  ))
}

#' R6 Class - Streamline Geometry
#' @description
#' Geometry that points at a streamline (\verb{tractography}) file on disk.  The tract
#' data is never read in \R: the file path is registered as cached group data and
#' the file is loaded and parsed directly by the 3D viewer.
#' @author Zhengjia Wang
#' @name StreamlineGeom
NULL

#' @export
StreamlineGeom <- R6::R6Class(
  classname = "StreamlineGeom",
  inherit = AbstractGeom,
  public = list(
    #' @field type Geometry type string (\code{"streamline"}).
    type = "streamline",
    #' @field clickable Logical; always \code{FALSE} for streamline geometry.
    clickable = FALSE,
    #' @field color Line color as an upper-case \code{'#RRGGBB'} string.
    color = "#FF0000",
    #' @field streamline_name Bundle name, using the on-disk spelling.  Bundles
    #'   stored in a sub-folder of the circuit keep that sub-path, for example
    #'   \code{'left/AF'}.
    streamline_name = "",
    #' @field streamline_group Circuit group name, using the on-disk spelling.
    streamline_group = "default",

    #' @description
    #' Create a streamline geometry from a file path.
    #' @param name Unique character name of the geometry.
    #' @param path Path to the streamline file.
    #' @param streamline_name Bundle name, relative to the circuit folder; used
    #'   to derive the cached data key.
    #' @param streamline_group Circuit group name.
    #' @param color Line color; any \R color specification.
    #' @param group \code{GeomGroup} that owns this geometry.
    #' @param layer Camera layer.  Default \code{7} (all cameras).
    #' @param ... Additional arguments forwarded to \code{AbstractGeom}.
    initialize = function(
      name,
      path,
      streamline_name,
      streamline_group = "default",
      color = "#FF0000",
      group = GeomGroup$new(name = "default"),
      layer = 7,
      ...
    ) {
      abspath <- normalizePath(path, winslash = "/", mustWork = TRUE)
      super$initialize(name, position = c(0, 0, 0), layer = layer, ...)
      self$group <- group

      self$streamline_name <- streamline_name
      self$streamline_group <- streamline_group
      self$color <- streamline_as_hex(color)

      # `threejs_brain` copies every cached item flat into the circuit's cache
      # folder, so two bundles of the same circuit must not share a file name.
      # Flatten the path relative to the circuit folder rather than the absolute
      # path: the latter would change with the `fs` location, leak it into the
      # served widget, and can outgrow the file name length limit. `.` stays so
      # the extension -- including a two-part `trk.gz` -- survives for the
      # viewer's format dispatch, and `__` is far less likely than `_` to also
      # occur in a bundle name.
      rel_file <- filename(abspath)
      rel_dir <- dirname(streamline_name)
      if (rel_dir != ".") {
        rel_file <- file.path(rel_dir, rel_file)
      }

      group$set_group_data(
        self$data_key,
        value = list(
          path = path,
          absolute_path = abspath,
          file_name = gsub("[^a-zA-Z0-9._-]+", "__", rel_file),
          is_new_cache = FALSE,
          is_cache = TRUE
        ),
        is_cached = TRUE
      )
    },

    #' @description Serialize the streamline geometry to a named list for
    #'   \code{'JSON'} export, adding \code{color}, \code{streamline_name},
    #'   \code{streamline_group}, and \code{isStreamlineGeom}.
    to_list = function() {
      re <- super$to_list()
      re$color <- self$color
      re$streamline_name <- self$streamline_name
      re$streamline_group <- self$streamline_group
      re$isStreamlineGeom <- TRUE
      re
    }
  ),
  active = list(
    #' @field data_key Key under which the file descriptor is stored in the
    #'   owning group.  One circuit group holds several bundles, so the key is
    #'   suffixed with \code{streamline_name}.
    data_key = function() {
      sprintf("streamline_data_%s", self$streamline_name)
    }
  )
)


#' R6 Class - Brain Streamline Data
#' @description
#' Internal class that wraps a streamline (\verb{tractography}) bundle
#' (\code{StreamlineGeom}) together with the \code{GeomGroup} representing the
#' brain circuit it belongs to.  Several bundles that contribute to the same
#' circuit share one group.
#' @author Zhengjia Wang
#' @name BrainStreamline
#' @noRd
NULL

BrainStreamline <- R6::R6Class(
  classname = "brain-streamline",
  portable = TRUE,
  cloneable = FALSE,
  public = list(
    subject_code = "",

    # bundle name, on-disk spelling (e.g. "AF_left")
    streamline_name = "",

    # circuit group name, on-disk spelling (e.g. "motor")
    streamline_group = "default",

    # path to the streamline file
    path = NULL,

    # StreamlineGeom instance
    object = NULL,

    group = NULL,

    set_subject_code = function(subject_code) {
      if (self$has_streamline) {
        self$object$subject_code <- subject_code
        self$group$subject_code <- subject_code

        self$object$name <- sprintf(
          "Streamline - %s/%s (%s)",
          self$streamline_group,
          self$streamline_name,
          subject_code
        )
        self$group$name <- sprintf(
          "Streamline - %s (%s)",
          self$streamline_group,
          subject_code
        )
        # unlike `BrainAtlas`, keep the served path in sync as well, otherwise
        # renaming the subject leaves the cache folder pointing at the old code
        self$group$.cache_name <- sprintf(
          "%s/streamline/%s",
          subject_code,
          stringr::str_replace_all(self$streamline_group, "[^a-zA-Z0-9]", "_")
        )
      }

      self$subject_code <- subject_code
    },

    set_color = function(color) {
      hex <- streamline_as_hex(color)
      if (self$has_streamline) {
        self$object$color <- hex
      }
      invisible(hex)
    },

    initialize = function(
      subject_code,
      streamline_name,
      streamline_group = "default",
      streamline,
      path = NULL
    ) {
      self$object <- streamline
      self$group <- streamline$group
      self$streamline_name <- streamline_name
      self$streamline_group <- streamline_group
      self$path <- path

      self$set_subject_code(subject_code)
    },

    print = function(...) {
      cat("Subject\t\t:", self$subject_code, end = "\n")
      cat("Circuit group\t:", self$streamline_group, end = "\n")
      cat("Bundle\t\t:", self$streamline_name, end = "\n")
      cat("Color\t\t:", self$color, end = "\n")
      cat("File\t\t:", paste(format(self$path), collapse = ""), end = "\n")
      if (!self$has_streamline) {
        warning("No streamline found!")
      }

      invisible(self)
    }
  ),
  active = list(
    streamline_type = function() {
      sprintf("%s/%s", self$streamline_group, self$streamline_name)
    },
    color = function() {
      if (!self$has_streamline) {
        return(NA_character_)
      }
      self$object$color
    },
    has_streamline = function() {
      if (
        !is.null(self$object) &&
          R6::is.R6(self$object) &&
          "streamline" %in% self$object$type
      ) {
        return(TRUE)
      }

      return(FALSE)
    }
  )
)


#' @title Add a streamline (fiber tract) bundle to a brain object
#' @description
#' Registers a streamline file so it renders in the 3D viewer.  The tract data is
#' not read in \R; only the file path is recorded, and the viewer loads and parses
#' the file itself.  Bundles are organized into circuit groups so that several
#' bundles contributing to the same brain circuit can be toggled together.
#'
#' @param brain a \code{'threeBrain'} brain object generated from
#' \code{\link{threeBrain}} or \code{\link{merge_brain}}
#' @param name one or more streamline keys, of the form \code{'circuit/bundle'}.
#' The circuit is the top-level sub-folder under \code{'fs/streamline'} and the
#' bundle is the file name without extension, prefixed by any further sub-folders
#' it sits in; both are matched case-insensitively, and the spelling on disk is
#' the one kept.  A key may also glob the bundle with \code{'*'} to select a whole
#' circuit at once.  See \sQuote{Key syntax} below
#' @param color line color, recycled over the bundles that \code{name} expands
#' to; when \code{NA} (default) each bundle is colored from
#' \code{'fs/streamline/colormap.csv'}, falling back to a color derived from the
#' bundle name.  See \sQuote{Colors}
#'
#' @section Key syntax:
#' A key names exactly one circuit, and the circuit is always the \strong{first}
#' component: everything after it is the bundle, so
#' \code{'motor/left/AF'} is the bundle \code{'left/AF'} of circuit
#' \code{'motor'}, not a circuit called \code{'motor/left'}.  Sub-folders are
#' therefore a way to load part of a circuit, not a way to create more of them,
#' and all of \code{'motor'} shares one folder in the viewer's control panel.
#' \describe{
#'   \item{\code{'motor/AF_left'}}{one bundle, \code{'AF_left'}, in circuit
#'     \code{'motor'}}
#'   \item{\code{'motor/*'}}{every bundle in circuit \code{'motor'}, including
#'     those in its sub-folders}
#'   \item{\code{'motor/'}}{shorthand for \code{'motor/*'}}
#'   \item{\code{'motor/left/AF'}}{one bundle stored as
#'     \code{'fs/streamline/motor/left/AF.tck'}, known as \code{'left/AF'} within
#'     circuit \code{'motor'}}
#'   \item{\code{'motor/left/*'}}{only the \code{'left'} sub-folder of circuit
#'     \code{'motor'}, rather than the whole circuit}
#'   \item{\code{'motor/CST_*'}}{bundles in \code{'motor'} whose name starts with
#'     \code{'CST_'}}
#'   \item{\code{'motor'}}{no circuit prefix, hence \code{'default/motor'}: the
#'     file \code{'motor'} in the \code{'default'} circuit}
#'   \item{\code{'default/'}}{the \code{'default'} circuit, which covers
#'     \code{'fs/streamline/default'} plus the files sitting directly in
#'     \code{'fs/streamline'} -- but not the other circuits' folders}
#' }
#' \code{'*'} matches \code{'/'} as well, which is why \code{'motor/*'} reaches
#' into sub-folders.  It is only allowed in the last component, though: a wild
#' card in a folder name, such as \code{'*/AF_left'} or \code{'motor/*/AF_left'},
#' raises an error so that a misspelled circuit or sub-folder fails loudly
#' instead of quietly matching another one.
#'
#' @details
#' Files are searched with the following extension priority: \verb{tck},
#' \verb{trk}, \verb{trk.gz}, \verb{tt}, \verb{tt.gz}.  \verb{VTK} formats
#' (\verb{vtk}, \verb{vtp}) are not supported by the viewer.  Naming such a file
#' directly raises an error; when expanding a wild card they are skipped, so one
#' stray file cannot abort a whole circuit.
#' Streamline coordinates are assumed to be in scanner \verb{RAS} space, matching
#' the convention used when tract files are dropped onto the viewer.
#'
#' @section Colors:
#' A bundle takes the first color available from three sources:
#' \enumerate{
#'   \item the \code{color} argument, when not \code{NA};
#'   \item the optional table \code{'fs/streamline/colormap.csv'}, which uses the
#'     same format as the drag-and-drop color table, with a \code{'Filename'} and
#'     a \code{'Color'} column.  A \code{'Filename'} entry may be
#'     \code{'circuit/bundle'}, \code{'bundle'}, the bundle's bare file name (for
#'     a bundle stored in a sub-folder), or \code{'circuit/'} (the trailing slash
#'     marks a circuit-wide entry, which is how a whole circuit is painted one
#'     color); more specific entries win, and all comparisons ignore case and
#'     surrounding white spaces;
#'   \item otherwise a color derived from the bundle name itself, stable across
#'     sessions.
#' }
#'
#' The derived color ignores case, punctuation and the file extension, and folds
#' left/right markers together, so \code{'CST_left.tck'}, \code{'CST-Right'} and
#' \code{'cst right.trk'} all render in the same color.  A name whose last six
#' characters are hexadecimal digits spells out its own color, so a bundle called
#' \code{'CST_ff8800'} renders as \code{'#FF8800'}.
#'
#' Every bundle declared this way is downloaded and parsed by the browser when the
#' viewer starts, so avoid declaring more bundles than needed.
#'
#' @returns \code{add_streamline} returns the \code{brain} object, invisibly.
#' The underlying \code{brain$add_streamline} returns, invisibly, a named list of
#' the bundles it added, keyed by \code{'circuit/bundle'}.  That same key names
#' the bundle's visibility controller in the viewer, as
#' \code{'Show: circuit/bundle'}
#'
#' @examples
#'
#' # Requires a FreeSurfer directory containing `streamline/motor/AF_left.trk`
#' \dontrun{
#'
#' brain <- threeBrain(path = "/path/to/fs", subject_code = "subject")
#'
#' # circuit is "motor", bundle name is "AF_left"
#' add_streamline(brain, "motor/AF_left", color = "#ff8800")
#'
#' # the whole `motor` circuit, alternating two colors
#' add_streamline(brain, "motor/*", color = c("#ff8800", "#00ccff"))
#'
#' # only the `left` sub-folder of the same circuit
#' add_streamline(brain, "motor/left/*")
#'
#' # several keys at once; colors are recycled over the resulting bundles
#' add_streamline(brain, c("language/", "motor/CST_*"))
#'
#' # bundle keys double as controller names
#' brain$plot(controllers = list("Show: motor/left/AF" = FALSE))
#'
#' brain$streamline_types
#' brain$plot()
#'
#' }
#'
#' @export
add_streamline <- function(brain, name, color = NA) {
  re <- brain
  if ("multi-rave-brain" %in% class(brain)) {
    brain <- brain$template_object
  }
  brain$add_streamline(name = name, color = color)
  invisible(re)
}
