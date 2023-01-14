/* mesh objects that always stays at the corner of canvas */

import { CONSTANTS } from '../core/constants.js';
import { Object3D, Vector3, ArrowHelper, Color, Mesh, MeshBasicMaterial, DoubleSide } from 'three';
import { TextSprite } from '../ext/text_sprite.js';


class Compass {
  constructor( camera, control, text = 'RAS' ){
    this._camera = camera;
    this._control = control;
    this._text = text;

    this.container = new Object3D();

    this._left = new Vector3();
    this._down = new Vector3();

    const color = new Color();
    const direction = new Vector3();
    const origin = new Vector3( 0 , 0 , 0 );
    const rotation = ['rotateZ', null, 'rotateX'];

    for( let ii in text ){
      // const geom = new CylinderGeometry( 0.5, 0.5, 3, 8 );
      const _c = [0,0,0];
      _c[ ii ] = 1;
      color.fromArray( _c );
      direction.fromArray( _c );
      _c[ ii ] = 255;

      // const line = new Mesh( geom, new MeshBasicMaterial({ color: color, side: DoubleSide }) );
      // if( rotation[ii] ) { line[ rotation[ii] ]( Math.PI / 2 ); }

      const axis = new ArrowHelper( direction, origin, 6, color.getHex(), 5.9 );
      const sprite = new TextSprite(text[ ii ], 6, `rgba(${_c[0]}, ${_c[1]}, ${_c[2]}, 1)`);
      sprite.position.copy( direction ).multiplyScalar( 9 );

      axis.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      sprite.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
      this.container.add( axis );
      this.container.add( sprite );

    }

  }

  update(){
    if( this.container.visible ) {

      const aspRatio = (this._camera.top - this._camera.bottom) / (this._camera.right - this._camera.left);
      const zoom = 1 / this._camera.zoom;

      this._down.copy( this._camera.position ).sub( this._control.target ).normalize();

      this.container.position.copy( this._camera.position )
        .sub( this._down.multiplyScalar( 40 ) );

      // calculate shift-left
      this._left.copy( this._camera.up ).cross( this._down ).normalize()
        .multiplyScalar( ( this._camera.left + this._camera.right ) / 2 );
        // .multiplyScalar( ( this._camera.left + 10 * zoom + ( -150 * ( zoom - 1 ) ) ) );

      this._down.copy( this._camera.up ).normalize()
        .multiplyScalar( ( this._camera.bottom + 10 * zoom + ( -150 * ( zoom - 1 ) ) * aspRatio ) );

      this.container.position.add( this._left ).add( this._down );
      this.container.scale.set( zoom, zoom, zoom );

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
