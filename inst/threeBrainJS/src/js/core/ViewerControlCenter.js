import { Vector3, Matrix4, EventDispatcher } from 'three';
import { CONSTANTS } from './constants.js';
import { is_electrode } from '../geometry/sphere.js';
import { copyToClipboard } from '../utility/copyToClipboard.js';
import { vector3ToString } from '../utility/vector3ToString.js';
import { asColor } from '../utility/color.js';

// 1. Background colors
import { registerPresetBackground } from '../controls/PresetBackground.js';

// 2. Record Videos
import { registerPresetRecorder } from '../controls/PresetRecorder.js';

// 3. Reset Camera
// 4. Camera Position
import { registerPresetMainCamera } from '../controls/PresetMainCamera.js';

// 5. display axis anchor
import { registerPresetCoordinateCompass } from '../controls/PresetCoordinateCompass.js';

// 6. toggle side panel
// 7. reset side panel position
// 8. coronal, axial, sagittal position (depth)
// 9. Electrode visibility in side canvas
import { registerPresetSliceOverlay } from '../controls/PresetSliceOverlay.js';

// 10. subject code
import { registerPresetSwitchSubject } from '../controls/PresetSwitchSubject.js';


// 11. surface type
// 12. Hemisphere material/transparency
// surface color
import { registerPresetSurface } from '../controls/PresetSurface.js';

// 13. electrode visibility, highlight, groups
// 14. electrode mapping
// 15. Highlight selected electrodes and info
import { registerPresetElectrodes } from '../controls/PresetElectrodes.js';

// 16. animation, play/pause, speed, clips...
import { registerPresetElectrodeAnimation } from '../controls/PresetElectrodeAnimation.js';

// 17. Voxel color type
import { registerPresetRaymarchingVoxels } from '../controls/PresetRaymarchingVoxels.js';

// 18. Electrode localization
import { register_controls_localization } from '../controls/localization.js';

// const mouseMoveEvent = { type : "viewerApp.mouse.mousemove" };
const mouseSingleClickEvent = { type : "viewerApp.mouse.singleClick" };
const mouseDoubleClickEvent = { type : "viewerApp.mouse.doubleClick" };

const keyDownEvent = { type : "viewerApp.keyboad.keydown" };
const animationFrameUpdateEvent = { type : "viewerApp.animationFrame.update" };

class ViewerControlCenter extends EventDispatcher {

  /**
   * Initialization, defines canvas (viewer), gui controller (viewer), and settings (initial values)
   */
  constructor( viewerApp ){

    super();

    this.throttleLevel = 4;
    this._updateCount = 0;
    this.canvas = viewerApp.canvas;
    this.gui = viewerApp.controllerGUI;
    this.settings = viewerApp.settings;
    this.userData = {};

    this.electrode_regexp = RegExp('^electrodes-(.+)$');

    this.cache = {};

    this.__localize_electrode_list = [];

    this.animParameters = this.canvas.animParameters;

    this._animOnTimeChange = () => {
      // update time controller
      if( this.ctrlAnimTime !== undefined ) {
        this.ctrlAnimTime.updateDisplay();
      }
    };
    this.animParameters._eventDispatcher.addEventListener( "animation.time.onChange", this._animOnTimeChange )

    // keyboard event dispatcher
    this.canvas.$el.addEventListener( "viewerApp.keyboad.keydown" , this._onKeyDown );
    this.canvas.$mainCanvas.addEventListener( 'mousemove', this._onMouseMove );
    this.canvas.$el.addEventListener( "viewerApp.mouse.click" , this._onClicked );
    this.canvas.$el.addEventListener( "viewerApp.canvas.setSliceCrosshair", this._onSetSliceCrosshair );

    // dead loop...
    // this.canvas.$el.addEventListener( "viewerApp.subject.changed", this.updateSelectorOptions );

    // other keyboard events

    // use `>` to go to next electrode
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_CYCLE_ELECTRODES_NEXT,
      shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      callback  : () => {
        const focusedObject = this.canvas.object_chosen || this.canvas._last_object_chosen;
        let previousObject, firstObject;
        // place flag first as the function might ends early
        this.canvas.needsUpdate = true;

        for( let meshName of this.canvas.mesh.keys() ){
          const obj = this.canvas.mesh.get( meshName );
          if( is_electrode( obj ) && obj.visible ) {

            if( !focusedObject ) {
              this.canvas.focus_object( obj , true );
              return;
            }

            if ( previousObject && previousObject.name === focusedObject.name ) {
              this.canvas.focus_object( obj , true );
              return;
            }

            previousObject = obj;
            if( firstObject === undefined ) { firstObject = obj; }

          }
        }
        if( previousObject !== undefined ){

          if( previousObject.name === focusedObject.name ){
            // focus on the first one
            previousObject = firstObject;
          }
          this.canvas.focus_object( previousObject, true );
        }
      }
    })

    // use `<` to go to previous electrode
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_CYCLE_ELECTRODES_PREV,
      shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      callback  : () => {
        const focusedObject = this.canvas.object_chosen || this.canvas._last_object_chosen;
        let previousObject, firstObject;
        // place flag first as the function might ends early
        this.canvas.needsUpdate = true;

        for( let meshName of this.canvas.mesh.keys() ){
          const obj = this.canvas.mesh.get( meshName );
          if( is_electrode( obj ) && obj.visible ) {

            if( previousObject && focusedObject && obj.name == focusedObject.name ){
              this.canvas.focus_object( previousObject, true );
              return ;
            }
            previousObject = obj;

          }
        }
        if( previousObject ){
          this.canvas.focus_object( previousObject, true );
        }
      }
    })

    // `Ctrl+C` to copy controller
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_COPY_CONTROLLER_DATA,
      shiftKey  : false,
      ctrlKey   : true,
      altKey    : false,
      metaKey   : true,
      metaIsCtrl: true,
      callback  : ( event ) => {
        const data = {
          isThreeBrainControllerData : true,
          controllerData : this.gui.save( true ),
          sliceCrosshair : {}
        };

        // some extra information

        const position = this.canvas.getSideCanvasCrosshairMNI305( new Vector3() );
        const subject = this.canvas.get_state( "target_subject" );
        const subjectData = this.canvas.shared_data.get( subject );

        // position is in tkrRAS
        data.sliceCrosshair.tkrRAS = vector3ToString( position ),

        // position is in Scanner
        position.applyMatrix4( subjectData.matrices.tkrRAS_Scanner );
        data.sliceCrosshair.scannerRAS = vector3ToString( position ),

        // position is in MNI-305
        position.applyMatrix4( subjectData.matrices.xfm );
        data.sliceCrosshair.mni305RAS = vector3ToString( position ),

        // position is in MNI-152
        position.applyMatrix4( new Matrix4().set(
          0.9975,   -0.0073,  0.0176,   -0.0429,
          0.0146,   1.0009,   -0.0024,  1.5496,
          -0.0130,  -0.0093,  0.9971,   1.1840,
          0,        0,        0,        1
        ) );
        data.sliceCrosshair.mni152RAS = vector3ToString( position ),

        copyToClipboard( JSON.stringify( data ) );
      }
    });

    // `Ctrl+V` to set controller from clipboard
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_PASTE_CONTROLLER_DATA,
      shiftKey  : false,
      ctrlKey   : true,
      altKey    : false,
      metaKey   : true,
      metaIsCtrl: true,
      callback  : async () => {
        try {
          await navigator.permissions.query({ name: 'clipboard-read' });
        } catch (e) {}
        const clipText = await navigator.clipboard.readText();

        const data = JSON.parse( clipText );
        if( typeof data === "object" && data !== null && data.isThreeBrainControllerData ) {

          const controllerData = data.controllerData;
          if( controllerData && typeof controllerData === "object") {
            // TODO: filter controllerData
            this.gui.load( controllerData );
          }

        }

      }
    });

    // `z/Z` to zoom-in/out
    this.bindKeyboard({
      codes     : CONSTANTS.KEY_ZOOM,
      // shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      metaIsCtrl: false,
      callback  : ( event ) => {
        const camera = this.canvas.mainCamera;
        let zoom = camera.zoom;
        if( event.shiftKey ) {
          zoom *= 1.2; // zoom in
        } else {
          zoom /= 1.2; // zoom out
        }
        if( zoom > 10 ) { zoom = 10; }
        if( zoom < 0.5 ) { zoom = 0.5; }
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
        this.canvas.needsUpdate = true;
      }
    });

    // Installs driver
    this.canvas.$el.addEventListener( "viewerApp.controller.setValue" , this._onDriveController );

  }

  dispose() {
    this.canvas.$el.removeEventListener( "viewerApp.keyboad.keydown" , this._onKeyDown );
    this.canvas.$mainCanvas.removeEventListener( 'mousemove', this._onMouseMove );
    this.canvas.$el.removeEventListener( "viewerApp.mouse.click" , this._onClicked );
    this.canvas.$el.removeEventListener( "viewerApp.controller.setValue" , this._onDriveController );
    this.canvas.$el.removeEventListener( "viewerApp.canvas.setSliceCrosshair", this._onSetSliceCrosshair );
    // this.canvas.$el.removeEventListener( "viewerApp.subject.changed", this.updateSelectorOptions );
  }

  _onSetSliceCrosshair = ( event ) => {
    if( typeof event.detail.x === "number" ) {
      const controller = this.gui.getController( 'Sagittal (L - R)' );
      if( !controller.isfake ) {
        controller.object[ 'Sagittal (L - R)' ] = event.detail.x;
        controller.updateDisplay();
      }
    }
    if( typeof event.detail.y === "number" ) {
      const controller = this.gui.getController( 'Coronal (P - A)' );
      if( !controller.isfake ) {
        controller.object[ 'Coronal (P - A)' ] = event.detail.y;
        controller.updateDisplay();
      }
    }
    if( typeof event.detail.z === "number" ) {
      const controller = this.gui.getController( 'Axial (I - S)' );
      if( !controller.isfake ) {
        controller.object[ 'Axial (I - S)' ] = event.detail.z;
        controller.updateDisplay();
      }
    }
  }

  _onDriveController = ( event ) => {

    // should be { name, value, folderName }
    const message = event.detail;
    if( typeof message !== "object" || message === null ) { return; }

    if( typeof message.name !== "string" || message.name === "" ) { return; }

    // get controller
    const controller = this.gui.getController( message.name , message.folderName );
    if( !controller || controller.isfake ) {
      console.warn(`Cannot find threeBrain viewer controller: ${ message.name }`);
      return;
    }

    if( controller._disabled ) {
      console.warn(`ThreeBrain viewer controller is disabled: ${ message.name }`);
      return;
    }

    // check controller type
    const classList = controller.domElement.classList;

    // Button
    if( classList.contains( "function" ) ) {
      controller.$button.click();
      return;
    }

    // Color
    if( classList.contains( "color" ) ) {
      controller.setValue(
        asColor( message.value, new Color() ).getHexString()
      );
      return;
    }

    // Boolean
    if( classList.contains( "boolean" ) ) {
      if( message.value ) {
        controller.setValue( true );
      } else {
        controller.setValue( false );
      }
      return;
    }

    // String
    if( classList.contains( "string" ) ) {
      if( typeof message.value === "object" ) {
        controller.setValue( JSON.stringify( message.value ) );
      } else {
        controller.setValue( message.value.toString() );
      }
      return;
    }

    // option
    if( classList.contains( "option" ) ) {
      if(
        Array.isArray( controller._names ) &&
        controller._names.includes( message.value )
      ) {
        controller.setValue( message.value );
      } else {
        console.warn(`ThreeBrain viewer controller [${ message.name }] does not contain option choice: ${ message.value }`);
      }
      return;
    }

    // Number
    if( classList.contains( "number" ) ) {

      if( typeof message.value !== "number" || isNaN( message.value ) ||
          !isFinite( message.value ) ) {
        console.warn(`ThreeBrain viewer controller [${ message.name }] needs a valid (not NaN, Infinity) numerical input.`);
      } else {

        if(
          ( controller._min !== undefined && controller._min > message.value ) ||
          ( controller._max !== undefined && controller._max < message.value )
        ) {
          console.warn(`Trying to ThreeBrain viewer controller [${ message.name }]  numerical value that is out of range.`);
        }

        controller.setValue( message.value );
      }

      return;

    }


    console.warn(`Unimplemented controller type for [${ message.name }].`);

  }

  _onMouseMove = ( event ) => {
    if( this.canvas.activated ) {
      this.canvas._mouseEvent = event;
      // this.dispatchEvent( mouseMoveEvent );
    }
  }

  _onClicked = ( event ) => {
    const clickEvent = event.detail;
    if( this.canvas.activated ) {

      if( clickEvent.detail > 1 ) {
        this.dispatchEvent( mouseDoubleClickEvent );
      } else {
        this.dispatchEvent( mouseSingleClickEvent );
      }
    }
  }

  _onKeyDown = ( event ) => {
    if( this.canvas.activated ) {
      const keyboardEvent = event.detail;

      keyDownEvent.key      = keyboardEvent.key;
      keyDownEvent.code     = keyboardEvent.code;
      keyDownEvent.shiftKey = keyboardEvent.shiftKey;
      keyDownEvent.ctrlKey  = keyboardEvent.ctrlKey;
      keyDownEvent.altKey   = keyboardEvent.altKey;
      keyDownEvent.metaKey  = keyboardEvent.metaKey;

      this.dispatchEvent( keyDownEvent );
    }
    /*
    const keyboardEvent = event.detail;
    const keyboardData = {
      type      : "viewerApp.keyboad.keydown",
      key       : keyboardEvent.key,
      code      : keyboardEvent.code,
      // keyCode   : keyboardEvent.keyCode, // deprecated API, use code instead
      shiftKey  : keyboardEvent.shiftKey,
      ctrlKey   : keyboardEvent.ctrlKey,
      altKey    : keyboardEvent.altKey,
      metaKey   : keyboardEvent.metaKey
    };

    // this event will not be registered to $wrapper and will be bound to this class
    // so auto-disposed when replaced
    this.dispatchEvent( keyboardData );
    */

  }

  bindKeyboard({
    codes, callback, tooltip,
    shiftKey, ctrlKey, altKey,
    metaKey, metaIsCtrl = false
  } = {}) {
    let codeArray;
    if( !Array.isArray( codes ) ) {
      codeArray = [ codes ];
    } else {
      codeArray = codes;
    }
    this.addEventListener( "viewerApp.keyboad.keydown", ( event ) => {
      if( !codeArray.includes( event.code ) ) { return; }
      if( shiftKey !== undefined && ( event.shiftKey !== shiftKey ) ) { return; }
      if( altKey !== undefined && ( event.altKey !== altKey ) ) { return; }
      if( metaIsCtrl ) {
        if( ctrlKey !== undefined || metaKey !== undefined ) {
          if( (ctrlKey || metaKey) !== (event.ctrlKey || event.metaKey) ) { return; }
        }
      } else {
        if( ctrlKey !== undefined && ( event.ctrlKey !== ctrlKey ) ) { return; }
        if( metaKey !== undefined && ( event.metaKey !== metaKey ) ) { return; }
      }
      callback( event );
    });
    if( typeof tooltip === "object" && tooltip !== null ) {
      this.gui.addTooltip(
        tooltip.key,
        tooltip.name,
        tooltip.folderName
      );
    }
  }

  enablePlayback ( enable = true ) {
    if( !this.ctrlAnimPlay ) { return; }
    this.ctrlAnimPlay.setValue( enable );
  }

  updateSelectorOptions() {
    this.updateDataCube2Types();
    // this.set_surface_ctype( true );
    this.canvas.needsUpdate = true;
  }

  updateDataCube2Types(){

    let ctrlDC2Type = this.gui.getController( 'Voxel Type' );
    if( ctrlDC2Type.isfake ) { return; }

    // c.options(['a', 'b'])
    const cube2Types = this.canvas.get_atlas_types();
    cube2Types.push("none");

    let currentValue = ctrlDC2Type.getValue();
    if( !cube2Types.includes( currentValue ) ) { currentValue = 'none'; }

    if(
      cube2Types.length === ctrlDC2Type._values.length &&
      ctrlDC2Type._values.every(item => cube2Types.includes(item))
    ) {
      ctrlDC2Type.setValue( currentValue );
      return;
    }

    ctrlDC2Type._values.length = 0;
    ctrlDC2Type.$select.innerHTML = "";
    cube2Types.forEach(t => {
      const $opt = document.createElement("option");
      $opt.innerHTML = t;
      ctrlDC2Type.$select.appendChild( $opt );
      ctrlDC2Type._values.push( t );
    });

    ctrlDC2Type.setValue( currentValue ).updateDisplay();

  }

  // update gui controllers
  update(){

    if( this._updateCount >= this.throttleLevel ) {
      this._updateCount = 0;
    } else {
      this._updateCount++;
    }
    if( this._updateCount !== 0 ) { return; }

    this.dispatchEvent( animationFrameUpdateEvent );

  }

  /**
   * wrapper for this.canvas.start_animation and pause_animation
   */
  _update_canvas(level = 0){
    if(level >= 0){
      this.canvas.start_animation(level);
    }else{
      this.canvas.pause_animation(-level);
    }
  }

  // priority is deferred or event, see shiny
  // broadcastController: true, false or "auto"; default is "auto", i.e.
  // when data is undefined, broadcast controller, otherwise broadcast data
  // only
  broadcast({ data, priority = "deferred", broadcastController = "auto" } = {}){
    if( typeof data === "object" ) {
      Object.assign( this.userData , data );
      this.dispatchEvent({
        type : "viewerApp.controller.broadcastData",
        data : data,
        priority : priority
      });
      if( broadcastController !== true) { return; }
    }
    this.dispatchEvent({
      type : "viewerApp.controller.change",
      priority : priority
    });
  }

}

ViewerControlCenter = registerPresetBackground( ViewerControlCenter );
ViewerControlCenter = registerPresetRecorder( ViewerControlCenter );
ViewerControlCenter = registerPresetMainCamera( ViewerControlCenter );
ViewerControlCenter = registerPresetCoordinateCompass( ViewerControlCenter );
ViewerControlCenter = registerPresetSliceOverlay( ViewerControlCenter );
ViewerControlCenter = registerPresetSwitchSubject( ViewerControlCenter );
ViewerControlCenter = registerPresetSurface( ViewerControlCenter );
ViewerControlCenter = registerPresetElectrodes( ViewerControlCenter );
ViewerControlCenter = registerPresetElectrodeAnimation( ViewerControlCenter );
ViewerControlCenter = registerPresetRaymarchingVoxels( ViewerControlCenter );
ViewerControlCenter = register_controls_localization( ViewerControlCenter );

export { ViewerControlCenter };
