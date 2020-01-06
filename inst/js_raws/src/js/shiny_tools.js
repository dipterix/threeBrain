/* JS to shiny callbacks

This file defines shiny callback functions (js to shiny)
*/

import { debounce, to_array, get_or_default } from './utils.js';
import { THREE } from './threeplugins.js';
import { add_electrode, is_electrode } from './geometry/sphere.js';

function storageAvailable(type) {
  try {
    var storage = window[type],
        x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  }
  catch(e) {
    return e instanceof DOMException && (
        // everything except Firefox
        e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage.length !== 0;
  }
}


class THREE_BRAIN_SHINY {
  constructor(outputId, shiny_mode = true) {

    this.outputId = outputId;
    this.shiny_mode = shiny_mode;
    this.shinyId = outputId + '__shiny';

    this.stack = [];

    this._do_send = debounce(() => {
      if( this.shiny_mode && this.stack.length > 0 ){
        const re = this.stack.pop();
        Shiny.onInputChange(re['.__callback_id__.'], re);
      }
      this.stack.length = 0;
      // console.log(`Send to shiny, ${this.stack.length}`);
    }, 200, false);

    // Register shiny handlers
    if( this.shiny_mode ){
      this.register_shiny();
    }
  }

  register_canvas( canvas ){
    this.canvas = canvas;
  }
  register_gui( gui ){
    this.gui = gui;
  }

  set_token( token ){
    if(storageAvailable('localStorage') && typeof(token) === 'string'){
      this.token = token;
    }
  }

  collect_electrode_info( group_name = "__localization__" ){
    const els = this.canvas.electrodes.get( group_name ),
          results = [];
    let current_subject = group_name;
    if( els === undefined ){ return( null ); }
    if( group_name === "__localization__" ){
      // we use target_subject instead
      current_subject = this.canvas.state_data.get("target_subject");
      if( !current_subject ){
        // To enter this statement, either we don't even have a subject
        // or canvas.switch_subject is not ran (highly impossible)
        // do further checks
        if( this.canvas.subject_codes.length === 0 ){ return( null ); }
        current_subject = this.canvas.subject_codes[0];
      }
    }

    // Calculate MNI mapping, and add visible electrodes only
    to_array( els ).forEach((el, ii) => {
      if( !el.isMesh || !el.visible ){ return(null); }
      const g = el.userData.construct_params;
      let pos = g.MNI305_position;
      if( !Array.isArray(pos) || pos.length !== 3 ){
        pos = [0,0,0];
      }

      results.push({
        Electrode: ii + 1,
        Label : g.custom_info || 'NA', Valid : true,
        Coord_x : g.position[0], Coord_y : g.position[1], Coord_z : g.position[2],
        TemplateSubject: current_subject,
        SurfaceElectrode: g.is_surface_electrode === true,
        SurfaceType: g.surface_type || 'NA',
        Radius : g.radius,
        VertexNumber : g.vertex_number || -1,
        Hemisphere : g.hemisphere || 'NA',
        DistanceToSurface : g._distance_to_surf,
        MNI305_x : pos[0], MNI305_y : pos[1], MNI305_z : pos[2]
      });
    });

    return( results );

  }

  loc_electrode_info( debounce = false ){

    const re = this.collect_electrode_info( '__localization__' );
    this.to_shiny({ table: re }, 'localization', !debounce );

    return(re);
  }
  loc_set_electrode(el_number, label = '', valid = true, position = undefined){
    const el = this.canvas.electrodes.get("__localization__")[`__localization__, ${el_number} - `];
    if( !el || !el.userData.construct_params.is_electrode ){
      return(null);
    }
    if( label && typeof label === 'string' && label !== '' && label!=='NA'){
      el.userData.construct_params.custom_info = label;
    }


    if( !valid ){
      // el.position.set(0,0,0);
      el.visible = false;
    }else{
      el.visible = true;
    }
    if( position ){
      position = to_array( position );
      if( position.length === 3 ){
        el.position.fromArray( position );
        el.userData.construct_params.position = position;
      }
    }
    this.canvas.start_animation( 0 );
  }

  loc_add_electrode(el_number, label, position, is_surface_electrode = false,
                    surface_type = 'pial', color = [1,0,0] ){
    add_electrode(this.canvas, el_number, `__localization__, ${el_number} - ` ,
                  position, surface_type, label, is_surface_electrode, 1, color);
  }

  clear_electrode_group( group_name = '__localization__' ){
    const group = this.canvas.electrodes.get( group_name );
    if( group === undefined ){ return(false); }
    for( let ename in group ){
      group[ ename ].parent.remove( group[ ename ] );
    }
    this.canvas.electrodes.set( group_name, {} );
    return( true );
  }

  register_shiny(){
    Shiny.addCustomMessageHandler(this.shinyId, (data) => {
      if( !data || typeof data.command !== 'string' || !this.canvas ){ return ( null ); }

      console.log(data);

      switch (data.command) {

        // 1. get electrode info
        case 'loc_electrode_info':
          this.loc_electrode_info();
          break;

        // 2. set electrode_info (localization)
        case 'loc_set_electrode':
          this.loc_set_electrode( data.electrode, data.label, data.is_valid );
          this.loc_electrode_info();
          break;

        case 'loc_set_electrodes':
          to_array( data.data ).forEach((d) => {
            this.loc_set_electrode( d.electrode, d.label, d.is_valid, d.position );
          });
          this.loc_electrode_info();
          break;
        case 'loc_add_electrodes':
          if( data.reset === true ){
            this.clear_electrode_group( '__localization__' );
          }
          const _es = to_array( data.data );
          const _col = new THREE.Color();
          _es.forEach((d) => {
            _col.setStyle( d.color || '#FF0000' );
            this.loc_add_electrode( d.electrode, d.label, d.position,
                                    d.is_surface || false, d.surface_type || 'pial',
                                    _col.toArray() );
          });
          if( this.gui ){
            this.gui.get_controller('Number').setValue( _es.length + 1 );
          }
          this.loc_electrode_info();
          break;

        default:
          // code
      }
    });
  }



  to_shiny(data, method = 'callback', immediate = false){
    // method won't be checked, assuming string
    // Callback ID will be outputId_callbackname

    // generate message:
    const time_stamp = new Date();
    const callback_id = this.outputId + '_' + method;
    const re = {...data, '.__timestamp__.': time_stamp, '.__callback_id__.': callback_id};

    // print
    // console.debug(JSON.stringify( re ));

    if( immediate && this.shiny_mode ){
      Shiny.onInputChange(re['.__callback_id__.'], re);
      this.stack.length = 0;
    }else{
      this.stack.push( re );
      this._do_send();
    }





    /*
    // Add RAVE support (might be removed in the future)
    if(typeof(this.token) === 'string'){
      // Get item and set back
      // let rave_msg = window.localStorage.getItem('rave-messages');
      let msg = {
        'token' : this.token,           // Used by RAVE to tell differences
        'item_id' : this.outputId,      // UI output ID
        'message_type' : 'threeBrain',               // potentially used by session to communicate (not yet supported)
        'method' : method,
        'callback_id' : callback_id,
        'time_stamp' : Date.now(),      //
        'content' : re                  // Actuall data
      };

      window.localStorage.setItem('rave-messages', JSON.stringify(msg));
    }
    */


  }

  // previous one should be soft-deprecated in the future
  // use setInputValue instead of onInputChange as later one is never officially supported
  to_shiny2(name, value, priority = "deferred"){

    if( this.shiny_mode ){

      const callback = this.outputId + '_' + name;
      console.debug(callback + ' is set to ', JSON.stringify(value));
      Shiny.setInputValue(callback, value, { priority : priority });

    }
  }

}

export { THREE_BRAIN_SHINY };
// window.THREE_BRAIN_SHINY = THREE_BRAIN_SHINY;
