
// Some presets for gui and canvas

var THREEBRAIN_PRESETS = {
  "lh-pial": function(canvas, gui){
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
  },
  "rh-pial": function(canvas, gui){
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
  },
  'electrodes' : function(canvas, gui){

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
      gui.add_item('E-' + gname, 7, options = {
        args : { 'all cameras' : 7, 'main camera' : 8, 'hidden': 30 },
        folder_name : folder_name
      })
      .onChange( (v) => {
        let group = canvas.group['electrodes-' + gname];
        if(group){
          group.children.forEach((m) =>{
            m.layers.set(v);
          });
        }
      } );
    });

    gui.open_folder(folder_name);
  },
};




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
