## Changes since last CRAN release
* `48c170fe (HEAD -> master)` [_`dipterix`_]: Fixed bugs drag & drop electrode data type: the electrodes with missing data will be reset, and the color palettes for existing data will be kept
* `0db22204 (origin/master, origin/HEAD)` [_`dipterix`_]: Fixed `GLB` format issue
* `dbd793be` [_`dipterix`_]: Minor change on the error message
* `57da325d` [_`dipterix`_]: Multi-brain template passes extra arguments to template object constructor
* `70aa92ef` [_`dipterix`_]: Function `threeBrain` does not automatically download templates if annotation is not found
* `18823dd7` [_`dipterix`_]: Disable downloading files in `WASM` by default to avoid triggering `CORS` condition that will terminate the program
* `a26514bf` [_`dipterix`_]: rewrote drag & drop code so its framework can be easily extended; surface color handlers now handle measurements and annotations different, with separate storage
* `2bdf8722` [_`dipterix`_]: Added `FileDataHandler` classes to handle drag & drop files; supported drop-in electrode coordinate files
* `caf0a3ed` [_`dipterix`_]: `GIfTI` reader now respect the transforms if there exists a transform with target space to be the `scanner_anat`
* `a5a0b6cd` [_`dipterix`_]: Allows continuous data cube to change color map
* `af5b9c90` [_`dipterix`_]: `add_annotation` automatically compiles annotations from template if missing
* `dd4b0b0a` [_`dipterix`_]: Fixing the side panels so the background color is always black
* `ad4633fe` [_`dipterix`_]: Canvas and screenshot is transparent when background is `#ffffff`
* `ff5eca46` [_`dipterix`_]: Fixed shader ignoring always-depth flag when outline is off; updated `jsPDF` to the 2.5.2 build
* `ad202235` [_`dipterix`_]: Transition animation allows video recording
* `94ec004f` [_`dipterix`_]: Fixed screenshot button and improved video quality
* `1c373a4d` [_`dipterix`_]: Fixed subcortical ROI matrices
* `d15cdb6a` [_`dipterix`_]: Added surface coordinate for crosshair
* `6981b0e9` [_`dipterix`_]: Fixed get controller state function; added stage transition, allowing users to create animations from key states
* `c720b964` [_`dipterix`_]: Using "color" instead of separated `color` and `underlayColor` attributes for surface underlay
* `3e8e0784` [_`dipterix`_]: Supported visualizing surface annotations; surface colors are sync'ed to the electrode colors if the names are consistent; re-wrote the surface shader to support under- and over-lay colors
* `b09e94ea` [_`dipterix`_]: Updated `SurfaceShader` to use morph normal and transformed positions
* `3126093d` [_`dipterix`_]: Load other common surfaces by default
* `9096bdaf` [_`dipterix`_]: Switching subject surface types will trigger morph if the number of vertex nodes are the same
* `838bff7f` [_`dipterix`_]: Allow animation presets to be shown even when data is not available; added keyboard shortcut to sync data threshold with display; added hidden features that are experimental; `crosshair` position is changed to scanner`RAS` and `Affine MNI152`; added tooltip title support for controllers; added global clock for app; updated `ViewerCanvas` constructor arguments; supported `useMorphTarget` for surface objects
* `4bc77317` [_`dipterix`_]: Fixed electrode useMatrix when contacts are represented as spheres
* `fa452b72` [_`dipterix`_]: Fixed template mapping, supported non-linear mapping for electrode geometries