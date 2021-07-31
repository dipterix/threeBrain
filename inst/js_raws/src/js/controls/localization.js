import { THREE } from '../threeplugins.js';
import { vec3_to_string } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import * as download from 'downloadjs';

// Electrode localization

function register_controls_localization( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.c_localization = function(){
    const folder_name = CONSTANTS.FOLDERS['localization'] || 'Electrode Localization';
    const edit_mode = this.gui.add_item( 'Edit Mode', "disabled", {
      folder_name: folder_name,
      args: ['disabled', 'CT/volume', 'MRI slice']
    });
    const tkr_loc = this.gui.add_item( ' - tkrRAS', "", {
      folder_name: folder_name
    });

    // snap to surface
    const surf_types = this.canvas.get_surface_types(),
          surf_options = ["no"];
    surf_types.forEach((v) => {
      surf_options.push(`lh.${v}`);
      surf_options.push(`rh.${v}`);
    });
    const snap_surf = this.gui.add_item( 'Snap to Surface', "no", {
      folder_name: folder_name,
      args : surf_options
    });

    // group name

    // Calculate MNI and T1
    const mni_loc = this.gui.add_item( ' - MNI305', "", {
      folder_name: folder_name
    });
    const t1_loc = this.gui.add_item( ' - T1 RAS', "", {
      folder_name: folder_name
    });

    // Download as CSV
    this.gui.add_item( 'Download as csv', () => {
      this.canvas.download_electrodes("csv");
    }, {
      folder_name: folder_name
    });


    const electrodes = [];

    const pos = new THREE.Vector3();

    const electrode_from_ct = () => {
      const inst = this.current_voxel_type();
      if( !inst ){ return; }
      this.canvas.set_raycaster();
      const res = THREE.raycast_volume(
        this.canvas.mouse_raycaster.ray.origin,
        this.canvas.mouse_raycaster.ray.direction,
        new THREE.Vector3().fromArray( inst._cube_dim ),
        new THREE.Vector3().set(
          inst._margin_length.xLength,
          inst._margin_length.yLength,
          inst._margin_length.zLength,
        ),
        inst._color_texture.image.data,
        2
      );
      pos.x = res[3];
      pos.y = res[4];
      pos.z = res[5];

      return ( pos );
    };
    const electrode_from_slice = ( scode ) => {
      if( !this.canvas._has_datacube_registered ){ return; }
      const l = this.canvas.volumes.get(scode);
      const k = Object.keys(l);
      if( !k.length ) { return; }
      const planes = l[k[0]];
      if(!Array.isArray(planes) || planes.length != 3){ return; }

      this.canvas.set_raycaster();
      this.canvas.mouse_raycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

      const items = this.canvas.mouse_raycaster.intersectObjects( planes );

      if( !items.length ){ return; }

      const p = items[0].point;
      pos.copy( p );
      return( pos );
    };

    // will get tkrRAS
    const electrode_pos = () => {
      const mode = edit_mode.getValue();
      const scode = this.canvas.state_data.get("target_subject");
      if( !mode || !scode || scode === "" ){ return; }
      switch(mode){
        case "CT/volume":
          return( electrode_from_ct() );
          break;
        case "MRI slice":
          return( electrode_from_slice( scode ) );
          break;
        default:
          return;
      }
    };

    // add canvas update
    //*
    this.canvas._custom_updates.set("localization_update", () => {
      const electrode_position = electrode_pos();

      if( !electrode_position ||
          !electrode_position.isVector3 ){
        tkr_loc.setValue("");
        mni_loc.setValue("");
        t1_loc.setValue("");
        return;
      }
      const scode = this.canvas.state_data.get("target_subject"),
            subject_data = this.canvas.shared_data.get( scode );

      // tkrRAS
      tkr_loc.setValue( vec3_to_string( electrode_position ) );

      // T1 ScannerRAS = Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
      electrode_position.applyMatrix4(
        subject_data.matrices.tkrRAS_Scanner
      );
      t1_loc.setValue( vec3_to_string( electrode_position ) );

      // MNI305 = xfm * ScannerRAS
      electrode_position.applyMatrix4(
        subject_data.matrices.xfm
      );
      mni_loc.setValue( vec3_to_string( electrode_position ) );

    });

    //*/

    // bind dblclick
    this.canvas.bind( 'localization_dblclick', 'dblclick',
      (event) => {
        const scode = this.canvas.state_data.get("target_subject");
        const electrode_position = electrode_pos();

        if( !electrode_position ||
            !electrode_position.isVector3 ){ return; }
        const num = electrodes.length + 1,
              group_name = `group_Electrodes (${scode})`;

        const el = this.canvas.add_object({
          "name": `${scode}, ${num} - NEW_ELECTRODE`,
          "type": "sphere",
          "time_stamp": [],
          "position": electrode_position.toArray(),
          "value": null,
          "clickable": true,
          "layer": 0,
          "group":{
            "group_name": group_name,
            "group_layer": 0,
            "group_position":[0,0,0]
          },
          "use_cache":false,
          "custom_info": "",
          "subject_code": scode,
          "radius": 1.5,
          "width_segments": 10,
          "height_segments": 6,
          "is_electrode":true,
          "is_surface_electrode": false,
          "use_template":false,
          "surface_type": 'pial',
          "hemisphere": null,
          "vertex_number": -1,
          "sub_cortical": true,
          "search_geoms": null
        });
        electrodes.push( el );
        this.canvas.switch_subject();

      }, this.canvas.main_canvas, false );

    // open folder
    this.gui.open_folder( folder_name );
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_localization };
