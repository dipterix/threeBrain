import { EventDispatcher, Vector2, Vector3, Quaternion } from 'three';

const STATE = {
  NONE: - 1,
  ROTATE: 0,
  ZOOM: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_ZOOM_PAN: 4
};
const EPS = 0.000001;

// events
const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

class HauntedArcballControls extends EventDispatcher {
  constructor( canvas ) {
    super();

    this._canvas = canvas;
    this.object = this._canvas.mainCamera;
  	this.domElement = this._canvas.main_canvas;

  	// API

  	this.enabled = true;

  	this.screen = { left: 0, top: 0, width: 0, height: 0 };

  	this.radius = 0;

  	this.rotateSpeed = 1.0;
  	this.zoomSpeed = 1.2;

  	this.noRotate = false;
  	this.noZoom = false;
  	this.noPan = false;
  	this.noRoll = false;

  	this.staticMoving = false;
  	this.dynamicDampingFactor = 0.2;

  	this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

  	// internals
	  this.target = new Vector3();
    this._changed = true;
    this._state = STATE.NONE;
		this._prevState = STATE.NONE;

		this._eye = new Vector3();

		this._rotateStart = new Vector3();
		this._rotateEnd = new Vector3();

		this._zoomStart = new Vector2();
		this._zoomEnd = new Vector2();

		this._touchZoomDistanceStart = 0;
		this._touchZoomDistanceEnd = 0;

		this._panStart = new Vector2();
		this._panEnd = new Vector2();
		this._mouseOnScreen = new Vector2();

		// project mouse to trackball
		this._projectedOnBall = new Vector3();
		this._objectUp = new Vector3();
		this._mouseOnBall = new Vector3();

		// rotation
		this._rotateAxis = new Vector3();
		this._rotateQuaternion = new Quaternion();
		this._isRotating = false;

		// zoom
		this._isZooming = false;

		// pan
		this._panMouseChange = new Vector2(),
		this._panDirection = new Vector3(),
		this._isPanning = false;

		// for reset

  	this.target0 = this.target.clone();
  	this.position0 = this.object.position.clone();
  	this.up0 = this.object.up.clone();

  	this.left0 = this.object.left;
  	this.right0 = this.object.right;
  	this.top0 = this.object.top;
  	this.bottom0 = this.object.bottom;

  	// Specialized for threeBrain
  	this.zoomSpeed = 0.02;
  	this.noPan = false;
  	this.zoomMax = 10;
  	this.zoomMin = 0.5;

  	// Initial radius is 500
  	// orthographic.radius = 400;
  	this.dynamicDampingFactor=0.5;

    // finalize
    this.domElement.addEventListener( 'contextmenu', this.onContextmenu, false );
  	this.domElement.addEventListener( 'mousedown', this.onMousedown, false );
  	this.domElement.addEventListener( 'wheel', this.onMousewheel, false );

  	this.domElement.addEventListener( 'touchstart', this.onTouchstart, false );
  	this.domElement.addEventListener( 'touchend', this.onTouchend, false );
  	this.domElement.addEventListener( 'touchmove', this.onTouchmove, false );

  	window.addEventListener( 'keydown', this.onKeydown, false );
  	window.addEventListener( 'keyup', this.onKeyup, false );

  	this.handleResize();

  	// force an update at start
  	this.update();

  }

  handleResize = () => {

    if ( this.domElement === document ) {

			this.screen.left = 0;
			this.screen.top = 0;
			this.screen.width = window.innerWidth;
			this.screen.height = window.innerHeight;

		} else {

			const box = this.domElement.getBoundingClientRect();
			// adjustments come from similar code in the jquery offset() function
			const d = this.domElement.ownerDocument.documentElement;
			this.screen.left = box.left + window.pageXOffset - d.clientLeft;
			this.screen.top = box.top + window.pageYOffset - d.clientTop;
			this.screen.width = box.width;
			this.screen.height = box.height;

		}

		this.radius = 0.5 * Math.min( this.screen.width, this.screen.height );

		this.left0 = this.object.left;
		this.right0 = this.object.right;
		this.top0 = this.object.top;
		this.bottom0 = this.object.bottom;

  }

  getMouseOnScreen = ( pageX, pageY ) => {
    this._mouseOnScreen.set(
      ( pageX - this.screen.left ) / this.screen.width,
			( pageY - this.screen.top ) / this.screen.height
    );
    return this._mouseOnScreen;
  }

  getMouseProjectionOnBall = ( pageX, pageY, fix_axis = 0 ) => {
		this._mouseOnBall.set(
			( pageX - this.screen.width * 0.5 - this.screen.left ) / this.radius,
			( this.screen.height * 0.5 + this.screen.top - pageY ) / this.radius,
			0.0
		);
		let length = this._mouseOnBall.length();
		if( fix_axis === 1 ){
		  // Fix x
		  this._mouseOnBall.x = 0;
		  length = Math.abs( this._mouseOnBall.y );
		}else if ( fix_axis === 2 ){
		  this._mouseOnBall.y = 0;
		  length = Math.abs( this._mouseOnBall.x );
		}else if ( fix_axis === 3 ){
		  this._mouseOnBall.normalize();
		  length = 1;
		}

		if ( this.noRoll ) {
			if ( length < Math.SQRT1_2 ) {
				this._mouseOnBall.z = Math.sqrt( 1.0 - length * length );
			} else {
				this._mouseOnBall.z = 0.5 / length;
			}
		} else if ( length > 1.0 ) {
			this._mouseOnBall.normalize();
		} else {
			this._mouseOnBall.z = Math.sqrt( 1.0 - length * length );
		}
		this._eye.copy( this.object.position ).sub( this.target );

		this._projectedOnBall.copy( this.object.up ).setLength( this._mouseOnBall.y );
		this._projectedOnBall.add( this._objectUp.copy( this.object.up ).cross( this._eye ).setLength( this._mouseOnBall.x ) );
		this._projectedOnBall.add( this._eye.setLength( this._mouseOnBall.z ) );
		return this._projectedOnBall;

  }

  rotateCamera = () => {

		let angle = Math.acos( this._rotateStart.dot( this._rotateEnd ) / this._rotateStart.length() / this._rotateEnd.length() );

		if( angle ) {
	    // start event
		  this._isRotating = true;
		  this.dispatchEvent( _startEvent );

			this._rotateAxis.crossVectors( this._rotateStart, this._rotateEnd ).normalize();

			angle *= this.rotateSpeed;

			this._rotateQuaternion.setFromAxisAngle( this._rotateAxis, - angle );

			this._eye.applyQuaternion( this._rotateQuaternion );

			this.object.up.applyQuaternion( this._rotateQuaternion );

			this._rotateEnd.applyQuaternion( this._rotateQuaternion );

			if ( this.staticMoving ) {

				this._rotateStart.copy( this._rotateEnd );

			} else {

				this._rotateQuaternion.setFromAxisAngle( this._rotateAxis, angle * ( this.dynamicDampingFactor - 1.0 ) );
				this._rotateStart.applyQuaternion( this._rotateQuaternion );

			}

			this._isRotating = true;

		}else if ( this._isRotating ){
		  this._isRotating = false;
		  this.dispatchEvent( _endEvent );
		}
  }

  zoomCamera = () => {

    if ( this._state === STATE.TOUCH_ZOOM_PAN ) {

			let factor = this._touchZoomDistanceEnd / this._touchZoomDistanceStart;
			this._touchZoomDistanceStart = this._touchZoomDistanceEnd;

      if( Math.abs( factor - 1.0 ) > EPS && factor > 0.0 ){

        // start event
			  this._isZooming = true;
			  this.dispatchEvent( _startEvent );


        this.object.zoom *= factor;
        if( this.object.zoom > this.zoomMax ) {
          this.object.zoom = this.zoomMax;
        } else if ( this.object.zoom < this.zoomMin ) {
          this.object.zoom = this.zoomMin;
        }

        this._changed = true;
      }else if( this._isZooming ){
			  // stop event
			  this._isZooming = false;
			  this.dispatchEvent( _endEvent );
			}

		} else {

			let factor = 1.0 + ( this._zoomEnd.y - this._zoomStart.y ) * this.zoomSpeed;

			if ( Math.abs( factor - 1.0 ) > EPS && factor > 0.0 ) {

			  // start event
			  this._isZooming = true;
			  this.dispatchEvent( _startEvent );

				this.object.zoom /= factor;

				if( this.object.zoom > this.zoomMax ) {

          this.object.zoom = this.zoomMax;
          this._zoomStart.copy( this._zoomEnd );

        } else if ( this.object.zoom < this.zoomMin ) {

          this.object.zoom = this.zoomMin;
          this._zoomStart.copy( this._zoomEnd );

        } else if ( this.staticMoving ) {

					this._zoomStart.copy( this._zoomEnd );

				} else {

					this._zoomStart.y += ( this._zoomEnd.y - this._zoomStart.y ) * this.dynamicDampingFactor;

				}

				this._changed = true;

			}else if( this._isZooming ){
			  // stop event
			  this._isZooming = false;
			  this.dispatchEvent( _endEvent );
			}

		}
  }

  panCamera = () => {
    // this._panMouseChange = new Vector2(),
		// this._panDirection = new Vector3(),
		// this._isPanning = false;
		// this._objectUp
		this._panMouseChange.copy( this._panEnd ).sub( this._panStart );

		if ( this._panMouseChange.lengthSq() > 0.00001 ) {
		  // start event
		  this._isPanning = true;
		  this.dispatchEvent( _startEvent );

			// Scale movement to keep clicked/dragged position under cursor
			let scale_x = ( this.object.right - this.object.left ) / this.object.zoom;
			let scale_y = ( this.object.top - this.object.bottom ) / this.object.zoom;
			this._panMouseChange.x *= scale_x;
			this._panMouseChange.y *= scale_y;

			this._panDirection.copy( this._eye )
			  .cross( this.object.up ).setLength( this._panMouseChange.x );
			this._panDirection.add( this._objectUp.copy( this.object.up ).setLength( this._panMouseChange.y ) );

			this.object.right = this.object.right - this._panMouseChange.x / 2;
			this.object.left = this.object.left - this._panMouseChange.x / 2;
			this.object.top = this.object.top + this._panMouseChange.y / 2;
			this.object.bottom = this.object.bottom + this._panMouseChange.y / 2;

			this.left0 = this.object.left;
  		this.right0 = this.object.right;
  		this.top0 = this.object.top;
  		this.bottom0 = this.object.bottom;

			if ( this.staticMoving ) {

				this._panStart.copy( this._panEnd );

			} else {

				this._panStart.add( this._panMouseChange.subVectors( this._panEnd, this._panStart ).multiplyScalar( this.dynamicDampingFactor ) );

			}

			this._changed = true;

		}else if (this._isPanning){
		  this._isPanning = false;
		  this.dispatchEvent( _endEvent );
		}

  }

  update = () => {
    this._eye.subVectors( this.object.position, this.target );

		if ( ! this.noRotate ) {

			this.rotateCamera();

		}

		if ( ! this.noZoom ) {

			this.zoomCamera();

			if ( this._changed ) {

				this.object.updateProjectionMatrix();

			}

		}

		if ( ! this.noPan ) {

			this.panCamera();

			if ( this._changed ) {

				this.object.updateProjectionMatrix();

			}

		}

		this.object.position.addVectors( this.target, this._eye );

		this.object.lookAt( this.target );

		if ( this._changed ) {

			this.dispatchEvent( _changeEvent );

			this._changed = false;

		}
  }

  lookAt = ({ x , y , z , remember = false } = {}) => {
    if( typeof x === "number" ) { this.target.x = x; }
    if( typeof y === "number" ) { this.target.y = y; }
    if( typeof z === "number" ) { this.target.z = z; }

    if( remember ) {
      this.target0.copy( this.target );
    }
  }

  reset = () => {
    this._state = STATE.NONE;
		this._prevState = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );
		this.object.up.copy( this.up0 );

		this._eye.subVectors( this.object.position, this.target );

		this.object.left = this.left0;
		this.object.right = this.right0;
		this.object.top = this.top0;
		this.object.bottom = this.bottom0;

		this.object.lookAt( this.target );

		this.dispatchEvent( _changeEvent );

		this._changed = false;
  }

  // listeners
  onKeydown = ( event ) => {
    if ( this.enabled === false ) return;
    window.removeEventListener( 'keydown', this.onKeydown );
    this._prevState = this._state;

		if ( this._state !== STATE.NONE ) {
			return;
		} else if ( event.keyCode === this.keys[ STATE.ROTATE ] && ! this.noRotate ) {

			this._state = STATE.ROTATE;

		} else if ( event.keyCode === this.keys[ STATE.ZOOM ] && ! this.noZoom ) {

			this._state = STATE.ZOOM;

		} else if ( event.keyCode === this.keys[ STATE.PAN ] && ! this.noPan ) {

			this._state = STATE.PAN;

		}
  }

  onKeyup = ( event ) => {
    if ( this.enabled === false ) return;

    this._state = this._prevState;

		window.addEventListener( 'keydown', this.onKeydown, false );
  }

  onMousedown = ( event ) => {
    if ( this.enabled === false ) return;
    event.preventDefault();
		event.stopPropagation();

		if ( this._state === STATE.NONE ) {
			this._state = event.button;
		}
		if ( this._state === STATE.ROTATE && ! this.noRotate ) {
		  // fix axis? altKey -> 3, ctrl -> 2, shift -> 1

			this._rotateStart.copy( this.getMouseProjectionOnBall( event.pageX, event.pageY, event.altKey * 3 + event.ctrlKey * 2 + event.shiftKey ) );
			this._rotateEnd.copy( this._rotateStart );
		} else if ( this._state === STATE.ZOOM && ! this.noZoom ) {
		  this._zoomStart.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
			this._zoomEnd.copy( this._zoomStart );
		} else if ( this._state === STATE.PAN && ! this.noPan ) {

			this._panStart.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
			this._panEnd.copy( this._panStart );

		}

		document.addEventListener( 'mousemove', this.onMousemove, false );
		document.addEventListener( 'mouseup', this.onMouseup, false );
    this.dispatchEvent( _startEvent );
  }

  onMousemove = ( event ) => {
    if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( this._state === STATE.ROTATE && ! this.noRotate ) {

			this._rotateEnd.copy( this.getMouseProjectionOnBall( event.pageX, event.pageY, event.altKey * 3 + event.ctrlKey * 2 + event.shiftKey ) );

		} else if ( this._state === STATE.ZOOM && ! this.noZoom ) {

			this._zoomEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );

		} else if ( this._state === STATE.PAN && ! this.noPan ) {

			this._panEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );

		}
  }

  onMouseup = ( event ) => {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		this._state = STATE.NONE;

		document.removeEventListener( 'mousemove', this.onMousemove );
		document.removeEventListener( 'mouseup', this.onMouseup );
		this.dispatchEvent( _endEvent );

	}

	onMousewheel = ( event ) => {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		this._zoomStart.y += event.deltaY * 0.01;
		this.dispatchEvent( _startEvent );
		this.dispatchEvent( _endEvent );

	}

	onTouchstart = ( event ) => {

		if ( this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				this._state = STATE.TOUCH_ROTATE;
				this._rotateStart.copy( this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				this._rotateEnd.copy( this._rotateStart );
				break;

			case 2:
				this._state = STATE.TOUCH_ZOOM_PAN;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				this._touchZoomDistanceEnd = this._touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				this._panStart.copy( this.getMouseOnScreen( x, y ) );
				this._panEnd.copy( this._panStart );
				break;

			default:
				this._state = STATE.NONE;

		}
		this.dispatchEvent( _startEvent );

	}

	onTouchmove = ( event ) => {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1:
				this._rotateEnd.copy( this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				break;

			case 2:
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				this._touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				this._panEnd.copy( this.getMouseOnScreen( x, y ) );
				break;

			default:
				this._state = STATE.NONE;

		}

	}

	onTouchend = ( event ) => {

		if ( this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				this._rotateEnd.copy( this.getMouseProjectionOnBall( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				this._rotateStart.copy( this._rotateEnd );
				break;

			case 2:
				this._touchZoomDistanceStart = this._touchZoomDistanceEnd = 0;

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				this._panEnd.copy( this.getMouseOnScreen( x, y ) );
				this._panStart.copy( this._panEnd );
				break;

		}

		this._state = STATE.NONE;
		this.dispatchEvent( _endEvent );

	}

	onContextmenu = ( event ) => {

		event.preventDefault();

	}

  dispose = () => {
    this.domElement.removeEventListener( 'contextmenu', this.onContextmenu, false );
		this.domElement.removeEventListener( 'mousedown', this.onMousedown, false );
		this.domElement.removeEventListener( 'wheel', this.onMousewheel, false );

		this.domElement.removeEventListener( 'touchstart', this.onTouchstart, false );
		this.domElement.removeEventListener( 'touchend', this.onTouchend, false );
		this.domElement.removeEventListener( 'touchmove', this.onTouchmove, false );

		document.removeEventListener( 'mousemove', this.onMousemove, false );
		document.removeEventListener( 'mouseup', this.onMouseup, false );

		window.removeEventListener( 'keydown', this.onKeydown, false );
		window.removeEventListener( 'keyup', this.onKeyup, false );
  }
}

export { HauntedArcballControls };
