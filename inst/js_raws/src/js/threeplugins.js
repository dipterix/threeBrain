
/*
* This file adds plugins to THREE
*/

import * as _three from './three.module.js';
import { register_lut } from './Math/Lut.js';
import { register_orthographic_controls } from './controls/OrthographicTrackballControls.js';
import { register_octree } from './threeoctree.js';
import { register_volumeShader1 } from './shaders/VolumeShader.js';

let THREE = register_lut( _three );

THREE = register_orthographic_controls( THREE );
THREE = register_octree( THREE );
THREE = register_volumeShader1( THREE );

export { THREE };
