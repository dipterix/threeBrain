import * as dat from './dat.gui.module.js';
import { to_array, to_dict } from '../utils.js';

class THREEBRAIN_CONTROL{
  constructor(args = {}, DEBUG = false){
    this.params = {};
    this.folders = {};
    this.ctrls = {};
    this._gui = new dat.GUI(args);
    // this._gui.remember( this.params );
    const _close_f = (e) => {
      if( typeof this.__on_closed === 'function' ){
        this.__on_closed( e );
      }
    };
    this._gui.__closeButton.addEventListener('click', _close_f);

    this.dispose = () => {
      this._gui.__closeButton.removeEventListener('click', _close_f);
    };

    this.domElement = this._gui.domElement;
    this.DEBUG = DEBUG;

    this.add_folder('Default');
    // this.open_folder('Default');
  }


  set closed( is_closed ){
    this._gui.closed = is_closed;
  }
  get closed(){
    return( this._gui.closed );
  }

  close(){
    this._gui.close();
    if( typeof this.__on_closed === 'function' ){
      this.__on_closed( true );
    }
  }

  open(){
    this._gui.open();
    if( typeof this.__on_closed === 'function' ){
      this.__on_closed( false );
    }
  }


  // function to
  set_closeHandler( h ){
    if( typeof h === 'function' ){
      this.__on_closed = h;
    }
  }

  // remember from args
  remember( args ){

    const keys = [
      "Background Color", "Camera Position", "Display Coordinates", "Show Panels",
      "Coronal (P - A)", "Axial (I - S)", "Sagittal (L - R)",
      "Overlay Coronal", "Overlay Axial", "Overlay Sagittal",
      "Dist. Threshold", "Surface Type", "Surface Material",
      "Left Hemisphere", "Right Hemisphere", "Left Opacity", "Right Opacity",
      "Map Electrodes", "Surface Mapping", "Volume Mapping", "Visibility",
      "Display Data", "Display Range", "Threshold Data", "Threshold Range",
      "Threshold Method", "Video Mode", "Speed", "Play/Pause",
      "Show Legend", "Show Time", "Highlight Box", "Info Text",
      "Voxel Type", "Voxel Display", "Voxel Label", "Voxel Opacity", "Voxel Min", "Voxel Max",
      "Surface Color", "Blend Factor", "Sigma", "Decay", "Range Limit",
      "Edit Mode", "Text Scale", "Text Visibility"
    ];
    const args_dict = to_dict( args );


    keys.forEach((k) => {
      if( args_dict[k] !== undefined ){
        console.debug("Setting " + k);
        this.get_controller(k).setValue( args_dict[k] );
      }
    });

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
    let fname = folder_name;
    let folder = this.folders[fname];

    if(folder && folder.__controllers){
      for(let ii in folder.__controllers){
        if(folder.__controllers[ii].property === name){
          return(folder.__controllers[ii]);
        }
      }
    }

    if( folder_name === 'Default' && typeof this.ctrls[name] === 'string' ){
      fname = this.ctrls[name];
      folder = this.folders[fname];

      if(folder && folder.__controllers){
        for(let ii in folder.__controllers){
          if(folder.__controllers[ii].property === name){
            return(folder.__controllers[ii]);
          }
        }
      }
    }


    const re = {};
    re.onChange = (callback) => {};
    re.setValue = (v) => {};
    re.isfake = true;

    return( re );
  }

  hide_item(name, folder_name = 'Default'){
    to_array( name ).forEach((_n) => {
      let c = this.get_controller(_n, folder_name);
      if( c.__li ){ c.__li.style.display='none'; }
    });

  }

  show_item(name, folder_name = 'Default'){
    to_array( name ).forEach((_n) => {
      let c = this.get_controller(_n, folder_name);
      if( c.__li ){ c.__li.style.display='block'; }
    });
  }


  // Add item
  add_item(name, value, options = {}, tooltip = null){
    let folder_name = options.folder_name || 'Default',
        args = options.args,
        is_color = options.is_color || false;

    if(this.params[name] !== undefined){
      return(undefined);
    }
    this.params[name] = value;
    let folder = this.add_folder(folder_name);

    this.ctrls[name] = folder_name;

    let _c;
    if(is_color){
      _c = folder.addColor(this.params, name);
    }else{
      if( args ){
        _c = folder.add(this.params, name, args);
      }else{
        _c = folder.add(this.params, name);
      }
    }

    return(_c);
  }

  alter_item(name, options, onSucceed = null, folder_name = 'Default'){
    let c = this.get_controller(name, folder_name);
    if( c.getValue && c.options ){
      console.debug("Altering controller: " + name);
      // will unlink listeners
      const v = c.getValue(),
            o = to_array( options ),
            callback = c.__onChange;
      let tooltip;
      if( c.__li ){
        tooltip = c.__li.getAttribute('viewer-tooltip');
      }

      if( !o.includes(v) && o.length > 0 ){
        v = o[0];
      }
      c.options( options );

      c = this.get_controller(name, folder_name);
      c.__onChange = undefined;
      c.setValue( v );
      c.__onChange = callback;

      if( typeof tooltip === 'string' ){
        c.__li.setAttribute('viewer-tooltip', tooltip);
      }

      if( typeof(onSucceed) === 'function' ){
        onSucceed( c );
      }
      return( true );
    }
    return( false );
  }

  add_tooltip( tooltip, name, folder ){
    const _c = this.get_controller( name, folder );
    if( _c.__li ){
      _c.__li.setAttribute('viewer-tooltip', tooltip);
    }
  }


}


export { THREEBRAIN_CONTROL };
