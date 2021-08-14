import { to_array, get_or_default, has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';

// 15. animation, play/pause, speed, clips...

function register_controls_animation( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.set_animation_time = function(v){
    if(this._ani_time){
      if(typeof(v) !== 'number'){
        v = this.animation_time[0];
      }
      this.__current_time = v;
      this._ani_time.setValue( v );
    }
  };

  THREEBRAIN_PRESETS.prototype.get_animation_params = function(){
    if(this._ani_time && this._ani_speed && this._ani_status){
      return({
        play : this._ani_status.getValue(),
        time : this.__current_time || 0, //this._ani_time.getValue(),
        speed : this._ani_speed.getValue(),
        min : this.animation_time[0],
        max : this.animation_time[1],
        display : this._ani_name.getValue(),
        threshold : this._thres_name.getValue()
      });
    }else{
      return({
        play : false,
        time : 0,
        speed : 0,
        min : 0,
        max : 0,
        display : '[None]',
        threshold : '[None]'
      });
    }
  };

  THREEBRAIN_PRESETS.prototype.add_clip = function(
    clip_name, focus_ui = false
  ){
    if( (typeof clip_name !== 'string') || this._animation_names.includes(clip_name) ){ return; }
    if( !this._ani_name || !this._thres_name ){ return; }
    let el = document.createElement('option');
    el.setAttribute('value', clip_name);
    el.innerHTML = clip_name;
    this._ani_name.__select.appendChild( el );

    el = document.createElement('option');
    el.setAttribute('value', clip_name);
    el.innerHTML = clip_name;
    this._thres_name.__select.appendChild( el );
    this._animation_names.push( clip_name );

    if( focus_ui ){
      // This needs to be done in the next round (after dom op)
      setTimeout(() => { this._ani_name.setValue( clip_name ); }, 100);
    }

  }

  THREEBRAIN_PRESETS.prototype.c_animation = function(){

    // Check if animation is needed
    if( to_array( this.settings.color_maps ).length === 0 ){
      return(false);
    }

    // Animation is needed
    const step = 0.001,
          folder_name = CONSTANTS.FOLDERS[ 'animation' ];

    let cnames = Object.keys( this.settings.color_maps ),
        names = ['[None]'],
        initial = this.settings.default_colormap;

    // Make sure the initial value exists, and [None] is included in the option
    cnames.forEach(n => {
      if( n === 'Subject' && cnames.includes('[Subject]') ){
        return;
      }
      names.push( n );
    });
    this._animation_names = names;

    if( !initial || !names.includes( initial ) || initial.startsWith('[') ){
      initial = undefined;
      names.forEach((_n) => {
        if( !initial && !_n.startsWith('[') ){
          initial = _n;
        }
      });
    }

    if( !initial ){
      initial = '[None]';
    }


    // Link functions to canvas (this is legacy code and I don't want to change it unless we rewrite the animation code)
    this.canvas.animation_controls.set_time = ( v ) => {
      this.set_animation_time( v );
    };
    this.canvas.animation_controls.get_params = () => { return( this.get_animation_params() ); };

    // Defines when clip name is changed (variable changed)
    const _ani_name_onchange = (v) => {
      // Generate animations
      this.canvas.generate_animation_clips( v, true, (cmap) => {

        // update time_range
        if( this.canvas.__min_t === undefined ) {
          this.canvas.update_time_range();
        }
        this._ani_time.min( this.canvas.__min_t ).max( this.canvas.__max_t );
        this.animation_time[0] = this.canvas.__min_t;
        this.animation_time[1] = this.canvas.__max_t;

        // update video playback speed
        const play_speed = this._ani_speed.getValue() || 1;

        if( !cmap ){
          legend_visible.setValue(false);
          if( v === '[None]' ){
            this.canvas.electrodes.forEach((_d) => {
              for( let _kk in _d ){
                _d[ _kk ].visible = true;
              }
            });
          }
        }else{
          this.set_animation_time( this.animation_time[0] );
          legend_visible.setValue(true);

          // If inactive electrodes are hidden, re-calculate visibility
          if( this._controller_electrodes ){
            this.set_electrodes_visibility( this._controller_electrodes.getValue() );
          }
          // reset color-range
          if( cmap.value_type === 'continuous' ){

            val_range.setValue( this.__display_range_continuous || '' );

            /*
             val_range.setValue(
               `${cmap.lut.minV.toPrecision(5)},${cmap.lut.maxV.toPrecision(5)}`
             );
            */
            this.gui.show_item(['Display Range'], folder_name);
          }else{
            val_range.setValue(',');
            this.gui.hide_item(['Display Range'], folder_name);
          }

        }
        this._update_canvas();
      });
      this.canvas.state_data.set('display_variable', v);
      this.fire_change({ 'clip_name' : v, 'display_data' : v });
    };

    const _thres_name_onchange = (v) => {
      const cmap = this.canvas.color_maps.get(v);
      if(!cmap){
        // this is not a value we can refer to
        thres_range.setValue('');
        this.canvas.state_data.set('threshold_active', false);
        return;
      }

      const previous_type = this.canvas.state_data.get('threshold_type');
      const previous_value = this.canvas.state_data.get('threshold_type');

      // set flags to canvas
      this.canvas.state_data.set('threshold_active', true);
      this.canvas.state_data.set('threshold_variable', v);

      if(cmap.value_type === 'continuous'){
        this.canvas.state_data.set('threshold_type', 'continuous');
        this.gui.show_item('Threshold Method');

        if( previous_type !== 'continuous' ){
          thres_range.setValue( this.__threshold_values_continuous || '' );
        }

      }else{
        // '' means no threshold
        this.canvas.state_data.set('threshold_type', 'discrete');
        thres_range.setValue(cmap.value_names.join('|'));
        this.gui.hide_item('Threshold Method');
      }
    };

    const ani_name = this.gui.add_item('Display Data', initial, { folder_name : folder_name, args : names })
      .onChange((v) => {
        _ani_name_onchange( v );
        this.fire_change();
        this._update_canvas();
      });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ANIMATION, 'Display Data', folder_name);

    this._ani_name = ani_name;
    const val_range = this.gui.add_item('Display Range', '', { folder_name : folder_name })
      .onChange((v) => {
        let ss = v;
        v = v.split(',').map(x => {
          return( parseFloat(x) );
        }).filter(x => {
          return( !isNaN(x) );
        });


        if( v.length > 0 && !(v.length === 1 && v[0] === 0) ){
          let v1 = v[0], v2 = Math.abs(v[0]);
          if( v.length == 1 ){
            v1 = -v2;
          }else{
            v2 = v[1];
          }

          // Set cmap value range
          this.__display_range_continuous = ss;
          this.canvas.switch_colormap( undefined, [v1, v2] );
          // reset animation tracks

        } else {
          const cmap = this.canvas.switch_colormap();
          if( cmap && cmap.value_type === 'continuous' ){
            this.__display_range_continuous = '';
            this.canvas.switch_colormap( undefined, [
              cmap.value_range[0],
              cmap.value_range[1]
            ] );
          }

        }
        /*
        if( v.match(/[^0-9,-.eE~]/) ){
          // illegal chars
          ss = Array.from(v).map((s) => {
            return( '0123456789.,-eE~'.indexOf(s) === -1 ? '' : s );
          }).join('');
        }
        let vr = ss.split(/[,~]/);
        if( vr.length === 2 ){
          vr[0] = parseFloat( vr[0] );
          vr[1] = parseFloat( vr[1] );
        }

        if( !isNaN( vr[0] ) && !isNaN( vr[1] ) ){
          // Set cmap value range
          this.canvas.switch_colormap( undefined, vr );
          // reset animation tracks
          this.canvas.generate_animation_clips( ani_name.getValue() , true );
        }
        */
        this.canvas.generate_animation_clips( ani_name.getValue() , true );
        this.fire_change();
        this._update_canvas();

      });

    const thres_name = this.gui.add_item('Threshold Data', '[None]', { folder_name : folder_name, args : names })
      .onChange((v) => {
        _thres_name_onchange( v );
        this.fire_change();
        this._update_canvas();
      });
    this._thres_name = thres_name;

    const thres_range = this.gui.add_item('Threshold Range', '', { folder_name : folder_name })
      .onChange((v) => {
        const is_continuous = get_or_default(this.canvas.state_data, 'threshold_type', 'discrete') == 'continuous';
        let candidates = v.split(/[\|,]/).map((x) => { return(x.trim()); });

        if(is_continuous){
          candidates = candidates.map(x => { return(parseFloat(x)); })
                                 .filter(x => { return(!isNaN(x)); });
          /*
          candidates = candidates.map((x) => {
            let s = Array.from(x).map((s) => {
              return( '0123456789.,-eE~'.indexOf(s) === -1 ? '' : s );
            }).join('').split(/[,~]/);
            if( s.length === 2 ){
              s[0] = parseFloat( s[0] );
              s[1] = parseFloat( s[1] );
            }else{
              return([]);
            }
            if( isNaN( s[0] ) || isNaN( s[1] ) ){
              return([]);
            }
            return(s);
          });
          */
          this.__threshold_values_continuous = v;
        }
        // set flag

        this.canvas.state_data.set('threshold_values', candidates);
        this.fire_change();
        this._update_canvas();
      });

    const thres_method = this.gui.add_item('Threshold Method', '|v| >= T1', { folder_name : folder_name, args : CONSTANTS.THRESHOLD_OPERATORS })
      .onChange((v) => {
        const is_continuous = get_or_default(this.canvas.state_data, 'threshold_type', 'discrete') == 'continuous';
        if( is_continuous ){
          const op = CONSTANTS.THRESHOLD_OPERATORS.indexOf(v);
          if( op > -1 ){
            this.canvas.state_data.set('threshold_method', op);
            this.fire_change();
            this._update_canvas();
          }
        }else{
          // TODO: handle discrete data
        }
      });
    this.canvas.state_data.set('threshold_method', 2);

    this._ani_status = this.gui.add_item( 'Play/Pause', false,
                                          { folder_name : folder_name },
                                          CONSTANTS.TOOLTIPS.KEY_TOGGLE_ANIMATION );
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_TOGGLE_ANIMATION, 'Play/Pause', folder_name);

    this._ani_status.onChange((v) => { if(v){ this._update_canvas(2); }else{ this._update_canvas(-2); } });

    this._ani_speed = this.gui.add_item('Speed', 1, {
      args : { 'x 0.01' : 0.01, 'x 0.05' : 0.05, 'x 0.1' : 0.1, 'x 0.2': 0.2, 'x 0.5': 0.5, 'x 1': 1, 'x 2':2, 'x 5':5},
      folder_name : folder_name
    });

    this.gui.add_item( 'Time', this.animation_time[0], { folder_name : folder_name })
        .min(this.animation_time[0]).max(this.animation_time[1]).step(step).onChange((v) => {
          if(typeof this.__current_time !== 'number' ||
             Math.abs(this.__current_time - v) >= 0.001){
            this.__current_time = v;
            this._ani_status.setValue(false);
          }
          this._update_canvas();
        });
    this._ani_time = this.gui.get_controller('Time', folder_name);

    this.canvas.bind( `dat_gui_ani_time_mousewheel`, 'mousewheel',
      (evt) => {
        if( evt.altKey ){
          evt.preventDefault();
          const current_val = this._ani_time.getValue();
          this._ani_time.setValue( current_val + Math.sign( evt.deltaY ) * step );
        }
      }, this._ani_time.domElement );

    // Add keyboard shortcut
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_TOGGLE_ANIMATION, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        const is_playing = this._ani_status.getValue();
        this._ani_status.setValue( !is_playing );
      }
    }, 'gui_toggle_animation');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ANIMATION, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        let current_idx = (names.indexOf( ani_name.getValue() ) + 1) % names.length;
        if( current_idx >= 0 ){
          ani_name.setValue( names[ current_idx ] );
        }
      } else if ( has_meta_keys( evt.event, true, false, false ) ){
        let current_idx = names.indexOf( ani_name.getValue() ) - 1;
        if( current_idx < 0 ){ current_idx += names.length; }
        if( current_idx >= 0 ){
          ani_name.setValue( names[ current_idx ] );
        }
      }
    }, 'gui_cycle_animation');

    this.gui.add_item('Video Mode', "hidden", {
      folder_name: folder_name, args : ["hidden", "muted", "normal"]
    }).onChange((v) => {
      if( v === undefined || v === "hidden" ){
        this.canvas.video_canvas._mode = "hidden"
      } else {
        this.canvas.video_canvas._mode = v;
        if( v === "muted" ){
          this.canvas.video_canvas.muted = true;
        } else {
          this.canvas.video_canvas.muted = false;
        }
      }
      this._update_canvas();
    });

    let render_legend = this.settings.show_legend;
    const legend_visible = this.gui.add_item('Show Legend', true, {folder_name: folder_name })
      .onChange((v) => {
        this.canvas.render_legend = v;
        this._update_canvas(0);
        this.fire_change();
      });

    let render_timestamp = this.settings.render_timestamp || false;
    const timestamp_visible = this.gui.add_item('Show Time', render_timestamp, {folder_name: folder_name })
      .onChange((v) => {
        this.canvas.render_timestamp = v;
        this.fire_change({ 'render_timestamp' : v });
        this._update_canvas(0);
      });


    this.canvas.render_legend = render_legend;
    this.canvas.render_timestamp = render_timestamp;

    this.fire_change({ 'render_timestamp' : render_timestamp });

    _ani_name_onchange( initial );

    this.gui.open_folder( folder_name );

  }

  return( THREEBRAIN_PRESETS );

}

export { register_controls_animation };
