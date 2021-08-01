import { THREE } from '../threeplugins.js';
import { vec3_to_string } from '../utils.js';
import { CONSTANTS } from '../constants.js';
import { raycast_volume_geneator } from '../Math/raycast_volume.js';
import * as download from 'downloadjs';

// Electrode localization
const pos = new THREE.Vector3();
const folder_name = CONSTANTS.FOLDERS['localization'] || 'Electrode Localization';

const raycast_volume = raycast_volume_geneator();
window.raycast_volume = raycast_volume;


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

function add_electrode(scode, num, pos, canvas){
  const group_name = `group_Electrodes (${scode})`;
  const el = canvas.add_object({
    "name": `${scode}, ${num} - NEW_ELECTRODE`,
    "type": "sphere",
    "time_stamp": [],
    "position": pos.toArray(),
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

  const map = new TextTexture( `${num}` );
  const material = new THREE.SpriteMaterial( {
    map: map,
    depthTest : false,
    depthWrite : false
  } );
  const sprite = new THREE.Sprite( material );
  sprite.scale.set(2,2,2);
  el.object.add( sprite );

  return( el );
}
window.add_electrode = add_electrode;

function electrode_from_ct( inst, canvas ){
  // const inst = this.current_voxel_type();
  if( !inst ){ return; }
  canvas.set_raycaster();
  const res = raycast_volume(
    canvas.mouse_raycaster.ray.origin,
    canvas.mouse_raycaster.ray.direction,
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
  const margin_nvoxels = new THREE.Vector3().fromArray( inst._cube_dim );
  const margin_lengths = new THREE.Vector3().set(
    inst._margin_length.xLength,
    inst._margin_length.yLength,
    inst._margin_length.zLength
  );
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
  let res;
  const re = [];
  for( let ii = 1; ii < n; ii++ ){

    tmp.copy( step ).multiplyScalar( ii );
    est.copy( dst ).add( tmp );
    dir.copy( est ).sub( src ).normalize();

    for( let delta = 2; delta < 100; delta += 2 ){
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
    }
  }

  return( re );
}
window.electrode_line_from_ct = electrode_line_from_ct;

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

  return( re );
}
window.electrode_line_from_slice = electrode_line_from_slice;

function register_controls_localization( THREEBRAIN_PRESETS ){


  THREEBRAIN_PRESETS.prototype.c_localization = function(){

    const electrodes = [];
    window.electrodes = electrodes;

    const edit_mode = this.gui.add_item( 'Edit Mode', "disabled", {
      folder_name: folder_name,
      args: ['disabled', 'CT/volume', 'MRI slice']
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

        if( res.length ){
          res.forEach((pos) => {
            const el = add_electrode(
              scode, electrodes.length + 1, pos, this.canvas
            );
            electrodes.push( el );
          });

          this.canvas.switch_subject();
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
      switch(mode){
        case "CT/volume":
          const inst = this.current_voxel_type();
          return( electrode_from_ct( inst, this.canvas ) );
          break;
        case "MRI slice":
          return( electrode_from_slice( scode, this.canvas ) );
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

        if(
          !electrode_position ||
          !electrode_position.isVector3 ||
          isNaN( electrode_position.x )
        ){ return; }
        const num = electrodes.length + 1,
              group_name = `group_Electrodes (${scode})`;
        const el = add_electrode(scode, num, electrode_position, this.canvas);
        electrodes.push( el );
        this.canvas.switch_subject();

      }, this.canvas.main_canvas, false );

    // open folder
    this.gui.open_folder( folder_name );
  };

  return( THREEBRAIN_PRESETS );

}

export { register_controls_localization };
