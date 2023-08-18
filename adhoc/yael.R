# DIPSAUS DEBUG START
n27_path <- "/Users/dipterix/Dropbox (PennNeurosurgery)/BeauchampLabAtPenn/Electrode_Localization_Paper/Code/N27"
atlas_idx <- c(17,18,53,1021,1023,1027,1034,1035,2001,2005,2027)
atlad_idx2 <- NULL #c(17,53,1001,1015,1030,2001,2015,2030)
brain <- raveio::rave_brain("YAEL/N27", surfaces = atlad_idx2)

electrodes <- brain$electrodes$raw_table
odr <- order(electrodes$FSIndex)
keys <- unique(electrodes$FSIndex[odr])
levels <- unique(electrodes$FSLabel[odr])
pal <- sapply(threeBrain::freesurfer_lut$from_key(keys, label_only = FALSE), function(x) {
  rgb(maxColorValue = 255, red = x$R, green = x$G, blue = x$B)
})
pal <- c(pal)

electrodes$FSLabel <- factor(electrodes$FSLabel, levels = levels)

epileptogenic <- rep("None", nrow(electrodes))
epileptogenic[119:124] <- "Motor"
epileptogenic[c(47:54, 113,114)] <- "Eloquent"
epileptogenic[49:53] <- "Epileptogenic"
epileptogenic[51:52] <- "SeizureOnset"
electrodes$Epileptogenic <- factor(epileptogenic, levels = c("SeizureOnset", "Epileptogenic", "Eloquent", "Motor", "None"))

response <- rnorm(nrow(electrodes), sd = 0.2)
response[50:54] <- response[50:54] + c(1.6, 1.5, 1.8, 2.1, 2.4)
response[96:100] <- response[96:100] + c(1.1, 1.6, 1.5, 2.3, 2.5)
response[26:30] <- response[26:30] + c(-0.5, -1.2, -0.7, -1.3, -1.8)
electrodes$Response <- response

brain$set_electrode_values(electrodes)
palettes = list(
  FSLabel = pal,
  Epileptogenic = c("red", "orange", "yellow4", "steelblue2", "black"),
  Response = ravebuiltins::get_heatmap_palette('PinkWhiteGreen')
)
brain$plot(
  palettes = palettes
)
# B|D|H|

var <- "Epileptogenic"
lvl <- levels(electrodes[[var]])
col <- palettes[[var]][seq_along(lvl)]
plot(1:2, type = 'n', main = '', axes = FALSE, xlab = "", ylab = "")
legend(
  "center",
  lvl, col = col, border = FALSE, bty = "n", box.col = col, fill = col
)


# load rave 3D viewer

## Run the following commented code to install library (if missing)
# install.packages("threeBrain")
n27_path <- "/Users/dipterix/Dropbox (PennNeurosurgery)/BeauchampLabAtPenn/Electrode_Localization_Paper/Code/N27"
controllers = list("Display Data" = "Fake")

atlas_idx <- c(18,54,1035,2035,1026,1002,1023,1010,2026,2002,2023,2010)

# Set working directory

# Read table
load_table <- function(fname){
  tbl <- read.csv(file.path("~/Dropbox (Personal)//projects/kelly_bijanki/cingulate-insula/", fname),
                  stringsAsFactors = FALSE)
  nms <- names(tbl)
  nms[nms == 'X'] <- 'Coord_x'
  nms[nms == 'Y'] <- 'Coord_y'
  nms[nms == 'Z'] <- 'Coord_z'

  names(tbl) <- nms
  tbl$ActualSubject <- tbl$Subject
  tbl$Subject <- "N27"
  tbl$Electrode <- seq_len(nrow(tbl))

  tbl$Label <- sprintf("(%s-%s, %s-%s)", tbl$ActualSubject, tbl$ChanNum, tbl$Location, tbl$Matter)
  tbl$MNI305_x <- tbl$Coord_x
  tbl$MNI305_y <- tbl$Coord_y
  tbl$MNI305_z <- tbl$Coord_z

  tbl
}

# tbl <- read.csv("./cingulateSummaryCorr.csv")
# tbl2 <- read.csv("insulaSummaryCorr.csv")

# cingulateSummaryCorr.csv
tbl1 <- load_table("insulaSummaryCorr.csv")
tbl2 <- load_table("cingulateSummaryCorr.csv")
tbl <- data.table::rbindlist(list(tbl1, tbl2), use.names = TRUE)
es <- dipsaus::parse_svec("33,32,5,4,2,1,34,46,63-64,78,79,80,66-70,61,95,81,96,109,110,94,93,92,72,73,74,89-92,114-117,111-113,87,60,65")
weak <- dipsaus::parse_svec("33,32,5,4,2,1,34,46")
tbl <- tbl[tbl$Electrode %in% es,]

brain <- threeBrain::threeBrain(
  path = n27_path, subject_code = "N27",
  surface_types = atlas_idx
)

tbl$Fake <- rnorm(n = nrow(tbl), mean = tbl$Coord_y - tbl$Coord_y[tbl$Electrode == 79], sd = 4)
tbl$Fake[tbl$Electrode %in% weak] <- rnorm(n = length(weak), sd = 4)
tbl$Fake <- abs(tbl$Fake)
brain$set_electrodes(tbl)
brain$set_electrode_values(tbl)

brain$plot(
  controllers = list(
    "Subcortical Surface" = "right",
    "Overlay Sagittal" = TRUE,
    "Map Electrodes" = TRUE,
    "Display Data" = "Fake"
  ),
  palettes = list(
    Fake = ravebuiltins::get_heatmap_palette("Spectral")
  )
)




# app = global_cache._d.get([...global_cache._d.keys()][0]);
# canvas = app.canvas
# els = canvas.electrodes.get("N27");
# e = els["N27, 96 - (YDI-43, INS-GM)"]
# for(let k in els) {
#   e = els[k];
#   e.material.depthTest = true
#   e.material.depthWrite = true
#   e.material.depthFunc = THREE.AlwaysDepth
#   e.position.x = 50
# }






