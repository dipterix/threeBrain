import { Vector3, SpriteMaterial, DoubleSide } from 'three';
import { vector3ToString } from '../utility/vector3ToString.js';
import { CONSTANTS } from '../core/constants.js';
import { is_electrode } from '../geometry/sphere.js';
import { intersect_volume, electrode_from_ct } from '../Math/raycast_volume.js';
import * as download from 'downloadjs';
import { LineSegments2 } from '../jsm/lines/LineSegments2.js';
import { LineMaterial } from '../jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from '../jsm/lines/LineSegmentsGeometry.js';


// Electrode localization
const pos = new Vector3();
const folderName = CONSTANTS.FOLDERS['localization'] || 'Electrode Localization';

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


// pos_array is in world coordinate
function atlas_label(pos_array, canvas){
  const sub = canvas.get_state("target_subject") || "none",
        inst = canvas.threebrain_instances.get(`Atlas - aparc_aseg (${sub})`);
  if( !inst ){ return( [ "Unknown", 0 ] ); }

  const fslut = canvas.global_data("__global_data__.FSColorLUT");

  const matrix_ = inst.object.matrixWorld.clone(),
        matrix_inv = matrix_.clone().invert();

  const modelShape = new Vector3().copy( inst.modelShape );

  const mx = modelShape.x,
        my = modelShape.y,
        mz = modelShape.z;
  const label_data = inst.voxelData;

  const pos = new Vector3().set(1, 0, 0),
        pos0 = new Vector3().set(0, 0, 0).applyMatrix4(matrix_);

  const delta = new Vector3().set(
    1 / pos.set(1, 0, 0).applyMatrix4(matrix_).sub(pos0).length(),
    1 / pos.set(0, 1, 0).applyMatrix4(matrix_).sub(pos0).length(),
    1 / pos.set(0, 0, 1).applyMatrix4(matrix_).sub(pos0).length()
  );
  const max_step_size = 2.0;

  // world -> model (voxel coordinate)
  pos.set(pos_array[0], pos_array[1], pos_array[2]).applyMatrix4(matrix_inv);

  // round model coord -> IJK coord
  const ijk0 = new Vector3().set(
    Math.round( ( pos.x + modelShape.x / 2 ) - 1.0 ),
    Math.round( ( pos.y + modelShape.y / 2 ) - 1.0 ),
    Math.round( ( pos.z + modelShape.z / 2 ) - 1.0 )
  );
  const ijk1 = new Vector3().set(
    Math.max( Math.min( ijk0.x, mx - delta.x * max_step_size - 1 ), delta.x * max_step_size ),
    Math.max( Math.min( ijk0.y, my - delta.y * max_step_size - 1 ), delta.y * max_step_size ),
    Math.max( Math.min( ijk0.z, mz - delta.z * max_step_size - 1 ), delta.z * max_step_size )
  );

  const ijk_idx = ijk1.clone();
  const multiply_factor = new Vector3().set( 1, mx, mx * my );
  let label_id, count = {};

  label_id = label_data[ ijk0.dot(multiply_factor) ] || 0;

  if( label_id == 0 ) {
    for(
      ijk_idx.x = Math.round( ijk1.x - delta.x * max_step_size );
      ijk_idx.x <= Math.round( ijk1.x + delta.x * max_step_size );
      ijk_idx.x += 1
    ) {
      for(
        ijk_idx.y = Math.round( ijk1.y - delta.y * max_step_size );
        ijk_idx.y <= Math.round( ijk1.y + delta.y * max_step_size );
        ijk_idx.y += 1
      ) {
        for(
          ijk_idx.z = Math.round( ijk1.z - delta.z * max_step_size );
          ijk_idx.z <= Math.round( ijk1.z + delta.z * max_step_size );
          ijk_idx.z += 1
        ) {
          label_id = label_data[ ijk_idx.dot(multiply_factor) ];
          if( label_id > 0 ){
            count[ label_id ] = ( count[ label_id ] || 0 ) + 1;
          }
        }
      }
    }


    const keys = Object.keys(count);
    if( keys.length > 0 ){
      label_id = keys.reduce((a, b) => count[a] > count[b] ? a : b);
      label_id = parseInt( label_id );
    }
  }


  // find label
  if( label_id == 0 ){
    return([ "Unknown", 0 ]);
  }

  try {
    const lbl = fslut.map[ label_id ].Label;
    if( lbl ){
      return([ lbl, label_id ]);
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
              electrode_scale = 1) {
    this.isLocElectrode = true;
    // temp vector 3
    this.__vec3 = new Vector3().set( 0, 0, 0 );
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
      let ac_pos = canvas.get_state("anterior_commissure");
      if( ac_pos && ac_pos.isVector3 ){
        ac_pos = ac_pos.x;
      } else {
        ac_pos = 0;
      }
      this.Hemisphere = pos.x > ac_pos ? "right" : "left";
    }

    this.Label = "NoLabel" + this.localization_order;
    this.Electrode = "";
    this.FSIndex = undefined;
    this._orig_name = `${this.subject_code}, ${this.localization_order} - ${this.Label}`;
    this._scale = electrode_scale;

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
    this.object.userData.localization_instance = this;

    // set up label;
    this.instance.label = this.localization_order;
    this.instance.set_label_visible(true);
    // this.object.scale.set( this._scale, this._scale, this._scale );

    // Add line to indicate shift
    const line_geometry = new LineSegmentsGeometry();
    line_geometry.setPositions( [
      0,0,0,
      0,0,0
    ] );
    const line_material = new LineMaterial( {
      color: 0x0000ff,
      // depthTest: false,
      linewidth: 3,
      side: DoubleSide
    } );
    const line = new LineSegments2( line_geometry, line_material );
    this._line = line;
    line.computeLineDistances();
    line.scale.set( 1/this._scale , 1/this._scale , 1/this._scale );
    line_material.resolution.set(
      this._canvas.client_width || window.innerWidth,
      this._canvas.client_height || window.innerHeight
    );
    this.object.add( line );




    this.update_scale();
    this._enabled = true;
  }

  dispose() {
    this.object.userData.dispose();
    try {
      const collection = this._canvas.electrodes.get(this.subject_code);
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
    this.instance.label = `${this.localization_order}-${this.Label}`;
    // this._map.draw_text( `${this.localization_order}-${this.Label}` );
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

  update_scale( scale ){
    if( scale ){
      this._scale = scale;
    }
    // if( text_scale ){
    //   this._text_scale = text_scale;
    // }
    const v = this._scale * this.instance._params.radius;
    this.object.scale.set( v, v, v );
    // this._map.update_scale( this._text_scale / v );
    this._line.scale.set( 1 / v, 1 / v, 1 / v );
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
    this.update_line();
  }

  update_line() {
    const positions = this._line.geometry.attributes.position;
    const dst = this.__vec3.fromArray( this.initial_position ).sub( this.object.position );

    //__canvas.object_chosen.position.set(0,0,0)
    const inst_start = this._line.geometry.attributes.instanceStart.data.array,
          inst_end   = this._line.geometry.attributes.instanceEnd.data.array;

    inst_start[3] = dst.x;
    inst_start[4] = dst.y;
    inst_start[5] = dst.z;
    inst_end[3] = dst.x;
    inst_end[4] = dst.y;
    inst_end[5] = dst.z;
    this._line.geometry.attributes.instanceStart.needsUpdate = true;
    this._line.geometry.attributes.instanceEnd.needsUpdate = true;

    /*
    positions.array[0] = dst.x;
    positions.array[1] = dst.y;
    positions.array[2] = dst.z;
    positions.needsUpdate = true;
    */

    // update length
    let shift_idx = Math.floor(dst.length() * 10);
    if( shift_idx > 63 ){
      shift_idx = 63;
    }
    this._line.material.color.set( pal[shift_idx] );
    this.update_scale();
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
    const atlas_type = this._canvas.get_state("atlas_type") || "none",
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

    const matrix_ = inst.object.matrixWorld.clone(),
          matrix_inv = matrix_.clone().invert();

    const modelShape = new Vector3().copy( inst.modelShape );
    const mx = modelShape.x,
          my = modelShape.y,
          mz = modelShape.z;
    const ct_data = inst.voxelData;

    let ct_threshold_min = inst.__dataLB;
    if( inst._selectedDataValues.length > 0 ) {
      ct_threshold_min = inst._selectedDataValues[0];
    }

    const pos = new Vector3().set(1, 0, 0),
          pos0 = new Vector3().set(0, 0, 0).applyMatrix4(matrix_);
    // calculate voxel size and IJK delta
    const delta = new Vector3().set(
      1 / pos.set(1, 0, 0).applyMatrix4(matrix_).sub(pos0).length(),
      1 / pos.set(0, 1, 0).applyMatrix4(matrix_).sub(pos0).length(),
      1 / pos.set(0, 0, 1).applyMatrix4(matrix_).sub(pos0).length()
    );
    const max_step_size = 2.0;


    // get position
    const position = this.instance._params.position;
    pos0.fromArray( position );
    pos.fromArray( position ).applyMatrix4( matrix_inv );

    // (p - vec3(0.5, -0.5, 0.5)) * scale_inv + 0.5
    // (pos+margin_voxels/2) is in IJK voxel coordinate right now
    // pos + margin_lengths/2 places the origin at voxel IJK corner
    // (pos + margin_lengths/2) / f scales to the voxel IJK corner
    //
    const ijk0 = new Vector3().set(
      Math.round( ( pos.x + modelShape.x / 2 ) - 1.0 ),
      Math.round( ( pos.y + modelShape.y / 2 ) - 1.0 ),
      Math.round( ( pos.z + modelShape.z / 2 ) - 1.0 )
    );
    const ijk1 = new Vector3().set(
      Math.max( Math.min( ijk0.x, mx - delta.x * max_step_size - 1 ), delta.x * max_step_size ),
      Math.max( Math.min( ijk0.y, my - delta.y * max_step_size - 1 ), delta.y * max_step_size ),
      Math.max( Math.min( ijk0.z, mz - delta.z * max_step_size - 1 ), delta.z * max_step_size )
    );
    const ijk_new = new Vector3().set(0, 0, 0),
          ijk_distance = new Vector3();
    const multiply_factor = new Vector3().set( 1, mx, mx * my );

    const voxel_value = ct_data[ ijk0.dot(multiply_factor) ];
    const ijk_idx = ijk1.clone();
    let tmp, dist, total_v = 0;
    for(
      ijk_idx.x = Math.round( ijk1.x - delta.x * max_step_size );
      ijk_idx.x <= Math.round( ijk1.x + delta.x * max_step_size );
      ijk_idx.x += 1
    ) {
      for(
        ijk_idx.y = Math.round( ijk1.y - delta.y * max_step_size );
        ijk_idx.y <= Math.round( ijk1.y + delta.y * max_step_size );
        ijk_idx.y += 1
      ) {
        for(
          ijk_idx.z = Math.round( ijk1.z - delta.z * max_step_size );
          ijk_idx.z <= Math.round( ijk1.z + delta.z * max_step_size );
          ijk_idx.z += 1
        ) {
          tmp = ct_data[ ijk_idx.dot(multiply_factor) ];
          if( tmp >= voxel_value ) {
            // calculate weight
            dist = ijk_distance.copy( ijk_idx ).sub( ijk0 ).length() / max_step_size;
            tmp *= Math.exp( - (dist * dist) / 8.0 );
            if(tmp > ct_threshold_min) { tmp *= 2; }
            total_v += tmp;
            ijk_new.x += tmp * (ijk_idx.x - ijk0.x);
            ijk_new.y += tmp * (ijk_idx.y - ijk0.y);
            ijk_new.z += tmp * (ijk_idx.z - ijk0.z);
          }
        }
      }
    }
    if( total_v <= 0 ){ return; }
    ijk_new.multiplyScalar( 1.0 / total_v ).add( ijk0 );

    // (ijk + 0.5 - margin_voxels / 2) * f
    ijk_new.multiplyScalar( 2.0 ).sub( modelShape ).addScalar( 2.0 ).multiplyScalar( 0.5 );
    pos.copy( ijk_new );

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
  const sliceInstance = canvas.get_state( "activeSliceInstance" );
  if( !sliceInstance || typeof(sliceInstance) !== "object" ||
    !sliceInstance.isDataCube ) { return; }
  const planes = sliceInstance.object;

  canvas.mouseRaycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );

  const items = canvas.mouseRaycaster.intersectObjects( planes );

  if( !items.length ){ return; }

  const p = items[0].point;
  pos.copy( p );
  return( pos );
}

function interpolate_electrode_from_ct( inst, canvas, electrodes, size ){
  if( !inst ){ return; }
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }
  const src = canvas.mainCamera.position;
  const dst = new Vector3();
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst ).multiplyScalar( 1 / n );
  const tmp = new Vector3();
  const est = new Vector3();

  const dir = new Vector3();
  const re = [];

  let added = false;
  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );
    dir.copy( est ).sub( src ).normalize();

    // adjust
    added = false;
    for( let delta = 0.5; delta < 100; delta += 0.5 ){
      const res = intersect_volume(src, dir, inst, canvas, delta, false);
      if(!isNaN(res.x) && res.distanceTo(est) < 10 + delta / 10 ){
        re.push( res.clone() );
        added = true;
        break;
      }
    }
    if(!added) {
      re.push( est.clone() );
    }
  }

  return({
    positions : re,
    direction : step
  });
}

function extend_electrode_from_ct( inst, canvas, electrodes, size ){
  if( !inst ){ return; }
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }
  const src = canvas.mainCamera.position;
  const dst = new Vector3();
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst );
  const step_length = step.length();
  const tmp = new Vector3();
  const est = new Vector3();

  const dir = new Vector3();
  const re = [];

  est.copy(dst).add( step );
  let added = false;
  for( let ii = 1; ii < n; ii++ ){

    est.add( step );
    dir.copy( est ).sub( src ).normalize();

    // adjust the est
    added = false
    for( let delta = 0.5; delta < 100; delta += 0.5 ){
      const res = intersect_volume(src, dir, inst, canvas, delta, false);
      if(!isNaN(res.x) && res.distanceTo(est) < 10 + delta / 10 ){
        step.add( res ).sub( est ).normalize().multiplyScalar(step_length);
        est.copy( res );
        added = true;
        break;
      }
    }
    re.push( est.clone() );
  }

  return({
    positions : re,
    direction : step
  });
}

function interpolate_electrode_from_slice( canvas, electrodes, size ){
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }

  const src = canvas.mainCamera.position;
  const dst = new Vector3();

  canvas.mouseRaycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst ).multiplyScalar( 1 / n );
  const tmp = new Vector3();
  const est = new Vector3();

  let res;
  const re = [];

  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );

    re.push( new Vector3().copy(est) );
  }

  return({
    positions : re,
    direction : step
  });
}

function extend_electrode_from_slice( canvas, electrodes, size ){
  if( electrodes.length < 2 ){ return; }
  if( size <= 2 ){ return; }

  const src = canvas.mainCamera.position;
  const dst = new Vector3();

  canvas.mouseRaycaster.layers.set( CONSTANTS.LAYER_SYS_MAIN_CAMERA_8 );
  electrodes[electrodes.length - 2].object.getWorldPosition( dst );

  const n = size - 1;
  const step = new Vector3();
  electrodes[electrodes.length - 1].object.getWorldPosition( step );
  step.sub( dst );
  dst.add( step );
  const tmp = new Vector3();
  const est = new Vector3();

  let res;
  const re = [];

  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );

    re.push( new Vector3().copy(est) );
  }

  return({
    positions : re,
    direction : step
  });
}

function register_controls_localization( ViewerControlCenter ){

  ViewerControlCenter.prototype.intersectActiveDataCube2 = function( mode ) {
    // mode can be "CT/volume", "MRI slice", or "refine"
    // default is to derive from controller

    if( typeof mode !== "string" ) {
      const controller = this.gui.getController( 'Edit Mode' );
      if( !controller || controller.isfake ) { return }
      mode = controller.getValue();
    }

    const subjectCode = this.canvas.get_state("target_subject");
    if( !subjectCode || subjectCode == '' ) { return; }

    this.canvas.updateRaycast();

    let position;
    switch(mode){
      case "CT/volume":
        const inst = this.getActiveDataCube2();
        position = electrode_from_ct( inst, this.canvas );
        break;
      case "MRI slice":
        position = electrode_from_slice( subjectCode, this.canvas );
        break;
      default:
        return;
    }

    if(
      !position || typeof(position) !== "object" || !position.isVector3 ||
      isNaN( position.x )
    ) { return; }

    return position;
  }

  ViewerControlCenter.prototype.clearLocalization = function( fireEvents = true ){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.get_state("target_subject");
    const collection = this.canvas.electrodes.get(scode) || {};
    electrodes.forEach((el) => {
      el.dispose();
    });
    electrodes.length = 0;
    this.canvas.switch_subject();

    if( fireEvents ) {
      this.broadcast({
        data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
      });
    }
  };

  ViewerControlCenter.prototype.localizeAddElectrode = function(
    x, y, z, mode, fireEvents = true
  ){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.get_state("target_subject");
    let edit_mode = mode;
    if(!edit_mode){
      const edit_mode = this.gui.getController( 'Edit Mode', folderName ).getValue();
    }
    let electrode_size = this.gui.getController('Electrode Scale', folderName).getValue() || 1.0;
    if(edit_mode === "disabled" ||
       edit_mode === "refine"){ return; }

    const el = new LocElectrode(
      scode, electrodes.length + 1, [x,y,z],
      this.canvas, electrode_size);
    el.set_mode( edit_mode );
    electrodes.push( el );
    this.canvas.switch_subject();

    if( fireEvents ){
      this.broadcast({
        data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
      });
    }

    return( el );
  };

  ViewerControlCenter.prototype.localizeSetElectrode = function(
    which, params, fireEvents = true
  ){
    const electrodes = this.__localize_electrode_list;
    const scode = this.canvas.get_state("target_subject");

    const _regexp = new RegExp(`^${scode}, ([0-9]+) \\- (.*)$`);

    electrodes.forEach((el) => {

      const localization_order = el.localization_order;
      if(localization_order == which){
        el.update( params );
      }

    });
    this.canvas.switch_subject();

    if( fireEvents ){
      this.broadcast({
        data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
      });
    }
  };

  ViewerControlCenter.prototype.addPreset_localization = function(){

    const electrodes = this.__localize_electrode_list;
    let refine_electrode;

    const edit_mode = this.gui
      .addController(
        'Edit Mode', "disabled", {
          folderName: folderName,
          args: ['disabled', 'CT/volume', 'MRI slice', 'refine']
        })
      .onChange((v) => {

        if( !v ){ return; }
        if( refine_electrode && refine_electrode.isLocElectrode ){
          // reset color
          refine_electrode.update_color();
          refine_electrode = null;
        }
        this.gui.hideControllers([
          '- tkrRAS', '- MNI305', '- T1 RAS', 'Interpolate Size',
          'Interpolate from Recently Added', 'Extend from Recently Added',
          'Reset Highlighted',
          'Auto-Adjust Highlighted', 'Auto-Adjust All'
        ], folderName);
        if( v === 'disabled' ){ return; }
        if( v === 'refine' ) {
          this.gui.showControllers([
            '- tkrRAS', '- MNI305', '- T1 RAS',
            'Auto-Adjust Highlighted', 'Auto-Adjust All', 'Reset Highlighted'
          ], folderName);
        } else {
          this.gui.showControllers([
            '- tkrRAS', '- MNI305', '- T1 RAS',
            'Interpolate Size', 'Interpolate from Recently Added',
            'Extend from Recently Added'
          ], folderName);
        }

        this._update_canvas();

      });

    const elec_size = this.gui
      .addController( 'Electrode Scale', 1.0, { folderName: folderName })
      .min(0.5).max(2).decimals(1)
      .onChange((v) => {

        electrodes.forEach((el) => {
          el.update_scale( v );
        });

        this._update_canvas();

      });

    // remove electrode
    this.gui.addController( 'Enable/Disable Electrode', () => {
      if( refine_electrode &&
          refine_electrode.isLocElectrode ){
        if( refine_electrode.enabled() ){
          refine_electrode.disable();
          refine_electrode = null;
        } else {
          refine_electrode.enable();
          refine_electrode = null;
        }

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


        this._update_canvas();
      }
    },  { folderName: folderName });

    this.gui.addController( 'Auto-Adjust Highlighted', () => {
      if( refine_electrode &&
          refine_electrode.isLocElectrode ){
        refine_electrode.adjust();

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


        this._update_canvas();
      }
    },  { folderName: folderName });

    this.gui.addController( 'Reset Highlighted', () => {
      if( refine_electrode &&
          refine_electrode.isLocElectrode ){

        refine_electrode.reset_position();

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


        this._update_canvas();
      }
    },  { folderName: folderName });

    this.gui.addController( 'Auto-Adjust All', () => {
      electrodes.forEach((el) => {
        el.adjust();
      });

      this.broadcast({
        data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
      });


      this._update_canvas();
    },  { folderName: folderName });



    // Calculate RAS
    const tkr_loc = this.gui.addController( '- tkrRAS', "", {
      folderName: folderName
    });
    const mni_loc = this.gui.addController( '- MNI305', "", {
      folderName: folderName
    });
    const t1_loc = this.gui.addController( '- T1 RAS', "", {
      folderName: folderName
    });

    // interpolate
    const interpolate_size = this.gui.addController( 'Interpolate Size', 1, {
      folderName: folderName
    }).min(1).step(1);

    this.gui.addController(
      'Interpolate from Recently Added',
      () => {
        let v = Math.round( interpolate_size.getValue() );
        if( !v ){ return; }
        const mode = edit_mode.getValue();
        const scode = this.canvas.get_state("target_subject");
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
          const inst = this.getActiveDataCube2();
          res = interpolate_electrode_from_ct( inst, this.canvas, electrodes, v + 2 );
        } else {
          res = interpolate_electrode_from_slice( this.canvas, electrodes, v + 2 );
        }
        // return({
        //   positions : re,
        //   direction : step
        // });

        if( res.positions.length ){
          const last_elec = electrodes.pop();
          res.direction.normalize();
          res.positions.push(new Vector3().fromArray(
            last_elec.instance._params.position
          ));
          last_elec.dispose();

          res.positions.forEach((pos) => {
            const el = new LocElectrode(
              scode, electrodes.length + 1, pos, this.canvas,
              elec_size.getValue());
            el.set_mode( mode );
            el.__interpolate_direction = res.direction.clone().normalize();
            electrodes.push( el );
          });

          this.canvas.switch_subject();
        }

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


      },
      { folderName: folderName }
    );

    this.gui.addController(
      'Extend from Recently Added',
      () => {
        let v = Math.round( interpolate_size.getValue() );
        if( !v ){ return; }
        const mode = edit_mode.getValue();
        const scode = this.canvas.get_state("target_subject");
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
          const inst = this.getActiveDataCube2();
          res = extend_electrode_from_ct( inst, this.canvas, electrodes, v + 2 );
        } else {
          res = extend_electrode_from_slice( this.canvas, electrodes, v + 2, true );
        }

        if( res.positions.length ){
          res.direction.normalize();
          res.positions.forEach((pos) => {
            const el = new LocElectrode(
              scode, electrodes.length + 1, pos, this.canvas,
              elec_size.getValue());
            el.set_mode( mode );
            electrodes.push( el );
          });

          this.canvas.switch_subject();
        }

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


      },
      { folderName: folderName }
    );


    // Download as CSV
    this.gui.addController( 'Download Current as CSV', () => {
      this.canvas.download_electrodes("csv");
    }, {
      folderName: folderName
    });

    // add canvas update
    let throttleCount = 0;
    this.addEventListener( "viewerApp.animationFrame.update", () => {

      const mode = edit_mode.getValue();

      let position;
      if( mode === 'refine' ) {
        if(
          refine_electrode &&
          refine_electrode.isLocElectrode
        ){
          pos.copy( refine_electrode.object.position );
          position = pos;
        }
      } else {
        position = this.intersectActiveDataCube2( mode );
      }

      if( !position || !position.isVector3 ) {
        tkr_loc.setValue("");
        mni_loc.setValue("");
        t1_loc.setValue("");
        return;
      } else {
        const subjectCode = this.canvas.get_state("target_subject"),
              subjectData = this.canvas.shared_data.get( subjectCode );

        // tkrRAS
        tkr_loc.setValue( vector3ToString( position ) );

        // T1 ScannerRAS = Norig*inv(Torig)*[tkrR tkrA tkrS 1]'
        position.applyMatrix4( subjectData.matrices.tkrRAS_Scanner );
        t1_loc.setValue( vector3ToString( position ) );

        // MNI305 = xfm * ScannerRAS
        position.applyMatrix4( subjectData.matrices.xfm );
        mni_loc.setValue( vector3ToString( position ) );
      }
    });

    // bind dblclick ssss
    this.addEventListener( "viewerApp.mouse.doubleClick", () => {
      const scode = this.canvas.get_state("target_subject"),
              mode = edit_mode.getValue();
        if(
          !mode || mode == "disabled" ||
          !scode || scode === ""
        ){ return; }


        if( mode === "CT/volume" || mode === "MRI slice" ){

          // If mode is add,
          const electrode_position = this.intersectActiveDataCube2( mode );
          if(
            !electrode_position ||
            !electrode_position.isVector3 ||
            isNaN( electrode_position.x )
          ){ return; }

          const num = electrodes.length + 1,
              group_name = `group_Electrodes (${scode})`;
          const el = new LocElectrode(
            scode, num, electrode_position, this.canvas,
            elec_size.getValue());
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

        this.broadcast({
          data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
        });


    });

    // bind adjustment
    const xyzTo123 = { x : 0 , y : 1, z : 2 };
    const adjust_electrode_position = ({
      axis, step = 0.1
    }) => {
      if( !refine_electrode || !is_electrode( refine_electrode.object ) ){ return; }
      const mode = edit_mode.getValue();
      if( mode !== "refine" ){ return; }

      refine_electrode.object.position[ axis ] += step;
      refine_electrode.object.userData.construct_params.position[ xyzTo123[ axis ] ] += step;
      refine_electrode.update_line();
      this.broadcast({
        data : { "localization_table" : JSON.stringify( this.canvas.electrodes_info() ) }
      });

      this._update_canvas();
    }

    this.bindKeyboard({
      codes     : CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_R,
      // shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      callback  : ( event ) => {
        if( event.shiftKey ) {
          adjust_electrode_position({ axis : 'x' , step : -0.1 });
        } else {
          adjust_electrode_position({ axis : 'x' , step : 0.1 });
        }
      }
    });

    this.bindKeyboard({
      codes     : CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_A,
      // shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      callback  : ( event ) => {
        if( event.shiftKey ) {
          adjust_electrode_position({ axis : 'y' , step : -0.1 });
        } else {
          adjust_electrode_position({ axis : 'y' , step : 0.1 });
        }
      }
    });

    this.bindKeyboard({
      codes     : CONSTANTS.KEY_ADJUST_ELECTRODE_LOCATION_S,
      // shiftKey  : false,
      ctrlKey   : false,
      altKey    : false,
      metaKey   : false,
      callback  : ( event ) => {
        if( event.shiftKey ) {
          adjust_electrode_position({ axis : 'z' , step : -0.1 });
        } else {
          adjust_electrode_position({ axis : 'z' , step : 0.1 });
        }
      }
    });

    // open folder
    this.gui.openFolder( folderName, false );
    this.gui.openFolder( CONSTANTS.FOLDERS[ 'atlas' ] , false );

    this.gui.hideControllers([
      '- tkrRAS', '- MNI305', '- T1 RAS', 'Interpolate Size',
      'Interpolate from Recently Added', 'Extend from Recently Added',
      'Auto-Adjust Highlighted', 'Auto-Adjust All', 'Reset Highlighted'
    ], folderName);
  };

  return( ViewerControlCenter );

}

export { register_controls_localization };
