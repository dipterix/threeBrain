import { THREE } from './threeplugins.js';
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

/* ------------------------------------ Global constants ------------------------------------
*/

// reorder render depth to force renders to render objects with maximum render order first
CONSTANTS.MAX_RENDER_ORDER = 9999999;
CONSTANTS.VEC_ORIGIN = new THREE.Vector3( 0, 0, 0 );
// Anatomcal axis RAS is the normal XYZ, LAI is the other direction
CONSTANTS.VEC_ANAT_R = new THREE.Vector3( 1, 0, 0 );
CONSTANTS.VEC_ANAT_A = new THREE.Vector3( 0, 1, 0 );
CONSTANTS.VEC_ANAT_S = new THREE.Vector3( 0, 0, 1 );
CONSTANTS.VEC_ANAT_L = new THREE.Vector3( -1, 0, 0 );
CONSTANTS.VEC_ANAT_P = new THREE.Vector3( 0, -1, 0 );
CONSTANTS.VEC_ANAT_I = new THREE.Vector3( 0, 0, -1 );

// You can only change which key is pressed. However, you cannot change shift & ctrl or alt
// To do that you must go into the code
CONSTANTS.KEY_ZOOM                    = 'KeyZ';         // z for zoom out and Z for zoom in
CONSTANTS.KEY_CYCLE_LEFT              = 'BracketLeft';  // [ for cycle through left hemisphere material
CONSTANTS.KEY_CYCLE_RIGHT             = 'BracketRight'; // ] for cycle through right hemisphere material
CONSTANTS.KEY_CYCLE_ELECTRODES_NEXT   = 'Period';       // "." for choosing next electrodes
CONSTANTS.KEY_CYCLE_ELECTRODES_PREV   = 'Comma';        // "," for choosing previous electrodes
CONSTANTS.KEY_CYCLE_ELEC_VISIBILITY   = 'KeyV';         // 'v' for cycling through visible, hide inactive, hidden
CONSTANTS.KEY_CYCLE_SURFACE           = 'KeyP';         // "p" for cycle through surfaces
CONSTANTS.KEY_OVERLAY_CORONAL         = 'KeyC';         // 'C' for coronal
CONSTANTS.KEY_OVERLAY_AXIAL           = 'KeyA';         // 'A' for axial
CONSTANTS.KEY_OVERLAY_SAGITTAL        = 'KeyS';         // 'S' for sagittal
CONSTANTS.KEY_MOVE_CORONAL            = 'KeyE';         // 'Q' for moving coronal f/b
CONSTANTS.KEY_MOVE_AXIAL              = 'KeyQ';         // 'W' for moving axial f/b
CONSTANTS.KEY_MOVE_SAGITTAL           = 'KeyW';         // 'E' for moving sagittal f/b
CONSTANTS.KEY_CYCLE_ANIMATION         = 'KeyC';         // 'c' for cycling through animation clips
CONSTANTS.KEY_TOGGLE_ANIMATION        = 'KeyS';         // 's' for play/paus animation
CONSTANTS.KEY_CYCLE_ELEC_EDITOR       = 'Backquote';    // '`' for cycling through electrodes (localization)
CONSTANTS.KEY_CYCLE_SURFTYPE_EDITOR   = 'Digit4';       // '4' for toggle electrode type (surface ot iEEG)
CONSTANTS.KEY_NEW_ELECTRODE_EDITOR    = 'Digit1';       // '1' new electrode
CONSTANTS.KEY_LABEL_FOCUS_EDITOR      = 'Digit2';       // '2' for quick edit label
CONSTANTS.KEY_CYCLE_REMOVE_EDITOR     = 'KeyR';

// Regular expressions
CONSTANTS.REGEXP_SURFACE_GROUP    = /^Surface - (.+) \((.+)\)$/;  // Surface - pial (YAB)
CONSTANTS.REGEXP_VOLUME_GROUP     = /^Volume - (.+) \((.+)\)$/;   // Volume - brain.finalsurfs (YAB)
CONSTANTS.REGEXP_ELECTRODE_GROUP  = /^Electrodes \((.+)\)$/;                  // Electrodes (YAB)
CONSTANTS.REGEXP_SURFACE          = /^([\w ]+) (Left|right) Hemisphere - (.+) \((.+)\)$/;   // Standard 141 Left Hemisphere - pial (YAB)
CONSTANTS.REGEXP_VOLUME           = /^(.+) \((.+)\)$/;                   // brain.finalsurfs (YAB)
CONSTANTS.REGEXP_ELECTRODE        = /^(.+), ([0-9]+) - (.*)$/;     // YAB, 1 - pSYLV12

// Colors
CONSTANTS.COLOR_MAIN_LIGHT = 0xefefef;                  // Color for main camera casting towards objects
CONSTANTS.COLOR_AMBIENT_LIGHT = 0x808080;               // Color for ambient light that lights up all cameras


// dat.GUI folders
CONSTANTS.FOLDERS = {
  'background-color'      : 'Default',
  'sync-viewers'          : 'Default',
  'video-recorder'        : 'Main Canvas',
  'reset-main-camera'     : 'Main Canvas',
  'main-camera-position'  : 'Main Canvas',
  'toggle-helpper'        : 'Main Canvas',
  'toggle-side-panels'    : 'Side Canvas',
  'reset-side-panels'     : 'Side Canvas',
  'side-three-planes'     : 'Side Canvas',
  'side-electrode-dist'   : 'Side Canvas',
  'subject-selector'      : 'Surface Settings',
  'surface-selector'      : 'Surface Settings',
  'hemisphere-material'   : 'Surface Settings',
  'electrode-style'       : 'Electrodes',
  'electrode-mapping'     : 'Electrodes',
  'animation'             : 'Data Visualization'
};







export { CONSTANTS };
