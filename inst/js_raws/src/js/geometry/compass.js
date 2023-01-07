/* mesh objects that always stays at the corner of canvas */

import { CONSTANTS } from '../constants.js';
import { Group, CylinderGeometry, Color, Mesh, MeshBasicMaterial, DoubleSide } from 'three';
import { TextSprite } from '../ext/text_sprite.js';


class Compass {
  constructor( camera, control, text = 'RAS' ){
    this._camera = camera;
    this._control = control;
    this._text = text;

    this.container = new Group();

    for( let ii in text ){
      let geom = new CylinderGeometry( 0.5, 0.5, 3, 8 );
      let _c = [0,0,0];
      _c[ ii ] = 1;
      let color = new Color().fromArray( _c );
      let line = new Mesh( geom, new MeshBasicMaterial({ color: color, side: DoubleSide }) );
      line.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

      let _tmp = ['rotateZ', null, 'rotateX'][ii];
      if( _tmp ){
        line[ _tmp ]( Math.PI / 2 );
      }

      this.container.add( line );

      _c[ ii ] = 255;
      let sprite = new TextSprite(text[ ii ], 3, `rgba(${_c[0]}, ${_c[1]}, ${_c[2]}, 1)`);
      _c[ ii ] = 5;
      sprite.position.fromArray( _c );
      sprite.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this.container.add( sprite );
    }

  }

  update(){
    if( this.container.visible ) {
      this.container.position.copy( this._camera.up )
        .cross( this._camera.position )
        .normalize()
        .multiplyScalar( this._camera.left + 10 )
        .add( this._camera.up.clone().multiplyScalar( this._camera.bottom + 10 ) )
        .multiplyScalar( 1 / this._camera.zoom )
        .add( this._control.target );
    }
  }

  set_visibility( visible, callback ){
    this.container.visible = (visible === true);
    if( typeof callback === 'function' ){
      callback();
    }
  }

}



export { Compass };
