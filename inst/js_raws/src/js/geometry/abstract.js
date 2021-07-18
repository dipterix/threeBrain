import { to_array, get_element_size, get_or_default } from '../utils.js';
import { CONSTANTS } from '../constants.js';

class AbstractThreeBrainObject {
  constructor(g, canvas){
    this._params = g;
    this._canvas = canvas;
    this.type = 'AbstractThreeBrainObject';
    this.isThreeBrainObject = true;
    this.name = g.name;
    if( g.group && typeof g.group === 'object' ){
      this.group_name = g.group.group_name;
    }
    this.subject_code = g.subject_code || '';
    canvas.threebrain_instances.set( this.name, this );
    this.clickable = g.clickable === true;
    this.world_position = new THREE.Vector3();
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
          console.debug( this.name + ' is enabled layer ' + ii );
        });
      }else if(layers.length === 0 || layers[0] > 20){
        if(this.DEBUG){
          console.debug( this.name + ' is set invisible.' );
        }
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

  get_world_position( results ){
    if( results && this._last_rendered === results.elapsed_time ) {
      return( this.world_position );
    }
    if( this.object ){
      this.object.getWorldPosition( this.world_position );
    }
    if( results ){
      this._last_rendered = results.elapsed_time;
    }
    return( this.world_position );
  }

  dispose(){
    this.warn('method dispose() not implemented...');
  }

  get_track_data( track_name, reset_material ){
    this.warn('method get_track_data(track_name, reset_material) not implemented...');
  }

  pre_render( results ){
    this.get_world_position( results );
    this._last_rendered = results.elapsed_time;
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

  finish_init(){
    if( this.object ){
      console.debug(`Finalizing ${ this.name }`);
      this.set_layer();
      this.object.userData.construct_params = this._params;

      this._canvas.mesh.set( this.name, this.object );
      if( this.clickable ){
        this._canvas.add_clickable( this.name, this.object );
      }

      if( this.group_name ){
        this.get_group_object().add( this.object );
      } else {
        this._canvas.add_to_scene( this.object );
      }

      if( this.object.isMesh ){
        this.object.updateMatrixWorld();
      }

      if( this.object.isObject3D ){
        this.object.userData.instance = this;
        this.object.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
        this.object.userData.dispose = () => { this.dispose(); };
        this.object.renderOrder = CONSTANTS.RENDER_ORDER[ this.type ] || 0;
      }

    }
  }
}

export { AbstractThreeBrainObject };
