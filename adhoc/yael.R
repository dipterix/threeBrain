# DIPSAUS DEBUG START
n27_path <- "/Users/dipterix/Dropbox (PennNeurosurgery)/BeauchampLabAtPenn/Electrode_Localization_Paper/Code/N27"
atlas_idx <- c(17,18,53,1021,1023,1027,1034,1035,2001,2005,2027)
atlad_idx2 <- c(17,53,1001,1015,1030,2001,2015,2030)


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
  palettes = palettes,
  controllers = list(
    "Background Color" = "#000000",
    'Display Data' = "LabelPrefix",
    'Subcortical Surface' = "right",
    'Right Opacity' = 0.2,
    # 'Voxel Type' = "aparc_aseg",
    "Sagittal (L - R)" = -25,
    "Overlay Axial" = TRUE
  ),
  qrcode = list(text = "", url = "https://dipterix.org/assets/3dviewer/demos/simple-demo.html"),
  title = "Make with RAVE - https://rave.wiki",
  custom_javascript = '
controlCenter.gui.openFolder("Default");
const ctrl = controlCenter.gui.getController("Paste to Set State");
ctrl.setValue(\'{"isThreeBrainControllerData":true,"controllerData":{"controllers":{},"folders":{"Default":{"controllers":{"Background Color":"#000000","Camera Position":"[free rotate]","Display Coordinates":true,"Record":false,"Paste to Set State":""},"folders":{}},"Volume Settings":{"controllers":{"Show Panels":true,"Slice Brightness":0,"Slice Mode":"canonical","Coronal (P - A)":0,"Axial (I - S)":-30,"Sagittal (L - R)":-25,"Intersect MNI305":"-23.7, -19.7, -11.7","Overlay Coronal":false,"Overlay Axial":true,"Overlay Sagittal":false,"Render Distance":0.4,"Voxel Type":"aparc_aseg","Voxel Display":"hidden","Voxel Opacity":0,"Voxel Min":-100000,"Voxel Max":100000,"Voxel Label":""},"folders":{}},"Surface Settings":{"controllers":{"Surface Material":"MeshPhysicalMaterial","Surface Type":"pial","Left Hemisphere":"normal","Right Hemisphere":"normal","Left Opacity":1,"Right Opacity":1,"Left Mesh Clipping":1,"Right Mesh Clipping":0.1,"Subcortical Surface":"right","Sub-Left Opacity":1,"Sub-Right Opacity":1,"Surface Color":"none","Blend Factor":1,"Sigma":1,"Decay":0.6,"Range Limit":5},"folders":{}},"Electrode Settings":{"controllers":{"Subject":"N27","Map Electrodes":false,"Surface Mapping":"sphere.reg","Volume Mapping":"mni305","Visibility":"all visible","Outlines":"auto","Text Scale":1.5,"Text Visibility":false},"folders":{}},"Data Visualization":{"controllers":{"Display Data":"LabelPrefix","Display Range":"","Threshold Data":"[None]","Threshold Range":"","Threshold Method":"|v| >= T1","Additional Data":"[None]","Play/Pause":false,"Speed":1,"Time":0,"Video Mode":"muted","Show Legend":true,"Show Time":true,"Highlight Box":true,"Info Text":true},"folders":{}}}},"sliceCrosshair":{"tkrRAS":"-23.70, -19.74, -11.67","scannerRAS":"-23.20, -37.24, 6.83","mni305RAS":"-22.64, -37.94, 5.29","mni152RAS":"-22.25, -36.77, 7.10"},"cameraState":{"target":{"x":-0.5699806213378906,"y":0.38562774658203125,"z":-3.507568359375},"up":{"x":0.0236866337490742,"y":0.5619081670291239,"z":0.8268604206319259},"position":{"x":9.869996858575208,"y":-411.7104766895651,"z":280.4828625050687},"zoom":1.1227083224406342}}\');
',
  debug = FALSE
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






