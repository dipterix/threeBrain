// Wrap up the whole script within a function
+(function(){
})();

/**
 *  ThreeBrainLib = {
      ViewerApp : BrainCanvas
      ViewerWrapper : ViewerWrapper,
      StorageCache : StorageCache
    }
  */

// This is a global cache that is shared across the widgets.
window.global_cache = window.global_cache || new ThreeBrainLib.StorageCache();
window.THREE = ThreeBrainLib.ExternLibs.THREE;

HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function( el , width , height) {

    const widget = new ThreeBrainLib.ViewerWrapper({
      $container : el, cache : global_cache,
      width : width, height : height,
      shinyMode : HTMLWidgets.shinyMode,
      viewerMode : HTMLWidgets.viewerMode
    });

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (v) => {
        widget.receiveData({ data : v, reset : false })
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


