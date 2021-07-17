// Wrap up the whole script within a function
+(function(){
})();
// This is a global cache that is shared across the widgets.
const global_cache = window.global_cache || new THREEBRAIN_STORAGE();

HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    let _container, cache = false;
    if( HTMLWidgets.shinyMode ){
      cache = global_cache;
    }

    const elid = el.getAttribute('id'),
          cache_id = '__THREE_CANVAS_' + elid,
          status = {
            initalized : !HTMLWidgets.shinyMode
          };

    // Add class to el to make it display: flex
    el.classList.add('threejs-brain-container');

    const init = () => {
      let handlers = global_cache.get_item(cache_id, undefined);
      if( handlers ){
        console.log('Found previous handler, re-use it.');

        _container = handlers.el;

        // remove inner html of el
        el.innerHTML = '';
        el.onclick = undefined;
        el.classList.remove("threejs-brain-blank-container");

        el.appendChild( _container );
      }else{
        _container = document.createElement('div');
        _container.classList.add( 'threejs-brain-canvas' );
        _container.setAttribute( 'data-target', elid );

        el.appendChild( _container );

        handlers = new BrainCanvas(

          // Element to store 3D viewer
          _container,

          // dimension of the viewer
          width, height,

          // Different sizing policy, as well as callbacks
          HTMLWidgets.shinyMode, HTMLWidgets.viewerMode,

          // use cache? true, false, or the cache object
          cache,

          // DEBUG mode?
          false
        );

        global_cache.set_item(cache_id, handlers);
      }
      status.handlers = handlers;
      status.initalized = true;
    }
    const render = (v, reset = false, callback = undefined) => {
      // read
      const xobj = new XMLHttpRequest();
      // path = 'lib/' + cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
      // lib/threebrain_data-0/config.json
      let path;

      path = v.settings.cache_folder + v.data_filename;

      console.debug( 'Reading configuration file from: ' + path );

      xobj.overrideMimeType("application/json");

      xobj.onreadystatechange = () => {
        if (xobj.readyState == 4 && xobj.status == "200") {
          new Promise( () => {
            let x = JSON.parse(xobj.responseText);
            x.settings = v.settings;
            status.handlers.render_value( x, reset, callback );
          });
        }
      };
      xobj.open('GET', path, true);
      xobj.send(null);
    }

    // check if this widget is newly created
    let handlers = global_cache.get_item(cache_id, undefined);
    if( handlers ){
      // no, initialize directly
      console.log('Found previous handler, re-use it.');
      status.handlers = handlers;
      _container = handlers.el;

      // remove inner html of el
      el.innerHTML = '';
      el.onclick = undefined;
      el.classList.remove("threejs-brain-blank-container");

      el.appendChild( _container );
      status.initalized = true;
    } else if ( status.initalized ) {
      // standalone version
      init();
      if( status.initalized && status.values !== undefined ){
        render( status.values, true, () => {
          modal.classList.add("hidden");
        });
      }
    } else {

      el.classList.add("threejs-brain-blank-container");
      const modal = document.createElement("div");
      modal.classList.add("threejs-brain-modal");

      modal.innerText = "Click me to load 3D viewer.";

      el.appendChild( modal );
      el.onclick = (evt) => {
        el.onclick = undefined;
        modal.innerText = "";
        const loader = document.createElement("div");
        loader.classList.add("threejs-brain-loader");
        modal.appendChild( loader );
        el.classList.remove("threejs-brain-blank-container");

        init();
        if( status.initalized && status.values !== undefined ){
          render( status.values, true, () => {
            modal.classList.add("hidden");
          });
        }
      }
    }

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (v) => {
        status.values = v;
        if( status.initalized ){
          render( status.values );
        } else if( v.force_render ){
          el.click();
        }
      },

      resize: (width, height) => {
        if( status.handlers ){
          status.handlers.resize_widget( width, height );
        }
      }
    };
  }
});


