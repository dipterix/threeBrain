# NA

## Changes since last CRAN release

- `69ce2e29 (HEAD -> master)` \[*`dipterix`*\]: Added documentations for
  exported `R6` classes
- `58b3bacc` \[*`dipterix`*\]: Added text decorator to allow adding text
  sprite at given locations; Added optional text fields for electrodes
- `4021fb93 (origin/master, origin/HEAD)` \[*`dipterix`*\]: R code style
  fix (via `lintr`)
- `f7c86f60` \[*`dipterix`*\]: Added per-contact active/inactive
  tracking for `InstancedMesh` electrode contacts: inactive contacts (no
  display value or failed threshold) suppress outlines; `hide inactives`
  visibility mode discards inactive contact fragments via
  `HIDE_INACTIVE_CONTACTS` shader define; replaced alpha-based inactive
  fading with `discard`; `instanceActive` per-instance buffer attribute
  drives all inactive logic; added `setHideInactives()` and
  `useInactiveAlpha()` material methods; added `guessHemisphere()` to
  infer electrode hemisphere from FreeSurfer anatomical label
- `584f2c68` \[*`dipterix`*\]: Added NeuroPixel shanks
- `5300ae5b` \[*`dipterix`*\]: Added Medtronic 3387 and 3389
- `9f650ac4` \[*`dipterix`*\]: Added DIXI 15PIX and 18PIXEL
- `9aca9098` \[*`dipterix`*\]: Added more BF??R-SP21X electrodes
- `b7eee16e` \[*`dipterix`*\]: Changed the screenshot/recording name
  date to be full-year with local timestamp
- `2d964e82` \[*`dipterix`*\]: Updated `jsPDF` version
- `05794e2e` \[*`dipterix`*\]: Improves the readability for screenshots
  and recordings (<https://github.com/orgs/rave-ieeg/discussions/145>)
- `c3d3ae9a` \[*`dipterix`*\]: Preserve canvas context to allow
  obtaining `dataURL`
- `32861939` \[*`dipterix`*\]: Improved lazy rendering so the canvas
  does not forces the `GPU` to render unless there is a need to
- `809a302a` \[*`dipterix`*\]: Add gradient texture pre-computation for
  faster normal calculation; Implement 3D Sobel filter for both
  continuous and discrete volumes; Add MatCap texture-based lighting for
  improved visual quality; Support gradient-based opacity modulation for
  continuous data; Add fast-pass empty space skipping with adaptive step
  sizing; Add `invokeWorker` method to ViewerApp for unified worker
  dispatch; Support ArrayBuffer transferables for zero-copy data
  transfer; Register `computeVolumeGradients` as worker-callable
  function; Convert colorChannels and dithering to compile-time defines;
  Add USE_GRADIENT_MAP and SINGLE_CHANNEL shader variants; Implement
  two-sided lighting with view-space normal correction
- `5f60030b` \[*`dipterix`*\]: Added read_colormap to support reading
  from RAVE (json) or itksnap format
- `ac95dca1` \[*`dipterix`*\]: Added PMT 2102-16-099 specs
- `41450e6f` \[*`dipterix`*\]: Added BF09R-SP51X-0BB specs
- `65b856e5` \[*`dipterix`*\]: Upgraded engine to `r182`; Removed `jsm`
  folder; Optimized electrode shader to calculate inversed
  `modelViewProjection` in `JavaScript` rather than vertex-shader
- `5580a157` \[*`dipterix`*\]: Added RD16R-SP03/05X (AdTech) sEEG
  prototypes
- `1f73a138` \[*`dipterix`*\]: Added prototypes for DIXI-MM08 electrodes
- `b64effe3` \[*`dipterix`*\]: Added YBA atlas colormap; added
  Behnke-Fried electrode prototypes
- `606428c2` \[*`dipterix`*\]: Added NeuroOne/Zimmer EVO electrode
  specifications
- `a03a67a0` \[*`dipterix`*\]: Mask is applied to slice overlays
- `9d1bbcb1` \[*`dipterix`*\]: Automatically download template subject
  if missing
- `a910ac51` \[*`dipterix`*\]: Use MeshBasicMaterial when rendering the
  sphere electrodes
- `9f1b04ee` \[*`dipterix`*\]: Moved JFM to senior position
- `6a288bf2` \[*`dipterix`*\]: Electrode transparency improvement; Added
  slice threshold to strip masks; volue slice masks work even the
  orientation is different
- `5f1f4312` \[*`dipterix`*\]: Bump version to trigger update
- `926d78be (origin/ravecore, ravecore)` \[*`dipterix`*\]: Added slice
  material to wrap shaders and refactored sampling method
  (super-sampling in shader rather than completely linear interp); added
  outline mode for discrete overlays; temporarily removed masks
- `02701b1c` \[*`dipterix`*\]: Using phisical materials for electrode
  prototypes
- `552cee75` \[*`dipterix`*\]: Allowed electrode prototypes to be rigid
  when mapping to template
- `04a68fed` \[*`dipterix`*\]: removed raveio from comments and using
  scanner RAS for slices
- `74c72618` \[*`dipterix`*\]: Added fsaverage in CIT168
- `39e1d289` \[*`dipterix`*\]: Fixed trk format; supported tck format
- `13e1d35f` \[*`dipterix`*\]: Suppressed rendering flags when the
  trackball is inactive, fixing the rendering policy
- `fbca73d5` \[*`dipterix`*\]: Fixed drag and drop color key length
  issue
- `2d525370` \[*`dipterix`*\]: Added radiographic view
- `43ee4c15` \[*`dipterix`*\]: Use `KDTree` to query the stream-lines
  that intersect the target volume
- `4f28d734` \[*`dipterix`*\]: Updated `BlueRed` color palette to match
  with the `ravebuiltins` color
- `24b00b58` \[*`dipterix`*\]: Removed obsolete `freesurfer_brain` and
  embrace the new universal interface `threeBrain`; added `render`
  method for template brain; `mereg_brain` also gains new argument
  `electrode_priority` to control the priority when setting electrode
  shape
- `f35f6d98` \[*`dipterix`*\]: Drag and drop is handled by file-system
  `API` or `Webkit` before fallback to naive approaches; Added support
  for `tt` format; streamline colors are fixed; using new shaders for
  streamline; better fallback for workers who don’t get new job spawned;
  Worker spawn is throttled; Added pseudo random generator; Streamlines
  have better memory management, with random shuffle; In highlight mode
  faded streamline widths can be adjusted; Added global ruler next to
  compass
- `e0355547` \[*`dipterix`*\]: Added try-catch to handle file processing
  errors to avoid stopping processing files
- `e5c88b9b` \[*`dipterix`*\]: Drag & drop file now generates consistent
  default colors and ignores the left-right keywords
- `80a90588` \[*`dipterix`*\]: Fixed drag and drop multiple files issue
- `7bf5c2ce` \[*`dipterix`*\]: Drag drop supports folders now
- `4a7aa43c` \[*`dipterix`*\]: Fixed
  <https://github.com/rave-ieeg/rave-pipelines/issues/49>; Added support
  for streamline
- `cc9ba41f` \[*`dipterix`*\]: Added support for `MXene` electrodes
- `510f3f8c` \[*`dipterix`*\]: Added Adtech-RD series
- `da5ff210` \[*`dipterix`*\]: Added interpolate without refine
- `2799e04f` \[*`dipterix`*\]: native annotation from template supports
  FreeSurfer `curv` file too
- `6048bf01` \[*`dipterix`*\]: Surface mapping is more robust even if
  the hemisphere is unset: using `MNI152` R-axis to infer the hemisphere
  instead
- `80c16686` \[*`dipterix`*\]: Added release tag
