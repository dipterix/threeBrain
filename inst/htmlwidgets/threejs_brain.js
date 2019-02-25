/* Wrap up the whole script within a function
+(function(){

})();
*/

DEBUG = true;

// Override methods so that we have multiple support across platforms
window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    function (callback) {
        setTimeout(function() { callback(Date.now()); },  1000/60);
    };


HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {
    /*
    This part controls the initialization of a HTMLWidget.
    We need to check environment (WebGL support, Environment (shiny or rmarkdown), generate basic HTML layout)
    */

    // ---------------------------- Debug ----------------------------
    if(DEBUG){
      // Debug mode, if true, expose canvas to the global environment (window)
      window.el = el;
      el.style.backgroundColor = '#ccff99';
    }


    // ---------------------------- Utils ----------------------------

    // 1. Shiny adapter
    let shiny = new THREE_BRAIN_SHINY();


    // 2. Resize policy
    let resize_widget = (width, height) => {
      console.log('TODO: Resizing (resize_widget)');
    };

    // 3. dat GUI
    let gui = new dat.GUI({ autoPlace: false });
    if(DEBUG){
      window.gui = gui;
    }


    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: function(x) {
        // geoms, settings
        let geoms = x.geoms,
            settings = x.settings;


        if(DEBUG){
          window.geoms = geoms;
          window.settings = settings;
        }


        // Make sure to resize widget
        resize_widget(width, height);
      },

      resize: resize_widget
    };
  }
});
