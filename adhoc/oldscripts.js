dependencies:
  - name: bootstrap
    version: 4.1.1
    src: htmlwidgets/lib/bootstrap-4.1.1
    style:
      - bootstrap.min.css
  - name: jquery
    version: 3.3.1
    src: htmlwidgets/lib/jQuery-3.3.1
    script:
      - jquery.min.js
  - name: threejs
    version: 0.101.1
    src: htmlwidgets/lib/threejs-0.101.1
    script:
      - js/three.min.js
      - js/Detector.js
      - js/libs/stats.min.js
      - js/libs/dat.gui.min.js
      - js/controls/OrbitControls.js
      - js/controls/TrackballControls.js
      - js/controls/OrthographicTrackballControls.js
    style:
      - css/dat.gui.css
  - name: dipterix
    version: 0.0.1
    src: htmlwidgets/lib/dipterix-0.0.1
    style:
      - dipterix.css
    script:
      - shiny_tools.js






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
      window.canvas = canvas;
      window.el = el;
      el.style.backgroundColor = '#ccff99';
    }


    // ---------------------------- Utils ----------------------------

    // 1. Shiny adapter
    let shiny = new THREE_BRAIN_SHINY();


    // 2. Resize policy
    function resize_widget(width, height){
      console.log('TODO: Resizing (resize_widget)');
    }


    return {
      // "find", "renderError", "clearError", "sizing", "name", "type", "initialize", "renderValue", "resize"

      renderValue: function(geoms, settings) {
        if(DEBUG){
          window.geoms = geoms;
          window.settings = settings;
        }
        window.x = x;

        // set camera positions
        // We main_camera to be a named list object
        if(Object.prototype.toString.call(x.main_camera) === 'object object'){
          if(x.main_camera.position !== undefined){
            canvas.camera.position.fromArray(x.main_camera.position);
          }
          if(x.main_camera.up !== undefined){
            canvas.camera.up.fromArray(x.main_camera.up);
          }
          if(x.main_camera.zoom !== undefined){
            cc.camera.zoom = x.main_camera.zoom;
          }
        }

        // Add data gui
        var gui = new dat.GUI({ autoPlace: false }),
            gui_folders = {},
            gui_appended = false,
            max_keyframe = -1;

        window.ggg = gui;



        if(!HTMLWidgets.shinyMode){
          window.dispatchEvent(new Event('resize'));
        }

        /* Clear previous elements
        The reason not to init a new canvas (which I think is what r-plotly is doing) is that
        we don't want to camera to be reset if same data pushed in. If you want to reset camera,
        I'll implement that later. Right now, you can also use shiny::uiOutput as a wrapper since that
        uiOutput will refresh everything inside it
        */

        // Clear canvas and renderers
        canvas.clear_all();
        // Clear gui controls
        $ctrl_pane.html('');
        // Add sidebars to canvas
        $side_cust.html(x.sidebar);
        // force change shiny callback
        // By default callback ID is shinyInputId + '_callback'. However this can be reset
        // So that you can have multiple callbacks in the runtime.
        shiny_input_id = x.callback_id;


        canvas.set_renderer_colors(
          new THREE.Color().fromArray(x.background_colors[0]),
          new THREE.Color().fromArray(x.background_colors[1])
        );

        var mct = x.mouse_control_target;
        canvas.set_controls_target(mct[0], mct[1], mct[2]);


        x.geoms.forEach(function(e){
          e = JSON.parse(e);
          var has_hook = false;
          if(typeof(e.hook_to) === 'object' && (e.hook_to.length === undefined || e.hook_to.length == 3)){
            if(e.hook_to.length === undefined && e.hook_to.target_name !== undefined){
              // hook is a dict which needs to look up
                var __hook_obj = canvas.scene.getObjectByName(e.hook_to.target_name);
                if(__hook_obj === undefined){
                  // __hook_obj doesn't exist
                  has_hook = false;
                }else{
                  var __pos = __hook_obj.geometry.getAttribute('position'),
                      __which_ind = e.hook_to.which_vertex;

                  e.hook_to = [
                    __pos.array[__which_ind * 3 - 3],
                    __pos.array[__which_ind * 3 - 2],
                    __pos.array[__which_ind * 3 - 1]
                  ];
                  has_hook = true;
                }
            }else if(e.hook_to.length == 3){
              has_hook = true;
            }
            if(has_hook){
              var hook = canvas.add_mesh(
                mesh_type = 'linesegment', mesh_name = e.mesh_name + '_hook',
                geom_args = {
                  // One single line of hook
                  'vertices' : [e.position[0], e.position[1], e.position[2], e.hook_to[0], e.hook_to[1], e.hook_to[2]],
                  'indices' : [0, 1]
                }, position = [0,0,0], transform = e.transform , layer = 1, mesh_info = '', clippers = null,
                clip_intersect = false, is_clipper = false, hover_enabled = false,
                threejs_method = 'LineSegments'
              );
              hook.userData.set_data_texture(hook, data = [[0, 0, 1], [1, 0, 0]]);
              hook.userData.update_data_texture(0, 1, 0, 1);
            }
          }

          var mesh = canvas.add_mesh(
            e.mesh_type, e.mesh_name, e.geom_args,
            e.position, e.transform, e.layer,
            mesh_info = function(){
              $info_pane.html(e.mesh_info);  // extra_data = e.extra_data
              if(
                HTMLWidgets.shinyMode &&
                Object.keys(e.extra_data).length > 1 &&
                e.extra_data.text !== undefined
              ){
                $info_pane.append('<span> <a href="#" class="threejsr-shiny-callback">'+
                  e.extra_data.text+
                  '</a></span>'
                );
                // add listener to shiny callbacks
                $info_pane.find(".threejsr-shiny-callback").click(function(){
                  threejsr_to_shiny(e.extra_data);
                });
              }
            },
            clippers = e.clippers,
            clip_intersect = e.clip_intersect,
            is_clipper = e.is_clipper,
            hover_enabled = e.hover_enabled
          );





          // Add control UIs
          Object.keys(e.controls).forEach(function(folder_name){

            // If is animation, check if we really need to show control gui
            if(!(x.control_animation || false) && folder_name == 'Animation'){
              return(undefined);
            }

            var params = e.controls[folder_name];
            if(gui_folders[folder_name] === undefined && folder_name !== 'hidden'){
              gui_folders[folder_name] = gui.addFolder(folder_name);
              gui_folders[folder_name].open();
            }

            // for each of params, i.e. p, add controls
            params.forEach(function(p){
              mesh.userData.__params[p.name] = p;
              p.__values = {};
              p.__values[p.label] = p.initial;

              if(typeof(p.callback) === 'string'){
                mesh.userData.__funs[p.name] = function(value, mesh = mesh){
                  try {
                    eval('var __tmp='+p.callback+';');
                    __tmp(value, mesh);
                  } catch (e) {
                  }
                };
                mesh.userData.__funs[p.name](p.initial, mesh = mesh);
              }

              if(p.hidden === undefined || p.hidden === false){
                if(p.step === undefined){
                  gui_folders[folder_name].add(
                    p.__values, p.label
                  ).onChange(function(value) {
                    if(typeof(mesh.userData.__funs[p.name]) === 'function'){
                      mesh.userData.__funs[p.name](value, mesh = mesh);
                    }
                  });
                }else{
                  gui_folders[folder_name].add(
                    p.__values, p.label, p.min, p.max
                  ).step(p.step).onChange(function(value) {
                    if(typeof(mesh.userData.__funs[p.name]) === 'function'){
                      mesh.userData.__funs[p.name](value, mesh = mesh);
                    }
                  });
                }
              }else{
                if(p.mouse_event || false){
                  // This is a mouse callback!
                  mesh.userData.mouse_callback = function(){
                    mesh.userData.__funs[p.name](value = mesh.position, mesh = mesh);
                  };
                }
              }

            });

          });


          // add mesh event if exists
          // Add controls
          Object.keys(e.events).forEach(function(event_type){
            e.events[event_type].forEach(function(args){
              canvas.mesh_event(
                  mesh_name = e.mesh_name,
                  event_type = event_type,
                  args = args
                );

              if(event_type === 'animation' && typeof(args.key_frames) === 'object'){
                var kf = args.key_frames.map(k => parseFloat(k));
                kf = kf.filter(k => !isNaN(k));
                max_keyframe = Math.max(...kf);
              }
            });
          });


        });


        canvas.switch_controls([x.control]);

        canvas.set_stats(x.show_stats);
        canvas.set_fps(x.fps);

        canvas.post_init();


        //--- Add sidebar cameras

        // Clear sidebar cameras
        $side_camr.html('');
        if(typeof(x.extra_cameras) === 'object' && x.extra_cameras !== null && (x.extra_cameras.length || 0) > 0){
          x.extra_cameras.forEach(function(args){
            canvas.side_camera(args.look_at, args);
          });

          canvas.set_side_renderer($side_camr[0]);
        }



        // Add dat gui

        if(max_keyframe > 0){
          // Now we have animation event(s)
          // add animation controllers
          if(gui_folders.Animation === undefined && (x.control_animation || false)){
            gui_folders.Animation= gui.addFolder('Animation');
          }

          canvas.ani_maxkeyframe(max_keyframe);

          if(x.control_animation || false){
            gui_folders.Animation.open();
            var keyframe_shift = x.keyframe_shift;
            var ani_params = {
              'Play/Pause' : true,
              'Reset' : canvas.ani_reset,
              'Speed' : 0,
              'Time' : keyframe_shift
            };

            gui_folders.Animation.add(ani_params, 'Play/Pause').onChange(function(v){ canvas.ani_toggle(v); });
            gui_folders.Animation.add(ani_params, 'Reset');
            gui_folders.Animation.add(ani_params, 'Speed', -1, 2).step(0.01).onChange(function(v){
              var fps = Math.pow(10, v);
              canvas.set_fps(fps);
            });
            gui_folders.Animation.add(ani_params, 'Time', keyframe_shift, max_keyframe + keyframe_shift).step(0.1)
            .onChange(function(v){
              canvas.ani_reset(v - keyframe_shift);
            });


            // Add animation callbacks to update bar
            canvas.ani_callback(function(frame){
              ani_params['Time'] = frame + keyframe_shift;
              // Iterate over all controllers
              for (var i in gui_folders.Animation.__controllers) {
                if(gui_folders.Animation.__controllers[i].property == 'Time'){
                  gui_folders.Animation.__controllers[i].updateDisplay();
                }
              }
            }, true);

          }

        }

        // Add miscellaneous items

        if(gui_folders.Miscellaneous === undefined){
          gui_folders.Miscellaneous = gui.addFolder('Miscellaneous');
        }
        gui_folders.Miscellaneous.open();

        gui_folders.Miscellaneous.add({'c' : function(){
          canvas.reset_controls();
        }}, 'c').name('Reset Camera');

        gui_folders.Miscellaneous.add({'c' : 'orthographic'}, 'c', [ 'trackball', 'orbit', 'orthographic' ] ).name('Mouse Control').onChange(function(v){
          canvas.switch_controls([v]);
        });

        gui_folders.Miscellaneous.addColor({'c' : '#ffffff'}, 'c').name('Background Color').onChange(function(v){
          canvas.set_renderer_colors(
            new THREE.Color(v)
          );
        });



        if(x.control_gui && !gui_appended){
          if(x.control_collapsed || false){
            gui.close();
          }
          gui_appended = true;
          $ctrl_pane.append(gui.domElement);
          $ctrl_pane.removeClass('hidden');

        }else if(!x.control_gui){
          $ctrl_pane.addClass('hidden');
        }

        // Resize
        resize_ui(width, height);


      },

      resize: resize_ui,

      s: this
    };
  }
});
