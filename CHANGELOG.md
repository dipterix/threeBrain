## Changes since last CRAN release
* 6f3ceefe (HEAD -> dragndrop, origin/dragndrop) (2024-03-31 11:43:52 -0400) dipterix: bump version
* a9d0c8f6 (2024-03-31 11:36:57 -0400) dipterix: rename electrode prototypes: (type-company-version.json)
* bb3adf85 (2024-03-31 11:31:42 -0400) dipterix: minor fix
* 01ed4695 (2024-03-31 11:22:43 -0400) dipterix: Added campass to side cameras when slice mode is not canonical; dragndrop changes folders; removed UV for sphere electrodes; added model-up for segmented electrodes shaft; fixed a bug when slice instance is missing but controller tries to set overlay; voxel threshold is async now; changed default to some controller; added broadcast() to more controllers; atlas number will be displayed so users don't need to search for lut; added global debug flag; js source map is hidden so browser won't complain about missing map;
* fa4fe3f6 (2024-03-31 11:22:26 -0400) dipterix: viewer can be seen in quarto/rmarkdown/knitr now
* e7cdff72 (2024-03-30 12:03:57 -0400) dipterix: added default prototypes
* 60f0dddd (2024-03-30 11:58:07 -0400) dipterix: added functions to create seeg prototypes
* 2096eb4c (2024-03-30 01:22:12 -0400) dipterix: added electrode "up", allowing electrode to rotate along direction
* 6a53d729 (2024-03-29 16:52:01 -0400) dipterix: dnd surface granted with USER_ALL_SIDE_CAMERA_4; implemented slice overlay; splited render distance into Frustum near and far; added model2vox to datacube and datacube2; no more timeout for workers; fixed sEEG-16 UV mapping
* 0c466378 (2024-03-28 23:38:20 -0400) dipterix: dynamic async workers; support dnd gii and colormap; added snap-to-electrode mode; dnd surface infer space from filename (BIDS); no voxel matching for subcortical surfaces;
* d64ae335 (2024-03-27 17:44:14 -0400) dipterix: added support for electrode directions; prototypes are loaded from system by default to allow updating certain params
* a9275a43 (2024-03-26 19:59:08 -0400) dipterix: fixed prototype channel number not set when set from list
* 3dc98c5e (2024-03-26 15:58:46 -0400) dipterix: added options to enable/disable cache; used better file loader with options to use js workers
* 0ef6c1c3 (2024-03-24 00:06:54 -0400) dipterix: fixed UV issues in prototype
* 2c1f30e4 (2024-03-23 22:31:36 -0400) dipterix: allow contact to be fixed (anchor); reduced number of control points to 2; removed `flattern=FALSE` for prototypes; fixed prototype transform issue
* 4351cc4b (2024-03-23 13:26:43 -0400) dipterix: default surface colors
* ad4b4299 (2024-03-23 12:50:09 -0400) dipterix: Implemented drag N drop
* 7fe52479 (origin/master, origin/HEAD, master) (2024-03-19 02:22:22 -0400) dipterix: added remotes
* b53c0725 (origin/custom-electrode-geom, custom-electrode-geom) (2024-03-18 23:49:24 -0400) dipterix: using instancedMesh to represent electrode contacts when prototype is used
* 4cacfd41 (2024-03-16 12:10:03 -0400) dipterix: Multi-representation of electrode
* e3bb38c0 (2024-03-15 12:43:03 -0400) dipterix: added mapToTemplate back
* d5416c4e (2024-03-14 16:04:02 -0400) dipterix: early stop when webgl2 is unavailable
* 4b71dee7 (2024-03-14 15:58:39 -0400) dipterix: no render if webgl2 is disabled
* fa11027f (2024-03-14 15:38:27 -0400) dipterix: Fixing win again
* fe2cc379 (2024-03-14 10:27:31 -0400) dipterix: recompile
* 2313b0a5 (2024-03-07 15:44:35 -0500) dipterix: changed pial surface material depthwrite when transparent
* cf2f1905 (2024-03-05 16:11:19 -0500) dipterix: fixed the electrode values when prototype is used
* 88e10f8d (2024-03-05 14:58:35 -0500) dipterix: js fix
* a6d61c23 (2024-03-05 11:41:38 -0500) dipterix: Added support for QRCode; using flags instead of function to hard update contact positions (may not ready)
* f77c8ee0 (2024-03-04 14:09:00 -0500) dipterix: docs, always docs
* b498b613 (2024-03-04 13:35:16 -0500) dipterix: avoid auto-load geometries; added type string to prototype; added set_matrix_world to set transform of an object
* 6e91dba8 (2024-02-28 12:03:10 -0500) dipterix: added custom electrode shape support
* fe5f2c84 (2024-02-06 13:04:05 -0500) dipterix: added news; cran-comments; allowed plot_slices to be additive
* ca56af1b (origin/win-fix, win-fix) (2024-01-29 22:50:54 -0500) dipterix: fixing the crash issue on windows
* ba3f975b (2024-01-27 09:24:26 -0500) dipterix: removed shader cache in surface shader (may cause window crash
* 8904130d (2024-01-24 11:26:47 -0500) dipterix: updated readme
* 48ea5ea6 (2024-01-23 11:38:31 -0500) dipterix: adjust the implementation of background color and arcball radius; removed additional unsed params from material call; added zindex base to side canvas; added defaultColor to electrodes; fixed localization electrodes color not set correctly issues; completely removed composer effects
* 9785b05d (2024-01-21 02:59:18 -0500) dipterix: trackball uses longer side instead of shorter side as arc radius; mouse position in the canvas is caluclated every mouse down instead of every resizing
* 85bffcbf (2024-01-21 02:57:51 -0500) dipterix: internalize col2hexstr
* 9a5d74ad (2024-01-20 18:04:40 -0500) dipterix: Added brain$electrodes$fix_electrode_color to fix contacts to a color for given clip names; added electrode visibility mode: use threshold only to show contacts that pass threhsold but have no values
* 467eac5d (2024-01-10 14:53:41 -0500) dipterix: more robust controller.load
* 34727c80 (2024-01-09 18:58:58 -0500) dipterix: textsprite depth fix
* c4365bad (2024-01-09 17:57:28 -0500) dipterix: changed default controllers
* 78acc14a (2024-01-09 11:50:44 -0500) dipterix: upgraded threejs to v160 with significant light fix + removed outline pass (using clearcoat instead)
* 56f0e000 (2024-01-09 11:49:32 -0500) dipterix: atlas label also returns atlas IDs
* f0712167 (2024-01-08 13:36:25 -0500) dipterix: if user name rave_slices under fs folder, use it to display T1 slices
* b28a22f5 (2023-12-20 09:52:38 -0500) dipterix: auto adjust T1 brightness when ploting slices
* 28767b24 (2023-12-20 09:45:54 -0500) dipterix: adjust title position
* 77a28c2f (2023-12-20 09:42:42 -0500) dipterix: Added plot_slices to brain class
* 58c66337 (2023-12-19 02:50:24 -0500) dipterix: mesh clipping
* c6f90fee (2023-12-14 15:32:12 -0500) dipterix: Fixed download template subject URL query
* e4092702 (2023-12-05 14:05:28 -0500) dipterix: dev bump
* 10524a4c (2023-12-05 14:05:13 -0500) dipterix: Added default rave_slices in case users want to choose their own slices in the 3D viewer
* a4cac580 (2023-12-05 09:01:22 -0500) dipterix: Allow slices to change gamma
* ff842861 (2023-12-04 19:34:58 -0500) dipterix: make voxel IJK starting from 0
* c139b53c (2023-12-01 10:17:13 -0500) dipterix: Fixed brain electrode mapping; added atlas guesser
* 16defcdb (2023-11-27 14:38:55 -0500) dipterix: Added space transform for electrodes class; set controllers (setFromDictionary) uses try-catch clauses now
* 176e7746 (2023-11-03 17:03:41 -0400) dipterix: Partition datauri so the datauri size does not exceed 65529
* 21e12b51 (2023-11-03 14:55:58 -0400) dipterix: bump version
* a12128c4 (2023-11-03 14:54:05 -0400) dipterix: updated citation
* 06a99127 (2023-11-03 14:53:56 -0400) dipterix: truly standalone viewer
* a5746ca2 (2023-11-03 14:53:27 -0400) dipterix: animation uses new cmap
* af2d2c76 (2023-11-03 14:53:02 -0400) dipterix: added png to dep
* bb773fcb (2023-11-03 14:51:53 -0400) dipterix: Added ACPC alignment, new tubegeom for customized electrode types
* 1b37825a (2023-11-03 14:44:10 -0400) dipterix: allows additional geoms to viewer in brain$plot
* 75e77aec (2023-10-04 12:22:00 -0400) dipterix: using new mac command
* 14f53797 (2023-09-30 18:37:48 -0400) dipterix: plot_slices is column-major
* 0d43840d (2023-09-30 18:28:32 -0400) dipterix: minor patch
* 3503ee49 (2023-09-30 18:27:47 -0400) dipterix: minor patch
* 19a0c0bc (2023-09-30 18:25:59 -0400) dipterix: line-of-sight view (js) and plot_slices (R)
* d019c899 (2023-09-02 20:19:20 -0400) dipterix: bump version
* b121553a (2023-09-02 20:09:55 -0400) dipterix: Fixing CT matrix in js when s/qforms are inconsistent (the coregistration matrix in sform and original matrix in qform)
* aea5c03f (2023-08-23 05:25:30 -0400) dipterix: improved way of calc spacing offsets
* 8be639fa (2023-08-23 04:49:07 -0400) dipterix: Fixed bugs on interpolation with spacing
* 74a871e7 (2023-08-23 00:45:11 -0400) dipterix: specify spacing for inter/extrapolation; removed old interpolation logic; added distanceRatio to prevent large shift (auto adjust)
* 73685b8a (2023-08-23 00:42:43 -0400) dipterix: localization: Outlines are on
* 1da0aa4f (2023-08-18 15:05:38 -0400) dipterix: Update to match the yael paper
* 60b014c3 (2023-07-19 08:13:41 -0400) dipterix: fixing incorrect subcortical label
* 1c98fa37 (2023-07-19 00:46:49 -0400) dipterix: Disabled old format; as_subcortical_label generates correct wm labels
* a909a73f (2023-07-14 16:54:01 -0400) dipterix: let electrodes to be opaque on main but transparent on side canvas
* 3591520e (2023-07-14 16:14:05 -0400) dipterix: added initialization condition
* 0d538d85 (2023-07-14 16:12:03 -0400) dipterix: Let subcortical surfaces to display by default
* 258a7cda (2023-07-14 16:09:47 -0400) dipterix: added get_ijk2ras to get Norig (sform) and Torig (tkr)
* 289153c2 (2023-07-14 00:51:50 -0400) dipterix: minor bug fix and bump
* a48ca697 (2023-07-13 20:37:49 -0400) dipterix: using pial surface center as trackball center
* 1c44190d (2023-07-13 20:23:17 -0400) dipterix: added support for showing subcortical surfaces; fixed depth issues when showing electrodes in side viewers
* bb0fb968 (2023-07-12 21:58:41 -0400) dipterix: fixed freesurfer_lut
* bd75f4e8 (2023-07-12 21:58:23 -0400) dipterix: Dithering the datacube2 to make rendering "smooth"; added `target` arg to pre_render so pre_render also applies to side canvas