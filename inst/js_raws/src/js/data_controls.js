import { THREE } from './threeplugins.js';
import * as dat from './libs/dat.gui.module.js';
import { to_array } from './utils.js';
import { CONSTANTS } from './constants.js';
// Some presets for gui and canvas

class THREEBRAIN_PRESETS{

  constructor(canvas, gui, map_to_template = false, initial_subject = 'N27'){
    this.canvas = canvas;
    this.gui = gui;
    this.map_to_template = map_to_template;

    this.electrode_regexp = RegExp('^electrodes-(.+)$');

    // Will pass if no surface is included
    const subjects = this._get_subjects();

    if(subjects.length){

      if(this.map_to_template && subjects.includes(initial_subject)){
        this.current_subject = initial_subject;
      }else{
        // use the only one subject
        this.current_subject = subjects[0];
      }

    }else{
      this.current_subject = undefined;
    }

    // Create alias for compatibility issue
    this.initial_subject = this.default_subject = this.current_subject;
    this.__left_hemisphere = 'normal';
    this.__right_hemisphere = 'normal';
  }

  _update_canvas(level = 0){
    if(level >= 0){
      this.canvas.start_animation(level);
    }else{
      this.canvas.pause_animation(-level);
    }
  }

  _surfaces(){
    return(this.canvas.group.get( "Left Hemisphere" ).userData.group_data['.gui_params']);
  }

  _current_surfaces( subj ){
    const surfaces = this._surfaces();
    return( surfaces[ subj || this.current_subject ] );
  }

  _all_group_names(){
    return( [...this.canvas.group.keys()] );
  }

  _electrode_group_names(filtered_result = false){
    const groups = this._all_group_names(),
          re = [];

    groups.forEach((g) => {
      let r = this.electrode_regexp.exec( g );
      if(r !== null){
        if(filtered_result){
          re.push(r[1]);
        }else{
          re.push(r[0]);
        }
      }
    });

    return(re);
  }

  _get_group_by_name( group_name ){
    return( this.canvas.group.get( group_name ) );
  }

  _is_electrode(e){
    if(e && e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
      return(true);
    }else{
      return(false);
    }
  }

  _get_subjects(){
    if( this.canvas.group.has( "Left Hemisphere" ) ){
      return(to_array( this.canvas.group.get( "Left Hemisphere" ).userData.group_data['.subjects'] ));
    }
    return([]);
  }


  animation(folder_name = 'Timeline', step = 0.001){
    // this.canvas.animation_controls = {};
    const min = this.canvas.time_range_min || 0;
    const max = this.canvas.time_range_max || 1;

    this.set_animation_time = (v) => {
      if(this._ani_time){
        if(typeof(v) !== 'number'){
          v = this._ani_time.min;
        }
        this._ani_time.setValue( v );
      }
    };

    this.get_animation_params = () => {
      if(this._ani_time && this._ani_speed && this._ani_status){
        return({
          play : this._ani_status.getValue(),
          time : this._ani_time.getValue(),
          speed : this._ani_speed.getValue(),
          min : min,
          max : max
        });
      }else{
        return({
          play : false,
          time : 0,
          speed : 0,
          min : min,
          max : max
        });
      }
    };

    this.canvas.animation_controls.set_time = this.set_animation_time;
    this.canvas.animation_controls.get_params = this.get_animation_params;

    this._ani_status = this.gui.add_item('Play/Pause', false, { folder_name : folder_name });
    this._ani_status.onChange((v) => {
      if(v){
        this.canvas.clock.start();
        this._update_canvas(2);
      }else{
        this.canvas.clock.stop();
        this._update_canvas(-2);
      }
    });

    this.gui.add_item('Reset', () => {
      this.set_animation_time( min );
      this._update_canvas();
    }, { folder_name : folder_name });

    this._ani_speed = this.gui.add_item('Speed', 1, {
      args : { 'x 0.1' : 0.1, 'x 0.2': 0.2, 'x 0.5': 0.5, 'x 1': 1, 'x 2':2},
      folder_name : folder_name
    });

    this.gui.add_item('Time', min, { folder_name : folder_name })
        .min(min).max(max).step(step).onChange((v) => {this._update_canvas()});
    this._ani_time = this.gui.get_controller('Time', 'Timeline');

    this._ani_time.domElement.addEventListener('mousewheel', (evt) => {
      if( evt.altKey ){
        evt.preventDefault();
        const current_val = this._ani_time.getValue();
        this._ani_time.setValue( current_val + Math.sign( evt.deltaY ) * step );
      }
    });

    this.gui.folders[ "Timeline" ].open();

  }


  color_group(item_name = 'Show Groups', folder_name = 'Geometry'){
    const group_names = this._electrode_group_names();
    // check how many groups
    const col_pal = ["#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe", "#469990", "#e6beff", "#9A6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#a9a9a9", "#000000"];
    const col = new THREE.Color();


    this.gui.add_item(item_name, false, {
        folder_name : folder_name
      }).onChange((v) => {

        if( v ){
          this._ani_status.setValue(false);
        }

        for(let ii in group_names){
          if(v){
            col.set( col_pal[ ii % col_pal.length ] );
          }

          let gnm = group_names[ii];
          if(this.canvas.group.has( gnm )){
            this.canvas.group.get( gnm ).children.forEach((e) => {
              if(this._is_electrode(e)){
                // supress animation
                e.userData._color_supressed = v;

                if( v ){
                  e.userData._original_color = '#' + e.material.color.getHexString();
                  e.material.color.setRGB( col.r, col.g, col.b );
                }else{
                  e.material.color.set( e.userData._original_color || "#ffffff" );
                }

              }
            });
          }

        }

        this._update_canvas();
      });
  }

  // Preset 1: Select subject
  subject(item_name = 'Template Subject', folder_name = 'Template Brain'){
    const canvas = this.canvas,
          gui = this.gui;

    const subjects = this._get_subjects();

    // Cortical Surface,
    this.subject_callback = (v) => {
      if(!v){
        v = this.current_subject;
      }else{
        this.current_subject = v;
      }
      try { this.attach_to_surface_callback(this.attached_surface) } catch (e) {}
      try { this.surface_type_callback(this.main_surface_type) } catch (e) {}

      this._update_canvas();
    };


    gui.add_item(item_name, this.default_subject, {
        args : subjects,
        folder_name : folder_name
      }).onChange(this.subject_callback);

    if(this.map_to_template){
      gui.open_folder(folder_name);
    }

  }

  // Preset 2: Select Surface to attach electrode
  attach_to_surface(item_name = 'Mapping Electrodes', folder_name = 'Template Brain'){
    const canvas = this.canvas;
    const gui = this.gui;

    const group_names = this._electrode_group_names();
    const surfaces = this._surfaces();
    let current_sf = this._current_surfaces( this.initial_subject );
    const left_surface_group = canvas.group.get( "Left Hemisphere" ),
          right_surface_group = canvas.group.get( "Right Hemisphere" );

    let surface_names = Object.keys( current_sf );
    surface_names.push('original');

    // If template, starts with pial, otherwise start with 'original', if pial not exists, starts with original
    this.attached_surface = 'original';
    if(this.map_to_template && surface_names.includes('pial')){
      this.attached_surface = 'pial';
    }

    // Cortical Surface,
    this.attach_to_surface_callback = (v) => {
      if(!v){
        v = this.attached_surface;
      }else{
        this.attached_surface = v;
      }

      if(v == 'original'){

        group_names.forEach((gnm) => {
          let gp = this._get_group_by_name( gnm );

          if(!gp){
            return(undefined);
          }

          let trans_mat = gp.userData.trans_mat,
              inv_trans_mat = gp.userData.inv_trans_mat,
              disable_trans_mat = gp.userData.construct_params.disable_trans_mat;

          // Step 1: seek for electrode locations
          gp.children.forEach((e) => {
            if(e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
              // Set electrode to original location
              let original_pos = e.userData.construct_params.position;
              e.position.fromArray( original_pos );

              if(trans_mat){
                e.position.applyMatrix4( trans_mat );
              }

            }
          });

          // Step 2: inverse trans_mat, the group is not rotated anymore
          if(!disable_trans_mat && inv_trans_mat){
            gp.userData.construct_params.disable_trans_mat = true;
            gp.applyMatrix( inv_trans_mat );
          }

        });
      }else{
        current_sf = this._current_surfaces( this.current_subject );

        // This will be a list of two
        let template_surface_names = to_array( current_sf[v] );

        group_names.forEach((gnm) => {
          let gp = this._get_group_by_name( gnm );

          if(!gp){
            return(undefined);
          }

          let trans_mat = gp.userData.trans_mat,
              inv_trans_mat = gp.userData.inv_trans_mat,
              disable_trans_mat = gp.userData.construct_params.disable_trans_mat;

          // Step 1: seek for electrode locations
          gp.children.forEach((e) => {
            if(e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
              // Set electrode to original location
              let original_pos = e.userData.construct_params.position;
              e.position.fromArray( original_pos );

              if(trans_mat){
                e.position.applyMatrix4( trans_mat );
              }

              // If on the cortical surface, (!sub_cortical), then map to the surface
              if(!e.userData.construct_params.sub_cortical){
                // Mat to the cortical surface
                let which_h = e.userData.construct_params.hemisphere == 'left'? 0 : 1;
                let surf = canvas.mesh.get( template_surface_names[which_h] );
                if(surf && surf.isMesh){
                  let position = surf.geometry.getAttribute('position'),
                    vertex_number = e.userData.construct_params.vertex_number,
                    x = position.getX(vertex_number),
                    y = position.getY(vertex_number),
                    z = position.getZ(vertex_number);
                  e.position.set( x, y, z );
                }

              }

            }
          });

          // Step 2: inverse trans_mat, the group is not rotated anymore
          if(!disable_trans_mat && inv_trans_mat){
            gp.userData.construct_params.disable_trans_mat = true;
            gp.applyMatrix( inv_trans_mat );
          }

        });

      }

      this._update_canvas();
    };


    gui.add_item(item_name, this.attached_surface, {
        args : surface_names,
        folder_name : folder_name
      }).onChange(this.attach_to_surface_callback);

  }

  // Preset 3: Select surface to visualize
  surface_type(item_name = 'Surface Type', folder_name = 'Geometry'){
    const canvas = this.canvas;
    const gui = this.gui;
    const surfaces = this._surfaces();
    let current_sf = surfaces[this.initial_subject];
    const surface_name = Object.keys( current_sf );

    if(surface_name.includes('pial')){
        this.main_surface_type = 'pial';
    }else{
      this.main_surface_type = surface_name[0];
    }

    this.surface_type_callback = (pn) => {

      if(!pn){
        pn = this.main_surface_type;
      }

      for( let sub in surfaces ){

        let sf = to_array( surfaces[sub][this.main_surface_type] );

        sf.forEach((nm) => {
          let m = canvas.mesh.get( nm );
          if( m ){
            m.visible = false;
          }
        });

      }

      this.main_surface_type = pn;

      let sf_show = to_array( surfaces[this.current_subject][pn] );
      let center = [0, 0, 0];

      sf_show.forEach((nm) => {
        let m = canvas.mesh.get( nm );

        if(m && m.isMesh){
          m.visible = true;

          // Center mesh
          if( m.geometry && m.geometry.isBufferGeometry ){

            if( !m.geometry.boundingBox ){
              m.geometry.computeBoundingBox();
            }

            let b = m.geometry.boundingBox,
                v = new THREE.Vector3();

            b.getCenter(v);
            center[2] = center[2] + v.z / 2.0;
            center[1] = center[1] + v.y / 2.0;

          }
        }
      });

      canvas.update_control_center( center );

      this._update_canvas();

    };

    gui.add_item(item_name, this.main_surface_type, {
        args : surface_name,
        folder_name : folder_name
      }).onChange(this.surface_type_callback);

  }

  // TODO deprecate this item
  lh_material(item_name = 'Left Hemisphere', folder_name = 'Geometry'){
    const canvas = this.canvas;
    const gui = this.gui;

    // Add controls on showing and hiding meshes
    gui.add_item(item_name, 'normal', {
      args : ['normal', 'wireframe', 'hidden'],
      folder_name : folder_name
    })
      .onChange((v) => {
        let m = canvas.group.get( "Left Hemisphere" );
        if(m && m.isObject3D){
          switch (v) {
            case 'normal':

              m.children.forEach( (h) => {
                if(h.isMesh){
                  h.material.wireframe = false;
                }
              });
              m.visible = true;

              break;
            case 'wireframe':
              m.children.forEach( (h) => {
                if(h.isMesh){
                  h.material.wireframe = true;
                }
              });
              m.visible = true;

              break;
            default:
              m.visible = false;
          }

        }
        this._update_canvas();
      });
    gui.open_folder(folder_name);
  }
  rh_material(item_name = 'Right Hemisphere', folder_name = 'Geometry'){
    const canvas = this.canvas;
    const gui = this.gui;

    // Add controls on showing and hiding meshes
    gui.add_item(item_name, 'normal', {
      args : ['normal', 'wireframe', 'hidden'],
      folder_name : folder_name
    })
      .onChange((v) => {
        let m = canvas.group.get( "Right Hemisphere" );
        if(m && m.isObject3D){
          switch (v) {
            case 'normal':

              m.children.forEach( (h) => {
                if(h.isMesh){
                  h.material.wireframe = false;
                }
              });
              m.visible = true;

              break;
            case 'wireframe':
              m.children.forEach( (h) => {
                if(h.isMesh){
                  h.material.wireframe = true;
                }
              });
              m.visible = true;

              break;
            default:
              m.visible = false;
          }

        }
        this._update_canvas();
      });
    gui.open_folder(folder_name);
  }
  electrodes(folder_name = 'Geometry'){
    const canvas = this.canvas;
    const gui = this.gui;

    const li = this._electrode_group_names(true);

    li.forEach((gname) => {
      gui.add_item('E-' + gname, 7, {
        args : { 'all cameras' : 7, 'main camera' : 8, 'hidden': 30 },
        folder_name : folder_name
      })
      .onChange( (v) => {
        let group = canvas.group.get( 'electrodes-' + gname );
        if(group){
          group.children.forEach((m) =>{
            m.layers.set(v);
            if(v > 20){
              m.visible=false;
            }else{
              m.visible=true;
            }
          });
        }
        this._update_canvas();
      } );
    });

    gui.open_folder(folder_name);
  }



  // -------------------------- New version --------------------------
  // which subject
  subject2(item_name = 'Subject', folder_name = 'Geometry'){
    // Get subjects
    let subject_ids = this.canvas.subject_codes;


    if( subject_ids.length > 0 ){
      let _s = this.canvas.state_data.get( 'target_subject' ) || subject_ids[0];
      this.gui.add_item(item_name, _s, {
        folder_name : folder_name,
        args : subject_ids
      }).onChange((v) => {
        this.canvas.switch_subject( v );
      });
    }
  }


  // which surface
  surface_type2(item_name = 'Surface Type', folder_name = 'Geometry'){

    const _s = this.canvas.state_data.get( 'surface_type' ) || 'pial',
          _c = this.canvas.get_surface_types();

    if( _c.length === 0 ){
      return(null);
    }
    const surf_type = this.gui.add_item(item_name, _s, {
        args : _c,
        folder_name : folder_name
      }).onChange((v) => {
        this.canvas.switch_subject( '/', {
          'surface_type': v
        });
      });

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFACE, (evt) => {
      let current_idx = (_c.indexOf( surf_type.getValue() ) + 1) % _c.length;
      if( current_idx >= 0 ){
        surf_type.setValue( _c[ current_idx ] );
      }
    }, 'gui_surf_type2');
  }


  hemisphere_material(folder_name = 'Geometry'){

    const options = ['normal', 'wireframe', 'hidden'];

    const lh_ctrl = this.gui.add_item('Left Hemisphere', 'normal', { args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', {
          'material_type_left': v
        });
      });

    const rh_ctrl = this.gui.add_item('Right Hemisphere', 'normal', { args : options, folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', {
          'material_type_right': v
        });
      });

    // add keyboard shortcut
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_LEFT, (evt) => {
      let current_idx = (options.indexOf( lh_ctrl.getValue() ) + 1) % options.length;
      if( current_idx >= 0 ){
        lh_ctrl.setValue( options[ current_idx ] );
      }
    }, 'gui_left_cycle');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_RIGHT, (evt) => {
      let current_idx = (options.indexOf( rh_ctrl.getValue() ) + 1) % options.length;
      if( current_idx >= 0 ){
        rh_ctrl.setValue( options[ current_idx ] );
      }
    }, 'gui_right_cycle');
  }


  map_template(folder_name = 'Electrode Mapping'){

    const subject_codes = ['[no mapping]', ...this.canvas.subject_codes];

    const do_mapping = this.gui.add_item('Map Electrodes', false, { folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_template': v });
      });

    this.gui.add_item('Surface', 'std.141', {
      args : ['std.141', 'mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_surface': v });
      });

    this.gui.add_item('Volume', 'mni305', {
      args : ['mni305', 'no mapping'],
      folder_name : folder_name })
      .onChange((v) => {
        this.canvas.switch_subject( '/', { 'map_type_volume': v });
      });

    // need to check if this is multiple subject case
    if( this.canvas.shared_data.get("multiple_subjects") ){
      // Do mapping by default
      do_mapping.setValue( true );
    }

  }





}




class THREEBRAIN_CONTROL{
  constructor(args = {}, DEBUG = false){
    this.params = {};
    this.folders = {};
    this._gui = new dat.GUI(args);

    // this._gui.remember(this.params);

    this.domElement = this._gui.domElement;
    this.DEBUG = DEBUG;

    this.add_folder('Default');
    this.open_folder('Default');
  }


  // Add folder
  add_folder(name){
    if(this.folders[name] === undefined){
      this.folders[name] = this._gui.addFolder(name);
    }
    return(this.folders[name]);
  }

  // open/close folder
  open_folder(name){
    if(this.folders[name] !== undefined){
      this.folders[name].open();
    }
  }
  close_folder(name){
    if(this.folders[name] !== undefined){
      this.folders[name].close();
    }
  }

  get_controller(name, folder_name = 'Default'){
    let folder = this.folders[folder_name];

    if(folder && folder.__controllers){
      for(var ii in folder.__controllers){
        if(folder.__controllers[ii].property === name){
          return(folder.__controllers[ii]);
        }
      }
    }

    return({ 'onChange': (callback) => {} });
  }


  // Add item
  add_item(name, value, options = {}){
    let folder_name = options.folder_name || 'Default',
        args = options.args,
        is_color = options.is_color || false;

    if(this.params[name] !== undefined){
      return(undefined);
    }
    this.params[name] = value;
    let folder = this.add_folder(folder_name);

    if(is_color){
      return(folder.addColor(this.params, name));
    }else{
      if(args !== null && args !== undefined){
        return(folder.add(this.params, name, args));
      }else{
        return(folder.add(this.params, name));
      }
    }

    return(undefined);
  }



}

export { THREEBRAIN_PRESETS, THREEBRAIN_CONTROL };

//window.THREEBRAIN_PRESETS = THREEBRAIN_PRESETS;
//window.THREEBRAIN_CONTROL = THREEBRAIN_CONTROL;
