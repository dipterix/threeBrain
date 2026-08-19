
# Deterministic colors derived from a string, so the same name always yields the
# same color across sessions and machines. This mirrors the idea the JavaScript
# viewer uses for dropped files (`getColorFromFilename` / `randomColor`): hash a
# normalized name into a hue, keeping saturation and lightness within a band so
# the result stays legible against both light and dark backgrounds.

# Runs of non-alphanumeric characters collapse to a literal backspace. A file
# name may well contain `-` or `_`, but never a backspace, so it is a
# collision-free stand-in for a word boundary. That matters for the laterality
# rewrite below: `_` is a regex word character, so `\b` assertions never fire
# between `cst` and `left` in `cst_left`.
COLOR_KEY_SEPARATOR <- "\b"

#' @noRd
#' @description Normalize a string into a key suitable for hashing into a color.
#' Case, punctuation and file extensions are discarded, and left/right markers
#' are folded together so that homologous names share a color.
#' @param name character vector
#' @param strip_ext whether to drop everything after the first dot, which
#' removes any extension including multi-part ones such as \code{'trk.gz'}
string_color_key <- function(name, strip_ext = TRUE) {

  x <- as.character(name)
  x <- trimws(x)
  # basename first: a dot in a parent directory must not confuse `strip_ext`
  x <- basename(x)

  if (strip_ext) {
    x <- sub("\\..*$", "", x)
  }

  x <- tolower(x)

  # every run of non-alphanumerics becomes a word boundary
  x <- gsub("[^a-zA-Z0-9]+", COLOR_KEY_SEPARATOR, x)
  x <- gsub("^\x08+|\x08+$", "", x, perl = TRUE)

  # laterality-agnostic: `cst_left` and `cst_right` fold onto one key. The
  # look-ahead leaves the trailing separator unconsumed, so runs of laterality
  # tokens all get rewritten. `\x08` is the backspace: in a pattern `\b` would
  # mean word boundary.
  gsub("(^|\x08)(left|right|lh|rh|l|r)(?=$|\x08)", "\\1lh", x, perl = TRUE)

}

#' @noRd
#' @description Convert \code{'HSL'} to an upper-case \code{'#RRGGBB'} string by
#' way of \code{'HSV'}, so \code{\link[grDevices]{hsv}} does the actual work.
hsl_to_hex <- function(h, s, l) {
  v <- l + s * min(l, 1 - l)
  sv <- if (v <= 0) { 0 } else { 2 * (1 - l / v) }
  toupper(grDevices::hsv(h = h %% 1, s = sv, v = v))
}

#' @noRd
#' @description Derive a stable, legible color from a string.
#' @param name character vector of names
#' @param strip_ext passed to \code{string_color_key}
#' @param allow_hex when \code{TRUE}, a name whose key ends with six hexadecimal
#' digits is taken to spell out its own color, so \code{'CST_ff8800'} renders as
#' \code{'#FF8800'}
random_color_from_string <- function(name, strip_ext = TRUE, allow_hex = TRUE) {

  keys <- string_color_key(name, strip_ext = strip_ext)

  vapply(keys, function(key) {

    if (!nzchar(key)) { key <- "default" }

    # a name that ends by spelling out a color simply is that color
    if (allow_hex && nchar(key) >= 6) {
      tail6 <- substr(key, nchar(key) - 5L, nchar(key))
      if (grepl("^[0-9a-f]{6}$", tail6)) {
        return(toupper(sprintf("#%s", tail6)))
      }
    }

    hash <- digest::digest(key, algo = "murmur32", serialize = FALSE)
    # per byte: `strtoi` on all 8 digits overflows to NA
    bytes <- strtoi(substring(hash, c(1, 3, 5, 7), c(2, 4, 6, 8)), base = 16L)

    hsl_to_hex(
      h = (bytes[[1]] * 256 + bytes[[4]]) / 65536,
      # 60-100% saturation and 40-70% lightness keep lines off both extremes
      s = 0.6 + bytes[[2]] / 255 * 0.4,
      l = 0.4 + bytes[[3]] / 255 * 0.3
    )

  }, character(1L), USE.NAMES = FALSE)

}
