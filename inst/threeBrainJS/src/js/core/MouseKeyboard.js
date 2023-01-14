import { ThrottledEventDispatcher } from './ThrottledEventDispatcher.js';
import { ViewerApp } from './ViewerApp.js';
import { CONSTANTS } from './constants.js';

const _enterViewerEvent = {
  type      : "viewerApp.mouse.enterViewer",
  immediate : false,
  muffled   : true
};
const _leaveViewerEvent = {
  type      : "viewerApp.mouse.leaveViewer",
  immediate : false,
  muffled   : true
};

const _contextMenuEvent = {
  type      : "viewerApp.mouse.contextmenu",
  immediate : false,
  muffled   : true
}

const _mouseUpEvent = {
  type      : "viewerApp.mouse.mouseup",
  immediate : true,
  muffled   : true
}



class MouseKeyboard extends ThrottledEventDispatcher {

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

    this._app = app;
    this.mouseLocation = MouseKeyboard.OFF_VIEWER;
    this._mouseDownHold = false;
    this.timeout = 300;


    this._app.$wrapper.addEventListener(
      "mouseenter", this._onViewerFocused );
    this._app.$wrapper.addEventListener(
      "mouseleave", this._onViewerBlurred );
    this._app.$controllerContainer.addEventListener(
      "mouseenter", this._onControllerFocused );
    this._app.$controllerContainer.addEventListener(
      "mouseleave", this._onControllerBlurred );

    this._app.canvas.sideCanvasList.coronal.$el.addEventListener(
      "mouseenter", this._onCoronalViewFocused );
    this._app.canvas.sideCanvasList.coronal.$el.addEventListener(
      "mouseleave", this._onCoronalViewBlurred );
    this._app.canvas.sideCanvasList.axial.$el.addEventListener(
      "mouseenter", this._onAxialViewFocused );
    this._app.canvas.sideCanvasList.axial.$el.addEventListener(
      "mouseleave", this._onAxialViewBlurred );
    this._app.canvas.sideCanvasList.sagittal.$el.addEventListener(
      "mouseenter", this._onSagittalViewFocused );
    this._app.canvas.sideCanvasList.sagittal.$el.addEventListener(
      "mouseleave", this._onSagittalViewBlurred );

    this._app.canvas.$mainCanvas.addEventListener(
      "contextmenu", this._onMainCanvasContextMenu );
    this._app.canvas.$mainCanvas.addEventListener(
      "mousedown", this._onMainCanvasMouseDown );
    this._app.canvas.$mainCanvas.addEventListener(
      "mouseup", this._onMainCanvasMouseUp );
    this._app.canvas.$mainCanvas.addEventListener(
      "click", this._onMainCanvasClicked );

    document.addEventListener( 'keydown', this._onKeydown, { capture : true } );

  }

  dispose() {
    super.dispose();
    this._app.$wrapper.removeEventListener( "mouseenter", this._onViewerFocused );
    this._app.$wrapper.removeEventListener( "mouseleave", this._onViewerBlurred );
    this._app.$controllerContainer.removeEventListener( "mouseenter", this._onControllerFocused );
    this._app.$controllerContainer.removeEventListener( "mouseleave", this._onControllerBlurred );

    this._app.canvas.sideCanvasList.coronal.$el.removeEventListener( "mouseenter", this._onCoronalViewFocused );
    this._app.canvas.sideCanvasList.coronal.$el.removeEventListener( "mouseleave", this._onCoronalViewBlurred );
    this._app.canvas.sideCanvasList.axial.$el.removeEventListener( "mouseenter", this._onAxialViewFocused );
    this._app.canvas.sideCanvasList.axial.$el.removeEventListener( "mouseleave", this._onAxialViewBlurred );
    this._app.canvas.sideCanvasList.sagittal.$el.removeEventListener( "mouseenter", this._onSagittalViewFocused );
    this._app.canvas.sideCanvasList.sagittal.$el.removeEventListener( "mouseleave", this._onSagittalViewBlurred );

    this._app.canvas.$mainCanvas.removeEventListener( "contextmenu", this._onMainCanvasContextMenu );
    this._app.canvas.$mainCanvas.removeEventListener( "mousedown", this._onMainCanvasMouseDown );
    this._app.canvas.$mainCanvas.removeEventListener( "mouseup", this._onMainCanvasMouseUp );
    this._app.canvas.$mainCanvas.removeEventListener( "click", this._onMainCanvasClicked );

    document.removeEventListener( 'keydown', this._onKeydown );

    this.mouseLocation = MouseKeyboard.OFF_VIEWER;
  }

  _onViewerFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_VIEWER;
    this.dispatch( _enterViewerEvent );
  }
  _onViewerBlurred = () => {
    this.mouseLocation = this.mouseLocation & MouseKeyboard.OFF_VIEWER;
    this.dispatch( _leaveViewerEvent );
  }
  _onControllerFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_CONTROLLER;
  }
  _onControllerBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_CONTROLLER;
  }
  _onCoronalViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_CORONAL;
  }
  _onCoronalViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_CORONAL;
  }
  _onAxialViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_AXIAL;
  }
  _onAxialViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_AXIAL;
  }
  _onSagittalViewFocused = () => {
    this.mouseLocation = this.mouseLocation | MouseKeyboard.ON_SAGITTAL;
  }
  _onSagittalViewBlurred = () => {
    this.mouseLocation = this.mouseLocation ^ MouseKeyboard.ON_SAGITTAL;
  }
  _onMainCanvasContextMenu = () => {
    // this should fire immediately
    this.dispatch( _contextMenuEvent );
  }
  _onMainCanvasMouseDown = ( event ) => {
    // this should fire immediately
    this._mouseDownHold = true;
    this.dispatch({
      type      : "viewerApp.mouse.mousedown",
      data      : event,
      immediate : true,
      muffled   : true
    });
  }
  _onMainCanvasMouseUp = () => {
    // this should fire immediately
    this._mouseDownHold = false;
    this.dispatch( _mouseUpEvent );
  }
  _onMainCanvasClicked = ( event ) => {
    // this should be fired delayed
    this.dispatch({
      type      : "viewerApp.mouse.click",
      data      : event,
      immediate : false,
      muffled   : true
    });
  }
  _onKeydown = ( event ) => {
    // keyCode is deprecated, but I found no better substitution
    if( event.isComposing || event.keyCode === 229 || this.mouseLocation === MouseKeyboard.OFF_VIEWER ) { return; }
    if( this.mouseLocation & MouseKeyboard.ON_CONTROLLER ) {
      if( this._app.controllerGUI.isFocused ) {
        console.log("Focused -> " + this.mouseLocation);
        return;
      }
    }
    event.preventDefault();
    this.dispatch({
      type      : "viewerApp.keyboad.keydown",
      data      : event,
      immediate : true,
      muffled   : true
    });
  }



}


export { MouseKeyboard };
