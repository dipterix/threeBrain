// Wrap up the whole script within a function
+(function(){
})();

/**
 *  threeBrain = {
      ViewerApp : BrainCanvas
      ViewerWrapper : ViewerWrapper,
      StorageCache : StorageCache
    }
  */

// This is a global cache that is shared across the widgets.
window.global_cache = window.global_cache || new threeBrain.StorageCache();
window.THREE = threeBrain.ExternLibs.THREE;

HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function( el , width , height) {

    const widget = new threeBrain.ViewerWrapper({
      $container : el, cache : global_cache,
      width : width, height : height,
      viewerMode : HTMLWidgets.viewerMode
    });

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (v) => {
        widget.receiveData({ data : v, reset : false });

        if( HTMLWidgets.shinyMode && !widget.viewer.shinyDriver ) {
          widget.viewer.shinyDriver = new threeBrain.Drivers.Shiny( widget.viewer );
        }
        /*
        widget.values = v;
        if( widget.initalized ){
          widget.render( widget.values, false );
        } else if( v.force_render ){
          widget.el.click();
        }
        */
      },

      resize: (width, height) => {
        widget.resize(width, height);
      }
    };
  }
});


