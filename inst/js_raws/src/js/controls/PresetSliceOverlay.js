import { has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import { Vector3 } from 'three';

// 6. toggle side panel
// 7. reset side panel position
// 8. coronal, axial, sagittal position (depth)
// 9. Electrode visibility in side canvas

function registerPresetSliceOverlay( ViewerControlCenter ){

  ViewerControlCenter.prototype.addPreset_enableSidePanel = function(){
    const folderName = CONSTANTS.FOLDERS[ 'toggle-side-panels' ];
    const initialDisplay = this.settings.side_display || false;

    const controller = this.gui.addController(
      'Show Panels', true, { folderName: folderName })
      .onChange((v) => {
        if( v ){
          this.canvas.enableSideCanvas();
        }else{
          this.canvas.disableSideCanvas();
        }
        this.fire_change({ 'side_display' : v });
      })
      .setValue( initialDisplay );

    this.canvas.bind(
      "canvasDriveEnableSideCanvas",
      "canvas.drive.enableSideCanvas",
      ( event ) => {
        // { enable : true }
        controller.setValue( event.detail.enable );
      }
    );
  };

  ViewerControlCenter.prototype.addPreset_resetSidePanel = function(){
    const folderName = CONSTANTS.FOLDERS[ 'reset-side-panels' ],
          sideCameraZoom = this.settings.side_canvas_zoom,
          sidePanelWidth = this.settings.side_canvas_width,
          sidePanelOffset = this.settings.side_canvas_shift;
    this.canvas._sideCanvasCSSWidth = sidePanelWidth;
    const resetSidePanels = () => {
      this.canvas.resetSideCanvas( sideCameraZoom, sidePanelWidth, sidePanelOffset );
    };
    const resetController = this.gui.addController(
      'Reset Position', resetSidePanels, { folderName: folderName });

    this.canvas.bind(
      "canvasDriveResetSideCanvas",
      "canvas.drive.resetSideCanvas",
      resetSidePanels
    );

    // reset first
    resetSidePanels();
  }

  ViewerControlCenter.prototype.setSlice = function( args ) {
    const activeSlice = this.canvas.get_state("activeSliceInstance");
    if( !activeSlice || !activeSlice.isDataCube ) { return; }
    activeSlice.setCrosshair( args );
  }
  ViewerControlCenter.prototype.showSlices = function( slices, show = true ) {
    const activeSlice = this.canvas.get_state( "activeSliceInstance" );
    if( !activeSlice || !activeSlice.isDataCube ) { return; }
    if( show ) {
      activeSlice.showSlices( slices );
    } else {
      activeSlice.hideSlices( slices );
    }
  }
  ViewerControlCenter.prototype.addPreset_sideSlices = function(){
    const folderName = CONSTANTS.FOLDERS[ 'side-three-planes' ];

    // TODO set initial value
    const controllerCoronal = this.gui.addController(
      'Coronal (P - A)', 0, { folderName : folderName }
    ).min(-128).max(128).step(0.1).decimals( 1 ).onChange((v) => {
      /*
      const activeSlice = this.canvas.get_state("activeSliceInstance");
      if( activeSlice && activeSlice.isDataCube ) {
        activeSlice.setCrosshair({ y: v });
      }
      this.fire_change({ 'coronal_depth' : v });
      */
      this.setSlice({ y : v });
    });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_CORONAL, 'Coronal (P - A)', folderName );

    const controllerAxial = this.gui
      .addController('Axial (I - S)', 0, { folderName : folderName })
      .min(-128).max(128).step(0.1).decimals( 1 ).onChange((v) => {
        this.setSlice({ z : v });
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_AXIAL, 'Axial (I - S)', folderName );

    const controllerSagittal = this.gui
      .addController('Sagittal (L - R)', 0, { folderName : folderName })
      .min(-128).max(128).step(0.1).decimals( 1 ).onChange((v) => {
        this.setSlice({ x : v });
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_MOVE_SAGITTAL, 'Sagittal (L - R)', folderName );

    const controllerCrosshair = this.gui
      .addController( 'Intersect MNI305', "0.00, 0.00, 0.00", { folderName: folderName } )

    this.canvas.bind(
      "ControllerIntersectionCoordinateNeedsUpdate",
      "canvas.sliceCrosshair.onChange",
      ( event ) => {
        // position should be Vector3. don't change this object
        // { position: new Vector3(...) }
        if( event.detail && event.detail.position && event.detail.position.isVector3 ) {
          const crosshair = this.canvas.getSideCanvasCrosshairMNI305( event.detail.position.clone() );
          const displayText = `${crosshair.x.toFixed(1)}, ${crosshair.y.toFixed(1)}, ${crosshair.z.toFixed(1)}`
          controllerCrosshair.object[ controllerCrosshair._name ] = displayText;
          controllerCrosshair.updateDisplay();
        }
      }
    );

    /*
    [ _controller_coronal, _controller_axial, _controller_sagittal ].forEach((_c, ii) => {

      this.canvas.bind( `dat_gui_side_controller_${ii}_mousewheel`, 'mousewheel',
        (evt) => {
          if( evt.altKey ){
            evt.preventDefault();
            const current_val = _c.getValue();
            _c.setValue( current_val + evt.deltaY );
          }
        }, _c.domElement );

    });
    */

    this.canvas.bind( `canvasDriveSetSliceCrosshair`, 'canvas.drive.setSliceCrosshair',
      (evt) => {
        evt.preventDefault();
        if( typeof evt.detail.x === "number" ) {
          controllerSagittal.setValue( evt.detail.x );
        }
        if( typeof evt.detail.y === "number" ) {
          controllerCoronal.setValue( evt.detail.y );
        }
        if( typeof evt.detail.z === "number" ) {
          controllerAxial.setValue( evt.detail.z );
        }
        if( evt.detail.centerCrosshair ) {
          this.canvas.sideCanvasList.coronal.zoom();
          this.canvas.sideCanvasList.sagittal.zoom();
          this.canvas.sideCanvasList.axial.zoom();
        }
      });

    const controllerOverlayCoronal = this.gui
      .addController('Overlay Coronal', false, { folderName : folderName })
      .onChange((v) => {
        this.showSlices( 'coronal', v );
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_CORONAL, 'Overlay Coronal', folderName );

    const controllerOverlayAxial = this.gui
      .addController('Overlay Axial', false, { folderName : folderName })
      .onChange((v) => {
        this.showSlices( 'axial', v );
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_AXIAL, 'Overlay Axial', folderName );

    const controllerOverlaySagittal = this.gui
      .addController('Overlay Sagittal', false, { folderName : folderName })
      .onChange((v) => {
        this.showSlices( 'sagittal', v );
      });
    this.gui.addTooltip( CONSTANTS.TOOLTIPS.KEY_OVERLAY_SAGITTAL, 'Overlay Sagittal', folderName );

    // register overlay keyboard shortcuts
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_CORONAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = controllerOverlayCoronal.getValue();
        controllerOverlayCoronal.setValue( !_v );
      }
    }, 'overlay_coronal');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_CORONAL, (evt) => {
      const _v = controllerOverlayCoronal.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        controllerOverlayCoronal.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        controllerOverlayCoronal.setValue( _v + 1 );
      }
    }, 'move_coronal');


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_AXIAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = controllerOverlayAxial.getValue();
        controllerOverlayAxial.setValue( !_v );
      }
    }, 'overlay_axial');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_AXIAL, (evt) => {
      const _v = controllerOverlayAxial.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        controllerOverlayAxial.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        controllerOverlayAxial.setValue( _v + 1 );
      }
    }, 'move_axial');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_OVERLAY_SAGITTAL, (evt) => {
      if( has_meta_keys( evt.event, true, false, false ) ){
        const _v = controllerOverlaySagittal.getValue();
        controllerOverlaySagittal.setValue( !_v );
      }
    }, 'overlay_sagittal');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_MOVE_SAGITTAL, (evt) => {
      const _v = controllerOverlaySagittal.getValue();
      if( has_meta_keys( evt.event, true, false, false ) ){
        controllerOverlaySagittal.setValue( _v - 1 );
      }else if( has_meta_keys( evt.event, false, false, false ) ){
        controllerOverlaySagittal.setValue( _v + 1 );
      }
    }, 'move_sagittal');

    this.canvas.bind( `canvasDriveSetSliceOverlay`, 'canvas.drive.setSliceOverlay',
      (evt) => {
        //
        if( typeof evt.detail.x === "boolean" ) {
          controllerOverlaySagittal.setValue( evt.detail.x );
        }
        if( typeof evt.detail.y === "boolean" ) {
          controllerOverlayCoronal.setValue( evt.detail.y );
        }
        if( typeof evt.detail.z === "boolean" ) {
          controllerOverlayAxial.setValue( evt.detail.z );
        }
      });
  }

  ViewerControlCenter.prototype.addPreset_sideViewElectrodeThreshold = function(){
    const folderName = CONSTANTS.FOLDERS[ 'side-electrode-dist' ];
    // show electrodes trimmed
    this.gui.addController('Dist. Threshold', 0, { folderName : folderName })
      .min(0).max(64).step(0.1)
      .onChange((v) => {
        this.canvas.updateElectrodeVisibilityOnSideCanvas( v );
        this._update_canvas();
        this.fire_change();
      })
      .setValue( 2 );
  }

  return( ViewerControlCenter );

}

export { registerPresetSliceOverlay };
