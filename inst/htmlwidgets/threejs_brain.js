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
          cache_id = '__THREE_CANVAS_' + elid;

    // Add class to el to make it display: flex
    el.classList.add('threejs-brain-container');

    let handlers = global_cache.get_item(cache_id, undefined);
    if( handlers ){
      console.log('Found previous handler, re-use it.');

      _container = handlers.el;

      // remove inner html of el
      el.innerHTML = '';

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

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (v) => {

        // read
        const xobj = new XMLHttpRequest();
        // path = 'lib/' + cache_folder + '-0/' + g.cache_name + '/' + cache_info.file_name;
        // lib/threebrain_data-0/config.json
        let path;

        path = v.data_directory + v.config;

        console.log( 'Reading configuration file from: ' + path );

        xobj.overrideMimeType("application/json");

        xobj.onreadystatechange = () => {
          if (xobj.readyState == 4 && xobj.status == "200") {
            let x = JSON.parse(xobj.responseText);
            handlers.render_value( x );
          }
        };
        xobj.open('GET', path, true);
        xobj.send(null);

      },

      resize: (width, height) => {
        handlers.resize_widget( width, height );
      }
    };
  }
});


