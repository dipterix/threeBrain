import { CONSTANTS } from './constants.js';
import { Vector3, OrthographicCamera, DirectionalLight, WebGLRenderer } from 'three';
import { get_element_size } from '../utils.js';
import { makeDraggable } from '../utility/draggable.js';
import { makeResizable } from '../utility/resizable.js';

class SideCanvas {

  get zIndex () {
    const re = parseInt( this.$el.style.zIndex );
    if( isNaN(re) ) { return( 0 ); }
    return re
  }
  set zIndex (v) {
    this.$el.style.zIndex = v;
  }

  set enabled( v ) {
    if( v ) {
      this._enabled = true;
	    this.$el.style.display = 'block';
    } else {
      this._enabled = false;
	    this.$el.style.display = 'none';
    }
  }

  get enabled () {
    return this._enabled;
  }

  zoom( level ) {
    if( level ) {
      this.zoomLevel = level;
    }
    if( this.zoomLevel > 10 ) { this.zoomLevel = 10; }
    if( this.zoomLevel < 1.05 ) { this.zoomLevel = 1; }
    const cameraMargin = 128 / this.zoomLevel;
    const maxTranslate = 128 - cameraMargin;

    // get depths
    let translateX = this.mainCanvas.get_state( 'sagittal_depth' ) || 0,
        translateY = this.mainCanvas.get_state( 'coronal_depth' ) || 0,
        translateZ = this.mainCanvas.get_state( 'axial_depth' ) || 0;

    if( translateX > maxTranslate ) { translateX = maxTranslate; }
    if( translateX < -maxTranslate ) { translateX = -maxTranslate; }
    if( translateY > maxTranslate ) { translateY = maxTranslate; }
    if( translateY < -maxTranslate ) { translateY = -maxTranslate; }
    if( translateZ > maxTranslate ) { translateZ = maxTranslate; }
    if( translateZ < -maxTranslate ) { translateZ = -maxTranslate; }

    this.camera.left = -cameraMargin;
    this.camera.right = cameraMargin;
    this.camera.bottom = -cameraMargin;
    this.camera.top = cameraMargin;

    switch ( this.type ) {
      case 'coronal':
        this.camera.position.fromArray( [translateX, -500, translateZ] );
        break;
      case 'axial':
        this.camera.position.fromArray( [translateX, translateY, 500] );
        break;
      case 'sagittal':
        this.camera.position.fromArray( [-500, translateY, translateZ] );
        break;
      default:
        throw 'SideCanvas: type must be coronal, sagittal, or axial';
    }
    this._lookAt.set( translateX, translateY, translateZ );
    this.camera.lookAt( this._lookAt );
    this.camera.updateProjectionMatrix();
    this.mainCanvas.start_animation(0);
  }

  raiseTop() {
    if( !this.mainCanvas.sideCanvasEnabled ) { return }

    const sideCanvasCollection = this.mainCanvas.sideCanvasList;

    let zIndex = [
      [parseInt(sideCanvasCollection.coronal.zIndex), 'coronal'],
      [parseInt(sideCanvasCollection.axial.zIndex), 'axial'],
      [parseInt(sideCanvasCollection.sagittal.zIndex), 'sagittal']
    ];
    zIndex.sort((v1,v2) => {return(v1[0] - v2[0])});
    zIndex.forEach((v, ii) => {
      const type = v[ 1 ];
      sideCanvasCollection[ type ].zIndex = ii;
    });
    this.zIndex = 4;
  }

  reset({
    zoomLevel = false, position = true, size = true, crosshair = false
  } = {}) {
    let width, height, offsetX, offsetY;
    if( position === true ) {
      offsetX = 0;
      offsetY = this.order * width;
    } else if (Array.isArray(position) && position.length == 2) {
      offsetX = position[0];
      offsetY = position[1];
    }
    if( size === true ) {
      const defaultWidth = Math.ceil( this.mainCanvas.side_width );
      width = defaultWidth;
      height = defaultWidth;
    }
    this.setDimension({
      width   : width,
      height  : height,
      offsetX : offsetX,
      offsetY : offsetY
    });

    if( zoomLevel === true ) {
      this.zoom( 1 );
    } else if( typeof zoomLevel === "number" ) {
      if( zoomLevel > 10 ) { zoomLevel = 10; }
      if( zoomLevel < 1 ) { zoomLevel = 1; }
      this.zoom( zoomLevel );
    }
    if( crosshair ) {
      this.mainCanvas.setSliceCrosshair({ x : 0, y : 0, z : 0, immediate : false });
      // this.setCrosshair({ x : 0, y : 0, z : 0, immediate : false });
    }
  }
  setDimension({ width, height, offsetX, offsetY } = {}) {
    // ignore height
    let w = width ?? height;
    if( w === undefined && offsetX === undefined && offsetY === undefined) {
      return;
    }
    if( w === undefined ) {
      w = Math.ceil( this.mainCanvas.side_width );
    }
    if( w <= 10 ) {
      w = 10;
    }
    this.$el.style.width = `${w}px`;
    this.$el.style.height = `${w}px`;
    this.$canvas.style.width = '100%';
		this.$canvas.style.height = '100%';

    let _offsetX = Math.round( offsetX || 0 );
    let _offsetY = Math.round( offsetY || (this.order * w) );
    if( _offsetX === 0 ) { _offsetX = '0'; } else { _offsetX = `${_offsetX}px`; }
    if( _offsetY === 0 ) { _offsetY = '0'; } else { _offsetY = `${_offsetY}px`; }

    this.$el.style.left = _offsetX;
    this.$el.style.top = _offsetY;

  }

  _calculateCrosshair( event ) {
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const canvasPosition = this.$canvas.getBoundingClientRect(); // left, top
    const canvasSize = get_element_size( this.$canvas );

    const right = event.clientX - canvasPosition.left - canvasSize[0]/2;
    const up = canvasSize[1]/2 + canvasPosition.top - event.clientY;

    this.raiseTop();
    this.pan({
      right : right, up : up, unit : "css",
      updateMainCamera : event.shiftKey
    });
  }


  render() {
    if( !this._enabled ) { return; }
    this.renderer.clear();

    this.renderer.render( this.mainCanvas.scene, this.camera );
  }

  dispose() {
    this.$header.removeEventListener( "dblclick" , this._onDoubleClick );
    this.$zoomIn.removeEventListener( "click" , this._onZoomInClicked );
    this.$zoomIn.removeEventListener( "click" , this._onZoomOutClicked );
    this.$recenter.removeEventListener( "click" , this._onRecenterClicked );
    this.$reset.removeEventListener( "click" , this._onResetClicked );

    this.$canvas.removeEventListener( "mousedown" , this._onMouseDown );
    this.$canvas.removeEventListener( "contextmenu" , this._onContextMenu );
    this.$canvas.removeEventListener( "mouseup" , this._onMouseUp );
    this.$canvas.removeEventListener( "mousemove" , this._onMouseMove );
    this.$canvas.removeEventListener( "mousewheel" , this._onMouseWheel );
    this.renderer.dispose();
  }

  setBackground( color ) {
    this._backgroundColor = color;
    this.renderer.setClearColor( color );
    this.$el.style.backgroundColor = color;
  }


  pan({ right = 0, up = 0, unit = "css", updateMainCamera = false } = {}) {
    //  this.raiseTop();

    // data is xy coord relative to $canvas
    let depthX, depthY;
    if( unit === "css" ) {
      const canvasSize = get_element_size( this.$canvas );
      const canvasRenderSize = 256 / this.zoomLevel;
      depthX = right / canvasSize[0] * canvasRenderSize;
      depthY = up / canvasSize[1] * canvasRenderSize;
    } else {
      depthX = right;
      depthY = up;
    }

    let sagittalDepth, coronalDepth, axialDepth;
    switch ( this.type ) {
      case 'coronal':
        sagittalDepth = depthX + this._lookAt.x;
        coronalDepth = this.mainCanvas.get_state( 'coronal_depth' );
        axialDepth = depthY + this._lookAt.z;
        break;
      case 'axial':
        sagittalDepth = depthX + this._lookAt.x;
        coronalDepth = depthY + this._lookAt.y;
        axialDepth = this.mainCanvas.get_state( 'axial_depth' );
        break;
      case 'sagittal':
        sagittalDepth = this.mainCanvas.get_state( 'sagittal_depth' );
        coronalDepth = -depthX + this._lookAt.y;
        axialDepth = depthY + this._lookAt.z;
        break;
      default:
        throw 'SideCanvas: type must be coronal, sagittal, or axial';
    }

    // console.log(`x: ${depthX}, y: ${depthY} of [${canvasSize[0]}, ${canvasSize[1]}]`);
    // console.log(`x: ${sagittalDepth}, y: ${coronalDepth}, z: ${axialDepth}`);

    // update slice depths
    this.mainCanvas.setSliceCrosshair({
      x : sagittalDepth,
      y : coronalDepth,
      z : axialDepth, immediate : false });
    // need to update mainCamera
    if( updateMainCamera ) {
      const newMainCameraPosition = new Vector3()
        .set( sagittalDepth, coronalDepth, axialDepth )
        .normalize().multiplyScalar(500);
      if( newMainCameraPosition.length() === 0 ) {
        newMainCameraPosition.x = 500;
      }

      // make S up as much as possible, try to heads up
      const newMainCameraUp = this.mainCanvas.mainCamera.position.clone()
        .cross( new Vector3(0, 0, 1) ).cross( newMainCameraPosition )
        .normalize();

      if( newMainCameraUp.z < 0 ) {
        newMainCameraUp.multiplyScalar(-1);
      }

      this.mainCanvas.mainCamera.position.copy( newMainCameraPosition );
      this.mainCanvas.mainCamera.up.copy( newMainCameraUp );
    }
  }

  constructor ( mainCanvas, type = "coronal" ) {

    this.type = type;
    switch ( this.type ) {
      case 'coronal':
        this.order = 0;
        this._headerText = "CORONAL (R=R)"
        break;
      case 'axial':
        this.order = 1;
        this._headerText = "AXIAL (R=R)"
        break;
      case 'sagittal':
        this.order = 2;
        this._headerText = "SAGITTAL";
        break;
      default:
        throw 'SideCanvas: type must be coronal, sagittal, or axial';
    }

    this.mainCanvas = mainCanvas;
    this.zoomLevel = 1;
    this.pixelRatio = this.mainCanvas.pixel_ratio[1];

    this._enabled = true;
    this._lookAt = new Vector3( 0, 0, 0 );
    this._container_id = mainCanvas.container_id;
    const _w = this.mainCanvas.client_width ?? 256;
    const _h = this.mainCanvas.client_height ?? 256;
    this._renderHeight = 256;
    this._canvasHeight = this._renderHeight * this.mainCanvas.pixel_ratio[1];

    this.$el = document.createElement('div');
    this.$el.id = this._container_id + '__' + type;
    this.$el.style.display = 'none';
    this.$el.className = 'THREEBRAIN-SIDE resizable';
    this.$el.style.zIndex = this.order;
    this.$el.style.top = ( this.order * this.mainCanvas.side_width ) + 'px';

    // Make header
    this.$header = document.createElement('div');
    this.$header.innerText = this._headerText; //type.toUpperCase();
    this.$header.className = 'THREEBRAIN-SIDE-HEADER';
    this.$header.id = this._container_id + '__' + type + 'header';
    this.$el.appendChild( this.$header );

    // Add side canvas element
    this.$canvas = document.createElement('canvas');
    this.$canvas.width = this._canvasHeight;
    this.$canvas.height = this._canvasHeight;
    this.$canvas.style.width = '100%';
		this.$canvas.style.height = '100%';
		this.$canvas.style.position = 'absolute';
		this.$el.appendChild( this.$canvas );
		this.context = this.$canvas.getContext('webgl2');

		this.renderer = new WebGLRenderer({
    	  antialias: false, alpha: true,
    	  canvas: this.$canvas, context: this.context,
    	  depths: false
    	});
  	this.renderer.setPixelRatio( this.mainCanvas.pixel_ratio[1] );
  	this.renderer.autoClear = false; // Manual update so that it can render two scenes
  	this.renderer.setSize( this._renderHeight, this._renderHeight );

		// Add widgets
		// zoom in tool
		this.$zoomIn = document.createElement('div');
		this.$zoomIn.className = 'zoom-tool';
		this.$zoomIn.style.top = '23px'; // for header
		this.$zoomIn.innerText = '+';
		this.$el.appendChild( this.$zoomIn );

		// zoom out tool
    this.$zoomOut = document.createElement('div');
		this.$zoomOut.className = 'zoom-tool';
		this.$zoomOut.style.top = '50px'; // header + $zoomIn
		this.$zoomOut.innerText = '-';
		this.$el.appendChild( this.$zoomOut );

		// toggle pan (translate) tool
		this.$recenter = document.createElement('div');
		this.$recenter.className = 'zoom-tool';
		this.$recenter.style.top = '77px'; // header + $zoomIn + $zoomOut
		this.$recenter.innerText = 'C';
		this.$el.appendChild( this.$recenter );


		this.$reset = document.createElement('div');
		this.$reset.className = 'zoom-tool';
		this.$reset.style.top = '104px'; // header + $zoomIn + $zoomOut + $recenter
		this.$reset.innerText = '0';
		this.$el.appendChild( this.$reset );

		// Add resize anchors to bottom-right
		this.$resizeWrapper = document.createElement('div');
		this.$resizeWrapper.className = 'resizers';
		const $resizeAnchor = document.createElement('div');
		$resizeAnchor.className = 'resizer bottom-right';
		this.$resizeWrapper.appendChild( $resizeAnchor );
		this.$el.appendChild( this.$resizeWrapper );

		// Make header draggable within viewer
    makeDraggable( this.$el, this.$header, undefined, () => {
      this.raiseTop();
    });


    // Make $el resizable, keep current width and height
    makeResizable( this.$el, true );


    // --------------- Register 3js objects -------------
    // Add OrthographicCamera

    // need to see ranges from +- 128 * sqrt(3) ~= +-222
    // The distance to origin is 500, hence the render range is:
    //  near = 500 - 222 = 278
    //  far  = 500 + 222 = 722
    this.camera = new OrthographicCamera( -128, 128, 128, -128, 278, 722 );
		this.camera.layers.enable( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
		this.camera.layers.enable( CONSTANTS.LAYER_USER_ALL_SIDE_CAMERAS_4 );
		this.camera.layers.enable( 5 );
		this.camera.layers.enable( 6 );
		this.camera.layers.enable( 7 );
		this.camera.layers.enable( CONSTANTS.LAYER_SYS_ALL_SIDE_CAMERAS_13 );

		// Side light is needed so that side views are visible.
		this.directionalLight = new DirectionalLight( 0xefefef, 0.5 );

		switch ( this.type ) {
      case 'coronal':
        this.camera.position.fromArray( [0, -500, 0] );
        this.camera.up.set( 0, 0, 1 );
        this.camera.layers.enable( CONSTANTS.LAYER_SYS_CORONAL_9 );
        this.directionalLight.position.fromArray([0, -500, 0]); // set direction from P to A
        this.directionalLight.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
        break;
      case 'axial':
        this.camera.position.fromArray( [0, 0, 500] );
        this.camera.up.set( 0, 1, 0 );
        this.camera.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
        this.directionalLight.position.fromArray([0, 0, 500]); // set direction from I to S
        this.directionalLight.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
        break;
      case 'sagittal':
        this.camera.position.fromArray( [-500, 0, 0] );
        this.camera.up.set( 0, 0, 1 );
        this.camera.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
        this.directionalLight.position.fromArray([-500, 0, 0]); // set direction from L to R
        this.directionalLight.layers.set( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
        break;
      default:
        throw 'SideCanvas: type must be coronal, sagittal, or axial';
    }
    this.camera.lookAt( this._lookAt );
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    // this.camera.add( this.directionalLight );

    this.mainCanvas.add_to_scene( this.camera, true );
    this.mainCanvas.add_to_scene( this.directionalLight, true );
    this.mainCanvas.wrapper_canvas.appendChild( this.$el );


    // ---- Bind events --------------------------------------------------------
    // double-click on header to reset position
    this.$header.addEventListener( "dblclick" , this._onDoubleClick );
    this.$zoomIn.addEventListener( "click" , this._onZoomInClicked );
    this.$zoomOut.addEventListener( "click" , this._onZoomOutClicked );
    this.$recenter.addEventListener( "click" , this._onRecenterClicked );
    this.$reset.addEventListener( "click" , this._onResetClicked );

    this.$canvas.addEventListener( "mousedown" , this._onMouseDown );
    this.$canvas.addEventListener( "contextmenu" , this._onContextMenu );
    this.$canvas.addEventListener( "mouseup" , this._onMouseUp );
    this.$canvas.addEventListener( "mousemove" , this._onMouseMove );
    this.$canvas.addEventListener( "mousewheel" , this._onMouseWheel );
  }

  _onResetClicked = () => {
	  this.$canvas.style.top = '0';
    this.$canvas.style.left = '0';
	  this.zoom( 1 );
	}

  _onMouseDown = ( evt ) => {
    evt.preventDefault();
    this._focused = true;
    this._calculateCrosshair( evt );
  }

  _onContextMenu = ( evt ) => {
    evt.preventDefault();
  }

  _onMouseUp = ( evt ) => {
    evt.preventDefault();
    this._focused = false;
  }

  _onMouseMove = ( evt ) => {
    if( !this._focused ) { return; }
    evt.preventDefault();
    this._calculateCrosshair( evt );
  }

  _onMouseWheel = ( evt ) => {
    evt.preventDefault();
    const depthName = this.type + '_depth';
    console.log(depthName);
    let currentDepth = this.mainCanvas.get_state( depthName );
    if( evt.deltaY > 0 ){
      currentDepth += 0.5;
    }else if( evt.deltaY < 0 ){
      currentDepth -= 0.5;
    }
    this.mainCanvas.set_state( depthName, currentDepth );

    switch (this.type) {
      case 'sagital':
        this.mainCanvas.setSliceCrosshair({ x : currentDepth })
        break;
      case 'coronal':
        this.mainCanvas.setSliceCrosshair({ y : currentDepth })
        break;
      case 'axial':
        this.mainCanvas.setSliceCrosshair({ z : currentDepth })
        break;
      default:
        // code
    }
  }

  _onRecenterClicked = () => {
    this.zoom();
  }

  _onZoomOutClicked = () => {
    let newZoomLevel = this.zoomLevel / 1.2;
	  this.zoom( newZoomLevel );
  }

  _onZoomInClicked = () => {
    let newZoomLevel = this.zoomLevel * 1.2;
	  this.zoom( newZoomLevel );
  }
  _onDoubleClick = () => {
    this.reset({ zoomLevel : false, position : true, size : true })
  }

}

export{ SideCanvas };
