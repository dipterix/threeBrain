/* JS to shiny callbacks

This file defines shiny callback functions (js to shiny)
*/

import { debounce, to_array, get_or_default, set_visibility } from './utils.js';
import { Math, Vector3, Color } from '../build/three.module.js';
import { add_electrode, is_electrode } from './geometry/sphere.js';
import { CONSTANTS } from './constants.js';

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

/**
 * Though the name is "shiny", it works more like adapter to communicate:
 * R-Shiny, gui, canvas
 *
 */
class THREE_BRAIN_SHINY {
  constructor(widget, shiny_mode = true) {
    this.widget = widget;

    this.outputId = widget.element_id;
    this.shiny_mode = shiny_mode;
    this.shinyId = this.outputId + '__shiny';
    this.canvas = this.widget.handler.canvas;
    this.uuid = Math.generateUUID();

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

    // Add canvas listeners
    // 1. controls
    this.canvas.bind( 'camera_parameters', 'end', (evt) => {
      this.to_shiny2('main_camera', {
        position  : this.canvas.main_camera.position,
        zoom      : this.canvas.main_camera.zoom,
        up        : this.canvas.main_camera.up
      });
    }, this.canvas.controls );

    // 2. click callback
    // finalize registering
    const pos = new Vector3();
    this.canvas.add_mouse_callback(
      (evt) => {
        return({
          pass  : (evt.action === 'click' || evt.action === 'dblclick'),
          type  : 'clickable'
        });
      },
      ( res, evt ) => {
        const obj = res.target_object;
        if( obj && obj.userData ){
          const g = obj.userData.construct_params;
          obj.getWorldPosition( pos );

          // Get information and show them on screen
          const group_name = g.group ? g.group.group_name : null;
          const shiny_data = {
            object      : g,
            name        : g.name,
            geom_type   : g.type,
            group       : group_name,
            position    : pos.toArray(),
            action      : evt.action,
            meta        : evt,
            edit_mode   : this.canvas.edit_mode,
            is_electrode: false,
            current_time: 0,
            time_range  : [0, 0]
          };

          if( this.canvas.state_data.has( 'color_map' ) ){
            const cmap_name = this.canvas.state_data.get( 'color_map' );
            shiny_data.color_map = this.canvas.color_maps.get( cmap_name );
          }

          if( this.gui ){
            // clip name
            let _c = this.gui.get_controller('Display Data', CONSTANTS.FOLDERS['animation']);
            if( _c && _c.getValue ){
              shiny_data.current_clip = _c.getValue();
            }

            _c = this.gui.get_controller('Time', CONSTANTS.FOLDERS['animation']);
            if( _c && _c.getValue ){
              shiny_data.current_time = _c.getValue();
              shiny_data.time_range = [_c.__min, _c.__max];
            }
          }

          if( g.is_electrode ){

            const m = CONSTANTS.REGEXP_ELECTRODE.exec( g.name );
            if( m.length === 4 ){

              shiny_data.subject = m[1];
              shiny_data.electrode_number = parseInt( m[2] );
              shiny_data.is_electrode = true;
            }

          }

          if( evt.action === 'click' ){

            // this.to_shiny(shiny_data, 'mouse_clicked');

            // use better version to_shiny2
            this.to_shiny2('mouse_clicked', shiny_data, 'event');
          }else{
            // this.to_shiny(shiny_data, 'mouse_dblclicked');
            this.to_shiny2('mouse_dblclicked', shiny_data, 'event');
          }


        }
      },
      'click-electrodes-callbacks'
    );
  }

  register_gui( gui, presets ){
    this.gui = gui;
    this.presets = presets;

    if( this.shiny_mode ){
      // register shiny customized message
      Shiny.addCustomMessageHandler(`threeBrain-RtoJS-${this.outputId}`, (data) => {
        const message_type = data.name,
              message_content = data.value,
              method_name = 'handle_' + message_type;
        if( typeof this[method_name] === 'function' ){
          this[method_name]( message_content );
        }
      });
    }
  }

  set_token( token ){
    if(storageAvailable('localStorage') && typeof(token) === 'string'){
      this.token = token;
    }
  }


  handle_background( bgcolor ){
    const _c = this.gui.get_controller('Background Color', CONSTANTS.FOLDERS['background-color']);
    _c.setValue( bgcolor );
  }

  handle_zoom_level( zoom ){
    this.canvas.main_camera.zoom = zoom;
    this.canvas.main_camera.updateProjectionMatrix();
    this.canvas.start_animation( 0 );
  }

  handle_camera( args = { position: [500, 0, 0] , up : [0, 0, 1]} ){
    const pos = to_array( args.position ),
          up = to_array( args.up );
    if( pos.length === 3 ){
      this.canvas.main_camera.position.set(pos[0] , pos[1] , pos[2]);
    }
    if( up.length === 3 ){
      this.canvas.main_camera.up.set(up[0] , up[1] , up[2]);
    }
    this.canvas.main_camera.updateProjectionMatrix();
    this.canvas.start_animation( 0 );
  }

  handle_display_data( args = { variable : '', range : [] } ){
    const variable = args.variable,
          range = to_array( args.range );
    if( typeof variable === 'string' && variable !== '' ){
      this.gui
        .get_controller( 'Display Data', CONSTANTS.FOLDERS[ 'animation' ])
        .setValue( variable );
    }
    if( range.length === 2 ){
      this.gui
        .get_controller( 'Display Range', CONSTANTS.FOLDERS[ 'animation' ])
        .setValue(`${range[0].toPrecision(5)},${range[1].toPrecision(5)}`);
    }
    this.canvas.start_animation( 0 );
  }

  handle_font_magnification( cex = 1 ){
    this.canvas.set_font_size( cex );
    this.canvas.start_animation( 0 );
  }

  handle_set_localization_electrode( args ){
    this.presets.localization_set_electrode(
      args.which, args.params, args.update_shiny
    );
  }

  handle_clear_localization(update_shiny = true) {
    this.presets.localization_clear(update_shiny);
  }

  handle_add_localization_electrode( args ){
    const el = this.presets.localization_add_electrode(
       args.Coord_x, args.Coord_y, args.Coord_z,
       args.mode || "CT/volume", false
    );
    if( el ){
      const locorder = el.localization_order;
      this.presets.localization_set_electrode(
        locorder, args, args.update_shiny
      );
    }
  }

  handle_controllers( args ){
    for(let k in args){
      this.gui
        .get_controller( k )
        .setValue( args[k] );
    }
  }

  handle_focused_electrode( args ){
    let subject_code = args.subject_code || '';
    subject_code = subject_code.trim();
    // this.canvas.electrodes.get("YAB")["YAB, 14 - G14"]
    const electrode = parseInt( args.electrode || 0 ),
          fmt = `${subject_code}, ${electrode} `;
    let elec_name = Object.keys( this.canvas.electrodes.get(subject_code) || {} )
      .filter((nm) => {
        return(nm.startsWith(fmt));
      });
    if( elec_name.length > 0 ){
      // use the first electrode
      elec_name = elec_name[0];
      let m = this.canvas.electrodes.get(subject_code)[elec_name];
      if( is_electrode(m) ){
        this.canvas.focus_object(m);
        this.canvas.start_animation(0);
      }
    }

  }

  // FIXME: this handler is Broken
  handle_add_clip( args ){
    // window.aaa = args;
    const clip_name = args.clip_name,
          mesh_name = args.target,
          data_type = args.data_type,
          value = args.value,
          time = args.time || 0,
          value_names = args.value_names || [''],
          value_range = args.value_range || [0,1],
          time_range = args.time_range || [0,0],
          color_keys = to_array( args.color_keys ),
          color_vals = to_array( args.color_vals ),
          n_levels = args.n_levels,
          focusui = args.focus || false,
          alias = args.alias;

    if(typeof mesh_name !== 'string'){ return; }

    // Add to object
    const mesh = this.canvas.mesh.get(mesh_name);
    if( !mesh || ( typeof mesh.userData.add_track_data !== 'function' ) ){ return; }

    mesh.userData.add_track_data( clip_name, data_type, value, time );

    // calculate cmap, add time range so that the last value is always displayed
    if( time_range.length == 2 ){
      time_range[1] += 1.0;
    }
    this.canvas.add_colormap( clip_name, alias, data_type, value_names, value_range, time_range,
                color_keys, color_vals, n_levels );

    // Add to gui
    this.presets.add_clip( clip_name, focusui );

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
      // el.visible = false;
      set_visibility( el, false );
    }else{
      // el.visible = true;
      set_visibility( el, true );
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
          const _col = new Color();
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

    // make sure shiny is running
    if( this.shiny_mode && Shiny.shinyapp.$socket ){

      const callback = this.outputId + '_' + name;
      console.debug(callback + ' is set to ', JSON.stringify(value));
      Shiny.setInputValue(callback, value, { priority : priority });

    }
  }

}

export { THREE_BRAIN_SHINY };
// window.THREE_BRAIN_SHINY = THREE_BRAIN_SHINY;
