// Wrap up the whole script within a function
+(function(){
})();
// This is a global cache that is shared across the widgets.
const global_cache = window.global_cache || new THREEBRAIN_STORAGE();


HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    const widget = new BrainWidgetWrapper(el, true);

    if( window.THREEBRAIN ){
      window.THREEBRAIN.widget = widget;
    }

    widget.initialize(width, height);

    /*if( widget.initalized && widget.values ) {
      widget.render( widget.values , true );
    } else {
      widget.addModal();
    }*/

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: (v) => {
        widget.values = v;
        if( widget.initalized ){
          widget.render( widget.values, false );
        } else if( v.force_render ){
          widget.el.click();
        }
      },

      resize: (width, height) => {
        widget.resize(width, height);
      }
    };
  }
});


