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


const pal = [0x1874CD, 0x1F75C6, 0x2677BF, 0x2E78B9, 0x357AB2, 0x3C7BAC, 0x447DA5, 0x4B7E9F, 0x528098, 0x598292, 0x61838B, 0x688585, 0x70867E, 0x778878, 0x7E8971, 0x858B6B, 0x8D8C64, 0x948E5E, 0x9B9057, 0xA39151, 0xAA934A, 0xB29444, 0xB9963D, 0xC09737, 0xC89930, 0xCF9A2A, 0xD69C23, 0xDD9E1D, 0xE59F16, 0xECA110, 0xF3A209, 0xFBA403, 0xFFA300, 0xFFA000, 0xFF9D00, 0xFF9A00, 0xFF9700, 0xFF9400, 0xFF9100, 0xFF8E00, 0xFF8B00, 0xFF8800, 0xFF8500, 0xFF8100, 0xFF7E00, 0xFF7B00, 0xFF7800, 0xFF7500, 0xFF7200, 0xFF6F00, 0xFF6C00, 0xFF6900, 0xFF6600, 0xFF6300, 0xFF6000, 0xFF5D00, 0xFF5A00, 0xFF5700, 0xFF5400, 0xFF5100, 0xFF4E00, 0xFF4B00, 0xFF4800, 0xFF4500];

class LocElectrode {
  constructor(subject_code, localization_order, initial_position, canvas,
              electrode_scale = 1, text_scale = 1.5) {
    this.isLocElectrode = true;
    // temp vector 3
    this.__vec3 = new THREE.Vector3().set( 0, 0, 0 );
    this.subject_code = subject_code;
    this.localization_order = localization_order;
    this._canvas = canvas;
    if(Array.isArray(initial_position)){
      this.initial_position = [...initial_position];
    } else {
      this.initial_position = initial_position.toArray();
    }
    const init_pos_clone = [
      this.initial_position[0],
      this.initial_position[1],
      this.initial_position[2]
    ];

    // get fs Label
    this.fs_label = atlas_label(init_pos_clone, canvas)[0];
    const regex = /(l|r)h\-/g;
    const m = regex.exec(this.fs_label);

    if( m && m.length >= 2 ){
      this.Hemisphere = m[1] == "r" ? "right" : "left";
    } else {
      let ac_pos = canvas.state_data.get("anterior_commissure");
      if( ac_pos && ac_pos.isVector3 ){
        ac_pos = ac_pos.x;
      } else {
        ac_pos = 0;
      }
      this.Hemisphere = pos.x > ac_pos ? "right" : "left";
    }

    this.Label = "N/A" + this.localization_order;
    this.Electrode = "";
    this.FSIndex = undefined;
    this._orig_name = `${this.subject_code}, ${this.localization_order} - ${this.Label}`;
    this._scale = electrode_scale;
    this._text_scale = text_scale;

    const inst = canvas.add_object({
      "name": this._orig_name,
      "type": "sphere",
      "time_stamp": [],
      "position": init_pos_clone,
      "value": null,
      "clickable": true,
      "layer": 0,
      "group":{
        "group_name": `group_Electrodes (${this.subject_code})`,
        "group_layer": 0,
        "group_position":[0,0,0]
      },
      "use_cache":false,
      "custom_info": "",
      "subject_code": this.subject_code,
      "radius": 1,
      "width_segments": 10,
      "height_segments": 6,
      "is_electrode":true,
      "is_surface_electrode": false,
      "use_template":false,
      "surface_type": 'pial',
      "hemisphere": this.Hemisphere,
      "vertex_number": -1,
      "sub_cortical": true,
      "search_geoms": null
    });


    this.instance = inst;
    this.object = inst.object;
    this.object.material.color.set( COL_ENABLED );

    const map = new THREE.TextTexture( `${localization_order}` );
    const material = new THREE.SpriteMaterial( {
      map: map,
      depthTest : false,
      depthWrite : false
    } );
    const sprite = new THREE.Sprite2( material );
    this.object.add( sprite );
    this._map = map;

    this.object.userData.dispose = () => {
      sprite.removeFromParent();
      sprite.material.map.dispose();
      sprite.geometry.dispose();
      sprite.material.dispose();
      this.instance.dispose();
    };
    this.object.userData.localization_instance = this;
    // this.object.scale.set( this._scale, this._scale, this._scale );
    this.update_scale();

    // Add line to indicate shift
    const line_geometry = new THREE.BufferGeometry().setFromPoints( [
      this.__vec3, this.__vec3
    ] );
    const line_material = new THREE.LineBasicMaterial( {
      color: 0x0000ff,
      linewidth: 5,
      depthTest: false
    } );
    const line = new THREE.Line( line_geometry, line_material );
    this._line = line;
    this.object.add( line );

    this._enabled = true;
  }

  dispose() {
    this.object.userData.dispose();
    try {
      const collection = this.canvas.electrodes.get(this.subject_code);
      if( collection.hasOwnProperty(this._orig_name) ){
        delete collection[ this._orig_name ];
      }
    } catch (e) {}
  }

  get_fs_label( index ){
    if( index !== undefined ){
      return( atlas_label_from_index(index, this._canvas) );
    } else if ( this.FSIndex !== undefined ) {
      return( atlas_label_from_index(this.FSIndex, this._canvas) );
    } else {
      const pos = this.instance._params.position;
      return( atlas_label(pos, this._canvas) );
    }
  }

  update_label( label ){
    this.Label = label || ("N/A " + this.localization_order);
    const name = `${this.subject_code}, ${this.localization_order} - ${this.Label}`;

    this._map.draw_text( `${this.localization_order}-${this.Label}` );
    this.instance._params.name = name;
  }

  update( params ){
    const g = this.instance._params;
    for( let k in params ){
      switch (k) {
        case 'Electrode':
        case 'FSIndex':
          this[k] = params[k];
          break;
        case 'Label':
          this.update_label( params.Label );
          break;
        case 'SurfaceElectrode':
          if( params[k] === "TRUE" || params[k] === true ){
            g.is_surface_electrode = true;
          } else {
            g.is_surface_electrode = false;
          }
          break;
        case 'SurfaceType':
          g.surface_type = params[k];
          break;
        case 'Radius':
          console.log(params);
          g.radius = parseFloat(params[k]);
          this.update_scale();
          break;
        case 'VertexNumber':
          g.vertex_number = parseInt(params[k]);
          break;
        case 'Hemisphere':
          this.Hemisphere = params[k];
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

  update_scale( scale, text_scale ){
    if( scale ){
      this._scale = scale;
    }
    if( text_scale ){
      this._text_scale = text_scale;
    }
    const v = this._scale * this.instance._params.radius;
    this.object.scale.set( v, v, v );
    this._map.update_scale( this._text_scale / v );
  }

  update_color( color ){
    if( color ){
      this.object.material.color.set( color );
    } else {
      if(this.enabled()){
        this.object.material.color.set( COL_ENABLED );
      } else {
        this.object.material.color.set( COL_DISABLED );
      }
    }
  }

  reset_position() {
    this.object.position.fromArray( this.initial_position );
    this.instance._params.position[0] = this.initial_position[0];
    this.instance._params.position[1] = this.initial_position[1];
    this.instance._params.position[2] = this.initial_position[2];
  }

  update_line() {
    const positions = this._line.geometry.attributes.position;
    const dst = this.__vec3.fromArray( this.initial_position ).sub( this.object.position );

    positions.array[0] = dst.x;
    positions.array[1] = dst.y;
    positions.array[2] = dst.z;
    positions.needsUpdate = true;

    // update length
    let shift_idx = Math.floor(dst.length() * 10);
    if( shift_idx > 63 ){
      shift_idx = 63;
    }
    this._line.material.color.set( pal[shift_idx] );
  }

  enabled() {
    return( this._enabled === true );
  }
  enable() {
    this.update_color( COL_ENABLED );
    this._enabled = true;
  }
  disable() {
    this.update_color( COL_DISABLED );
    this._enabled = false;
  }

  set_mode( mode ) {
    this.mode = mode;
  }

  get_volume_instance(){
    const atlas_type = this._canvas.state_data.get("atlas_type") || "none",
          sub = this.subject_code,
          inst = this._canvas.threebrain_instances.get(`Atlas - ${atlas_type} (${sub})`);
    if( inst && inst.isDataCube2 ){
      return( inst );
    }
    return;
  }

  adjust() {
    if( this.mode !== "CT/volume" ){ return; }
    const inst = this.get_volume_instance();
    if( !inst ){ return; }

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

    // get position
    const position = this.instance._params.position;
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


    if(this.__interpolate_direction && this.__interpolate_direction.isVector3) {
      // already normalized
      const interp_dir = this.__interpolate_direction.clone();

      // reduce moving along interpolate_direction
      pos.copy( pos ).sub( pos0 );
      const inner_prod = pos.dot( interp_dir );
      pos.sub( interp_dir.multiplyScalar( inner_prod * 0.9 ) ).add( pos0 );
    }

    position[0] = pos.x;
    position[1] = pos.y;
    position[2] = pos.z;

    this.object.position.copy( pos );
    this.update_line();
  }

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
      el.dispose();
    });
    electrodes.length = 0;
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
    let electrode_size = this.gui.get_controller('Electrode Scale', folder_name).getValue() || 1.5;
    let text_size = this.gui.get_controller('Text Scale', folder_name).getValue() || 1.5;
    if(edit_mode === "disabled" ||
       edit_mode === "refine"){ return; }

    const el = new LocElectrode(
      scode, electrodes.length + 1, [x,y,z],
      this.canvas, electrode_size, text_size);
    el.set_mode( edit_mode );
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

    electrodes.forEach((el) => {

      const localization_order = el.localization_order;
      if(localization_order == which){
        el.update( params );
      }

    });
    this.canvas.switch_subject();

    if(update_shiny && this.shiny){
      this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
    }
  };

  THREEBRAIN_PRESETS.prototype.c_localization = function(){

    const electrodes = this.__localize_electrode_list;
    let refine_electrode;

    const edit_mode = this.gui.add_item( 'Edit Mode', "disabled", {
      folder_name: folder_name,
      args: ['disabled', 'CT/volume', 'MRI slice', 'refine']
    }).onChange((v) => {

      if( !v ){ return; }
      if( refine_electrode && refine_electrode.isLocElectrode ){
        // reset color
        refine_electrode.update_color();
        refine_electrode = null;
      }
      this.gui.hide_item([
        ' - tkrRAS', ' - MNI305', ' - T1 RAS', 'Interpolate Size',
        'Interpolate from Recently Added', 'Reset Highlighted',
        'Auto-Adjust Highlighted', 'Auto-Adjust All'
      ], folder_name);
      if( v === 'disabled' ){ return; }
      if( v === 'refine' ) {
        this.gui.show_item([
          ' - tkrRAS', ' - MNI305', ' - T1 RAS',
          'Auto-Adjust Highlighted', 'Auto-Adjust All', 'Reset Highlighted'
        ], folder_name);
      } else {
        this.gui.show_item([
          ' - tkrRAS', ' - MNI305', ' - T1 RAS',
          'Interpolate Size', 'Interpolate from Recently Added'
        ], folder_name);
      }

      this._update_canvas();

    });

    const elec_size = this.gui.add_item( 'Electrode Scale', 1.5, { folder_name: folder_name })
      .min(0.5).max(2).step(0.1)
      .onChange((v) => {

        electrodes.forEach((el) => {
          el.update_scale( v );
        });

        this._update_canvas();

      });

    const elec_text_size = this.gui.add_item( 'Text Scale', 1.5, { folder_name: folder_name })
      .min(1).max(3).step(0.1)
      .onChange((v) => {

        electrodes.forEach((el) => {
          el.update_scale( undefined, v );
        });

        this._update_canvas();

      });

    // remove electrode
    this.gui.add_item( 'Enable/Disable Electrode', () => {
      if( refine_electrode &&
          refine_electrode.isLocElectrode ){
        if( refine_electrode.enabled() ){
          refine_electrode.disable();
          refine_electrode = null;
        } else {
          refine_electrode.enable();
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
          refine_electrode.isLocElectrode ){
        refine_electrode.adjust();

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }

        this._update_canvas();
      }
    },  { folder_name: folder_name });

    this.gui.add_item( 'Reset Highlighted', () => {
      if( refine_electrode &&
          refine_electrode.isLocElectrode ){

        refine_electrode.reset_position();

        if(this.shiny){
          this.fire_change({ "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) });
        }

        this._update_canvas();
      }
    },  { folder_name: folder_name });

    this.gui.add_item( 'Auto-Adjust All', () => {
      electrodes.forEach((el) => {
        el.adjust();
      });

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
            last_elec.instance._params.position
          ));
          last_elec.dispose();

          res.positions.forEach((pos) => {
            const el = new LocElectrode(
              scode, electrodes.length + 1, pos, this.canvas,
              elec_size.getValue(), elec_text_size.getValue());
            el.set_mode( mode );
            el.__interpolate_direction = res.direction.clone().normalize();
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
            refine_electrode.isLocElectrode
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
          const el = new LocElectrode(
            scode, num, electrode_position, this.canvas,
            elec_size.getValue(), elec_text_size.getValue());
          el.set_mode( mode );
          electrodes.push( el );
          this.canvas.switch_subject();
        } else {

          // mode is to refine
          // make electrode shine!
          const el = this.canvas.object_chosen;
          if( el && is_electrode( el ) ){
            if(
              refine_electrode &&
              refine_electrode.isLocElectrode &&
              is_electrode( refine_electrode.object )
            ){
              refine_electrode.update_color();
            }
            refine_electrode = el.userData.localization_instance;
            refine_electrode.update_color( COL_SELECTED );
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
      'Auto-Adjust Highlighted', 'Auto-Adjust All', 'Reset Highlighted'
    ], folder_name);
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_localization };