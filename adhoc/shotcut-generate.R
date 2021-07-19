s <- readLines('inst/js_raws/src/js/constants.js')
s <- s[startsWith(s, "CONSTANTS.KEY")]

m <- stringr::str_match(s, "^CONSTANTS\\.([A-Z_]+)[ ]*=[ ]*([^ ]+);[ ]*//[ ]*([^ ].*)$")

s <- readLines('inst/js_raws/src/js/constants.js')
s <- s[startsWith(s, "CONSTANTS.TOOL")]

k <- sapply(paste0('CONSTANTS.TOOLTIPS.', m[,2], " "), function(x){
  stringr::str_split_fixed(s[startsWith(s, x)][[1]], "=", 2)
})[2,]
k <- stringr::str_remove_all(k, r"(["'; ])")

tbl <- knitr::kable(data.frame(
  #Key = sprintf('`%s`', k),
  Name = m[,3],
  Description = m[,4],
  "Internal Flag" = m[,2],
  check.names = FALSE
))

s <- sprintf(r"(# 3D Brain Viewer Shortcuts

%s

* The shortcut keys are only active when the mouse is on the main canvas (not controling GUI nor the side panel)
* Hold `Ctrl`, `Shift`, or `Alt` and drag the brain if you want to fix the rotation axis
* If you are using *MacOSX*, `Alt` key is equivalent to `Option [⌥]`, and `Ctrl` is equivalent to `Control [^]`
)", paste(as.character(tbl), collapse = '\n'))

writeLines(s, 'shortcuts.md')
