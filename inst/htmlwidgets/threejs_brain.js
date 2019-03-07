/* Wrap up the whole script within a function
+(function(){

})();
*/



HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    DEBUG = false;

    /*
    This part controls the initialization of a HTMLWidget.
    We need to check environment (WebGL support, Environment (shiny or rmarkdown), generate basic HTML layout)
    */

    // ---------------------------- Debug ----------------------------
    if(DEBUG){
      // Debug mode, if true, expose canvas to the global environment (window)
      window.el = el;
      // el.style.backgroundColor = '#ccff99';
    }

    // ---------------------------- Global objects ----------------------------

    // ---------------------------- Utils ----------------------------
    // 0. Check WebGL
    if ( WEBGL.isWebGLAvailable() === false ) {
			el.appendChild( WEBGL.getWebGLErrorMessage() );
			return({});
		}

    // 1. Shiny adapter
    let outputId = el.getAttribute('id'),
        shiny_mode = HTMLWidgets.shinyMode,   // is in shiny?
        viewer_mode = HTMLWidgets.viewerMode, // Not used now
        shiny = new THREE_BRAIN_SHINY(outputId, shiny_mode);


    // 2. Resize policy

    // Make sure to resize widget in the viewer model because its parent element is absolute in position and setting height, width to 100% won't work.
    if(viewer_mode){
      el.style.height = '100vh';
      el.style.width = '100vw';
    }

    var resize_widget = function(width, height){
      if(DEBUG){
        console.debug('TODO: Resizing (resize_widget)');
      }

      canvas.handle_resize(width - 300, height);

      el_side.style.maxHeight = height + 'px';

    };


    // 4. HTML layout:
    // Create control panel
    let el_side = document.createElement('div');
    el_side.style.maxHeight = height + 'px';
    // el_side.style.height = height + 'px';
    el_side.setAttribute('class', 'threejs-control');
    el.appendChild( el_side );

    // Control panel has three parts:
    // 1. data gui - auto
    // 2. text info - auto
    // 3. legend info - auto
    var el_control = document.createElement('div'),
        gui_placeholder = document.createElement('div');
    el_control.style.width = '100%';
    el_control.appendChild( gui_placeholder );
    el_side.appendChild( el_control );




    var el_legend = document.createElement('div'),
        el_legend_img = document.createElement('img');
    el_legend.style.width = '100%';
    el_legend.style.pointerEvents = 'none';
    // el_legend.style.padding = '10px';
    // el_legend.style.backgroundColor = 'rgba(255,255,255,0.2)';

    el_legend_img.style.width = '100%';
    el_legend_img.style.display = 'none';
    el_legend_img.style.pointerEvents = 'none';
    el_legend_img.style.backgroundColor = 'rgba(255,255,255,0.6)';

    el_legend.appendChild( el_legend_img );

    el_side.appendChild( el_legend );


    var el_text = document.createElement('div');
    el_text.style.width = '100%';
    el_text.style.padding = '10px';
    el_side.appendChild( el_text );



    // 5. initialize threejs scene
    let canvas = new THREEBRAIN_CANVAS(el, width, height, side_width = 250, DEBUG = DEBUG);

    // 6. Animation
    canvas.animate();

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: function(x) {
        // geoms, settings
        let geoms = x.geoms,
            settings = x.settings,
            optionals = settings.optionals || {},
            groups = x.groups;
        let gui = new THREEBRAIN_CONTROL(args = { autoPlace: false }, DEBUG = DEBUG);
        // let gui = new dat.GUI({ autoPlace: false });

        DEBUG = settings.debug;
        if(DEBUG){
          window.groups = groups;
          window.geoms = geoms;
          window.settings = settings;
          window.gui = gui;
          window.canvas = canvas;
          canvas.DEBUG = true;
          window.scene = canvas.scene; // chrome debugger seems to need this
        }else{
          window.__groups = groups;
          window.__geoms = geoms;
          window.__settings = settings;
          window.__gui = gui;
          window.__canvas = canvas;
        }
        DEBUG = true;

        // Clear scene so that elements get removed
        canvas.clear_all();
        canvas.render_flag = false;

        canvas.set_colormap(map = settings.colors, settings.value_range[0], settings.value_range[1], outputId);


        canvas.loader_triggered = false;

        canvas.loader_manager.onLoad = () => {
          el_text.innerHTML = '<p><small>Loading Completed!</small></p>';
          geoms.forEach( (g) => {
            if(DEBUG){
              canvas.add_object(g);
            }else{
              try {
                canvas.add_object(g);
              } catch (e) {
              }
            }
          });

          // --------------- Register GUI controller ---------------
          // Add legends
          el_legend_img.setAttribute('src', settings.legend_img);

          // Set side bar
          if(settings.hide_controls || false){
            gui.domElement.style.display = 'none';
          }else{
            gui.domElement.style.display = 'block';

            let placeholder = el_control.firstChild;
            el_control.replaceChild( gui.domElement, placeholder);

          }

          let control_presets = settings.control_presets;
              presets = new THREEBRAIN_PRESETS(canvas, gui, optionals.map_to_template || false);

          to_array( control_presets ).forEach((control_preset) => {
            try {
              presets[control_preset]();

              let callback = presets[control_preset + '_callback'];
              if(typeof(callback) === 'function'){
                callback();
              }
            } catch (e) {
              if(DEBUG){
                console.warn(e);
              }
            }
          });



          // GUI folders to keep them in order
          gui.add_folder('Graphics');
          gui.add_folder('Misc');


          // Add listeners
          gui
            .add_item('Background Color', "#ffffff", {is_color : true, folder_name: 'Misc'})
            .onChange((v) => {
              let inversedColor = invertColor(v);
              canvas.main_renderer.setClearColor(v);
              canvas.side_renderer.setClearColor(v);
              el_text.style.color=inversedColor;
              el.style.backgroundColor = v;
            });

          gui.add_item('Reset Control', () => {canvas.reset_controls()}, {folder_name: 'Misc'});
          gui.add_item('Lock Control', false, {folder_name: 'Misc'})
            .onChange((v) => {
              canvas.controls.enabled = !v;
            });
          gui.add_item('Show Legend', settings.show_legend, {folder_name: 'Graphics'})
            .onChange((v) => {
              let d = v? 'block' : 'none';
              el_legend_img.style.display = d;
            });

          gui.add_item('Enable Raycast', false, {folder_name: 'Misc'})
            .onChange((v) =>{
              canvas.disable_raycast = !v;
            });


          canvas.render_flag = true;
        };


        canvas.loader_manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {

        	let path = /\/([^/]*)$/.exec(url)[1],
        	    msg = '<p><small>Loading file: ' + itemsLoaded + ' of ' + itemsTotal + ' files.<br>' + path + '</small></p>';

          if(DEBUG){
            console.debug(msg);
          }

          el_text.innerHTML = msg;

        };

        // Register groups and geoms

        groups.forEach( (g) => {

          canvas.add_group(g, cache_folder = settings.cache_folder);

        } );

        if(!canvas.loader_triggered){
          canvas.loader_manager.onLoad();
        }





        // Set side camera
        if(settings.side_camera || false){
          canvas.enable_side_cameras();
        }else{
          canvas.disable_side_cameras();
        }

        // set controls center
        canvas.update_control_center(settings.control_center);

        // Force render canvas
        canvas.handle_resize(width - 300, height);
        canvas.render();



        canvas.set_mouse_click_callback((obj) => {
          if(obj.userData){
            const g = obj.userData.construct_params,
                  pos = obj.getWorldPosition( new THREE.Vector3() );

            // Get information and show them on screen
            let group_name = g.group ? g.group.group_name : '(No Group)';

            let text = `<h4>${g.name}</h4><hr>
                        <p>
                        Group: ${group_name}<br>
                        Global Position: <br>(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})<br>
                        </p>`;

            el_text.innerHTML = text;
          }
        });
      },

      resize: resize_widget
    };
  }
});
