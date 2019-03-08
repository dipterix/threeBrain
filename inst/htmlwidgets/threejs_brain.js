// Wrap up the whole script within a function
+(function(){
})();
// This is a global cache that is shared across the widgets.
const global_cache = new THREEBRAIN_STORAGE();

HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    let cache = false;
    if( HTMLWidgets.shinyMode ){
      cache = global_cache;
    }


    this.handlers = new BrainCanvas(

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
    window.hh = this.handlers;

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (x) => {
        this.handlers.render_value( x );
      },

      resize: (w, h) => {
        this.handlers.resize_widget( w, h );
      }
    };
  }
});


