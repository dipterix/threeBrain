import {
  Vector2, Vector3, Matrix3, Matrix4, OrthographicCamera, DirectionalLight
} from 'three';
import { CONSTANTS } from './constants.js';

const DEFAULT_CAMERA_LEFT = 150;

class HauntedOrthographicCamera extends OrthographicCamera {
  constructor ( canvas, width, height, near = 1, far = 10000 ) {
    super(
      -DEFAULT_CAMERA_LEFT, DEFAULT_CAMERA_LEFT,
      height / width * DEFAULT_CAMERA_LEFT,
      -height / width * DEFAULT_CAMERA_LEFT, near, far );

    this._canvas = canvas;

    this._originalPosition = new Vector3( 500, 0, 0 );

    // getState()
    this._stateTarget = new Vector3( 500, 0, 0 );
    this._stateUp = new Vector3( 500, 0, 0 );
    this._statePosition = new Vector3( 500, 0, 0 );

    this.position.copy( this._originalPosition );
		this.up.set(0,0,1);
		this.layers.set( CONSTANTS.LAYER_USER_MAIN_CAMERA_0 );
		this.layers.enable( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
		this.layers.enable( 2 );
		this.layers.enable( 3 );
		this.layers.enable( CONSTANTS.LAYER_SYS_ALL_CAMERAS_7 );
		this.layers.enable( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
		this.lookAt( CONSTANTS.VEC_ORIGIN ); // Force camera

		// Main camera light, casting from behind the mainCamera, only light up objects in CONSTANTS.LAYER_SYS_MAIN_CAMERA_8
		this.backLight = new DirectionalLight( CONSTANTS.COLOR_MAIN_LIGHT , 0.5 );
    this.backLight.position.copy( CONSTANTS.VEC_ANAT_I );
    this.backLight.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
    this.backLight.name = 'main light - directional';
    this.add( this.backLight );


  }

  handleResize() {
    const _ratio1 = this._canvas.client_height / this._canvas.client_width
    const _ratio2 = ( this.right - this.left ) / ( this.top - this.bottom );
	  this.top = _ratio1 * ( this.top * _ratio2 ||  DEFAULT_CAMERA_LEFT );
	  this.bottom = _ratio1 * ( this.bottom * _ratio2 || -DEFAULT_CAMERA_LEFT );
    this.updateProjectionMatrix();
  }

  setPosition({ x, y, z, forceZUp = false, remember = false, updateProjection = true } = {}) {
    if( typeof x === "number" ) { this.position.x = x; }
    if( typeof y === "number" ) { this.position.y = y; }
    if( typeof z === "number" ) { this.position.z = z; }

    if( this.position.length() < 0.00001 ) {
      this.position.set(0, 0, 500);
    }
    this.position.normalize().multiplyScalar( 500 );

    if( forceZUp ) {
      if( this.position.x !== 0 || this.position.y !== 0 ) {
        this.up.set( 0, 0, 1 );
      } else {
        this.up.set( 0, 1, 0 );
      }
    }

    if( remember ) {
      this._originalPosition.copy( this.position );
    }
    if( updateProjection ) {
      this.updateProjectionMatrix();
    }
  }

  setPosition2( str ) {
    // str can be left, right, anterior, posterior, superior, inferior
    const str2 = str.toLowerCase()[0];
    switch (str2) {
      case 'r':
        this.position.set( 500, 0, 0 );
        this.up.set( 0, 0, 1 );
        break;
      case 'l':
        this.position.set( -500, 0, 0 );
        this.up.set( 0, 0, 1 );
        break;
      case 'a':
        this.position.set( 0, 500, 0 );
        this.up.set( 0, 0, 1 );
        break;
      case 'p':
        this.position.set( 0, -500, 0 );
        this.up.set( 0, 0, 1 );
        break;
      case 's':
        this.position.set( 0, 0, 500 );
        this.up.set( 0, 1, 0 );
        break;
      case 'i':
        this.position.set( 0, 0, -500 );
        this.up.set( 0, 1, 0 );
        break;
    }
  }

  setZoom({ zoom, updateProjection = true } = {}) {
    if( zoom !== undefined ){
      this.zoom = zoom;
      if( updateProjection ) {
        this.updateProjectionMatrix();
      }
    }
  }

  reset({ fov = true, position = true, zoom = true } = {}) {

    if( fov ) {
      const _ratio = this._canvas.client_height / this._canvas.client_width;
      this.left = -DEFAULT_CAMERA_LEFT;
      this.right = DEFAULT_CAMERA_LEFT;
      this.top = _ratio * DEFAULT_CAMERA_LEFT;
      this.bottom = - _ratio * DEFAULT_CAMERA_LEFT;
    }

    if( position ) {
      this.setPosition( { updateProjection : false } );

      if( this.position.x !== 0 || this.position.y !== 0 ) {
        this.up.set( 0, 0, 1 );
      } else {
        this.up.set( 0, 1, 0 );
      }
    }
    if( zoom ) {
      this.setZoom( { zoom: 1, updateProjection : false } );
    }
    this.updateProjectionMatrix();

  }

  getState() {

    return({
      //[-1.9612333761590435, 0.7695650079159719, 26.928547456443564]
      'target' : this.localToWorld( this._stateTarget.set(0, 0, 0) ),

      // [0.032858884967361716, 0.765725462595094, 0.6423276497335524],
      'up' : this._stateUp.copy( this.up ),

      //[-497.73726242493797, 53.59986825131752, -10.689109034020102]
      'position': this._statePosition.copy( this.position ),

      'zoom' : this.zoom
    });
  }
}

export { HauntedOrthographicCamera };
