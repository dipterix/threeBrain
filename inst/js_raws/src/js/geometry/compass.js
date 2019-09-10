/* mesh objects that always stays at the corner of canvas */

import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';


class Compass {
  constructor( camera, control, text = 'RAS' ){
    this._camera = camera;
    this._control = control;
    this._text = text;

    this.container = new THREE.Group();

    for( let ii in text ){
      let geom = new THREE.CylinderGeometry( 0.5, 0.5, 3, 8 );
      let _c = [0,0,0];
      _c[ ii ] = 1;
      let color = new THREE.Color().fromArray( _c );
      let line = new THREE.Mesh( geom, new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }) );
      line.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

      let _tmp = ['rotateZ', null, 'rotateX'][ii];
      if( _tmp ){
        line[ _tmp ]( Math.PI / 2 );
      }

      this.container.add( line );

      _c[ ii ] = 255;
      let sprite = new THREE.TextSprite(text[ ii ], 3, `rgba(${_c[0]}, ${_c[1]}, ${_c[2]}, 1)`);
      _c[ ii ] = 5;
      sprite.position.fromArray( _c );
      sprite.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this.container.add( sprite );
    }

  }

  update(){
    this.container.position.copy( this._camera.up )
      .cross( this._camera.position )
      .normalize()
      .multiplyScalar( this._camera.left + 10 )
      .add( this._camera.up.clone().multiplyScalar( this._camera.bottom + 10 ) )
      .multiplyScalar( 1 / this._camera.zoom )
      .add( this._control.target );
  }

  set_visibility( visible, callback ){
    this.container.visible = (visible === true);
    if( typeof callback === 'function' ){
      callback();
    }
  }

}



export { Compass };
