import { Vector3 } from 'three';
// Defined all the constants

const CONSTANTS = {};

/* ------------------------------------ Layer setups ------------------------------------
  Defines for each camera which layers are visible.
  Protocols are
    Layers:
      - 0, 2, 3: Especially reserved for main camera
      - 1, Shared by all cameras
      - 4, 5, 6: Reserved for side-cameras
      - 7: reserved for all, system reserved
      - 8: main camera only, system reserved
      - 9 side-cameras 1 only, system reserved
      - 10 side-cameras 2 only, system reserved
      - 11 side-cameras 3 only, system reserved
      - 12 side-cameras 4 only, system reserved
      - 13 all side cameras, system reserved
      - 14~31 invisible

*/

CONSTANTS.LAYER_USER_MAIN_CAMERA_0 = 0;           // User use, main camera only
CONSTANTS.LAYER_USER_ALL_CAMERA_1 = 1;            // User use, all cameras visible
CONSTANTS.LAYER_USER_ALL_SIDE_CAMERAS_4 = 4;      // User use, all side cameras
CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 = 7;            // System reserved, all cameras
CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 = 8;            // System reserved, main cameras only
CONSTANTS.LAYER_SYS_CORONAL_9 = 9;                // System reserved, coronal camera only
CONSTANTS.LAYER_SYS_AXIAL_10 = 10;                 // System reserved, axial camera only
CONSTANTS.LAYER_SYS_SAGITTAL_11 = 11;              // System reserved, sagittal camera only
CONSTANTS.LAYER_SYS_ALL_SIDE_CAMERAS_13 = 13;      // System reserved, all side cameras visible
CONSTANTS.LAYER_SYS_RAYCASTER_14 = 14;               // System reserved, raycaster use
CONSTANTS.LAYER_INVISIBLE_31 = 31;                   // invisible layer, but keep rendered
/* ------------------------------------ Global constants ------------------------------------
*/

// reorder render depth to force renders to render objects with maximum render order first
CONSTANTS.MAX_RENDER_ORDER = 9999999;
CONSTANTS.VEC_ORIGIN = new Vector3( 0, 0, 0 );
// Anatomcal axis RAS is the normal XYZ, LAI is the other direction
CONSTANTS.VEC_ANAT_R = new Vector3( 1, 0, 0 );
CONSTANTS.VEC_ANAT_A = new Vector3( 0, 1, 0 );
CONSTANTS.VEC_ANAT_S = new Vector3( 0, 0, 1 );
CONSTANTS.VEC_ANAT_L = new Vector3( -1, 0, 0 );
CONSTANTS.VEC_ANAT_P = new Vector3( 0, -1, 0 );
CONSTANTS.VEC_ANAT_I = new Vector3( 0, 0, -1 );

// You can only change which key is pressed. However, you cannot change shift & ctrl or alt
// To do that you must go into the code
CONSTANTS.KEY_ZOOM                    = "KeyZ";         // `z/⇧Z` - zoom out/in
CONSTANTS.KEY_CYCLE_LEFT              = "BracketLeft";  // `[` - cycle through left hemisphere material
CONSTANTS.KEY_CYCLE_RIGHT             = "BracketRight"; // `]` - cycle through right hemisphere material
CONSTANTS.KEY_CYCLE_LEFT_OPACITY      = "BracketLeft";  // `⇧[` - cycle through left hemisphere opacity
CONSTANTS.KEY_CYCLE_RIGHT_OPACITY     = "BracketRight"; // `⇧[` - cycle through right hemisphere opacity
CONSTANTS.KEY_CYCLE_SURFACE_COLOR     = "KeyK";         // `k` - cycling surface color type
CONSTANTS.KEY_CYCLE_ELECTRODES_NEXT   = "Period";       // `.` - choosing next electrodes
CONSTANTS.KEY_CYCLE_ELECTRODES_PREV   = "Comma";        // `,` - choosing previous electrodes
CONSTANTS.KEY_CYCLE_ELEC_VISIBILITY   = "KeyV";         // `v` - toggle electrode visibility
CONSTANTS.KEY_TOGGLE_ELEC_LABEL_VISIBILITY   = "KeyV";  // `⇧V` - toggle electrode label visibility
CONSTANTS.KEY_CYCLE_SURFACE           = "KeyP";         // `p` - cycle through surfaces types
CONSTANTS.KEY_CYCLE_MATERIAL          = "KeyM";         // `⇧M` - change surface material types (lighting model)
CONSTANTS.KEY_CYCLE_ATLAS_MODE        = "KeyL";         // `l` - cycle through voxel display mode
CONSTANTS.KEY_OVERLAY_CORONAL         = "KeyC";         // `⇧C` - toggle coronal plane in main scene
CONSTANTS.KEY_OVERLAY_AXIAL           = "KeyA";         // `⇧A` - toggle axial plane in main scene
CONSTANTS.KEY_OVERLAY_SAGITTAL        = "KeyS";         // `⇧S` - toggle sagittal plane in main scene
CONSTANTS.KEY_MOVE_CORONAL            = "KeyE";         // `q/⇧Q` - move coronal forward/backward
CONSTANTS.KEY_MOVE_AXIAL              = "KeyQ";         // `w/⇧W` - move axial forward/backward
CONSTANTS.KEY_MOVE_SAGITTAL           = "KeyW";         // `e/⇧E` - move sagittal forward/backward
CONSTANTS.KEY_CYCLE_ANIMATION         = "KeyD";         // `d/⇧D` - cycle through animation clips or values
CONSTANTS.KEY_TOGGLE_ANIMATION        = "KeyS";         // `s` - play/pause timer
CONSTANTS.KEY_COPY_CONTROLLER_DATA    = "KeyC";         // `Ctrl+c` - copy the controller data to clipboard
CONSTANTS.KEY_PASTE_CONTROLLER_DATA   = "KeyV";         // `Ctrl+v` - paste the controller data from clipboard
CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_R = "Digit1";     // `1/⇧1` - adjust electrode locations along Right/Left axis
CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_A = "Digit2";     // `2/⇧2` - adjust electrode locations along Anterior/Posterior axis
CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_S = "Digit3";     // `3/⇧3` - adjust electrode locations along Superior/Inferior axis
CONSTANTS.KEY_CYCLE_ELEC_EDITOR       = "Backquote";    // `` ` `` - cycle through electrodes (localization, experimental)
CONSTANTS.KEY_CYCLE_SURFTYPE_EDITOR   = "Digit4";       // `4` - toggle electrode type (surface ot iEEG, experimental)
CONSTANTS.KEY_NEW_ELECTRODE_EDITOR    = "Digit1";       // `1` - new electrode (experimental)
CONSTANTS.KEY_LABEL_FOCUS_EDITOR      = "Digit2";       // `2` - quick edit label (experimental)
CONSTANTS.KEY_CYCLE_REMOVE_EDITOR     = "KeyR";         // `r` - remove editor key (experimental)

CONSTANTS.TOOLTIPS = {};
CONSTANTS.TOOLTIPS.KEY_ZOOM                    = "z/Z";
CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT              = "[";
CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT             = "]";
CONSTANTS.TOOLTIPS.KEY_CYCLE_LEFT_OPACITY      = "⇧[";
CONSTANTS.TOOLTIPS.KEY_CYCLE_RIGHT_OPACITY     = "⇧]";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ELECTRODES_NEXT   = ".";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ELECTRODES_PREV   = ",";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ELEC_VISIBILITY   = "v";
CONSTANTS.TOOLTIPS.KEY_TOGGLE_ELEC_LABEL_VISIBILITY   = "⇧V";
CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE           = "p";
CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFACE_COLOR     = "k";
CONSTANTS.TOOLTIPS.KEY_CYCLE_MATERIAL          = "⇧M";
CONSTANTS.TOOLTIPS.KEY_OVERLAY_CORONAL         = "⇧C";
CONSTANTS.TOOLTIPS.KEY_OVERLAY_AXIAL           = "⇧A";
CONSTANTS.TOOLTIPS.KEY_OVERLAY_SAGITTAL        = "⇧S";
CONSTANTS.TOOLTIPS.KEY_MOVE_CORONAL            = "e/E";
CONSTANTS.TOOLTIPS.KEY_MOVE_AXIAL              = "q/Q";
CONSTANTS.TOOLTIPS.KEY_MOVE_SAGITTAL           = "w/W";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ANIMATION         = "d/D";
CONSTANTS.TOOLTIPS.KEY_TOGGLE_ANIMATION        = "s";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ELEC_EDITOR       = "`";
CONSTANTS.TOOLTIPS.KEY_CYCLE_SURFTYPE_EDITOR   = "4";
CONSTANTS.TOOLTIPS.KEY_NEW_ELECTRODE_EDITOR    = "1";
CONSTANTS.TOOLTIPS.KEY_LABEL_FOCUS_EDITOR      = "2";
CONSTANTS.TOOLTIPS.KEY_CYCLE_REMOVE_EDITOR     = "r";
CONSTANTS.TOOLTIPS.KEY_CYCLE_ATLAS_MODE        = "l";
CONSTANTS.TOOLTIPS.KEY_COPY_CONTROLLER_DATA    = "ctrl+c";
CONSTANTS.TOOLTIPS.KEY_PASTE_CONTROLLER_DATA   = "ctrl+v";
CONSTANTS.TOOLTIPS.KEY_ADJUST_ELECTRODE_LOCATION_R = "1/⇧1";
CONSTANTS.TOOLTIPS.KEY_ADJUST_ELECTRODE_LOCATION_A = "2/⇧2";
CONSTANTS.TOOLTIPS.KEY_ADJUST_ELECTRODE_LOCATION_S = "3/⇧3";

// Regular expressions
CONSTANTS.REGEXP_SURFACE_GROUP    = /^Surface - (.+) \((.+)\)$/;  // Surface - pial (YAB)
CONSTANTS.REGEXP_VOLUME_GROUP     = /^Volume - (.+) \((.+)\)$/;   // Volume - brain.finalsurfs (YAB)
CONSTANTS.REGEXP_ELECTRODE_GROUP  = /^Electrodes \((.+)\)$/;                  // Electrodes (YAB)
CONSTANTS.REGEXP_SURFACE          = /^([\w ]+) (Left|right) Hemisphere - (.+) \((.+)\)$/;   // Standard 141 Left Hemisphere - pial (YAB)
CONSTANTS.REGEXP_ATLAS            = /^Atlas - ([^\(\)]+)\s\(/;  // Atlas - aparc_aseg (YAB)
CONSTANTS.REGEXP_VOLUME           = /^(.+) \((.+)\)$/;                   // brain.finalsurfs (YAB)
CONSTANTS.REGEXP_ELECTRODE        = /^(.+), ([0-9]+) - (.*)$/;     // YAB, 1 - pSYLV12

// Colors
CONSTANTS.COLOR_MAIN_LIGHT = 0xefefef;                  // Color for main camera casting towards objects
CONSTANTS.COLOR_AMBIENT_LIGHT = 0x808080;               // Color for ambient light that lights up all cameras

// freemesh
CONSTANTS.DEFAULT_COLOR = 0;
CONSTANTS.VERTEX_COLOR = 1;
CONSTANTS.VOXEL_COLOR = 2;
CONSTANTS.ELECTRODE_COLOR = 3;

// dat.GUI folders
CONSTANTS.FOLDERS = {
  'background-color'      : 'Default',
  'sync-viewers'          : 'Default',
  'video-recorder'        : 'Default',
  'reset-main-camera'     : 'Default',
  'main-camera-position'  : 'Default',
  'toggle-helpper'        : 'Default',
  'toggle-side-panels'    : 'Volume Settings',
  'reset-side-panels'     : 'Volume Settings',
  'side-three-planes'     : 'Volume Settings',
  'side-electrode-dist'   : 'Volume Settings',
  'atlas'                 : 'Volume Settings',
  'subject-selector'      : 'Surface Settings',
  'surface-selector'      : 'Surface Settings',
  'hemisphere-material'   : 'Surface Settings',
  'electrode-style'       : 'Electrode Settings',
  'electrode-mapping'     : 'Electrode Settings',
  'animation'             : 'Data Visualization',
  'highlight-selection'   : 'Data Visualization',
  'localization'          : 'Electrode Localization'
};

CONSTANTS.THRESHOLD_OPERATORS = [
  'v = T1',
  '|v| < T1',
  '|v| >= T1',
  'v < T1',
  'v >= T1',
  'v in [T1, T2]',
  'v not in [T1,T2]'
];

/**
 * .renderOrder : Number
This value allows the default rendering order of scene graph objects to be overridden although opaque and transparent objects remain sorted independently. When this property is set for an instance of Group, all descendants objects will be sorted and rendered together. Sorting is from lowest to highest renderOrder. Default value is 0.
 */
CONSTANTS.RENDER_ORDER = {
  'DataCube2' : -1,
  'DataCube'  : CONSTANTS.MAX_RENDER_ORDER - 1
};


CONSTANTS.SINGLETONS = {
  "line-segments" : "line_segments_singleton"
};


export { CONSTANTS };
