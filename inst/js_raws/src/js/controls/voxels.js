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
    const atlas_type = this.canvas.get_state("atlas_type") || "none",
          sub = this.canvas.get_state("target_subject") || "none",
          inst = this.canvas.threebrain_instances.get(`Atlas - ${atlas_type} (${sub})`);
    if( inst && inst.isDataCube2 ){
      return( inst );
    }
    return;
  };


  THREEBRAIN_PRESETS.prototype.c_voxel = function(){
    const folder_name = CONSTANTS.FOLDERS['atlas'] || 'Volume Settings';
          // _atype = this.canvas.get_state( 'atlas_type' ) || 'none';  //_s

    // color look-up table
    this._ctl_voxel_type_options = ['none'];

    // Controls which datacube2 to display
    this.gui.add_item('Voxel Type', 'none', {args : ['none'], folder_name : folder_name })
      .onChange((v) => {
      if( v ){
        this.canvas.switch_subject( '/', {
          'atlas_type': v
        });
        this.fire_change({ 'atlas_type' : v });
      }
    });

    // Controls how the datacube should be displayed
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
    // register keyboard shortcut & callback
    this.gui.add_tooltip( CONSTANTS.TOOLTIPS.KEY_CYCLE_ATLAS_MODE, 'Voxel Display', folder_name);
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

    // Controls the opacity of the voxels
    this.gui.add_item('Voxel Opacity', 0.0, { folder_name : folder_name })
      .min(0).max(1).step(0.01)
      .onChange((v) => {
        const inst = this.current_voxel_type(),
              opa = v < 0.001 ? -1 : v;
        // mesh.material.uniforms.alpha.value = opa;
        if( inst && inst.isDataCube2 ){
          inst.object.material.uniforms.alpha.value = opa;
          if( opa < 0 ){
            inst.updatePalette();
          }
        }
        this._update_canvas();
        this.fire_change({ 'atlas_alpha' : opa });
      });


    // Add controllers for continuous lut
    let voxelLB = -100000, voxelUB = 100000;
    const applyContinuousSelection = () => {
      const dataCubeInstance = this.current_voxel_type();
      if( !dataCubeInstance ) { return; }
      const lut = dataCubeInstance.lut;
      if( !lut || lut.mapDataType !== "continuous" ) { return; }
      dataCubeInstance._filterDataContinuous( voxelLB, voxelUB );
      this.canvas.set_state( "surface_color_refresh", Date() );
      this._update_canvas();
    }
    const ctrlContinuousThresholdLB = this.gui
      .add_item('Voxel Min', -100000, { folder_name : folder_name })
      .min(-100000).max(100000).step(0.01)
      .onChange(( v ) => {
        voxelLB = v;
        applyContinuousSelection();
      });
    const ctrlContinuousThresholdUB = this.gui
      .add_item('Voxel Max', 100000, { folder_name : folder_name })
      .min(-100000).max(100000).step(0.01)
      .onChange(( v ) => {
        voxelUB = v;
        applyContinuousSelection();
      });


    // Add controllers for discrete lut
    let selectedLabels = [];
    const applyDiscreteSelection = () => {
      const dataCubeInstance = this.current_voxel_type();
      if( !dataCubeInstance ) { return; }
      const lut = dataCubeInstance.lut;
      if( !lut || lut.mapDataType !== "discrete" ) { return; }
      dataCubeInstance._filterDataDiscrete( selectedLabels );
      this.canvas.set_state( "surface_color_refresh", Date() );
      this._update_canvas();
    }
    const ctrlDiscreteSelector = this.gui.add_item('Voxel Label', "", { folder_name : folder_name })
      .onChange((v) => {
        if(typeof(v) !== "string"){ return; }

        selectedLabels.length = 0;
        const selected = v.split(",").forEach((v) => {
          v = v.trim();
          if( v.match(/^[-]{0,1}[0-9]+$/g) ) {
            v = parseInt(v);
            if( !isNaN(v) ) {
              selectedLabels.push( v );
            }
            return;
          }

          const split = v.split(/[:-]/g);
          if( !Array.isArray(split) || split.length <= 1 ) { return; }

          const start = parseInt( split[0] ),
                end = parseInt( split[1] );
          if( isNaN(start) || isNaN(end) || start > end ) { return; }
          for(let i = start; i <= end; i++ ) {
            selectedLabels.push( i );
          }
        });
        applyDiscreteSelection();
      });


    //
    this.canvas.bind(
      'c_updated_voxel_threshold', "canvas.controllers.onChange",
      (evt) => {
        if( !evt.detail || !evt.detail.data || evt.detail.data.atlas_type === undefined ) { return; }
        const dataCubeInstance = this.current_voxel_type();
        if( !dataCubeInstance ) {
          // hide selection controllers
          this.gui.hide_item(['Voxel Display', 'Voxel Label', 'Voxel Min', 'Voxel Max'], folder_name);
          return;
        }

        if( dataCubeInstance.isDataContinuous ) {
          this.gui.show_item(['Voxel Display', 'Voxel Min', 'Voxel Max'], folder_name);
          this.gui.hide_item(['Voxel Label'], folder_name);
          // update controllers' min, max, steps
          const nColorKeys = Object.keys(dataCubeInstance.lut.map).length;
          const lb = Math.floor( dataCubeInstance.__dataLB ),
                ub = Math.ceil( dataCubeInstance.__dataUB ),
                step = (dataCubeInstance.__dataUB - dataCubeInstance.__dataLB) / ( nColorKeys + 1 );
          ctrlContinuousThresholdLB.min( lb ).max( ub ).step( step )
            .setValue( voxelLB );
          ctrlContinuousThresholdUB.min( lb ).max( ub ).step( step )
            .setValue( voxelUB );
          // applyContinuousSelection();
        } else {
          this.gui.show_item(['Voxel Display', 'Voxel Label'], folder_name);
          this.gui.hide_item(['Voxel Min', 'Voxel Max'], folder_name);
          applyDiscreteSelection();
        }

      }
    )


    // initialize, let listeners to know the volume type is none
    this.fire_change({ 'atlas_type' : 'none', 'atlas_enabled' : false});
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_voxels };
