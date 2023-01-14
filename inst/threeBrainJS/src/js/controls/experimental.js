import { CONSTANTS } from '../constants.js';
import { set_visibility } from '../utils.js';

// Experimental (probably not gonna be used)

function register_controls_experimental( ViewerControlCenter ){

  ViewerControlCenter.prototype.c_electrode_localization = function(
    folder_name = 'Electrode Localization (Beta)'){

    this.canvas.electrodes.set( '__localization__', [] );

    /** UI:
     * 1. edit mode (checkbox)
     * 2. electrode number (positive integer)
     * 3. electrode location (string)
     * 4. electrode label
     * 5. Surface or Depth
    */
    // function to get electrode info and update dat.GUI
    // idx is from 0 - (electrode count -1)
    const switch_electrode = ( v ) => {

      let _el = get_electrode( v );
      if( !_el ){
        // use default settings
        elec_position_r.setValue( 0 );
        elec_position_a.setValue( 0 );
        elec_position_s.setValue( 0 );
        // elec_label.setValue('');
      }else{
        elec_position_r.setValue( _el.position.x );
        elec_position_a.setValue( _el.position.y );
        elec_position_s.setValue( _el.position.z );
        // elec_label.setValue( _el.userData.construct_params.custom_info || '' );

        let electrode_is_surface = _el.userData.construct_params.is_surface_electrode === true;
        elec_surface.setValue( electrode_is_surface ? 'Surface' : 'Depth' );

        this.canvas.focus_object( _el );
      }
    };
    const get_electrode = (el_num) => {
      const group = this.canvas.electrodes.get('__localization__');
      if( !group ){
        return( undefined );
      }

      return( group[ `__localization__, ${el_num === undefined? Math.max( 1, Math.round( elec_number.getValue() ) ) : el_num} - ` ] );
    };

    const edit_mode = this.gui.add_item( 'Editing Mode', 'disabled', {
      folder_name: folder_name,
      args: ['disabled', 'new electrodes', 'modification']
    } )
      .onChange( (v) => {
        this.canvas.edit_mode = (v !== 'disabled');
        this.edit_mode = v;
        this.gui.hide_item([ 'Remove Electrode', 'Number', 'Sub Label', 'Position-[R]', 'Position-[A]',
                             'Position-[S]', 'Group Label', 'Electrode type' ], folder_name);
        if( v === 'new electrodes' ){
          this.gui.show_item([ 'Number', 'Electrode type' ], folder_name);
          new_electrode();
        }else if( v === 'modification' ){
          this.gui.show_item([ 'Remove Electrode', 'Sub Label', 'Position-[R]', 'Position-[A]',
                             'Position-[S]', 'Group Label' ], folder_name);
        }
      } );

    const elec_number = this.gui.add_item( 'Number', 1, { folder_name: folder_name} ).min( 1 ).step( 1 )
      .onChange( (v) => {
        if( this.canvas.edit_mode ){
          v = Math.max( Math.round( v ) , 1 );
          switch_electrode( v );
          this._update_canvas();

          // send electrode information to shiny
          this.shiny.loc_electrode_info( true );
        }
      } );

    // const st = this.canvas.get_surface_types().concat( this.canvas.get_volume_types() );
    const elec_surface = this.gui.add_item( 'Electrode type', 'Surface', {
      folder_name: folder_name, args: ['Surface', 'Depth']
    } ).onChange((v) => {
      if( this.canvas.edit_mode ){
        let el = get_electrode();
        if( el ){
          el.userData.construct_params.is_surface_electrode = (v === 'Surface');
        }
        if( v === 'Depth' ){
          this.gui.get_controller('Overlay Coronal', 'Volume Settings').setValue( true );
          this.gui.get_controller('Overlay Axial', 'Volume Settings').setValue( true );
          this.gui.get_controller('Overlay Sagittal', 'Volume Settings').setValue( true );
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'hidden' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'hidden' );
        }else if ( v === 'Surface' ){
          this.gui.get_controller('Left Hemisphere', 'Geometry').setValue( 'normal' );
          this.gui.get_controller('Right Hemisphere', 'Geometry').setValue( 'normal' );
        }
      }
    });

    const elec_position_r = this.gui.add_item( 'Position-[R]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.x = v;
          el.userData.construct_params.position[0] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });
    const elec_position_a = this.gui.add_item( 'Position-[A]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.y = v;
          el.userData.construct_params.position[1] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });
    const elec_position_s = this.gui.add_item( 'Position-[S]', 0, { folder_name: folder_name} )
      .min(-128).max(128).step(0.01).onChange((v) => {
        if( this.canvas.edit_mode !== true ){ return( null ); }
        const el = get_electrode();
        if( el ){
          el.position.z = v;
          el.userData.construct_params.position[2] = v;
          el.userData.construct_params.vertex_number = -1;
          el.userData.construct_params._distance_to_surf = -1;
          el.userData.construct_params.hemisphere = 'NA';
          this.shiny.loc_electrode_info( true );
        }
        this._update_canvas();
      });


    const elec_group_label = this.gui.add_item( 'Group Label', '', { folder_name: folder_name} )
      .onChange((v) => {
        elec_sub_label.setValue( 0 );
      });
    const elec_sub_label = this.gui.add_item( 'Sub Label', 0, { folder_name: folder_name} ).min(0).step(1);

    const new_electrode = () => {
      let next_elnum = 1;
      to_array( this.canvas.electrodes.get("__localization__") ).forEach((el) => {
        let el_num = el.userData.electrode_number || 1;
        if( next_elnum <= el_num ){
          next_elnum = el_num + 1;
        }
      });
      elec_number.setValue( next_elnum );
      this._update_canvas();
    };

    this.gui.hide_item([ 'Remove Electrode', 'Number', 'Position', 'Sub Label', 'Position-[R]',
        'Position-[A]', 'Position-[S]', 'Group Label', 'Electrode type' ], folder_name);


    // callback 1: focus electrode
    this.canvas.add_mouse_callback(
      (evt) => {
        // If single click, focus on electrode
        if( evt.action === 'click' && this.canvas.group.has( '__electrode_editor__' ) ){
          return({ pass  : true, type  : this.canvas.group.get( '__electrode_editor__' ).children });
        }
        return({ pass: false });
      },
      ( res, evt ) => {
        if( !res.target_object ){ return(null); }
        this.canvas.focus_object( res.target_object );
        this._update_canvas();

        if( this.edit_mode === 'modification' ){
          const _n = res.target_object.userData.electrode_number || 0;
          if( _n > 0 ){
            elec_number.setValue( _n );
          }

        }
      },
      'electrode_editor_focus'
    );

    // callback 2: double click to add electrode
    this.canvas.add_mouse_callback(
      (evt) => {
        // If double click + new electrodes
        if( evt.action === 'dblclick' && this.edit_mode === 'new electrodes' ){
          const is_surface = elec_surface.getValue() === 'Surface',
                current_subject = this.canvas.get_state("target_subject");
          if( !current_subject ){
            return({pass : false});
          }

          // If Surface, we only focus on the surfaces
          let search_objects = [],
              meta;
          let lh_name, rh_name;
          if( is_surface ){
            let surfs = this.canvas.surfaces.get( current_subject );

            // Check if pial-outer-smoothed is loaded
            lh_name = `FreeSurfer Left Hemisphere - pial-outer-smoothed (${ current_subject })`;
            rh_name = `FreeSurfer Right Hemisphere - pial-outer-smoothed (${ current_subject })`;
            if( !surfs.hasOwnProperty( lh_name ) ){
              lh_name = `Standard 141 Left Hemisphere - pial-outer-smoothed (${ current_subject })`;
              rh_name = `Standard 141 Right Hemisphere - pial-outer-smoothed (${ current_subject })`;
            }
            if( surfs.hasOwnProperty( lh_name ) && surfs.hasOwnProperty( rh_name ) && !surfs[ lh_name ].visible ){
              // outer pial exists
              // Check lh and rh visibility
              const _lh = this.gui.get_controller('Left Hemisphere');
              if( !(_lh && _lh.getValue && _lh.getValue() === 'hidden') ){
                // surfs[ lh_name ].visible = true;
                set_visibility( surfs[ lh_name ], true );
              }
              const _rh = this.gui.get_controller('Right Hemisphere');
              if( !(_rh && _rh.getValue && _rh.getValue() === 'hidden') ){
                // surfs[ rh_name ].visible = true;
                set_visibility( surfs[ rh_name ], true );
              }
              meta = {
                lh_name: lh_name,
                rh_name: rh_name,
                current_subject: current_subject
              };
            }else{
              lh_name = undefined;
              rh_name = undefined;
            }

            search_objects = to_array( this.canvas.surfaces.get( current_subject ) );
          }else{
            search_objects = to_array(
              get_or_default( this.canvas.slices, current_subject, {})[`T1 (${current_subject})`]
            );
          }

          return({
            pass  : true,
            type  : search_objects,
            meta  : meta
          });
        }

        return({ pass: false });
      },
      ( res, evt ) => {
        if( res.meta && res.meta.current_subject ){
          let surfs = this.canvas.surfaces.get( res.meta.current_subject );
          if( res.meta.lh_name ){
            // surfs[ res.meta.lh_name ].visible = false;
            // surfs[ res.meta.rh_name ].visible = false;
            set_visibility( surfs[ res.meta.lh_name ], false );
            set_visibility( surfs[ res.meta.rh_name ], false );
          }
        }
        if( res.first_item ){
          // get current electrode
          let current_electrode = Math.max(1, Math.round( elec_number.getValue() )),
              // label = elec_label.getValue(),
              label = '',
              position = res.first_item.point.toArray(),
              is_surface_electrode = elec_surface.getValue() === 'Surface';

          const surface_type = this.canvas.get_state( 'surface_type', 'pial');
          add_electrode(this.canvas, current_electrode, `__localization__, ${current_electrode} - ` ,
                                position, surface_type, label, is_surface_electrode, 1);

          new_electrode();
        }
        this.shiny.loc_electrode_info();
        this._update_canvas();
      },
      'electrode_editor_add_electrodes'
    );

    // callback 3: double click to add label
    this.canvas.add_mouse_callback(
      (evt) => {
        if( evt.action === 'dblclick' &&
            this.edit_mode === 'modification' &&
            this.canvas.group.has( '__electrode_editor__' ) )
        {
          return({ pass  : true, type : this.canvas.group.get( '__electrode_editor__' ).children });
        }
        // Default, do nothing
        return({ pass: false });
      },
      ( res, evt ) => {
        if( !res.target_object ){ return(null); }
        const group_label = elec_group_label.getValue();
        const sub_number = elec_sub_label.getValue() + 1;

        res.target_object.userData.construct_params.custom_info = group_label + sub_number;

        elec_sub_label.setValue( sub_number );
        this.shiny.loc_electrode_info();
        this._update_canvas();
      },
      'electrode_editor_labels'
    );

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_REMOVE_EDITOR, (evt) => {
      if( this.canvas.edit_mode && has_meta_keys( evt.event, true, false, false ) ){
        const el = get_electrode();
        if( el && el.userData.construct_params.is_electrode ){
          el.parent.remove( el );
          const group = this.canvas.electrodes.get('__localization__');
          delete group[ el.userData.construct_params.name ];
          this.shiny.loc_electrode_info();
          this._update_canvas();
        }
      }
    });


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_ELEC_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        let delta = -1;
        if( has_meta_keys( evt.event, true, false, false ) ){
          delta = 1;
        }
        // last
        let el_num = Math.round( elec_number.getValue() + delta );
        el_num = Math.max( 1, el_num );
        elec_number.setValue( el_num );
        this._update_canvas();
      }
    }, 'edit-gui_cycle_electrodes');


    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_CYCLE_SURFTYPE_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        const is_ecog = elec_surface.getValue() === 'Surface';
        elec_surface.setValue( is_ecog ? 'Depth' : 'Surface' );
        this._update_canvas();
      }
    }, 'edit-gui_cycle_surftype');

    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_NEW_ELECTRODE_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        new_electrode();
      }
    }, 'edit-gui_new_electrodes');
/*
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_LABEL_FOCUS_EDITOR, (evt) => {
      if( this.canvas.edit_mode ){
        elec_label.domElement.children[0].click();
      }
    }, 'edit-gui_edit_label');*/

    // close other folders
    this.gui.folders["Default"].close();
    this.gui.folders["Volume Settings"].close();
    this.gui.folders[ folder_name ].open();

    // hide 3 planes
    edit_mode.setValue( 'new electrodes' );

    this._has_localization = true;

  };

  ViewerControlCenter.prototype.c_export_electrodes = function(
    folder_name = 'Default'){
    this.gui.add_item('Download Electrodes', () => {
      this.canvas.download_electrodes('csv');
    });
  };

  ViewerControlCenter.prototype.c_ct_visibility = function(){
    const folder_name = 'CT Overlay';
    this.gui.add_item('Align CT to T1', false, { folder_name: folder_name })
      .onChange((v) => {
        this.canvas._show_ct = v;
        this.canvas.switch_subject();
      });
    const ct_thred = this.gui.add_item('CT threshold', 0.8, { folder_name: folder_name })
      .min(0.3).max(1).step(0.01)
      .onChange((v) => {
        this.canvas.switch_subject('/', { ct_threshold : v });
      });

    const n_elec = this.gui.add_item('Number of Elecs', 100, { folder_name: folder_name })
      .min(1).step(1);
    this.gui.add_item('Guess Electrodes', () => {
      const thred = ct_thred.getValue() * 255;
      const n_electrodes = Math.ceil(n_elec.getValue());
      const current_subject = this.canvas.get_state("target_subject") || '';
      const ct_cube = this.canvas.mesh.get(`ct.aligned.t1 (${current_subject})`);
      if( !ct_cube || ct_cube.userData.construct_params.type !== 'datacube2' ){
        alert(`Cannot find aligned CT (${current_subject})`);
        return(null);
      }

      this.shiny.to_shiny({
        threshold: thred,
        current_subject : current_subject,
        n_electrodes : n_electrodes
      }, 'ct_threshold', true);


    }, { folder_name: folder_name });


    this.gui.folders[ folder_name ].open();

  };

  return( ViewerControlCenter );

}

export { register_controls_experimental };
