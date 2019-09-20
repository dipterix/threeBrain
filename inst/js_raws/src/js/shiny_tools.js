/* JS to shiny callbacks

This file defines shiny callback functions (js to shiny)
*/

import { debounce, to_array, get_or_default } from './utils.js';
import { THREE } from './threeplugins.js';

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

  set_token( token ){
    if(storageAvailable('localStorage') && typeof(token) === 'string'){
      this.token = token;
    }
  }

  loc_electrode_info(){

    const els = this.canvas.electrodes.get("__localization__");
    if( !els ){ return(null); }

    let current_subject = this.canvas.state_data.get("target_subject");
    if( !current_subject ){
      if( this.canvas.subject_codes.length === 0 ){
        return(null);
      }
      current_subject = this.canvas.subject_codes[0];
    }
    const re = [];
    // get MNI mapping matrix

    to_array( els ).forEach((el, ii) => {
      const g = el.userData.construct_params;
      let pos = g.MNI305_position;
      let info = {
        Electrode: ii + 1, MNI305_x : 0, MNI305_y : 0, MNI305_z : 0,
        Label : g.custom_info || 'NA', Valid : false,
        Coord_x : g.position[0], Coord_y : g.position[1], Coord_z : g.position[2],
        TemplateSubject: current_subject,
        SurfaceElectrode: g.is_surface_electrode === true,
        SurfaceType: g.surface_type || 'NA',
        Radius : g.radius,
        VertexNumber : g.vertex_number || -1,
        Hemisphere : g.hemisphere || 'NA'
      };

      if( !Array.isArray(pos) || pos.length !== 3 ){
        pos = [0,0,0];
      }


      if( el.visible ){
        info.MNI305_x = pos[0];
        info.MNI305_y = pos[1];
        info.MNI305_z = pos[2];
        info.Valid = true;
      }
      re.push( info );
    });


    this.to_shiny({ table: re }, 'localization', true);

    return(re);
  }
  loc_set_electrode(el_number, label, valid = true){
    const el = this.canvas.electrodes.get("__localization__")[`__localization__, ${el_number} - `];
    if( !el || !el.userData.construct_params.is_electrode ){
      return(null);
    }
    el.userData.construct_params.custom_info = label || '';

    if( !valid ){
      // el.position.set(0,0,0);
      el.visible = false;
    }else{
      el.visible = true;
    }
    this.canvas.start_animation( 0 );
  }

  register_shiny(){
    Shiny.addCustomMessageHandler(this.shinyId, (data) => {
      if( !data || typeof data.command !== 'string' || !this.canvas ){ return ( null ); }
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
            this.loc_set_electrode( d.electrode, d.label, d.is_valid );
          });
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

}

export { THREE_BRAIN_SHINY };
// window.THREE_BRAIN_SHINY = THREE_BRAIN_SHINY;
