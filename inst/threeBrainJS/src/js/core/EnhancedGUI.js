import { to_array, to_dict } from '../utils.js';
import GUI from 'lil-gui';
import { EventDispatcher } from 'three';

const _openEvent = { type: 'open' };
const _closeEvent = { type: 'close' };

class EnhancedGUI extends GUI {
  constructor(args = {}){
    super(args);
    this.isEnhancedGUI = true;

    // event
    if( this.parent === undefined ) {
      this.__eventDispather = new EventDispatcher();
    } else {
      this.__eventDispather = this.parent.__eventDispather;
    }

    if( !this.parent || !this.parent.isEnhancedGUI ) {
      this._fullPaths = [];
      this.addFolder('Default');
    } else {
      this._fullPaths = [...this.parent._fullPaths];
      this._fullPaths.push( this._title );
    }

    // everything is controlled here
    this.object = {};

  }

  get isFocused() {
    return this.controllersRecursive().some(c => { return c._isFocused2; } );
  }

  _dispatchEvent ( event ) {
    event.folderPath = this._fullPaths.join(">");
    this.__eventDispather.dispatchEvent( event );
  }
  dispatchEvent = ( event ) => {
    this._dispatchEvent();
  }
  addEventListener = ( type, callback ) => {
    this.__eventDispather.addEventListener( type, callback );
  }
  removeEventListener = ( type, callback ) => {
    this.__eventDispather.removeEventListener( type, callback );
  }

  dispose() {
    this.destroy();
  }

  set closed( is_closed ){
    if( is_closed ) {
      this.close();
    } else {
      this.open();
    }
  }
  get closed(){
    return this._gui._hidden;
  }

  openAnimated( open = true ){

		// set state immediately
		this._closed = !open;

		if( open ) {
		  this._dispatchEvent( _openEvent );
		}

		this.$title.setAttribute( 'aria-expanded', !this._closed );

		// wait for next frame to measure $children
		requestAnimationFrame( () => {

			// explicitly set initial height for transition
			const initialHeight = this.$children.clientHeight;
			this.$children.style.height = initialHeight + 'px';

			this.domElement.classList.add( 'transition' );

			const onTransitionEnd = e => {
				if ( e.target !== this.$children ) return;
				this.$children.style.height = '';
				this.domElement.classList.remove( 'transition' );
				this.$children.removeEventListener( 'transitionend', onTransitionEnd );
				if( this._closed ) {
				  this._dispatchEvent( _closeEvent );
				}

			};

			this.$children.addEventListener( 'transitionend', onTransitionEnd );

			// todo: this is wrong if children's scrollHeight makes for a gui taller than maxHeight
			const targetHeight = !open ? 0 : this.$children.scrollHeight;

			this.domElement.classList.toggle( 'closed', !open );

			requestAnimationFrame( () => {
				this.$children.style.height = targetHeight + 'px';
			} );

		} );

		return this;

	}

	open( open = true ) {

		this._closed = !open;

		if( open ) {
		  this._dispatchEvent( _openEvent );
		}

		this.$title.setAttribute( 'aria-expanded', !this._closed );
		this.domElement.classList.toggle( 'closed', this._closed );

		if( this._closed ) {
		  this._dispatchEvent( _closeEvent );
		}

		return this;

	}

	// folders
  addFolder( title ){
    const subTitles = title.split(">")
      .map(v => { return v.trim(); });
    const folderName = subTitles.splice(0, 1)[0];

    // try to find from existing folders
    const existingFolders = this.folders.filter( folder => {
      return folder._title === folderName;
    })
    let currentFolder;
    if( existingFolders.length > 0 ) {
      currentFolder = existingFolders[0];
    } else {
      currentFolder = new EnhancedGUI( {
        parent: this, title : folderName
      });
      currentFolder.close();
    }

    if( subTitles.length === 0 ) {
      return currentFolder;
    }
    return currentFolder.addFolder( subTitles.join(">") );
  }
  openFolder( title, animated = true, open = true ){
    const subTitles = title.split(">")
      .map(v => { return v.trim(); });
    const folderName = subTitles.splice(0, 1)[0];
    this.folders.forEach( folder => {
      if( folder._title === folderName ) {
        if( animated ) {
          folder.openAnimated( open );
        } else {
          folder.open( open )
        }
        folder.openFolder( subTitles.join(">"), animated );
      }
    })
  }
  closeFolder( title, animated = true ){
    this.openFolder( title, animated, false );
  }
  getFolder( title ) {
    if( !title || title.length === 0 ) { return this; }
    if( !Array.isArray(title) ) {
      title = title.split(">").map(v => { return v.trim(); });
    }
    const folderName = title.splice(0, 1)[0];
    for(let i in this.folders) {
      const folder = this.folders[i];
      if( folder._title === folderName ) {
        return folder.getFolder( title );
      }
    }
    return;
  }

  // items
  addController( name, value, options, tooltip) {
    if( !options || typeof options !== "object" ) {
      options = {};
    }
    let fullPath = (options.folderName || options.folder_name || "") + ">" + name;
    fullPath = fullPath.split(">").map(v => v.trim()).filter(v => { return( v !== "" ); });
    if( fullPath.length == 0 ) {
      throw 'Invalid controller name: name cannot be blank.'
    }
    let folderName = fullPath.splice(0, fullPath.length - 1);
    if( this.parent === undefined && folderName.length === 0 ) {
      folderName.push("Default");
    }
    folderName = folderName.join(">");
    const folder = this.addFolder( folderName );
    const controllerName = fullPath[0];
    const isColor = options.isColor || options.is_color || false;
    const controllerArgs = options.args;

    // check if this folder has controller
    for(let i in folder.controllers) {
      const controller = folder.controllers[ i ];
      if( controller._name === controllerName ) {
        return controller;
      }
    }
    const controllerObject = options.object ?? folder.object;
    controllerObject[ name ] = value;
    let controller;
    if( isColor ) {
      controller = folder.addColor( controllerObject, controllerName );
    } else {
      if( controllerArgs ) {
        controller = folder.add( controllerObject, controllerName, controllerArgs );
      } else {
        controller = folder.add( controllerObject, controllerName );
      }
    }
    // make sure the controller slider does not activate accidentally
    controller._sliderWheelEnabled = false;

    // add event to set focus flags
    if( controller.$disable ) {
      controller.$disable.onfocus = () => { controller._isFocused2 = true; }
      controller.$disable.onblur = () => { controller._isFocused2 = false; }
    }

    return controller;
  }
  getController( name, folderName, explicit = false ) {
    if( Array.isArray( folderName ) ) { folderName = folderName.join(">"); }
    if( typeof folderName !== "string" ) { folderName = ""; }
    const fullPath = `${ folderName }>${name}`.split(">").map(v => v.trim())
      .filter(v => { return( v !== "" ); });
    let controllerName;
    if( fullPath.length == 1 ) {
      controllerName = fullPath[0];
      for(let i in this.controllers) {
        const controller = this.controllers[ i ];
        if( controller._name === controllerName ) {
          return controller;
        }
      }
    } else if ( fullPath.length > 1 ) {
      const folder = this.getFolder( fullPath.splice( 0, fullPath.length - 1 ) );
      controllerName = fullPath[0];
      if( folder ) {
        return folder.getController( controllerName );
      }
    }

    // recursive search name: TODO: consider whether this is necessary
    if( controllerName && !explicit ) {
      const allControllers = this.controllersRecursive();
      for(let i in allControllers) {
        const controller = allControllers[ i ];
        if( controller._name === controllerName ) {
          return controller;
        }
      }
    }


    // unable to find, return fake one
    return ({
      onChange : () => {},
      setValue : () => {},
      isfake : true
    });
  }
  showControllers( names, folderName ) {
    if( Array.isArray( names ) ) {
      names.forEach( v => {
        this.showControllers( v, folderName );
      });
      return;
    }
    const controller = this.getController( names, folderName );
    if( controller.isfake ) { return; }
    controller.show()
  }
  hideControllers( names, folderName ) {
    if( Array.isArray( names ) ) {
      names.forEach( v => {
        this.hideControllers( v, folderName );
      });
      return;
    }
    const controller = this.getController( names, folderName );
    if( controller.isfake ) { return; }
    controller.hide();
  }

  addTooltip( tooltip, controllerName, controllerFolder ){
    const controller = this.getController( controllerName, controllerFolder );
    if( controller.isfake ) { return; }
    try {
      controller.domElement.setAttribute('viewer-tooltip', tooltip);
    } catch (e) {}
  }

  setFromDictionary( args ){
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
    const data = to_dict( args );
    keys.forEach((k) => {
      const value = data[k];
      if( value !== undefined ){
        const controller = this.getController( k, "", false );
        if( !controller.isfake ) {
          console.debug(`Initialize setting ${ k } -> ${ value }`);
          controller.setValue( value );
        }
      }
    });

  }

}


export { EnhancedGUI };
