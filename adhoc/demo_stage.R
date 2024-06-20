# script to generate demo stages

# run in console:
'
JSON.stringify(app.controllerGUI.controllersRecursive().map(c => {
  return({name: c._name, value: c.getValue()})
}))
'


json <- '[{"name":"Background Color","value":"#faf7f4"},{"name":"Camera Position","value":"[free rotate]"},{"name":"Display Coordinates","value":false},{"name":"Record","value":false},{"name":"Screenshot"},{"name":"Download GLTF"},{"name":"Reset Canvas"},{"name":"Copy Controller State"},{"name":"Paste to Set State","value":""},{"name":"QR Code"},{"name":"Show Panels","value":false},{"name":"Slice Brightness","value":0},{"name":"Slice Contrast","value":0},{"name":"Slice Mode","value":"canonical"},{"name":"Crosshair Gap","value":0},{"name":"Reset Slice Canvas"},{"name":"Coronal (P - A)","value":0},{"name":"Axial (I - S)","value":0},{"name":"Sagittal (L - R)","value":0},{"name":"Intersect MNI305","value":"-1.4, -18.5, 17.7"},{"name":"Overlay Coronal","value":true},{"name":"Overlay Axial","value":true},{"name":"Overlay Sagittal","value":true},{"name":"Frustum Near","value":5},{"name":"Frustum Far","value":10},{"name":"Voxel Type","value":"none"},{"name":"Voxel Display","value":"anat. slices"},{"name":"Voxel Opacity","value":1},{"name":"Voxel Min","value":-100000},{"name":"Voxel Max","value":100000},{"name":"Voxel Label","value":"1035,3035,1034,3034,1001,1030,3030,2015,2009"},{"name":"ISO Surface","value":false},{"name":"Update ISO Surface"},{"name":"Surface Material","value":"MeshPhysicalMaterial"},{"name":"Surface Type","value":"pial"},{"name":"Clipping Plane","value":"disabled"},{"name":"Left Hemisphere","value":"mesh clipping x 0.3"},{"name":"Right Hemisphere","value":"mesh clipping x 0.3"},{"name":"Left Opacity","value":0.39999999999999997},{"name":"Right Opacity","value":0.39999999999999997},{"name":"Left Mesh Clipping","value":0.20000000000000004},{"name":"Right Mesh Clipping","value":0.20000000000000004},{"name":"Surface Color","value":"none"},{"name":"Blend Factor","value":1},{"name":"Sigma","value":1},{"name":"Decay","value":0.6},{"name":"Range Limit","value":5},{"name":"Subject","value":"cvs_avg35_inMNI152"},{"name":"Map Electrodes","value":true},{"name":"Surface Mapping","value":"sphere.reg"},{"name":"Volume Mapping","value":"mni305"},{"name":"Visibility","value":"all visible"},{"name":"Electrode Shape","value":"prototype+sphere"},{"name":"Outlines","value":"auto"},{"name":"Translucent","value":"contact+outline"},{"name":"Text Scale","value":1.5},{"name":"Text Visibility","value":false},{"name":"Dragdrop Uploader"},{"name":"Clear Uploaded Surfaces"},{"name":"Visibility (all surfaces)","value":"visible"},{"name":"Opacity (all surfaces)","value":1},{"name":"Clear Uploaded Volumes"},{"name":"Visibility (all volumes)","value":"visible"},{"name":"Opacity (all volumes)","value":1},{"name":"Display Data","value":"LabelPrefix"},{"name":"Display Range","value":""},{"name":"Threshold Data","value":"[None]"},{"name":"Threshold Range","value":""},{"name":"Threshold Method","value":"|v| >= T1"},{"name":"Additional Data","value":"[None]"},{"name":"Inactive Color","value":"#c2c2c2"},{"name":"Play/Pause","value":false},{"name":"Speed","value":0.5},{"name":"Time","value":0},{"name":"Video Mode","value":"muted"},{"name":"Show Legend","value":false},{"name":"Show Time","value":false},{"name":"Highlight Box","value":false},{"name":"Info Text","value":false}]'

ignore_names <- c("Time", "Play/Pause", "Speed", "Subject", "Surface Mapping",
                  "Volume Mapping", "Surface Material", "Intersect MNI305",
                  "Camera Position", "Record", "Paste to Set State", "Background Color",
                  "Map Electrodes", "Video Mode")
on_completion_names <- c(
  # "Overlay Coronal", "Overlay Axial", "Overlay Sagittal"
)
data <- jsonlite::fromJSON(txt = json, flatten = FALSE, simplifyDataFrame = FALSE)
data <- data[ vapply(data, function(item) { length(item$value) && !is.na(item$value) && !item$name %in% ignore_names }, FALSE) ]
is_transition <- sapply(data, function(item) { is.numeric(item$value) || startsWith(as.character(item$value), "#")})
is_post_completion <- sapply(data, function(item) { item$name %in% on_completion_names })

s <- jsonlite::toJSON(list(
  immediate = data[!is_transition & !is_post_completion],
  transition = data[is_transition & !is_post_completion],
  onCompletion = data[is_post_completion]
), auto_unbox = TRUE, pretty = FALSE)

clipr::write_clip(s)
