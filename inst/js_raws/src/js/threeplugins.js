
/*
* This file adds plugins to THREE
*/

import * as _three from '../build/three.module.js';
import { register_lut } from './Math/Lut.js';
import { register_orthographic_controls } from './controls/OrthographicTrackballControls.js';
// import { register_octree } from './threeoctree.js';
import { register_volumeShader1 } from './shaders/VolumeShader.js';
import { register_volume2DShader1 } from './shaders/Volume2DShader.js';
import { add_text_sprite } from './ext/text_sprite.js';
import { register_raycast_volume } from './Math/raycast_volume.js'

let THREE = register_lut( _three );

THREE = register_orthographic_controls( THREE );
// THREE = register_octree( THREE );
THREE = register_volumeShader1( THREE );
THREE = register_volume2DShader1( THREE );
THREE = add_text_sprite( THREE );
THREE = register_raycast_volume( THREE );

export { THREE };
