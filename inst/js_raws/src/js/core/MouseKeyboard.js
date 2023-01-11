import { ThrottledEventDispatcher } from './ThrottledEventDispatcher.js';
import { ViewerApp } from './ViewerApp.js';
import { CONSTANTS } from '../constants.js';

class MouseKeyboard extends ThrottledEventDispatcher {

  // private
  #app;

  // static
  static OFF_VIEWER     = 0b00000;
  static ON_VIEWER      = 0b00001;
  static ON_CORONAL     = 0b00010;
  static ON_SAGITTAL    = 0b00100;
  static ON_AXIAL       = 0b01000;
  static ON_CONTROLLER  = 0b10000;

  /**
   * mouse down: (immediate)
   *    if left-button, activate trackball to rotate
   *    if right-button, activate trackball to pan
   *    in the meanwhile, remember state
   * mouse up: (immediate)
   *    deactivate trackball
   *    de-remember state
   * mouse click: (delayed)
   *    focus object
   *    if double-clicked, then do nothing
   *    if mouse is still down, do nothing
   *    otherwise:
   *      if left-click, focus object
   *      if right-click, focus object and set crosshair
   * mouse double-click:
   *    send to shiny
   *
   *
   * 1. click fires after both the mousedown and mouseup events have fired,
   * in that order.
   *
   * 2. The MouseEvent object passed into the event handler for click has its
   * detail property set to the number of times the target was clicked. In
   * other words, detail will be 2 for a double-click, 3 for triple-click,
   * and so forth. Therefore, we should use one listener for both single click
   * and double-click events.
   * */

  constructor ( app ) {
    super( app.$wrapper );

    this.#app = app;
    this.mouseLocation = MouseKeyboard.OFF_VIEWER;
    this._mouseDownHold = false;
    this.timeout = 300;


    this.#app.$wrapper.addEventListener(
      "mouseenter", this.#onViewerFocused );
    this.#app.$wrapper.addEventListener(
      "mouseleave", this.#onViewerBlurred );
    this.#app.$controllerContainer.addEventListener(
      "mouseenter", this.#onControllerFocused );
    this.#app.$controllerContainer.addEventListener(
      "mouseleave", this.#onControllerBlurred );

    this.#app.canvas.sideCanvasList.coronal.$el.addEventListener(
      "mouseenter", this.#onCoronalViewFocused );
    this.#app.canvas.sideCanvasList.coronal.$el.addEventListener(
      "mouseleave", this.#onCoronalViewBlurred );
    this.#app.canvas.sideCanvasList.axial.$el.addEventListener(
      "mouseenter", this.#onAxialViewFocused );
    this.#app.canvas.sideCanvasList.axial.$el.addEventListener(
      "mouseleave", this.#onAxialViewBlurred );
    this.#app.canvas.sideCanvasList.sagittal.$el.addEventListener(
      "mouseenter", this.#onSagittalViewFocused );
    this.#app.canvas.sideCanvasList.sagittal.$el.addEventListener(
      "mouseleave", this.#onSagittalViewBlurred );

    this.#app.canvas.mainCanvas.addEventListener(
      "contextmenu", this.#onMainCanvasContextMenu );
    this.#app.canvas.mainCanvas.addEventListener(
      "mousedown", this.#onMainCanvasMouseDown );
    this.#app.canvas.mainCanvas.addEventListener(
      "mouseup", this.#onMainCanvasMouseUp );
    this.#app.canvas.mainCanvas.addEventListener(
      "click", this.#onMainCanvasClicked );

    document.addEventListener( 'keydown', this.#onKeydown );



    /*


    this.bind( 'main_canvas_keydown', 'keydown', (event) => {
      if (event.isComposing || event.keyCode === 229) { return; }
      if( this.listen_keyboard ){
        // event.preventDefault();
        this.keyboard_event = {
          'action' : 'keydown',
          'event' : event,
          'dispose' : false,
          'level' : 0
        };
      }

    }, document );
    */
  }

  dispose() {
    super.dispose();
    this.#app.$wrapper.removeEventListener( "mouseenter", this.#onViewerFocused );
    this.#app.$wrapper.removeEventListener( "mouseleave", this.#onViewerBlurred );
    this.#app.$controllerContainer.removeEventListener( "mouseenter", this.#onControllerFocused );
    this.#app.$controllerContainer.removeEventListener( "mouseleave", this.#onControllerBlurred );

    this.#app.canvas.sideCanvasList.coronal.$el.removeEventListener( "mouseenter", this.#onCoronalViewFocused );
    this.#app.canvas.sideCanvasList.coronal.$el.removeEventListener( "mouseleave", this.#onCoronalViewBlurred );
    this.#app.canvas.sideCanvasList.axial.$el.removeEventListener( "mouseenter", this.#onAxialViewFocused );
    this.#app.canvas.sideCanvasList.axial.$el.removeEventListener( "mouseleave", this.#onAxialViewBlurred );
    this.#app.canvas.sideCanvasList.sagittal.$el.removeEventListener( "mouseenter", this.#onSagittalViewFocused );
    this.#app.canvas.sideCanvasList.sagittal.$el.removeEventListener( "mouseleave", this.#onSagittalViewBlurred );

    this.#app.canvas.mainCanvas.removeEventListener( "contextmenu", this.#onMainCanvasContextMenu );
    this.#app.canvas.mainCanvas.removeEventListener( "mousedown", this.#onMainCanvasMouseDown );
    this.#app.canvas.mainCanvas.removeEventListener( "mouseup", this.#onMainCanvasMouseUp );
    this.#app.canvas.mainCanvas.removeEventListener( "click", this.#onMainCanvasClicked );

    document.removeEventListener( 'keydown', this.#onKeydown );

    this.mouseLocation = MouseKeyboard.OFF_VIEWER;
  }


  #onViewerFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_VIEWER;
  }
  #onViewerBlurred = () => {
    this.mouseLocation = this.mouseLocation & MouseKeyboard.OFF_VIEWER;
  }
  #onControllerFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_CONTROLLER;
  }
  #onControllerBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_CONTROLLER;
  }
  #onCoronalViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_CORONAL;
  }
  #onCoronalViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_CORONAL;
  }
  #onAxialViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_AXIAL;
  }
  #onAxialViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_AXIAL;
  }
  #onSagittalViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_SAGITTAL;
  }
  #onSagittalViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_SAGITTAL;
  }
  #onMainCanvasContextMenu = () => {
    // this should fire immediately
    this.dispatch( "viewerApp.mouseKeyboard.contextmenu", null, true );
  }
  #onMainCanvasMouseDown = () => {
    // this should fire immediately
    this._mouseDownHold = true;
    this.dispatch( "viewerApp.mouseKeyboard.mousedown", null, true );
  }
  #onMainCanvasMouseUp = () => {
    // this should fire immediately
    this._mouseDownHold = false;
    this.dispatch( "viewerApp.mouseKeyboard.mouseup", null, true );
  }
  #onMainCanvasClicked = ( event ) => {
    // this should be fired delayed
    this.dispatch( "viewerApp.mouseKeyboard.click", event.detail, false );
  }
  #onKeydown = ( event ) => {
    if( event.isComposing || this.mouseLocation === MouseKeyboard.OFF_VIEWER ) { return; }
    if( this.mouseLocation & MouseKeyboard.ON_CONTROLLER ) {
      if( this.#app.controllerGUI.isFocused ) { return; }
    }
    event.preventDefault();
    console.log( event.key );
    this.dispatch( "viewerApp.mouseKeyboard.keydown", event, true );
  }



}


export { MouseKeyboard };
