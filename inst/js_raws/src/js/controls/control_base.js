
class THREEBRAIN_PRESETS{

  /**
   * Initialization, defines canvas (viewer), gui controller (viewer), and settings (initial values)
   */
  constructor(canvas, gui, settings, shiny){
    this.canvas = canvas;
    this.gui = gui;
    this.settings = settings;
    this.shiny = shiny;

    this.electrode_regexp = RegExp('^electrodes-(.+)$');

    // Min max of animation time
    this.animation_time = [0,1];

    this.cache = {};

    this.canvas.bind( 'update_data_gui_controllers', 'switch_subject',
      (evt) => {
        this.update_self();
      }, this.canvas.el );

  }

  // update gui controllers
  update_self(){
    this.update_voxel_type();
    this.set_surface_ctype( true );

    if( typeof(this._calculate_intersection_coord) === 'function' ){
      this._calculate_intersection_coord();
    }

    this._update_canvas();
  }

  /**
   * wrapper for this.canvas.start_animation and pause_animation
   */
  _update_canvas(level = 0){
    if(level >= 0){
      this.canvas.start_animation(level);
    }else{
      this.canvas.pause_animation(-level);
    }
  }

  fire_change( args, priority = "deferred" ){

    // fire gui.params first
    this.shiny.to_shiny2('controllers', this.gui.params, "deferred");

    if( typeof args === 'object' ){
      for(let k in args){
        // this.parameters[k] = args[k];

        this.shiny.to_shiny2(k, args[k], priority);
      }
    }

  }

  c_syncviewer(){
    if( this.shiny.shiny_mode ){
      const folder_name = CONSTANTS.FOLDERS['sync-viewers'];
      this.gui.add_item('Send to Other Viewers', () => {
        this.fire_change({ 'sync' : this.shiny.uuid }, 'event' );
      }, {folder_name: folder_name });
    }
  }


}

export { THREEBRAIN_PRESETS };
