import { to_array, has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';


// 17. Voxel color type

function register_controls_voxels( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.update_voxel_type = function(){
    let c, v, flag;

    if( this._ctl_voxel_type_options ){
      c = this.gui.get_controller("Voxel Type");
      if( !c.isfake ){

        let atlases = this.canvas.get_atlas_types();
        atlases.push("none");
        if( this._ctl_voxel_type_options.length !== atlases.length ){
          flag = true;
        } else {
          flag = false;
          this._ctl_voxel_type_options.forEach((v, ii) => {
            if( atlases[ii] !== v ){
              flag = true;
            }
          })
        }
        if( flag ){
          flag = this.gui.alter_item("Voxel Type", atlases, ( c ) => {
            this._ctl_voxel_type_options = atlases;
            c.setValue( atlases[0] );
          })
        }
      }
    }
  };

  THREEBRAIN_PRESETS.prototype.current_voxel_type = function(){
    const atlas_type = this.canvas.state_data.get("atlas_type") || "none",
          sub = this.canvas.state_data.get("target_subject") || "none",
          inst = this.canvas.threebrain_instances.get(`Atlas - ${atlas_type} (${sub})`);
    if( inst && inst.isDataCube2 ){
      return( inst );
    }
    return;
  };

  THREEBRAIN_PRESETS.prototype.c_voxel = function(){
    const folder_name = CONSTANTS.FOLDERS['atlas'] || 'Volume Settings',
          lut = this.canvas.global_data('__global_data__.VolumeColorLUT'),
          lut_map = lut.map,
          lut_alpha = lut.mapAlpha,
          lut_type = lut.mapDataType;
          // _atype = this.canvas.state_data.get( 'atlas_type' ) || 'none';  //_s
    this._ctl_voxel_type_options = ['none'];
    this._ctl_voxel_type_callback = (v) => {
      if( v ){
        this.canvas.switch_subject( '/', {
          'atlas_type': v
        });
        this.fire_change({ 'atlas_type' : v });
      }
    };

    this.gui.add_item('Voxel Type', 'none', {args : ['none'], folder_name : folder_name })
      .onChange( this._ctl_voxel_type_callback );

    this.fire_change({ 'atlas_type' : 'none', 'atlas_enabled' : false});

    // display type
    this.gui.add_item('Voxel Display', 'hidden', {
      args : ['hidden', 'normal'], folder_name : folder_name
    }).onChange( (v) => {
      this.canvas.atlases.forEach( (al, subject_code) => {
        for( let atlas_name in al ){
          const m = al[ atlas_name ];
          if( m.isMesh && m.userData.instance.isThreeBrainObject ){
            const inst = m.userData.instance;
            if( inst.isDataCube2 ){
              inst.set_display_mode( v );
            }
          }
        }
      });
      this.canvas.set_state( "surface_color_refresh", Date() );
      this._update_canvas();
    });
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ATLAS_MODE, 'Voxel Display', folder_name);

    // register key callbacks
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ATLAS_MODE, (evt) => {
      if( has_meta_keys( evt.event, false, false, false ) ){
        // have to update dynamically because it could change
        const ctl = this.gui.get_controller("Voxel Display");
        if( ctl.getValue() === 'hidden' ) {
          ctl.setValue( "normal" );
        } else {
          ctl.setValue( "hidden" );
        }
      }
    }, 'gui_atlas_display_mode');

    // If color map supports alpha, add override option
    const atlas_alpha = this.gui.add_item('Voxel Opacity', 0.0, { folder_name : folder_name })
      .min(0).max(1).step(0.01)
      .onChange((v) => {
        const inst = this.current_voxel_type(),
              opa = v < 0.001 ? -1 : v;
        // mesh.material.uniforms.alpha.value = opa;
        if( inst && inst.isDataCube2 ){
          inst.object.material.uniforms.alpha.value = opa;
          if( opa < 0 ){
            inst._set_palette();
            inst.object.material.uniforms.cmap.value.needsUpdate = true;
          }
        }
        this._update_canvas();
        this.fire_change({ 'atlas_alpha' : opa });
      });

    // this.gui.hide_item("Voxel Opacity")

    //.add_item('Intersect MNI305', "NaN, NaN, NaN", {folder_name: folder_name});
    if( lut_type === "continuous" ){

      const cmap_array = Object.values(lut_map);
      const voxel_value_range = to_array( lut.mapValueRange );
      const voxel_minmax = (l, u) => {
        const inst = this.current_voxel_type();
        if( inst && inst.isDataCube2 ){

          // might be large?
          new Promise( () => {

            let tmp;
            const candidates = cmap_array.filter((e) => {
              tmp = parseFloat(e.Label);
              if(isNaN(tmp)){ return(false); }
              if( tmp >= l && tmp <= u ){ return(true); }
              return(false);
            }).map( (e) => {
              return(e.ColorID);
            });

            inst._set_palette( candidates );

            inst.object.material.uniforms.cmap.value.needsUpdate = true;
            this.canvas.set_state( "surface_color_refresh", Date() );
            this._update_canvas();
          });

        }
      }
      if(cmap_array.length > 0){
        let vmin = voxel_value_range[0],
            vmax = voxel_value_range[1];
        this.gui.add_item('Voxel Min', vmin, { folder_name : folder_name })
          .min(vmin).max(vmax).step((vmax - vmin) / cmap_array.length)
          .onChange((v) => {
            vmin = v;
            voxel_minmax(vmin, vmax);
          });

        this.gui.add_item('Voxel Max', vmax, { folder_name : folder_name })
          .min(vmin).max(vmax).step((vmax - vmin) / cmap_array.length)
          .onChange((v) => {
            vmax = v;
            voxel_minmax(vmin, vmax);
          });
      }

    } else {
      const atlas_thred_text = this.gui.add_item('Voxel Label', "0", { folder_name : folder_name })
      .onChange((v) => {

        if(typeof(v) !== "string"){ return; }

        const inst = this.current_voxel_type();
        if( inst && inst.isDataCube2 ){

          // might be large?
          new Promise( () => {
            const candidates = v.split(",")
              .map((v) => {return parseInt(v)})
              .filter((v) => {return !isNaN(v)});
            inst._set_palette( candidates );
            inst.object.material.uniforms.cmap.value.needsUpdate = true;
            this.canvas.set_state( "surface_color_refresh", Date() );
            this._update_canvas();
          });

        }


      });
    }
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_voxels };
