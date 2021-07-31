
/*
* This file adds plugins to THREE
*/

import * as _three from '../build/three.module.js';
import { register_lut } from './Math/Lut.js';
import { register_orthographic_controls } from './core/OrthographicTrackballControls.js';
// import { register_octree } from './threeoctree.js';
import { register_volumeShader1 } from './shaders/VolumeShader.js';
import { register_volume2DShader1 } from './shaders/Volume2DShader.js';
import { add_text_sprite } from './ext/text_sprite.js';
import { register_raycast_volume } from './Math/raycast_volume.js'
import { regisater_convexhull } from './ext/geometries/ConvexHull.js'

let THREE = register_lut( _three );

THREE = register_orthographic_controls( THREE );
// THREE = register_octree( THREE );
THREE = register_volumeShader1( THREE );
THREE = register_volume2DShader1( THREE );
THREE = add_text_sprite( THREE );
THREE = register_raycast_volume( THREE );
THREE = regisater_convexhull( THREE );

THREE.as_Matrix4 = (m) => {
  const re = new THREE.Matrix4();
  if(!Array.isArray(m)){ return(re); }

  if( m.length <= 4 ){
    try {
      const m1 = m[3] || [0,0,0,1];
      re.set(...m[0],...m[1],...m[2], ...m1);
    } catch (e) {}
    return( re );
  }
  // else m length is either 12 or 16
  if( m.length == 12 ) {
    re.set(...m, 0,0,0,1);
  } if (m.length == 16) {
    re.set(...m);
  }
  return( re );
};

export { THREE };
