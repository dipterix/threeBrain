/* Wrap up the whole script within a function
+(function(){

})();
*/





HTMLWidgets.widget({

  name: "threejs_brain",

  type: "output",

  factory: function(el, width, height) {

    DEBUG = true;

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
        console.log('TODO: Resizing (resize_widget)');
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
    if(DEBUG){
      window.canvas = canvas;
      window.scene = canvas.scene; // chrome debugger seems to need this
    }

    // 6. Animation
    canvas.animate();

    // 7. Set flag to stop render if mouse leaves element
    el.addEventListener( 'onmouseenter', (event) => {
      if(DEBUG){
        console.log('Mouse entered canvas, render...');
      }
      canvas.render_flag = true;
    }, false );

    el.addEventListener( 'onmouseleave', (event) => {
      if(DEBUG){
        console.log('Mouse left canvas, stop render...');
      }
      canvas.render_flag = false;
    }, false );

    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: function(x) {
        // geoms, settings
        let geoms = x.geoms,
            settings = x.settings,
            groups = x.groups;
        let gui = new THREEBRAIN_CONTROL(args = { autoPlace: false }, DEBUG = DEBUG);
        // let gui = new dat.GUI({ autoPlace: false });

        if(DEBUG){
          window.groups = groups;
          window.geoms = geoms;
          window.settings = settings;
          window.gui = gui;
        }

        // Clear scene so that elements get removed
        canvas.clear_all();

        canvas.set_colormap(map = settings.colors, settings.value_range[0], settings.value_range[1], outputId);



        // Register groups and geoms
        let loader_promises = [];

        groups.forEach( (g) => {

          // Copy current count
          //let lc = loader_counts;
          let p = canvas.add_group(g, cache_folder = settings.cache_folder,
              ( xhr, path ) => {

                let percentage = xhr.loaded / xhr.total * 100;
                    msg = `${percentage.toFixed(0)}% loaded - ${path}`;

                if(DEBUG){
                  window.xhr = xhr;
                  console.log(msg);
                }

                el_text.innerHTML = msg;

            	});
          loader_promises.push(p);
        } );

        Promise.all(loader_promises).then(() => {
          el_text.innerHTML = 'Loading Completed!';
          geoms.forEach( (g) => {
            try {
              canvas.add_object(g);
            } catch (e) {
              if(DEBUG){
                console.error(e);
              }
            }
          });
        });



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

        // Add legends
        el_legend_img.setAttribute('src', settings.legend_img);

        // Set side bar
        if(settings.hide_controls || false){
          gui.domElement.style.display = 'none';
        }else{
          gui.domElement.style.display = 'block';

          let placeholder = el_control.firstChild;
          el_control.replaceChild( gui.domElement, placeholder);



          if(DEBUG){
            gui.add_item('message', 'this is a message');
            gui.add_item('color', "#ffae23", {is_color : true});
          }
        }

        let control_presets = settings.control_presets;
            presets = new THREEBRAIN_PRESETS();

        to_array( control_presets ).forEach((control_preset) => {
          if(DEBUG){
            presets[control_preset](canvas, gui);
          }else{
            try {
              presets[control_preset](canvas, gui);
            } catch (e) {}
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


