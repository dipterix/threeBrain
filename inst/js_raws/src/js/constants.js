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


// Colors
CONSTANTS.COLOR_MAIN_LIGHT = 0xefefef;                  // Color for main camera casting towards objects
CONSTANTS.COLOR_AMBIENT_LIGHT = 0x808080;               // Color for ambient light that lights up all cameras

export { CONSTANTS };
