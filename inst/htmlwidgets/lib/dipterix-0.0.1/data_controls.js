
// Some presets for gui and canvas

class THREEBRAIN_PRESETS{

  constructor(canvas, gui, map_to_template = false, initial_subject = 'congruency/YAB'){
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
  }

  _surfaces(){
    return(canvas.group["Left Hemisphere"].userData.group_data['.gui_params']);
  }

  _current_surfaces( subj ){
    const surfaces = this._surfaces();
    return( surfaces[ subj || this.current_subject ] );
  }

  _all_group_names(){
    return( Object.keys( canvas.group ) );
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
    return( canvas.group[group_name] );
  }

  _get_subjects(){
    if(canvas.group["Left Hemisphere"]){
      return(to_array( canvas.group["Left Hemisphere"].userData.group_data['.subjects'] ));
    }
    return([]);
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
    };


    gui.add_item(item_name, this.default_subject, {
        args : subjects,
        folder_name : folder_name
      }).onChange(this.subject_callback);

  }

  // Preset 2: Select Surface to attach electrode
  attach_to_surface(item_name = 'Mapping Electrodes', folder_name = 'Template Brain'){
    const canvas = this.canvas;
    const gui = this.gui;

    const group_names = this._electrode_group_names();
    const surfaces = this._surfaces();
    let current_sf = this._current_surfaces( this.initial_subject );
    const left_surface_group = canvas.group["Left Hemisphere"],
          right_surface_group = canvas.group["Right Hemisphere"];

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
                let surf = canvas.mesh[template_surface_names[which_h]];
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
          if( canvas.mesh[nm] ){
            canvas.mesh[nm].visible = false;
          }
        });

      }

      this.main_surface_type = pn;

      let sf_show = to_array( surfaces[this.current_subject][pn] );

      sf_show.forEach((nm) => {
        canvas.mesh[nm].visible = true;
      });

    };

    gui.add_item(item_name, this.main_surface_type, {
        args : surface_name,
        folder_name : folder_name
      }).onChange(this.surface_type_callback);

  }

  lh_material(){
    const canvas = this.canvas;
    const gui = this.gui;

    // Add controls on showing and hiding meshes
    let folder_name = 'Geometry';
    gui.add_item('Left Hemisphere', 'normal', options = {
      args : ['normal', 'wireframe', 'hidden'],
      folder_name : folder_name
    })
      .onChange((v) => {
        let m = canvas.mesh["Left Hemisphere"];
        if(m && m.isMesh){
          switch (v) {
            case 'normal':
              m.material.wireframe = false;
              m.visible = true;
              break;
            case 'wireframe':
              m.material.wireframe = true;
              m.visible = true;
              break;
            default:
              m.visible = false;
          }

        }
      });
    gui.open_folder(folder_name);
  }
  rh_material(){
    const canvas = this.canvas;
    const gui = this.gui;

    let folder_name = 'Geometry';
    gui.add_item('Right Hemisphere', 'normal', options = {
      args : ['normal', 'wireframe', 'hidden'],
      folder_name : folder_name
    })
      .onChange((v) => {
        let m = canvas.mesh["Right Hemisphere"];
        if(m && m.isMesh){
          switch (v) {
            case 'normal':
              m.material.wireframe = false;
              m.visible = true;
              break;
            case 'wireframe':
              m.material.wireframe = true;
              m.visible = true;
              break;
            default:
              m.visible = false;
          }

        }
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
        let group = canvas.group['electrodes-' + gname];
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
      } );
    });

    gui.open_folder(folder_name);
  }
}




class THREEBRAIN_CONTROL{
  constructor(args = {}, DEBUG = false){
    this.params = {};
    this.folders = {};
    this._gui = new dat.GUI(args);

    this._gui.remember(this.params);

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

    return({
      onChange: (callback) => {},
    });
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
