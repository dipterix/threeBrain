
// Some presets for gui and canvas

class THREEBRAIN_PRESETS{
  pial_type(canvas, gui){
    // This function controls which pial to be visible
    const pial_group = canvas.group["Left Hemisphere"],
          folder_name = 'Geometry';

    if(pial_group === undefined){
      return(null);
    }

    let gui_data = canvas.group["Left Hemisphere"].userData.group_data['.gui_params'],
        pial_name = Object.keys( gui_data ),
        default_pial = canvas.group["Left Hemisphere"].userData.group_data['.__template__'];

    this.current_pial = default_pial;

    let obj_names = to_array( gui_data[this.current_pial] );

    if(pial_name.length > 0){
      gui.add_item('Pial Name', default_pial, {
        args : pial_name,
        folder_name : folder_name
      })
      .onChange((pn) => {
        if(this.current_pial != pn){
          obj_names = to_array( gui_data[this.current_pial] );

          obj_names.forEach((nm) => {
            canvas.mesh[nm].visible = false;
          });

          obj_names = to_array( gui_data[pn] );

          obj_names.forEach((nm) => {
            canvas.mesh[nm].visible = true;
          });

          this.current_pial = pn;
        }




      });
    }

  }

  lh_material(canvas, gui){
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
  rh_material(canvas, gui){
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
  electrodes(canvas, gui){

    let group_names = Object.keys( canvas.group ),
        regex = RegExp('^electrodes-(.+)$'),
        li = [],
        folder_name = 'Geometry';

    group_names.forEach((nm) => {
      if( regex.test( nm ) ){
        let res = regex.exec( nm );
        li.push( res[1] );
      }
    });

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

    for(var ii in folder.__controllers){
      if(folder.__controllers[ii].property === name){
        return(folder.__controllers[ii]);
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
