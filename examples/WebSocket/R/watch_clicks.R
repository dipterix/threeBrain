# Prints what the user clicks in a connected viewer.
#
#   cd examples/WebSocket/R
#   Rscript watch_clicks.R          # until Ctrl+C
#   Rscript watch_clicks.R 60       # for 60 seconds

source("hub_client.R")

args <- commandArgs(trailingOnly = TRUE)
seconds <- if (length(args)) as.numeric(args[1]) else Inf

hub <- hub_connect()
hub$subscribe("mouse_clicked", function(event) {
  clicked <- event$value
  if (isTRUE(clicked$is_electrode)) {
    cat(sprintf("[%s] contact %s of %s at tkrRAS (%s)\n", event$source,
                clicked$electrode_number, clicked$subject,
                paste(round(unlist(clicked$position), 1), collapse = ", ")))
  } else {
    cat(sprintf("[%s] %s\n", event$source, clicked$name))
  }
  flush.console()
})

cat("Click something in the viewer",
    if (is.finite(seconds)) sprintf("(watching for %g s)\n", seconds) else "(Ctrl+C to stop)\n")
flush.console()
hub$listen(seconds)
hub$close()
