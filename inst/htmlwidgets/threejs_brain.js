// Wrap up the whole script within a function
+(function(){
})();
// This is a global cache that is shared across the widgets.
const global_cache = window.global_cache || new THREEBRAIN_STORAGE();

HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    let cache = false;
    if( HTMLWidgets.shinyMode ){
      cache = global_cache;
    }

    // handlers should never be "this.handlers" since HTMLWidgets is a class,
    // this.handlers will have crosstalk with other widgets
    let handlers = new BrainCanvas(

      // Element to store 3D viewer
      el,

      // dimension of the viewer
      width, height,

      // Different sizing policy, as well as callbacks
      HTMLWidgets.shinyMode, HTMLWidgets.viewerMode,

      // use cache? true, false, or the cache object
      cache,

      // DEBUG mode?
      false
    );

    // global_cache.set_item('__' + el.getAttribute('id'), handlers);

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (x) => {
        handlers.render_value( x );
      },

      resize: (width, height) => {
        handlers.resize_widget( width, height );
      }
    };
  }
});


