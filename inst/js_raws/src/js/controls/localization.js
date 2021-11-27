import { THREE } from '../threeplugins.js';
import { vec3_to_string, has_meta_keys } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import { is_electrode } from '../geometry/sphere.js';
import { intersect_volume, electrode_from_ct } from '../Math/raycast_volume.js';
import * as download from 'downloadjs';

// Electrode localization
const pos = new THREE.Vector3();
const folder_name = CONSTANTS.FOLDERS['localization'] || 'Electrode Localization';

const COL_SELECTED = 0xff0000,
      COL_ENABLED = 0xfa9349,
      COL_DISABLED = 0xf1f2d5;

class TextTexture extends THREE.Texture {

  constructor( text, mapping, wrapS, wrapT, magFilter, minFilter, format,
    type, anisotropy, font = "Courier", size = 32
  ) {

    const canvas = document.createElement("canvas");
    super( canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

    this._text = text || " ";
    this._size = Math.ceil( size );
    this._canvas = canvas;
    this._canvas.height = this._size;
    this._canvas.width = Math.ceil( this._text.length * this._size * 0.6 );
    this._context = this._canvas.getContext("2d");
    this._context.font = `${this._size}px ${font}`;
    this._context.fillText( this._text, 0, this._size * 26 / 32);

		this.needsUpdate = true;

	}

}

function atlas_label_from_index(index, canvas){
  const fslut = canvas.global_data("__global_data__.FSColorLUT");
  try {
    const lbl = fslut.map[ index ].Label;
    if( lbl ){
      return([lbl, index]);
    } else {
      return(["Unknown", index]);
    }
  } catch (e) {
    return(["Unknown", index]);
  }
}

function atlas_label(pos_array, canvas){
  const sub = canvas.state_data.get("target_subject") || "none",
        inst = canvas.threebrain_instances.get(`Atlas - aparc_aseg (${sub})`);
  if( !inst ){ return( [ "Unknown", 0 ] ); }

  const margin_voxels = new THREE.Vector3().fromArray( inst._cube_dim );
  const margin_lengths = new THREE.Vector3().set(
    inst._margin_length.xLength,
    inst._margin_length.yLength,
    inst._margin_length.zLength
  );
  const f = new THREE.Vector3().set(
    margin_lengths.x / margin_voxels.x,
    margin_lengths.y / margin_voxels.y,
    margin_lengths.z / margin_voxels.z
  );
  const mx = margin_voxels.x,
        my = margin_voxels.y,
        mz = margin_voxels.z;
  const ct_data = inst._cube_values;

  const delta = 4;
  const position = pos_array;

  let i = ( position[0] + ( margin_lengths.x - 1 ) / 2 ) / f.x + 0.5;
  let j = ( position[1] + ( margin_lengths.y - 1 ) / 2 ) / f.y + 0.5;
  let k = ( position[2] + ( margin_lengths.z - 1 ) / 2 ) / f.z - 0.5;

  i = Math.round( i );
  j = Math.round( j );
  k = Math.round( k );

  if( i < 0 ){ i = 0; }
  if( i >= mx ){ i = mx - 1; }
  if( j < 0 ){ k = 0; }
  if( j >= my ){ j = my - 1; }
  if( k < 0 ){ k = 0; }
  if( k >= mz ){ k = mz - 1; }

  let tmp, count = {};

  tmp = ct_data[ i + j * mx + k * mx * my ];

  if( tmp == 0 ){
    for(let i0 = Math.max(0, i - delta); i0 < Math.min(i + delta, mx); i0++ ) {
      for(let j0 = Math.max(0, j - delta); j0 < Math.min(j + delta, my); j0++ ) {
        for(let k0 = Math.max(0, k - delta); k0 < Math.min(k + delta, mz); k0++ ) {
          tmp = ct_data[ i0 + j0 * mx + k0 * mx * my ];
          if( tmp > 0 ){
            count[ tmp ] = ( count[ tmp ] || 0 ) + 1;
          }
        }
      }
    }

    const keys = Object.keys(count);
    if( keys.length > 0 ){
      tmp = keys.reduce((a, b) => count[a] > count[b] ? a : b);
      tmp = parseInt( tmp );
    }
  }

  // find label
  if( tmp == 0 ){
    return([ "Unknown", 0 ]);
  }
  const fslut = canvas.global_data("__global_data__.FSColorLUT");
  try {
    const lbl = fslut.map[ tmp ].Label;
    if( lbl ){
      return([ lbl, tmp ]);
    } else {
      return([ "Unknown", 0 ]);
    }
  } catch (e) {
    return([ "Unknown", 0 ]);
  }

}
// window.atlas_label = atlas_label;

function add_electrode(scode, num, pos, canvas, size = 1){
  const group_name = `group_Electrodes (${scode})`;

  const pos_array = pos.toArray();
  const fs_label = atlas_label(pos_array, canvas)[0];
  const regex = /(l|r)h\-/g;
  const m = regex.exec(fs_label);

  let hemisphere;
  if( m && m.length >= 2 ){
    hemisphere = m[1] == "r" ? "right" : "left";
  } else {
    let ac_pos = canvas.state_data.get("anterior_commissure");
    if( ac_pos && ac_pos.isVector3 ){
      ac_pos = ac_pos.x;
    } else {
      ac_pos = 0;
    }
    hemisphere = pos.x > ac_pos ? "right" : "left";
  }

  const el = canvas.add_object({
    "name": `${scode}, ${num} - NEW_ELECTRODE`,
    "type": "sphere",
    "time_stamp": [],
    "position": pos_array,
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
    "radius": 1,
    "width_segments": 10,
    "height_segments": 6,
    "is_electrode":true,
    "is_surface_electrode": false,
    "use_template":false,
    "surface_type": 'pial',
    "hemisphere": hemisphere,
    "vertex_number": -1,
    "sub_cortical": true,
    "search_geoms": null
  });
  el._enabled = true;
  el._fs_label = ( index ) => {
    if( index !== undefined ){
      return( atlas_label_from_index(index, canvas) );
    } else {
      return( atlas_label(el._params.position, canvas) );
    }
  };
  el._localization_params = {};
  el._localization_params.localizationOrder = num;
  el.object.material.color.set( COL_ENABLED );

  const map = new TextTexture( `${num}` );
  const material = new THREE.SpriteMaterial( {
    map: map,
    depthTest : false,
    depthWrite : false
  } );
  const sprite = new THREE.Sprite( material );
  sprite.scale.set(1, 1, 1);
  el.object.add( sprite );

  el.object.userData.dispose = () => {
    sprite.removeFromParent();
    sprite.material.map.dispose();
    sprite.geometry.dispose();
    sprite.material.dispose();
    el.dispose();
  };

  el.object.scale.set( size, size, size );

  return( el );
}


function electrode_from_slice( scode, canvas ){
  if( !canvas._has_datacube_registered ){ return; }
  const l = canvas.volumes.get(scode);
  const k = Object.keys(l);
  if( !k.length ) { return; }
  const planes = l[k[0]];
  if(!Array.isArray(planes) || planes.length != 3){ return; }

  canvas.set_raycaster();
  canvas.mouse_raycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

  const items = canvas.mouse_raycaster.intersectObjects( planes );

  if( !items.length ){ return; }

  const p = items[0].point;
  pos.copy( p );
  return( pos );
}

function electrode_line_from_ct( inst, canvas, electrodes, size ){
  if( !inst ){ return; }
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }
  /*
  const margin_nvoxels = new THREE.Vector3().fromArray( inst._cube_dim );
  const margin_lengths = new THREE.Vector3().set(
    inst._margin_length.xLength,
    inst._margin_length.yLength,
    inst._margin_length.zLength
  );
  */
  const src = canvas.main_camera.position;
  const dst = new THREE.Vector3();
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new THREE.Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst ).multiplyScalar( 1 / n );
  const tmp = new THREE.Vector3();
  const est = new THREE.Vector3();

  const dir = new THREE.Vector3();
  const re = [];
  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );
    dir.copy( est ).sub( src ).normalize();

    // adjust

    for( let delta = 0.5; delta < 100; delta += 0.5 ){
      const res = intersect_volume(src, dir, inst, canvas, delta, false);
      if(!isNaN(res.x) && res.distanceTo(est) < 10 + delta / 10 ){
        re.push( res.clone() );
        break;
      }
      /*
      res = raycast_volume(
        src, dir, margin_nvoxels, margin_lengths,
        inst._color_texture.image.data,
        delta
      );
      if( res && res.length >= 6 && !isNaN( res[3] )){
        let est1 = new THREE.Vector3( res[3], res[4], res[5] );
        if( est1.distanceTo(est) < 10 + delta / 10 ){
          re.push(est1);
          break;
        }
      }
      */
    }
  }

  return({
    positions : re,
    direction : step
  });
}

function electrode_line_from_slice( canvas, electrodes, size ){
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }

  const src = canvas.main_camera.position;
  const dst = new THREE.Vector3();

  canvas.set_raycaster();
  canvas.mouse_raycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new THREE.Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst ).multiplyScalar( 1 / n );
  const tmp = new THREE.Vector3();
  const est = new THREE.Vector3();

  let res;
  const re = [];

  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );

    re.push( new THREE.Vector3().copy(est) );
  }

  return({
    positions : re,
    direction : step
  });
}

function register_controls_localization( THREEBRAIN_PRESETS ){

  THREEBRAIN_PRESETS.prototype.localization_clear = function(update_shiny = true){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.state_data.get("target_subject");
    const collection = this.canvas.electrodes.get(scode) || {};
    electrodes.forEach((el) => {
      try {
        delete collection[ el.name ];
      } catch (e) {}
      el.object.userData.dispose();
    });
    this.__localize_electrode_list.length = 0;
    this.canvas.switch_subject();

    if(update_shiny && this.shiny){
      this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
    }
  };

  THREEBRAIN_PRESETS.prototype.localization_add_electrode = function(
    x, y, z, mode, update_shiny = true
  ){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.state_data.get("target_subject");
    let edit_mode = mode;
    if(!edit_mode){
      const edit_mode = this.gui.get_controller('Edit Mode', folder_name).getValue();
    }
    let electrode_size = this.gui.get_controller('Electrode Size (L)', folder_name).getValue() || 1.5;
    if(edit_mode === "disabled" ||
       edit_mode === "refine"){ return; }

    const el = add_electrode(
      scode, electrodes.length + 1,
      new THREE.Vector3().set(x, y, z),
      this.canvas, electrode_size
    );
    el._mode = edit_mode;
    electrodes.push( el );
    this.canvas.switch_subject();

    if(update_shiny && this.shiny){
      this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
    }

    return( el );
  };

  THREEBRAIN_PRESETS.prototype.localization_set_electrode = function(
    which, params, update_shiny = true
  ){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.state_data.get("target_subject");

    const _regexp = new RegExp(`^${scode}, ([0-9]+) \\- (.*)$`);

    electrodes.forEach((inst) => {
      const loc_params = inst._localization_params;
      const localization_order = loc_params.localizationOrder;
      if(localization_order == which){
        const g = inst.object.userData.construct_params;
        if(!inst._localization_params){
          inst._localization_params = {};
        }
        for( let k in params ){
          switch (k) {
            case 'Electrode':
            case 'FSIndex':
            case 'Label':
              loc_params[k] = params[k];
              break;
            case 'SurfaceElectrode':
              if( params[k] === "TRUE" || params[k] == true ){
                g.is_surface_electrode = true;
              } else {
                g.is_surface_electrode = false;
              }
              break;
            case 'SurfaceType':
              g.surface_type = params[k];
              break;
            case 'Radius':
              g.radius = params[k];
              break;
            case 'VertexNumber':
              g.vertex_number = params[k];
              break;
            case 'Hemisphere':
              g.hemisphere = params[k];
              break;
            case 'Notes':
              g.custom_info = params[k];
              break;
            default:
              // skip
          }
        }
      }

    });
    this.canvas.switch_subject();

    if(update_shiny && this.shiny){
      this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
    }
  };

  THREEBRAIN_PRESETS.prototype.c_localization = function(){

    // threebrain_instances, not Object3D
    const electrodes = this.__localize_electrode_list;
    let refine_electrode;

    const edit_mode = this.gui.add_item( 'Edit Mode', "disabled", {
      folder_name: folder_name,
      args: ['disabled', 'CT/volume', 'MRI slice', 'refine']
    }).onChange((v) => {

      if( !v ){ return; }
      if( refine_electrode && refine_electrode.isThreeBrainObject &&
          is_electrode( refine_electrode.object )){
        if( refine_electrode._enabled ){
          refine_electrode.object.material.color.set( COL_ENABLED );
        } else {
          refine_electrode.object.material.color.set( COL_DISABLED );
        }

        refine_electrode = null;
      }
      this.gui.hide_item([
        ' - tkrRAS', ' - MNI305', ' - T1 RAS', 'Interpolate Size',
        'Interpolate from Recently Added',
        'Auto-Adjust Highlighted', 'Auto-Adjust All'
      ], folder_name);
      if( v === 'disabled' ){ return; }
      if( v === 'refine' ) {
        this.gui.show_item([
          ' - tkrRAS', ' - MNI305', ' - T1 RAS',
          'Auto-Adjust Highlighted', 'Auto-Adjust All'
        ], folder_name);
      } else {
        this.gui.show_item([
          ' - tkrRAS', ' - MNI305', ' - T1 RAS',
          'Interpolate Size', 'Interpolate from Recently Added'
        ], folder_name);
      }

      this._update_canvas();

    });

    const elec_size = this.gui.add_item( 'Electrode Size (L)', 1.5, { folder_name: folder_name })
      .min(0.5).max(2).step(0.1)
      .onChange((v) => {

        electrodes.forEach((e) => {
          e.object.scale.set( v, v, v );
        });

        this._update_canvas();

      });

    // remove electrode
    this.gui.add_item( 'Enable/Disable Electrode', () => {
      if( refine_electrode &&
          refine_electrode.isThreeBrainObject &&
          is_electrode( refine_electrode.object ) ){
        if( refine_electrode._enabled ){
          refine_electrode._enabled = false;
          refine_electrode.object.material.color.set( COL_DISABLED );
          refine_electrode = null;
        } else {
          refine_electrode.object._enabled = true;
          refine_electrode.object.material.color.set( COL_ENABLED );
          refine_electrode = null;
        }

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }


        this._update_canvas();
      }
    },  { folder_name: folder_name });

    this.gui.add_item( 'Auto-Adjust Highlighted', () => {
      if( refine_electrode &&
          refine_electrode.isThreeBrainObject &&
          is_electrode( refine_electrode.object ) ){
        adjust_local( [ refine_electrode ] );

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }

        this._update_canvas();
      }
    },  { folder_name: folder_name });

    this.gui.add_item( 'Auto-Adjust All', () => {
      adjust_local( electrodes );

      if(this.shiny){
        this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
      }

      this._update_canvas();
    },  { folder_name: folder_name });



    // Calculate RAS
    const tkr_loc = this.gui.add_item( ' - tkrRAS', "", {
      folder_name: folder_name
    });
    const mni_loc = this.gui.add_item( ' - MNI305', "", {
      folder_name: folder_name
    });
    const t1_loc = this.gui.add_item( ' - T1 RAS', "", {
      folder_name: folder_name
    });

    // interpolate
    const interpolate_size = this.gui.add_item( 'Interpolate Size', 1, {
      folder_name: folder_name
    }).min(1).step(1);

    this.gui.add_item(
      'Interpolate from Recently Added',
      () => {
        let v = Math.round( interpolate_size.getValue() );
        if( !v ){ return; }
        const mode = edit_mode.getValue();
        const scode = this.canvas.state_data.get("target_subject");
        if( !mode || mode == "disabled" ||
            mode == "refine" ||
            !scode || scode === ""
        ){ return; }

        if( electrodes.length < 2 ){
          alert("Please localize at least 2 electrodes first.");
          return;
        }

        let res;

        if( mode == "CT/volume" ){
          const inst = this.current_voxel_type();
          res = electrode_line_from_ct( inst, this.canvas, electrodes, v + 2 );
        } else {
          res = electrode_line_from_slice( this.canvas, electrodes, v + 2 );
        }
        // return({
        //   positions : re,
        //   direction : step
        // });

        if( res.positions.length ){
          const last_elec = electrodes.pop();
          res.direction.normalize();
          res.positions.push(new THREE.Vector3().fromArray(
            last_elec._params.position
          ));
          last_elec.object.userData.dispose();

          res.positions.forEach((pos) => {
            const el = add_electrode(
              scode, electrodes.length + 1, pos,
              this.canvas, elec_size.getValue()
            );
            el._mode = mode;
            el.__interpolate_direction = res.direction.clone();
            electrodes.push( el );
          });

          this.canvas.switch_subject();
        }

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }

      },
      { folder_name: folder_name }
    );


    // Download as CSV
    this.gui.add_item( 'Download as csv', () => {
      this.canvas.download_electrodes("csv");
    }, {
      folder_name: folder_name
    });



    const adjust_local = (el_list) => {
      // el is a threebrain instance
      // inst is the CT
      if( !el_list || !el_list.length ){ return; }
      const els = el_list.filter((el) => { return( el && el._mode === "CT/volume" ); });
      if( !els.length ){ return; }
      const inst = this.current_voxel_type();
      if( !inst || !inst.isDataCube2 ){ return; }

      const matrix_ = inst.object.parent.matrixWorld.clone(),
            matrix_inv = matrix_.clone().invert();

      const margin_voxels = new THREE.Vector3().fromArray( inst._cube_dim );
      const margin_lengths = new THREE.Vector3().set(
        inst._margin_length.xLength,
        inst._margin_length.yLength,
        inst._margin_length.zLength
      );
      const f = new THREE.Vector3().set(
        margin_lengths.x / margin_voxels.x,
        margin_lengths.y / margin_voxels.y,
        margin_lengths.z / margin_voxels.z
      );
      const mx = margin_voxels.x,
            my = margin_voxels.y,
            mz = margin_voxels.z;
      const ct_data = inst._cube_values;

      const delta = 4;
      const pos = new THREE.Vector3(),
            pos0 = new THREE.Vector3();
            // pos1 = new THREE.Vector3();

      els.forEach((el) => {
        const position = el.object.userData.construct_params.position;
        pos0.fromArray( position );
        pos.fromArray( position ).applyMatrix4( matrix_inv );

        /*
        (i+0.5) * f.x - l_x / 2,
        (j+0.5) * f.y - l_y / 2,
        (k+0.5) * f.z - l_z / 2
        *?

        let i = ( position[0] + ( margin_lengths.x - 1 ) / 2 ) / f.x;
        let j = ( position[1] + ( margin_lengths.y - 1 ) / 2 ) / f.y;
        let k = ( position[2] + ( margin_lengths.z - 1 ) / 2 ) / f.z;
        */
        let i = ( pos.x + ( margin_lengths.x ) / 2 ) / f.x - 0.5;
        let j = ( pos.y + ( margin_lengths.y ) / 2 ) / f.y - 0.5;
        let k = ( pos.z + ( margin_lengths.z ) / 2 ) / f.z - 0.5;

        i = Math.round( i );
        j = Math.round( j );
        k = Math.round( k );

        if( i < 0 ){ i = 0; }
        if( i >= mx ){ i = mx - 1; }
        if( j < 0 ){ k = 0; }
        if( j >= my ){ j = my - 1; }
        if( k < 0 ){ k = 0; }
        if( k >= mz ){ k = mz - 1; }

        const new_ijk = [0, 0, 0];
        let thred = ct_data[ i + j * mx + k * mx * my ];
        let tmp, total_v = 0;
        for(let i0 = Math.max(0, i - delta); i0 < Math.min(i + delta, mx); i0++ ) {
          for(let j0 = Math.max(0, j - delta); j0 < Math.min(j + delta, my); j0++ ) {
            for(let k0 = Math.max(0, k - delta); k0 < Math.min(k + delta, mz); k0++ ) {
              tmp = ct_data[ i0 + j0 * mx + k0 * mx * my ];
              if( tmp >= thred ) {
                total_v += tmp;
                new_ijk[0] += tmp * i0;
                new_ijk[1] += tmp * j0;
                new_ijk[2] += tmp * k0;
              }
            }
          }
        }
        if( total_v <= 0 ){ return; }
        new_ijk[0] /= total_v;
        new_ijk[1] /= total_v;
        new_ijk[2] /= total_v;


        /*
        let i = ( pos.x + ( margin_lengths.x ) / 2 ) / f.x - 0.5;
        let j = ( pos.y + ( margin_lengths.y ) / 2 ) / f.y - 0.5;
        let k = ( pos.z + ( margin_lengths.z ) / 2 ) / f.z - 0.5;
        */
        pos.x = (new_ijk[0] + 0.5) * f.x - ( margin_lengths.x ) / 2;
        pos.y = (new_ijk[1] + 0.5) * f.y - ( margin_lengths.y ) / 2;
        pos.z = (new_ijk[2] + 0.5) * f.z - ( margin_lengths.z ) / 2;

        // reverse back
        pos.applyMatrix4( matrix_ );

        if( el.__interpolate_direction && el.__interpolate_direction.isVector3 ){
          // already normalized
          const interp_dir = el.__interpolate_direction.clone();

          // reduce moving along interpolate_direction
          pos.copy( pos ).sub( pos0 );
          const inner_prod = pos.dot( interp_dir );
          pos.sub( interp_dir.multiplyScalar( inner_prod * 0.9 ) ).add( pos0 );
        }

        position[0] = pos.x;
        position[1] = pos.y;
        position[2] = pos.z;

        el.object.position.copy( pos );

      });


    }

    // will get tkrRAS
    const electrode_pos = () => {
      const mode = edit_mode.getValue();
      const scode = this.canvas.state_data.get("target_subject");
      if( !mode || !scode || scode === "" ){ return; }
      let pos_alt;
      switch(mode){
        case "CT/volume":
          const inst = this.current_voxel_type();
          pos_alt = electrode_from_ct( inst, this.canvas );
          break;
        case "MRI slice":
          pos_alt = electrode_from_slice( scode, this.canvas );
          break;
        case "refine":
          if(
            refine_electrode &&
            refine_electrode.isThreeBrainObject &&
            is_electrode( refine_electrode.object )
          ){
            pos.copy( refine_electrode.object.position );
            pos_alt = pos;
            break;
          }
        default:
          return;
      }
      if( !pos_alt || !pos_alt.isVector3 || isNaN(pos_alt.x) ){ return; }
      return( pos_alt );
    };

    // add canvas update
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

    // bind dblclick
    this.canvas.bind( 'localization_dblclick', 'dblclick',
      (event) => {
        const scode = this.canvas.state_data.get("target_subject"),
              mode = edit_mode.getValue();
        if(
          !mode || mode == "disabled" ||
          !scode || scode === ""
        ){ return; }


        if( mode === "CT/volume" || mode === "MRI slice" ){

          // If mode is add,
          const electrode_position = electrode_pos();
          if(
            !electrode_position ||
            !electrode_position.isVector3 ||
            isNaN( electrode_position.x )
          ){ return; }

          const num = electrodes.length + 1,
              group_name = `group_Electrodes (${scode})`;
          const el = add_electrode(scode, num, electrode_position, this.canvas, elec_size.getValue());
          el._mode = mode;
          electrodes.push( el );
          this.canvas.switch_subject();
        } else {

          // mode is to refine
          // make electrode shine!
          const el = this.canvas.object_chosen;
          if( el && is_electrode( el ) ){
            if(
              refine_electrode &&
              refine_electrode.isThreeBrainObject &&
              is_electrode( refine_electrode.object )
            ){
              if( refine_electrode._enabled ){
                refine_electrode.object.material.color.set( COL_ENABLED );
              } else {
                refine_electrode.object.material.color.set( COL_DISABLED );
              }
            }
            refine_electrode = el.userData.instance;
            el.material.color.set( COL_SELECTED );
          }
        }

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }


      }, this.canvas.main_canvas, false );

    // bind adjustment
    const adjust_electrode_position = (evt, nm, idx, step = 0.1) => {
      if( !refine_electrode || !is_electrode( refine_electrode.object ) ){ return; }
      const mode = edit_mode.getValue();
      if( mode !== "refine" ){ return; }
      if( has_meta_keys( evt.event, false, false, false ) ){
        // R
        refine_electrode.object.position[nm] += step;
        refine_electrode.object.userData.construct_params.position[idx] += step;
      } else if( has_meta_keys( evt.event, true, false, false ) ){
        // L
        refine_electrode.object.position[nm] -= step;
        refine_electrode.object.userData.construct_params.position[idx] -= step;
      }
      if(this.shiny){
        this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
      }
      this._update_canvas();
    }
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_R, (evt) => {
      adjust_electrode_position(evt, "x", 0);
    }, 'gui_refine_electrode_R');
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_A, (evt) => {
      adjust_electrode_position(evt, "y", 1);
    }, 'gui_refine_electrode_A');
    this.canvas.add_keyboard_callabck( CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_S, (evt) => {
      adjust_electrode_position(evt, "z", 2);
    }, 'gui_refine_electrode_S');


    // open folder
    this.gui.open_folder( folder_name );

    this.gui.hide_item([
      ' - tkrRAS', ' - MNI305', ' - T1 RAS', 'Interpolate Size',
      'Interpolate from Recently Added',
      'Auto-Adjust Highlighted', 'Auto-Adjust All'
    ], folder_name);
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_localization };
