## Changes since last CRAN release
* `3c5eb84c (HEAD -> master)` [_`dipterix`_]: Fixed the depth issue in electrode material shader
* `583d267e (origin/master, origin/HEAD)` [_`dipterix`_]: Set maximum render length cut-off for electrode prototypes
* `4037eddb` [_`dipterix`_]: Added model tangent (usually the direction) to electrode shader so outlines are correctly visualized
* `da148714` [_`dipterix`_]: Fixed electrode prototype rendering issue (color) on Windows
* `eda02a82` [_`dipterix`_]: Fixed the color map for discrete values
* `fc4f3d0c` [_`dipterix`_]: Setting electrode prototype render order to be `-500` so it does not hide behind the transparent surfaces
* `3854835b` [_`dipterix`_]: Plotting electrodes on slices now takes numerical `adjust_brightness` interpreted as quantile
* `47a8db0a` [_`dipterix`_]: Changed default color palette for discrete values, removed colors that are too dark or gray
* `c345aa3a` [_`dipterix`_]: Change `CT` threshold back to positive (3000) when switching from `DBS` leads back to `sEEG` leads.
* `69a3853c` [_`dipterix`_]: Support drag and drop annot files
* `ac572325` [_`dipterix`_]: Changed electrode material to display front-side only instead of double side to avoid overlapping contacts visually when spacing is small
* `189fc172` [_`dipterix`_]: Added `Abbott` segmented electrodes 6170-6173, with segmented electrodes clockwise viewing from proximal end
* `7e6fc9a8` [_`dipterix`_]: Fixed a bug that may change electrode coordinate hand
* `6bb2ebf7` [_`dipterix`_]: All the `DBS` electrode prototype maker uses natural `cos` for `x` and `sin` for `y`. However, this will cause electrodes to rely on rendering on back side (material)
* `007aaa25` [_`dipterix`_]: Added missing prototype
* `52bec836` [_`dipterix`_]: Fixed `BSC` and `Medtronic` electrode orientation (now is counter-clockwise when viewing from proximal end)
* `8ce3bdee` [_`dipterix`_]: Added more spacings for `DBS` segmented contacts; added prototypes for `Medtronic` segmented electrodes
* `9b0d8250` [_`dipterix`_]: Added `BSC-DB` electrodes for 2202 2201
* `d8fc18c8` [_`dipterix`_]: Added internal test code for depth mapping
* `d0f93db6` [_`dipterix`_]: Surface mapping has been implemented for depth electrodes, with dynamic offset threshold
* `8f9ab813` [_`dipterix`_]: `surface_offset` has been added to electrode field
* `b9ef710d` [_`dipterix`_]: `cvs_avg35_inMNI152` has the correct `talXFM` (scanner to `MNI305`) now
* `bb328b96` [_`dipterix`_]: Added `load_mesh` to surface object so users can load surface mesh for computation in `R`; Added internal `calculate_distances` to compute the distances from a point to its projection to a list of mesh
* `02165822` [_`dipterix`_]: `DistanceShifted` in electrode table is taken into account and will be passed to electrode instances
* `f703c24b` [_`dipterix`_]: Inflated surfaces have offset by default
* `988fd65e` [_`dipterix`_]: Fixed a singular matrix bug when the electrode prototype `up` vector is zero or is parallel with the model direction
* `dd16370a` [_`dipterix`_]: Allowed the surface mapped electrodes to be snapped to the surface if the surface world matrix is not identity; Force the inflated brain to have offset positions
* `18df6e14` [_`dipterix`_]: Bump `dev` version
* `074adfb1` [_`dipterix`_]: Added `DBS` electrode prototype `BSC-DB-2202`
* `00ba2111` [_`dipterix`_]: Prototype `set_transform_from_points` now tries to set rotation from transform `Euler` angle when the prototype guided marker is 1-ranked (electrode strip, `DBS` electrodes)
* `7529aa91` [_`dipterix`_]: Allowed electrode prototype to display markers; added viewer options for localization
* `b35e7dc1` [_`dipterix`_]: Changed electrode direction helper to be displayed inside of crosshair group; Allowed side panel to be displayed with atlas column-row-slice; Added controller to display symmetric continuous color map for volumes
* `12970a6b` [_`dipterix`_]: Fixed the `GLTF` not showing inner-most contact issue
* `c8522cd7` [_`dipterix`_]: Removed `devel` version of `ravetools` from check
* `11bb99e8` [_`dipterix`_]: Update `Github` action check script
* `cbeac8bc` [_`dipterix`_]: Added rhub check
* `b302dd71` [_`dipterix`_]: minor change
* `02880b44` [_`dipterix`_]: Ready for a CRAN release
* `9efec0cb` [_`dipterix`_]: Removed `doc` folder
* `bae88ccb` [_`dipterix`_]: Plotting slices have correct margins with partial plot
* `4bd0352c` [_`dipterix`_]: Allow users to drag and drop value tables
* `10ac71ad` [_`dipterix`_]: Allow users to hide crosshairs
* `05836f94` [_`dipterix`_]: Allow `shiny` app to change current color map via proxy
* `fbca42f4` [_`dipterix`_]: Allows drag-drop electrode color files; Added `set_electrode_data` to brain proxy class, allowing `shiny` applications to change the electrode data, set color palettes, and set value ranges in the same call
* `a14cd3f5` [_`dipterix`_]: Allow masks to be added to `T1`; Added `D99v2` for monkey brain; Added demo code; Export `GLTF` for `datacube2`
* `9268886f` [_`dipterix`_]: Fixed `fix_electrode_color` bug
* `62567274` [_`dipterix`_]: Supported `ISO` surface generation from voxels
* `a6295c2c` [_`dipterix`_]: Added white-matter segmentation as default atlas if user has this file
* `cd8e15e8` [_`dipterix`_]: Exporting `GLTF` is wrapped with try-catch
* `963859ed` [_`dipterix`_]: `fix_electrode_color` is exclusive by default; fixed color fixing issue for naive sphere electrodes
* `1dea870f` [_`dipterix`_]: Changed logo message
* `1e70580a` [_`dipterix`_]: Using better `RAVE` logo and fixed style issues; Changed shortcut `p` to toggling the visibility and `shift+p` to switching surface types
* `9b76fa41` [_`dipterix`_]: Added logo to control panel to advertise the project
* `226994ba` [_`dipterix`_]: Added export `GLTF` binary format; Separate `3D` and `2D` canvas;
* `e556d025` [_`dipterix`_]: Converts `*h.pial.gii` to `FreeSurfer` format when the files are missing
* `8d8c36dc` [_`dipterix`_]: Allow electrode depth test to be disabled (always-depth) on contact and/or outlines
* `558564ec` [_`dipterix`_]: Typo fix in `SliceShader`
* `40d60f02` [_`dipterix`_]: Fixing the vertex shader output not read by fragment shader issue
* `82b23f63` [_`dipterix`_]: Drop-in feature support color-map for volume and surfaces
* `0dfb0531` [_`dipterix`_]: Fixing `readme` and vignettes
* `b28c0643` [_`dipterix`_]: Added contact order to display when electrode is clicked
* `33d7c9b3` [_`dipterix`_]: Added `DIXI` (`AM`, `BM, `CM`) electrode specifications
* `a2d6fb53` [_`dipterix`_]: Added brightness and contrast adjustment with keyboard shortcut
* `2c636b26` [_`dipterix`_]: Added option to set crosshair gap
* `8137d32a` [_`dipterix`_]: Added `model_rigid=FALSE` to allow electrode morph (trajectory)
* `ce375985` [_`dipterix`_]: Underlay image is not needed
* `29141273` [_`dipterix`_]: Added default interpolation string for `sEEG` electrodes
* `ff9997df` [_`dipterix`_]: Changed `sEEG` contact radius from shaft radius to half of the contact widths, increasing visibility
* `1397eade` [_`dipterix`_]: Disabled user-selection event in `CSS` for zoom-tools (side canvas)
* `6993bab0` [_`dipterix`_]: Supported drag and drop curvature files for `pial` with built-in color map
* `31b7f388` [_`dipterix`_]: Skip smooth step when `lambda` is non-positive
* `8b814e08` [_`dipterix`_]: `plot_slices` allows overlay images
* `5ad19c55` [_`dipterix`_]: Fixed right-click not settings crosshairs correctly on template brain
* `8ccd7706` [_`dipterix`_]: Drag and drop feature supports `STL` format now; Color map is remembered regardless of the file extension
* `d6de9e10` [_`dipterix`_]: Added `conform_volume` to conform images that simulate `FreeSurfer` conform algorithm
* `40d10a3b` [_`dipterix`_]: Exported `write.fs.surface`
* `8f356c31` [_`dipterix`_]: `volume_to_surf` can take objects (from `read_volume`) as input
* `c1e25e3a` [_`dipterix`_]: Fixed subject code not set issue when visualizing with template brain; Fixed atlas list not updated when brain is loaded; Fixed controller not set because the `value` variable is undefined; `Voxel Label` input is remembered.
* `4d0f2a23` [_`dipterix`_]: Fixed name parsing for surface file when `space` keyword is provided
* `01836188` [_`dipterix`_]: Added `volume_to_surf` to generate `3D` triangular mesh surfaces from volume data
* `8a3a03e0 (origin/dragndrop, dragndrop)` [_`dipterix`_]: Fixed `Github` action script with system dependecies added
* `aae29b28` [_`dipterix`_]: Color look-up table can be set with arbitrary single color (in `HexString`, indicating that all values should be rendered with such color; Drag & Drop volumes can change to single colors
* `c04d7783` [_`dipterix`_]: Remembers to state when switching volumes (`datacube2`)
* `d7cab685` [_`dipterix`_]: Allowed prototype contact colors to be fixed; Prototype control points displays channel information (provided control points are channels) Added color (`randomColor`, `testColorString`) and file-name utility functions; Soft removed `addColorCoat` and using `ElectrodeMaterial`, this results in massive code improvement in electrode instance; Allow to set default electrode colors if a contact is not rendered with values nor fixed color; Fixed `NamedLut` color error when a value range is zero; Prototype electrode click information displays the channel number; Fixed `RShinyDriver` issue when object does not have construction parameters (using `getThreeBrainInstance` instead);
* `1ed4b5b4` [_`dipterix`_]: Scrolling on side canvas is faster now
* `b4cd7dbf` [_`dipterix`_]: Drag & drop file names is sanitized to avoid displaying issues; Electrode contacts (`instancedMesh`) are now click-able; Dispose is cleaner now, it also fires events; Added `makeClickable` and `removeClickable` to replace previous `add_clickable` function; Renamed `register_object` to `registerToMap`; Fixed `UV` mapping issue in sphere electrode geometry; Better ways to sanitize `datacube`;
* `e0437d6c` [_`dipterix`_]: Improved `datacube` overlay texture, including using `clamp-to-border` instead `clamp-to-edge`; Fixed `shader` issue when transparency is set to negative (treated as 1)
* `7a196ff4` [_`dipterix`_]: Ray-casting electrode prototypes with `instancedMesh` now works under `contact-only` mode; Show electrode prototype with contacts by default
* `28f3af8d` [_`dipterix`_]: Changed drag & drop default color mode; changing global opacity also affects the `Voxel Opacity` under volume settings; `AbstractThreeBrainObject` now inherits `EventDispatcher` (from `three`) so events can be registered to instances directly; Color changes to `datacube2` will notify the underlay `datacube` via event dispatcher; For each color keyword added, a reversed version is also registered; Fixed discrete volume treated as continuous map when overlaid
* `5f068018` [_`dipterix`_]: Added color modes for uploaded images; using `NIfTI` headers to get calculated color intensities before applying heuristic approach; removed `normalize` method (replaced by `getNormalizedImage`) from `NiftiImage` and `MGHImage`
* `bb1e6150` [_`dipterix`_]: Using script to generate change log automatically from Git commits
* `1eea71c6` [_`dipterix`_]: Added news
* `6f3ceefe` [_`dipterix`_]: bump version
* `a9d0c8f6` [_`dipterix`_]: rename electrode prototypes: (type-company-version.json)
* `bb3adf85` [_`dipterix`_]: minor fix
* `01ed4695` [_`dipterix`_]: Added campass to side cameras when slice mode is not canonical; dragndrop changes folders; removed UV for sphere electrodes; added model-up for segmented electrodes shaft; fixed a bug when slice instance is missing but controller tries to set overlay; voxel threshold is async now; changed default to some controller; added broadcast() to more controllers; atlas number will be displayed so users don't need to search for lut; added global debug flag; js source map is hidden so browser won't complain about missing map;
* `fa4fe3f6` [_`dipterix`_]: viewer can be seen in quarto/rmarkdown/knitr now
* `e7cdff72` [_`dipterix`_]: added default prototypes
* `60f0dddd` [_`dipterix`_]: added functions to create seeg prototypes
* `2096eb4c` [_`dipterix`_]: added electrode "up", allowing electrode to rotate along direction
* `6a53d729` [_`dipterix`_]: dnd surface granted with USER_ALL_SIDE_CAMERA_4; implemented slice overlay; splited render distance into Frustum near and far; added model2vox to datacube and datacube2; no more timeout for workers; fixed sEEG-16 UV mapping
* `0c466378` [_`dipterix`_]: dynamic async workers; support dnd gii and colormap; added snap-to-electrode mode; dnd surface infer space from filename (BIDS); no voxel matching for subcortical surfaces;
* `d64ae335` [_`dipterix`_]: added support for electrode directions; prototypes are loaded from system by default to allow updating certain params
* `a9275a43` [_`dipterix`_]: fixed prototype channel number not set when set from list
* `3dc98c5e` [_`dipterix`_]: added options to enable/disable cache; used better file loader with options to use js workers
* `0ef6c1c3` [_`dipterix`_]: fixed UV issues in prototype
* `2c1f30e4` [_`dipterix`_]: allow contact to be fixed (anchor); reduced number of control points to 2; removed `flattern=FALSE` for prototypes; fixed prototype transform issue
* `4351cc4b` [_`dipterix`_]: default surface colors
* `ad4b4299` [_`dipterix`_]: Implemented drag N drop
* `7fe52479` [_`dipterix`_]: added remotes
* `b53c0725 (origin/custom-electrode-geom, custom-electrode-geom)` [_`dipterix`_]: using instancedMesh to represent electrode contacts when prototype is used
* `4cacfd41` [_`dipterix`_]: Multi-representation of electrode
* `e3bb38c0` [_`dipterix`_]: added mapToTemplate back
* `d5416c4e` [_`dipterix`_]: early stop when webgl2 is unavailable
* `4b71dee7` [_`dipterix`_]: no render if webgl2 is disabled
* `fa11027f` [_`dipterix`_]: Fixing win again
* `fe2cc379` [_`dipterix`_]: recompile
* `2313b0a5` [_`dipterix`_]: changed pial surface material depthwrite when transparent
* `cf2f1905` [_`dipterix`_]: fixed the electrode values when prototype is used
* `88e10f8d` [_`dipterix`_]: js fix
* `a6d61c23` [_`dipterix`_]: Added support for QRCode; using flags instead of function to hard update contact positions (may not ready)
* `f77c8ee0` [_`dipterix`_]: docs, always docs
* `b498b613` [_`dipterix`_]: avoid auto-load geometries; added type string to prototype; added set_matrix_world to set transform of an object
* `6e91dba8` [_`dipterix`_]: added custom electrode shape support
* `fe5f2c84` [_`dipterix`_]: added news; cran-comments; allowed plot_slices to be additive
* `ca56af1b (origin/win-fix, win-fix)` [_`dipterix`_]: fixing the crash issue on windows
* `ba3f975b` [_`dipterix`_]: removed shader cache in surface shader (may cause window crash
* `8904130d` [_`dipterix`_]: updated readme
* `48ea5ea6` [_`dipterix`_]: adjust the implementation of background color and arcball radius; removed additional unsed params from material call; added zindex base to side canvas; added defaultColor to electrodes; fixed localization electrodes color not set correctly issues; completely removed composer effects
* `9785b05d` [_`dipterix`_]: trackball uses longer side instead of shorter side as arc radius; mouse position in the canvas is caluclated every mouse down instead of every resizing
* `85bffcbf` [_`dipterix`_]: internalize col2hexstr
* `9a5d74ad` [_`dipterix`_]: Added brain$electrodes$fix_electrode_color to fix contacts to a color for given clip names; added electrode visibility mode: use threshold only to show contacts that pass threhsold but have no values
* `467eac5d` [_`dipterix`_]: more robust controller.load
* `34727c80` [_`dipterix`_]: textsprite depth fix
* `c4365bad` [_`dipterix`_]: changed default controllers
* `78acc14a` [_`dipterix`_]: upgraded threejs to v160 with significant light fix + removed outline pass (using clearcoat instead)
* `56f0e000` [_`dipterix`_]: atlas label also returns atlas IDs
* `f0712167` [_`dipterix`_]: if user name rave_slices under fs folder, use it to display T1 slices
* `b28a22f5` [_`dipterix`_]: auto adjust T1 brightness when ploting slices
* `28767b24` [_`dipterix`_]: adjust title position
* `77a28c2f` [_`dipterix`_]: Added plot_slices to brain class
* `58c66337` [_`dipterix`_]: mesh clipping
* `c6f90fee` [_`dipterix`_]: Fixed download template subject URL query
* `e4092702` [_`dipterix`_]: dev bump
* `10524a4c` [_`dipterix`_]: Added default rave_slices in case users want to choose their own slices in the 3D viewer
* `a4cac580` [_`dipterix`_]: Allow slices to change gamma
* `ff842861` [_`dipterix`_]: make voxel IJK starting from 0
* `c139b53c` [_`dipterix`_]: Fixed brain electrode mapping; added atlas guesser
* `16defcdb` [_`dipterix`_]: Added space transform for electrodes class; set controllers (setFromDictionary) uses try-catch clauses now
* `176e7746` [_`dipterix`_]: Partition datauri so the datauri size does not exceed 65529
* `21e12b51` [_`dipterix`_]: bump version
* `a12128c4` [_`dipterix`_]: updated citation
* `06a99127` [_`dipterix`_]: truly standalone viewer
* `a5746ca2` [_`dipterix`_]: animation uses new cmap
* `af2d2c76` [_`dipterix`_]: added png to dep
* `bb773fcb` [_`dipterix`_]: Added ACPC alignment, new tubegeom for customized electrode types
* `1b37825a` [_`dipterix`_]: allows additional geoms to viewer in brain$plot
* `75e77aec` [_`dipterix`_]: using new mac command
* `14f53797` [_`dipterix`_]: plot_slices is column-major
* `0d43840d` [_`dipterix`_]: minor patch
* `3503ee49` [_`dipterix`_]: minor patch
* `19a0c0bc` [_`dipterix`_]: line-of-sight view (js) and plot_slices (R)
* `d019c899` [_`dipterix`_]: bump version
* `b121553a` [_`dipterix`_]: Fixing CT matrix in js when s/qforms are inconsistent (the coregistration matrix in sform and original matrix in qform)
* `aea5c03f` [_`dipterix`_]: improved way of calc spacing offsets
* `8be639fa` [_`dipterix`_]: Fixed bugs on interpolation with spacing
* `74a871e7` [_`dipterix`_]: specify spacing for inter/extrapolation; removed old interpolation logic; added distanceRatio to prevent large shift (auto adjust)
* `73685b8a` [_`dipterix`_]: localization: Outlines are on
* `1da0aa4f` [_`dipterix`_]: Update to match the yael paper
* `60b014c3` [_`dipterix`_]: fixing incorrect subcortical label
* `1c98fa37` [_`dipterix`_]: Disabled old format; as_subcortical_label generates correct wm labels
* `a909a73f` [_`dipterix`_]: let electrodes to be opaque on main but transparent on side canvas
* `3591520e` [_`dipterix`_]: added initialization condition
* `0d538d85` [_`dipterix`_]: Let subcortical surfaces to display by default
* `258a7cda` [_`dipterix`_]: added get_ijk2ras to get Norig (sform) and Torig (tkr)
* `289153c2` [_`dipterix`_]: minor bug fix and bump
* `a48ca697` [_`dipterix`_]: using pial surface center as trackball center
* `1c44190d` [_`dipterix`_]: added support for showing subcortical surfaces; fixed depth issues when showing electrodes in side viewers
* `bb0fb968` [_`dipterix`_]: fixed freesurfer_lut
* `bd75f4e8` [_`dipterix`_]: Dithering the datacube2 to make rendering "smooth"; added `target` arg to pre_render so pre_render also applies to side canvas