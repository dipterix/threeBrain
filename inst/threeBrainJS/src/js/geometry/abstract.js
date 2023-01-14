import { to_array, get_element_size, get_or_default } from '../utils.js';
import { CONSTANTS } from '../core/constants.js';
import { Vector3, Matrix4 } from 'three';

class AbstractThreeBrainObject {
  constructor(g, canvas){
    this._params = g;
    this._canvas = canvas;
    this._display_mode = "normal";
    this._visible = true;
    this.type = 'AbstractThreeBrainObject';
    this.isThreeBrainObject = true;
    this.name = g.name;
    if( g.group && typeof g.group === 'object' ){
      this.group_name = g.group.group_name;
    }
    this.subject_code = g.subject_code || '';
    canvas.threebrain_instances.set( this.name, this );
    this.clickable = g.clickable === true;
    this.world_position = new Vector3();
  }

  set_layer( addition = [], object = null ){
    let obj = object || this.object;
    if( obj ){
      let layers = to_array( this._params.layer );
      let more_layers = to_array(addition);
      // set clickable layer
      if( this._params.clickable === true ){
        layers.push( CONSTANTS.LAYER_SYS_RAYCASTER_14 );
      }
      layers.concat( more_layers );

      // Normal 3D object
      obj.layers.set( 31 );
      if( layers.length > 1 ){
        layers.forEach((ii) => {
          obj.layers.enable(ii);
          // console.debug( this.name + ' is enabled layer ' + ii );
        });
      }else if(layers.length === 0 || layers[0] > 20){
        // if(this.debug){
        //   console.debug( this.name + ' is set invisible.' );
        // }
        obj.layers.set( CONSTANTS.LAYER_USER_ALL_CAMERA_1 );
        obj.visible = false;
      }else{
        obj.layers.set( layers[0] );
      }
    }
  }

  warn( s ){
    console.warn(this._name + ' ' + s);
  }

  get_world_position(){
    const animParameters = this._canvas.animParameters;
    if( this._last_rendered === animParameters.trackPosition ) {
      return( this.world_position );
    }
    if( this.object ){
      this.object.getWorldPosition( this.world_position );
    }
    this._last_rendered = animParameters.trackPosition;
    return( this.world_position );
  }

  dispose(){
    this.warn('method dispose() not implemented...');
  }

  get_track_data( track_name, reset_material ){
    this.warn('method get_track_data(track_name, reset_material) not implemented...');
  }

  pre_render(){
    this.get_world_position();
    if( this.object && this.object.isMesh ){
      if( this._visible && this._display_mode !== "hidden" ) {
        this.object.visible = true;
      } else {
        this.object.visible = false;
      }
    }
  }

  add_track_data( track_name, data_type, value, time_stamp = 0 ){

  }

  get_group_object(){
    return(this._canvas.group.get( this.group_name ));
  }

  register_object( names ){
    to_array(names).forEach((nm) => {
      get_or_default( this._canvas[ nm ], this.subject_code, {} )[ this.name ] = this.object;
    });
  }

  debugVerbose ( message ) {
    if( this.debug ) {
      console.debug(`[${ this.constructor.name }]: ${message}`);
    }
  }

  finish_init(){
    if( this.object ){
      // console.debug(`Finalizing ${ this.name }`);
      this.set_layer();
      this.object.userData.construct_params = this._params;

      this._canvas.mesh.set( this.name, this.object );
      if( this.clickable ){
        this._canvas.add_clickable( this.name, this.object );
      }

      if( this.group_name ){
        this.get_group_object().add( this.root_object || this.object );
      } else {
        this._canvas.add_to_scene( this.root_object || this.object );
      }

      if( this.object.isObject3D ){
        this.object.userData.instance = this;
        this.object.userData.pre_render = () => { return( this.pre_render() ); };
        this.object.userData.dispose = () => { this.dispose(); };
        this.object.renderOrder = CONSTANTS.RENDER_ORDER[ this.type ] || 0;
      }

      if( this.object.isMesh ){
        if( Array.isArray(this._params.trans_mat) &&
            this._params.trans_mat.length === 16 ) {
          let trans = new Matrix4();
          trans.set(...this._params.trans_mat);
          this.object.userData.trans_mat = trans;

          if( !this._params.disable_trans_mat ) {
            this.object.applyMatrix4(trans);
          }
        }

        this.object.updateMatrixWorld();
      }

    }
  }


  set_display_mode( mode ){
    // hidden will set visible to false
    if( typeof mode === "string" ){
      this._display_mode = mode;
    }
  }

  set_visibility( visible ){
    this._visible = visible;
  }
}

export { AbstractThreeBrainObject };
