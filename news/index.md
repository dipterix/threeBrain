# Changelog

## threeBrain 1.4.0

Volume Rendering Improvements:

- Added precomputed gradient textures for faster normal calculation
  during volume rendering
- Implemented 3D `Sobel` filter for computing gradients on both
  continuous (MRI) and discrete (atlas parcellation) volume data
- Added `MatCap` (Material Capture) texture-based lighting for improved
  visual quality of volumetric surfaces
- Introduced gradient-based opacity modulation for continuous data
  visualization
- Added adaptive fast-pass empty space skipping with ray-angle-aware
  step sizing for improved rendering performance
- Added slice material instead of `RawMaterial` to wrap up changes to
  the `uniforms`
- Rewrote slice sampling method (super-sampling rather than completely
  linear interpolation) to improve the user experience when inspecting
  MRI slices
- Added outline mode for discrete overlays
- Added slice threshold, a user controller to strip the skulls
- Volume slice masks work even when orientation and dimensions are
  different
- Improved lazy rendering so the canvas does not forces the `GPU` to
  render unless there is a need to

Worker Thread Infrastructure:

- Added `invokeWorker()` method to `ViewerApp` for unified worker thread
  dispatch with fallback support
- Added `ArrayBuffer` transferable support for zero-copy data transfer
  between main thread and workers
- Registered `computeVolumeGradients` as a worker-callable function for
  offloading heavy gradient computation
- Better fallback method for workers who don’t get new job spawned
- Worker spawn is throttled

Shader Optimizations:

- Converted `colorChannels` and `dithering` uniforms to compile-time
  shader defines for better GPU performance
- Added `USE_GRADIENT_MAP` and `SINGLE_CHANNEL` shader variants for
  optimized code paths
- Implemented two-sided lighting with proper view-space normal
  correction

Engine Updates:

- Upgraded `three.js` engine to `r182`
- Removed `jsm` folder; optimized electrode shader to calculate inverse
  `modelViewProjection` in JavaScript rather than vertex-shader

Streamline Visualization:

- Added support for `tt` streamline format
- Fixed `trk` format; supported `tck` format (drag and drop)
- Use `KDTree` to query the streamlines that intersect the target volume
- Streamlines have better memory management with random shuffle
- In highlight mode faded streamline widths can be adjusted

Minor Changes:

- Automatically download template subject when `merge_brain` is called
  but the subject is missing
- Electrode transparency is improved when visualized as geometry
- Using physical/standard materials for electrode prototype geometries
- Allowed electrode prototype transforms to be rigid when mapping to
  template
- Removed `raveio` from comments and using scanner RAS for slices
- Added `fsaverage_inCIT168` template
- Added `radiographic` view
- Added global ruler next to compass
- Added `read_colormap` to support reading from `RAVE` (`JSON`) or
  `ITK-SNAP` format
- Mask is now applied to slice overlays
- Use `MeshBasicMaterial` when rendering sphere electrodes for better
  performance
- Updated `BlueRed` color palette to match with the `ravebuiltins` color
- Removed obsolete `freesurfer_brain` and embrace the new universal
  interface `threeBrain`
- Added `render` method for template brain for remembering the states in
  shiny applications
- `merge_brain` also gains new argument `electrode_priority` to control
  the priority when setting electrode shape
- Added pseudo random generator
- Native annotation from template supports `FreeSurfer` `curv` file too
- Surface mapping is more robust even if the hemisphere is unset: using
  `MNI152` R-axis to infer the hemisphere instead
- Added `YBA` atlas color-map

Electrode Localization:

- Added “interpolate without refine” option for electrode localization,
  if the users prefer
- Added support for multiple electrodes

New Experimental Electrode Prototypes:

- Added `PMT-2102-16-099` specifications
- Added `BF09R-SP51X-0BB` specifications
- Added `RD16R-SP03/05X` (`AdTech`) specifications
- Added `DIXI-MM08` electrode specifications
- Added `Behnke-Fried` electrode specifications
- Added `NeuroOne/Zimmer` electrode specifications

Drag and Drop Improvements:

- Drag and drop is handled by file-system API or `WebKit` before
  fallback to naive approaches to support dropping in folders
- Drag drop supports folders now
- The default colors for dropped objects are determined by their file
  names to avoid random colors
- Drag-and-dropped files now generate consistent default colors and
  ignores the left-right keywords
- Fixed drag and drop multiple files issue
- Fixed drag and drop color key length issue
- Added try-catch to handle file processing errors to avoid stopping
  processing files

Bug Fixes:

- Suppressed rendering flags when the trackball is inactive, fixing the
  rendering policy

## threeBrain 1.3.0

- Ray-caster with ruler now works on surfaces derived from volumes
- Fixed volume value range issue: instead of using `cal_min` and
  `cal_max`, always calculate the data minimum and maximum instead.
- Updated `jspdf` version
- Ruler supports multiple segments and displays segment lengths and
  angles for adjacent segments
- Minor edits on ruler
- Make sure the ruler does not automatically disappear unless pressing
  “R” key
- Added ruler helper
- Fixed template brain argument issue when template `atlas` and
  `annotation` types are not specified explicitly
- Supported dynamic color-map (value range) for continuous surfaces and
  volumes; supported showing additional volume components (such as time
  component in `fMRI`)
- Added prototype geometries for `AdTech-SD16R-AP0?X`
- Fixed color palette offset issue; Supported dropping color map for
  electrode contacts
- Handles infinite electrode numbers
- Fixed bugs drag & drop electrode data type: the electrodes with
  missing data will be reset, and the color palettes for existing data
  will be kept
- Fixed `GLB` format issue
- Minor change on the error message
- Multi-brain template passes extra arguments to template object
  constructor
- Function `threeBrain` does not automatically download templates if
  annotation is not found
- Disable downloading files in `WASM` by default to avoid triggering
  `CORS` condition that will terminate the program
- rewrote drag & drop code so its framework can be easily extended;
  surface color handlers now handle measurements and annotations
  different, with separate storage
- Added `FileDataHandler` classes to handle drag & drop files; supported
  drop-in electrode coordinate files
- `GIfTI` reader now respect the transforms if there exists a transform
  with target space to be the `scanner_anat`
- Allows continuous data cube to change color map
- `add_annotation` automatically compiles annotations from template if
  missing
- Fixing the side panels so the background color is always black
- Canvas and screenshot is transparent when background is `#ffffff`
- Fixed `shader` ignoring always-depth flag when outline is off; updated
  `jsPDF` to the 2.5.2 build
- Transition animation allows video recording
- Fixed screenshot button and improved video quality
- Fixed sub-cortical `ROI` matrices
- Added surface coordinate for cross-hair
- Fixed get controller state function; added stage transition, allowing
  users to create animations from key states
- Using “color” instead of separated `color` and `underlayColor`
  attributes for surface underlay
- Supported visualizing surface annotations; surface colors are synced
  to the electrode colors if the names are consistent; re-wrote the
  surface `shader` to support under- and over-lay colors
- Updated `SurfaceShader` to use morph normal and transformed positions
- Load other common surfaces by default
- Switching subject surface types will trigger morph if the number of
  vertex nodes are the same
- Allow animation presets to be shown even when data is not available;
  added keyboard shortcut to sync data threshold with display; added
  hidden features that are experimental; `crosshair` position is changed
  to scanner`RAS` and `Affine MNI152`; added `tooltip` title support for
  controllers; added global clock for app; updated `ViewerCanvas`
  constructor arguments; supported `useMorphTarget` for surface objects
- Fixed electrode `useMatrix` when contacts are represented as spheres
- Fixed template mapping, supported non-linear mapping for electrode
  geometries

## threeBrain 1.2.0

CRAN release: 2024-11-07

- Fixed shiny callback when electrode contacts are double-clicked
- Fixed contact-switching and highlight box
- Added `PMT` electrodes
- Fixed non-integer search radius issue
- Adjust electrode position can be done under volume-mode to improve
  user experience
- Electrodes with prototype geometries will use the prototype to infer
  the locations rather than spacial calculation
- Added keyboard shortcut for registering from cross-hair
- Added `get_atlas_values` for continuous atlases such as binary or
  probabilistic `ROI`
- The radius refers to maximum `RAS` distance instead of `voxel`
  indexing distance, hence more accurate when the atlas volume has
  imbalanced slice count
- Renamed `active-voxel` to `column-row-slice` but still keep the naming
  for backward compatibility
- `Voxel` filter is linear now when displayed at side slices only and
  when the slice mode is not `active-voxel`
- Fixed drifting issue when visualizing via active `voxel` mode
- Added direction arrow helper to `DBS` (or electrodes with non-zero
  model up vectors)
- Support `WebAssembly`
- Avoid using `pandoc` to save the whole page self-contained
- Fixed the depth issue in electrode material shader
- Set maximum render length cut-off for electrode prototypes
- Added model tangent (usually the direction) to electrode shader so
  outlines are correctly visualized
- Fixed electrode prototype rendering issue (color) on Windows
- Fixed the color map for discrete values
- Setting electrode prototype render order to be `-500` so it does not
  hide behind the transparent surfaces
- Plotting electrodes on slices now takes numerical `adjust_brightness`
  interpreted as quantile
- Changed default color palette for discrete values, removed colors that
  are too dark or gray
- Change `CT` threshold back to positive (3000) when switching from
  `DBS` leads back to `sEEG` leads.
- Support drag and drop annotation files
- Changed electrode material to display front-side only instead of
  double side to avoid overlapping contacts visually when spacing is
  small
- Added `Abbott` segmented electrodes `6170-6173`, with segmented
  electrodes clockwise viewing from `proximal` end
- Fixed a bug that may change electrode coordinate hand
- All the `DBS` electrode prototype maker uses natural `cos` for `x` and
  `sin` for `y`. However, this will cause electrodes to rely on
  rendering on back side (material)
- Added missing prototype
- Fixed `BSC` and `Medtronic` electrode orientation (now is
  counter-clockwise when viewing from `proximal` end)
- Added more spacing for `DBS` segmented contacts
- added prototypes for `Medtronic` segmented electrodes
- Added `BSC-DB` electrodes for `2202` `2201`
- Added internal test code for depth mapping
- Surface mapping has been implemented for depth electrodes, with
  dynamic offset threshold
- `surface_offset` has been added to electrode field
- `cvs_avg35_inMNI152` has the correct `talXFM` (scanner to `MNI305`)
  now
- Added `load_mesh` to surface object so users can load surface mesh for
  computation in `R`
- Added internal `calculate_distances` to compute the distances from a
  point to its projection to a list of mesh
- `DistanceShifted` in electrode table is taken into account and will be
  passed to electrode instances
- Inflated surfaces have offset by default
- Fixed a singular matrix bug when the electrode prototype `up` vector
  is zero or is parallel with the model direction
- Allowed the surface mapped electrodes to be snapped to the surface if
  the surface world matrix is not identity
- Force the inflated brain to have offset positions
- Added `DBS` electrode prototype `BSC-DB-2202`
- Prototype `set_transform_from_points` now tries to set rotation from
  transform `Euler` angle when the prototype guided marker is 1-ranked
  (electrode strip, `DBS` electrodes)
- Allowed electrode prototype to display markers; added viewer options
  for localization
- Changed electrode direction helper to be displayed inside of
  cross-hair group
- Allowed side panel to be displayed with atlas column-row-slice
- Added controller to display symmetric continuous color map for volumes
- Fixed the `GLTF` not showing inner-most contact issue
- Removed `devel` version of `ravetools` from check
- Update `Github` action check script
- Added `rhub` check
- Plotting slices have correct margins with partial plot
- Allow users to drag and drop value tables
- Allow users to hide cross-hairs
- Allow `shiny` app to change current color map via proxy
- Allows drag-drop electrode color files
- Added `set_electrode_data` to brain proxy class, allowing `shiny`
  applications to change the electrode data, set color palettes, and set
  value ranges in the same call
- Allow masks to be added to `T1`
- Added `D99v2` for monkey brain
- Export `GLTF` for `datacube2`
- Fixed `fix_electrode_color` bug
- Supported `ISO` surface generation from volume
- Added white-matter segmentation as default atlas if user has this file
- Exporting `GLTF` is wrapped with try-catch
- `fix_electrode_color` is exclusive by default
- fixed color fixing issue for naive sphere electrodes
- Changed logo message
- Using better `RAVE` logo and fixed style issues
- Changed shortcut `p` to toggling the visibility and `shift+p` to
  switching surface types
- Added logo to control panel to advertise the project
- Added export `GLTF` binary format
- Separate `3D` and `2D` canvas;
- Converts `*h.pial.gii` to `FreeSurfer` format when the files are
  missing
- Allow electrode depth test to be disabled (always-depth) on contact
  and/or outlines
- Fixing the vertex shader output not read by fragment shader issue
- Drop-in feature support color-map for volume and surfaces
- Added contact order to display when electrode is clicked
- Added `DIXI` (`AM`, `BM`, `CM`) electrode specifications

## threeBrain 1.1.0

### Major Changes

- `threejs` engine is upgraded to `v160`; added support for `NIfTI` and
  `GIfTI` images
- Allowed data to be embedded with viewer as `dataURI`. This results in
  a truly standalone viewer: no extra engine required, only web-browser
  is needed.
- Added electrode geometry prototype, allowing users to see the
  electrode rather than using spheres, useful for electrodes with super
  micro contacts or electrodes with segmented contact like `DBS`
- Added support for showing (cortical or sub-cortical) `ROI` surfaces
- Implemented drag-and-drop feature to drop arbitrary volume (`nii,mgz`)
  or surface (`fs,gii`) files to the viewer. The surface coordinate
  system is inferred from file name following `BIDS` convention. The
  surface color can be set via a color-map (`csv`) or in the file name
- Implemented slice (in side viewer) overlay
- Users can control side camera `frustums` (near and far) separately
- Implemented worker system so the viewer can run truly parallel code in
  the background
- Added `snap-to-electrode` and `line-of-sight` mode in addition to
  canonical anatomical slices.
  - Under `line-of-sight` mode, the underlay image will be sliced
    dynamically with a plane orthogonal to the line of sight; two other
    (orthogonal) planes parallel to the line of sight
  - Under `snap-to-electrode`, the volume slices will be snapped to
    electrode direction (only available when electrode prototype is used
    and electrode direction defined). The other two planes will
    dynamically slice the `MRI`
- Users can localize an electrode probe by clicking on the target
  location, then entry location
- Added an option to add `QR` code to the viewer, allowing people to
  link to the publication
- Loading progress is more informative now
- Implemented `plot_slices` to allow plotting `MRI` slices for each
  contact in canonical order
- Users can set default colors to electrodes via
  `brain$electrodes$fix_electrode_color`
- Users can override underlay images by placing `rave_slices.nii[.gz]`
  under the `mri/` in `FreeSurfer` folder
- File/Data loaders use `JavaScript` workers now (can be disabled with
  `enable_cache=TRUE`)
- Added mesh clipping to see depth electrodes without compromising color
- Implemented volume clipping
- Added new mode for `ACPC` alignment
- Added `target` flag so objects can be rendered differently on main
  canvas versus side canvas

### Minor changes

- Electrode prototype names follow `type-company-version.json` format
- Added compass object to side cameras when slice mode is not canonical
- Remove `UV` mapping on sphere electrodes
- Added model up direction to electrodes to assist calculating Euler
  axis and angles
- Volume, atlas threshold is asynchronous now
- Changed default values of some controller
- Added `broadcast()` to more controllers;
- Atlas key number is displayed so users no longer need to search for
  look-up table
- Added debug flag with keyboard shortcuts
- Viewer finally compiles with `quarto/rmarkdown`
- Implemented functions to create `sEEG` electrodes
- Slices does not write to depth buffer when rendered in side canvas, so
  electrode contacts are not blocked
- Allowed anchor to be fixed when localizing with electrode prototype
- Using `instancedMesh` to render actual electrode spheres when
  prototype is used and users choose to see the actual contact locations
- Implemented `mapToTemplate` for electrode prototypes
- `Pial` surface does not write to depth buffer when it’s super
  transparent
- Added drivers to set object transform matrix
- Adjust the implementation of background color and `arcball` radius
- Removed composer effects, using `shaders` to render electrode outline
- Trackball uses longer side of the canvas instead of shorter side as
  radius
- Added electrode visibility mode: use `threshold-only` to show contacts
  that pass threshold even no display value is given
- Overlay brightness can be adjusted via controller
- Adjusted title position
- Updated `CITATION`
- New color map is used for electrodes to be consistent with `RAVE`
  color
- Allow adding additional geometries in `brain$plot`
- Improved spacing for interpolation and extrapolation (electrode
  localization); removed old interpolation logic; added `distanceRatio`
  to prevent large shift (auto adjust)
- Electrodes are opaque on main but transparent on side canvas
- Using `pial` surface center as trackball center
- Dithering the `datacube2` to make rendering more natural on main
  canvas
- By default set `MRI` slices visible when surfaces are missing
- Drag & drop file names is sanitized to avoid displaying issues
- Electrode contacts (`instancedMesh`) are now click-able
- `dispose` is cleaner now, it also fires events
- Added `makeClickable` and `removeClickable` to replace previous
  `add_clickable` function
- Renamed `register_object` to `registerToMap`
- Better ways to sanitize `datacube`
- Improved `datacube` overlay texture, including using `clamp-to-border`
  instead `clamp-to-edge`
- Ray-casting electrode prototypes with `instancedMesh` now works under
  `contact-only` mode
- Show electrode prototype with contacts by default
- Added color modes for uploaded images
- removed `normalize` method (replaced by `getNormalizedImage`) from
  `NiftiImage` and `MGHImage`
- Using script to generate change log automatically from Git commits
- Scrolling on side canvas is faster now
- Allowed prototype contact colors to be fixed
- Prototype control points displays channel information (provided
  control points are channels) Added color (`randomColor`,
  `testColorString`) and file-name utility functions
- Soft removed `addColorCoat` and using `ElectrodeMaterial`, this
  results in massive code improvement in electrode instance
- Allow to set default electrode colors if a contact is not rendered
  with values nor fixed color
- Scrolling on side canvas is faster now
- Color look-up table can be set with arbitrary single color (in
  `HexString`, indicating that all values should be rendered with such
  color; Drag & Drop volumes can change to single colors
- Remembers the state when switching volumes (`datacube2`)

### Bug fixes

- Fixed `NamedLut` color error when a value range is zero
- Prototype electrode click information displays the channel number
- Fixed `RShinyDriver` issue when object does not have construction
  parameters (using `getThreeBrainInstance` instead)
- Avoid rendering volume data to sub-cortical `ROI`
- Fixed UV issues in electrode geometry prototypes
- Fixed a bug when slice instance is missing but controller tries to set
  overlay
- `JavaScript` map is hidden when compiled so browsers will not complain
  about missing maps
- Significantly reduced the chances of viewer crash under R shiny
  applications
- Fixed a `shader` crash issue on `Windows`
- `WebGL2` is the hard requirement now; users will be notified if this
  requirement is not met
- Mouse position in the canvas is calculated every mouse down instead of
  every resizing to fix the control issues when page is scrolled in
  shiny app
- Fixed `controller.load` to handle invalid set controller request
- Fixed `textsprite` depth issues
- Fixed light under new engine
- Fixed visualization of volume cubes when using `NIfTI` files
- Fixed volume transforms when `sform` and `qform` are inconsistent in
  `NIfTI`
- Fixed a bug in interpolation with spacing
- fixed incorrect `ROI` label
- `as_subcortical_label` generates correct white-matter labels
- Fixed `freesurfer_lut`
- Fixed `auto-adjust` feature (electrode localization)
- Fixed `UV` mapping issue in sphere electrode geometry
- Fixed `shader` issue when transparency is set to negative (treated as
  1)
- Using `NIfTI` headers to get calculated color intensities before
  applying heuristic approach

## threeBrain 1.0.2

- Removed a `shader` loop that accidentally used dynamic variable for
  looping, which may crash on `Windows` in certain situations
- Updated `README.md`
- Composer effects are removed
- Added default color to electrodes (JavaScript) to fix the localization
  electrode color not set correctly issues
- Added `z-index` base to the side canvas layer (`div`)
- Removed additional unused parameters from material call
- Used new material type to make brain more realistic
- New background color is implemented
- `Trackball` uses width instead of height of the viewer as the
  `Arcball` radius; mouse positions is calculated whenever mouse-down
  event is triggered (allowing more accurate track-ball calculation in
  `Shiny` applications)
- Made `col2hexstr` internal function
- Added a new electrode visibility mode, allowing to show contacts with
  no values but passing the threshold
- Added `brain$electrodes$fix_electrode_color` to fix the electrode
  colors under given data names (to display `DBS` electrodes, for
  example)
- Made `controller.load` more robust against errors
- Fixed the depth issue in `TextSprite`
- Some default controller values have changed to make more sense
- Outline render effect is removed; electrode outlines are implemented
  directly in the `shader`
- Updated `three.js` to `v160` with light model improved
- Added `rave_slices.nii` to allowed `MRI` prefix in `FreeSurfer` folder
  with highest priority, such that this image will be treated as default
  volume to load in side canvas (default is still
  `brain.finalsurfs.mgz`)
- Allow `MRI` to change brightness dynamically in viewer
- Ensure that `voxels` index from zeros
- Added `brain$get_atlas_labels` to guess the atlas labels from given
  masks or atlas files
- Allowed to spatially transform electrodes to desired coordinate system
- Updated citation
- The standalone viewer does not require static server anymore:
  everything is self-contained (require `pandoc`, which comes with
  `RStudio`)
- Changed mechanism on animation color map generator (so the color is
  more accurate for discrete variables)
- Added `png` to dependence
- Added support for `AC-PC` alignment, available in `RAVE` - `YAEL`
  module
- Allow `brain` to plot with additional customized geometries
- Added `plot_slides` to plot `MRI` centered at each electrode contact
  for slide-to-slide visualization
- Added Line-of-Sight view mode for side canvas; can be enabled using
  shortcut `m` (previous shortcut to change the material type is changed
  to `shift+M`)
- Fixed `CT` in `JavaScript` when the `sform` and `qform` are different
  (have different code)
- Allowed to specify the spacing for interpolation and extrapolation for
  unequally spaced electrodes
- Added electrode outlines
- `YAEL` paper is finally out
- Fixed incorrect sub-cortical labels
- Deprecated old format (no cache is needed anymore)
- Made electrodes opaque on main but transparent in side canvas
- Let controllers check if the variable is valid before set to avoid
  invalid viewer state during initialization
- Added `get_ijk2ras` to get `Norig` and `Torig` matrix

## threeBrain 1.0.1

CRAN release: 2023-07-03

- Updated controller library to have reasonable input focus
- Allow `MRI` slices to be `NIfTI` format
- Set slices to be visible by default when the surface is not available
- Fixed transform for `datacube2`
- Fixed `qform` when reading `NIfTI` files
- Fixed `auto-refine` functions in electrode localization
- Removed clipboard auto-copy and auto-paste functions since they
  conflict with other viewers; instead users can use controllers to copy
  and paste state

## threeBrain 1.0.0 - Egypt

CRAN release: 2023-06-03

This version is a major update.

- Created
  [`threeBrain::threeBrain`](https://dipterix.org/threeBrain/reference/threeBrain.md)
  as the formal way to create brain objects
- Updated `JavaScript` engine to `v150`
- Allow getting `HTML` tags from saved widget so the widget can be used
  from `Jupyter` notebook
- Added `$render` method to remember viewer states
- Allowing set title via proxy driver
- Added citation information
- Fixed hemisphere issue in localization when electrodes are closer to
  opposite hemispheres
- Added electrode registration from anatomical slice cross-hair

## threeBrain 0.2.9

CRAN release: 2023-03-14

This version plans for a major update. Here are some highlights:

- Electrode localization can be done from original `CT` instead of
  re-sampled ones
- Completely isolate `JavaScript` engine from `R` code. The `JavaScript`
  code is available as `npm` package and is used via sub-module
- Implemented file readers directly from `JavaScript`, this allows
  reading files directly in viewer, and no cache is needed
- No home-brew version of `threejs` is required: standard `npm`
  distribution is used
- New controller `GUI` is implemented
- The viewer can be driven via `JavaScript` directly via event
  dispatchers
- Anatomical segmentation map is visible from the side panels; the
  `voxel` values are displayed when setting `crosshair`

### Detailed Changes

- Added step size in `datacube2` material uniforms
- Upgraded `threejs` to `r148`, and use `npm` distribution “three”
- Massive code re-factory (variable names, trackball controls, legacy
  classes…)
- Removed `data-GUI` and use `lil-GUI`
- Fixed compass (finally…)
- Added title to the viewer
- Reworked the whole message signal system, added
  `ThrottledEventDispatcher.js`
- Added `MouseKeyboard` class to track mouse and keyboard events,
  greatly reduced canvas burden
- Added `animParameter` object to canvas to keep track of the animation
  parameters
- reworked shiny drivers
- fixed one-voxel shift issues
- Added format support for `nii`, `mgh/mgz`, `FreeSurfer` surface,
  `FreeSurfer` node value binary formats
- Added function `threeBrain` to allow 3D viewer to run without cache
  (with fs only)
- Fixed memory leak issues in `JavaScript` code
- Geometry groups can now change its storage path
- JS is completely independent now (available on `npm` now)
- Peel event dispatcher from the canvas class so the events can be
  managed separately
- Hide time-stamps when there is no data/animation available
- Added experimental support to show labels on regular electrodes;
  currently no depth-test is turned on
- Added `GUI` support to change electrode label visibility and size
- Electrode label size adjusts along with electrode radius
- `handle_resize` now put off resizing function when detecting widget
  size is too small

### Bug fixes

- Fixing `xfm` not parsed correctly when the line starts with blank
  spaces
- Stopped rendering canvas when canvas is too small (less than 10
  pixels)

## threeBrain 0.2.7

CRAN release: 2022-10-15

### Changes

- Rewired events, allowing to drive the viewer via `JavaScript` events
- Allowed to set animation playback status
- Remove modal by default if `raveio` or `ravedash` is loaded
- Edited launch script to always use `Python3`

### Bug fixes

- Fixed installation issues (template brain) on `Windows`, avoid
  backslashes

## threeBrain 0.2.6

CRAN release: 2022-08-25

### Changes

- Allowed users to pan the camera when localizing electrodes
- Added line segment geometry type that can either display static line
  segments (such as `DTI`), or connect two electrodes dynamically
- Printing brain now uses more accurate terms
- Allowed `CT` to be either path or the actual data when calling
  localizing function

### Bug fixes

- Fixed `NifTi` orientation issues and use `sform`
- Fixed localization issue when `NifTi` transform matrix has determinant
  not equally to 1
- Fixed volume shader, resolved shift issues when panning the camera

## threeBrain 0.2.5

CRAN release: 2022-05-30

### Changes

- Surface `sync from voxels` now clamp the surface nodes
- Added `Voxel Display` controller to toggle volume display modes
- Changed shortcut `l` from `Voxel Type` to `Voxel Display`
- Volume `fragmentShader` uses non-linear function to calculate fragment
  colors combined with face normal; this will create smoother results
- `DataCube2` geometry uses `ConvexHull` instead of box/sphere to
  improve the performance
- `DataCube2` are no longer hidden when `sync from voxels` is on: users
  can use shortcuts `l` and `k` to easily control the visibility.
- `download_template_subject` can download other templates such as
  `fsaverage`, `cvs_avg35`, `bert`.

### Bug fixes

- Fixed a volume rendering issue where ray-marching directions are not
  calculated correctly
- Fixed color not set correctly when changing `Voxel Labels` while
  surface colors are `sync from voxels`

## threeBrain 0.2.4

CRAN release: 2021-12-03

This version mainly works on the electrode localization. Most changes
occur in the `JavaScript` engine.

### Changes

- Allows electrodes to be reset
- Displays electrode labels along with the electrodes
- Allows resizing electrode size on the fly
- Allows resizing the electrode labels
- Localization module has been integrated into `RAVE`
- Added line mesh to mark the distance of the electrode deviating from
  its original position. The line color changes with the distance value.

#### Improvements

- Improved localization precision
- Auto-adjusting electrodes now respects the topology
- Electrodes in the localization mode now have `LocElectrode` class
- Volume rendering and ray-casters now respects the transform matrices

## threeBrain 0.2.3

CRAN release: 2021-10-13

### Changes

- Electrode localization now has a `shiny` application

#### Improvements

- Added 3 vignettes

## threeBrain 0.2.2

### Changes

- Supported video content to display auditory visual stimuli along the
  response
- Default to closing the `default` and `volume` side folders

#### Improvements

- Fixed electrode localization interpolation issue
- Proper dispose the localized electrodes
- Fixed screenshot and video recording functions
- Renamed recording button to `Chrome`-specific

## threeBrain 0.2.1

CRAN release: 2021-08-03

### Changes

- Finally, electrode localization is added!
- Added `TextTexture` in the internal code to display text `Sprite`
  easily
- Can download electrodes as `csv`

## threeBrain 0.2.0

CRAN release: 2021-07-27

### Changes

- More efficient volume rendering with transparency
- Added shader functions to surface instances, allowing color rendering
  from volume, electrodes, or vertices (major change)
- Added color-map generator for surface and volume data
- Added method to generate data cube (volume) from `MNI305` coordinates
- Optimized loading procedure
- Removed `crayon`, `base64enc`, `htmltools`, `pryr` from dependence

#### Improvements

- Bumped `threejs` version to `v131dev`
- Fixed surface transparency losing fragments issue
- Added loaders to shiny applications to avoid performance issues on old
  computers
- Fixed electrodes not selected on mouse click-down (on `Firefox`)

## threeBrain 0.1.9

CRAN release: 2021-01-10

### Changes

- Added backend engine for volume rendering to show atlas files
- Standalone viewers now use native system tools for `Mac` and `Linux`
  (On `Windows`, it still needs `R` to be installed)

#### Improvements

- Allows super slow play speed to show animations in millisecond level
- Bumped `threejs` to a newer version and fixed compatibility issues
- Animation time range is more reasonable

## threeBrain 0.1.8

CRAN release: 2020-06-23

### Changes

- Screenshot now downloads `pdf` format

#### Improvements

- Fixed `freesurferformats` face index starting from 1 instead of 0

## threeBrain 0.1.7

CRAN release: 2020-05-12

### Changes

- Now displays `MNI305` coordinates instead of `tkRAS` coordinates
- Removed `reticulate` and related functions to support native R
  functions

#### Improvements

- Fixed `MNI305` calculation issues
- Internally calculates anterior commissure

## threeBrain 0.1.6

### Changes

- Implemented `view_ct_t1` to view `CT` aligned to `T1` images
- Updated document on how to generate `FreeSurfer` brain
- Removed dependency to `nibabel` and use native R packages
- Re-designed legends, added options to show, hide display information
- Added screenshot to download as image

#### Improvements

- Added hints for keyboard shortcuts

## threeBrain 0.1.5

CRAN release: 2020-01-20

### Changes

- Import `FreeSurfer` and `SUMA` files `sulc`
- Control element update
- Added `brain_proxy` to control in shiny element
- Separated display and threshold data
- `FreeMesh` material can be switched between `MeshPhongMaterial` and
  `MeshLambertMaterial`

#### Improvements

- UI will blur focus when clicking on canvas
- Allow customizing widgets `background`, `cex` (font magnification),
  `timestamp` (display time)
- Allow `controllers` (list) to override control UI
- Added preset `syncviewers` (`threejs_brain(control_presets = ...)`) to
  synchronize multiple viewers in shiny environment

## threeBrain 0.1.4

CRAN release: 2019-10-18

### Changes

- Implemented a new mesh type - volume rendering using ray marching
- Added alternative methods to read `.nii` files, `nibabel` is now
  optional
- Customized color palettes and value range for better visualizations
  with outliers
- Only requires `T1.mgz` or `brainmask` of `brain.finalsurf` is not
  found. This allows users only run `FreeSurfer` to the first stage,
  which only takes around 8 to 10 minutes instead of 6 hours.
- Fully compatible with `htmlwidgets` in `shiny` mode. When calling
  `threejsBrainOutput` under
  [`shiny::renderUI`](https://rdrr.io/pkg/shiny/man/renderUI.html), the
  `DOM` element might get reset by `shiny`, causing a new 3D viewer
  created. This might consume more resource, causing memory leaks and
  even conflict context renderings. Also event listeners couldn’t reset
  correctly. A cache is created and now is reusing the canvas.

#### Improvements

- More flexible directory requirement
- Added dispose function to canvas so that memory gets cleared correctly
- Renderer optimization and memory optimization

#### Bug Fixes

- Fixed keyboard listeners locking the keys
- Fixed huge memory leaks due to `threejs` not garbage collecting
  geometries and textures

## threeBrain 0.1.3

CRAN release: 2019-09-10

### Changes

- File structure change: now directly read in from `FreeSurfer` folder
- Added readers for `.mgz`, `.m3z` files
- Added coordinate system to align volume with surface data
- Implemented side-viewers, added three side cameras at XYZ axis
- Can now read, export electrodes as csv file
- Re-write brain generating function
- Can display/switch multiple value types
- Added transparency to surfaces
- Implemented experimental electrode localization
- Automatically determine color type (continuous or discrete) and value
  range

#### Improvements

- Shortcuts available at
  [here](https://github.com/dipterix/threeBrain/blob/master/shortcuts.md)
- Optimized electrode value settings

## threeBrain 0.1.2

CRAN release: 2019-06-28

### Changes

- Re-draw canvas on a 2D context to make customized overlay directly on
  canvas.
- Implemented continuous and discrete legends to replace D3.
- Added support to set main camera position and initial zoom level.
- Added 3D scatter plot and examples.
- Use hybrid render mode when animation not required to save battery
  usage.
- Improved color palette calculation.
- Support customized title.

#### Improvements

- Support customized datapath when saving widgets.
- Added instructions on how to embed widgets into websites without R.

## threeBrain 0.1.1

- Implemented three types of geometries: plane, sphere and free. A free
  geometry takes arbitrary geometry vertices and faces to form a 3D mesh
  object.
- Added animation to sphere object.
- Replaced old JavaScript with npx driven modules.
- Implemented D3 side-widget

## threeBrain 0.1.0

- Initial private beta release!
