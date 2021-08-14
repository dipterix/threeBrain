import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { to_array, get_or_default } from '../utils.js';
import { CONSTANTS } from '../constants.js';

const MATERIAL_PARAMS = { 'transparent' : false };

class Sphere extends AbstractThreeBrainObject {
  constructor (g, canvas) {
    super( g, canvas );

    this.type = 'Sphere';
    this.isSphere = true;

    this._materials = {
      'MeshBasicMaterial' : new THREE.MeshBasicMaterial( MATERIAL_PARAMS ),
      'MeshLambertMaterial': new THREE.MeshLambertMaterial( MATERIAL_PARAMS )
    };

    const gb = new THREE.SphereBufferGeometry( g.radius, g.width_segments, g.height_segments ),
          values = g.keyframes,
          n_keyframes = to_array( g.keyframes ).length;
    this._geometry = gb;

    gb.name = 'geom_sphere_' + g.name;

    // Make material based on value
    if( n_keyframes > 0 ){
      // Use the first value
      this._material_type = 'MeshBasicMaterial';
    }else{
      this._material_type = 'MeshLambertMaterial';
    }

    const mesh = new THREE.Mesh(gb, this._materials[ this._material_type ]);
    mesh.name = 'mesh_sphere_' + g.name;

    // FIXME: need to use class instead of canvas.mesh
    let linked = false;
    if(g.use_link){
      // This is a linkedSphereGeom which should be attached to a surface mesh
      let vertex_ind = Math.floor(g.vertex_number - 1),
          target_name = g.linked_geom,
          target_mesh = canvas.mesh.get( target_name );

      if(target_mesh && target_mesh.isMesh){
        let target_pos = target_mesh.geometry.attributes.position.array;
        mesh.position.set(target_pos[vertex_ind * 3], target_pos[vertex_ind * 3+1], target_pos[vertex_ind * 3+2]);
        linked = true;
      }
    }

    if(!linked){
      mesh.position.fromArray(g.position);
    }
    if( n_keyframes > 0 ){
      mesh.userData.ani_exists = true;
    }
    mesh.userData.ani_active = false;
    mesh.userData.ani_params = {...values};
    mesh.userData.ani_name = 'default';
    mesh.userData.ani_all_names = Object.keys( mesh.userData.ani_params );
    mesh.userData.display_info = {};

    this._mesh = mesh;
    this.object = mesh;

    this._link_userData();
  }

  _link_userData(){
    // register for compatibility
    this._mesh.userData.add_track_data = ( track_name, data_type, value, time_stamp = 0 ) => {
      return( this.add_track_data( track_name, data_type, value, time_stamp ) );
    };
    this._mesh.userData.get_track_data = ( track_name, reset_material ) => {
      return( this.get_track_data( track_name, reset_material ) );
    };
    this._mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
    this._mesh.userData.dispose = () => { this.dispose(); };
  }

  _get_animation_params(){
    return( this._canvas.animation_controls.get_params() );
  }

  dispose(){
    try {
      this._mesh.removeFromParent();
    } catch (e) {}
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
  }

  pre_render( results ){

    super.pre_render( results );

    const canvas = this._canvas,
          mesh = this._mesh;

    // 0. check if raw position is 0,0,0
    const const_pos = mesh.userData.construct_params.position;
    if( is_electrode(mesh) && const_pos[0] === 0 && const_pos[1] === 0 && const_pos[2] === 0 ){
      mesh.visible = false;
      return ;
    }

    // 1. whether passed threshold
    let threshold_test = true;
    let current_value;
    const track_name = canvas.state_data.get('threshold_variable');

    if( get_or_default(canvas.state_data, 'threshold_active', false) ){
      // need to check the threshold
      threshold_test = false;

      const track = this.get_track_data(track_name, false);

      if(track){

        // obtain current threshold value
        if( Array.isArray(track.time) && track.time.length > 1 && Array.isArray(track.value) ){
          // need to get the value at current time
          const ani_params = this._get_animation_params();

          for(let idx in track.time){
            if(track.time[idx] >= ani_params.time){
              current_value = track.value[ idx ];
              break;
            }
          }

        }else{
          if(Array.isArray(track.value)){
            current_value = track.value[0];
          }else{
            current_value = track.value;
          }
        }

        // get threshold criteria
        if(current_value !== undefined){
          const ranges = to_array(canvas.state_data.get('threshold_values'));
          const opers = canvas.state_data.get('threshold_method');
          if( get_or_default(canvas.state_data, 'threshold_type', 'continuous') === 'continuous' ){
            // contunuous
            threshold_test = false;

            // '|v| < T1', '|v| >= T1', 'v < T1',
            // 'v >= T1', 'v in [T1, T2]', 'v not in [T1,T2]'
            if( ranges.length > 0 && opers >= 0 && opers < CONSTANTS.THRESHOLD_OPERATORS.length ){
              const opstr = CONSTANTS.THRESHOLD_OPERATORS[ opers ]
              let t1 = ranges[0];

              if( opstr === 'v = T1' && current_value == t1 ){
                threshold_test = true;
              } else if( opstr === '|v| < T1' && Math.abs(current_value) < t1 ){
                threshold_test = true;
              } else if( opstr === '|v| >= T1' && Math.abs(current_value) >= t1 ){
                threshold_test = true;
              } else if( opstr === 'v < T1' && current_value < t1 ){
                threshold_test = true;
              } else if( opstr === 'v >= T1' && current_value >= t1 ){
                threshold_test = true;
              } else {
                let t2 = Math.abs(t1);
                if( ranges.length === 1 ){
                  t1 = -t2
                } else {
                  t2 = ranges[1];
                  if( t1 > t2 ){
                    t2 = t1;
                    t1 = ranges[1];
                  }
                }
                if( opstr === 'v in [T1, T2]' && current_value <= t2 && current_value >= t1 ){
                  threshold_test = true;
                } else if( opstr === 'v not in [T1,T2]' && ( current_value > t2 || current_value < t1 ) ){
                  threshold_test = true;
                }
              }

            } else {
              threshold_test = true;
            }


            /*
            ranges.forEach((r) => {
              if(Array.isArray(r) && r.length === 2){
                if(!threshold_test && r[1] >= current_value && r[0] <= current_value){
                  threshold_test = true;
                }
              }
            });
            */
          }else{
            // discrete
            threshold_test = ranges.includes( current_value );
          }
        }
      }

    }

    // 2. check if active
    let active_test = threshold_test & mesh.userData.ani_active;

    // 3. change material, don't use switch_material as that's heavy
    if( active_test && mesh.material.isMeshLambertMaterial ){
      mesh.material = this._materials.MeshBasicMaterial;
    }else if( !active_test && mesh.material.isMeshBasicMaterial ){
      mesh.material = this._materials.MeshLambertMaterial;
    }

    // 4. set visibility
    const vis = get_or_default(canvas.state_data, 'electrode_visibility', 'all visible');

    switch (vis) {
      case 'all visible':
        mesh.visible = true;
        break;
      case 'hidden':
        mesh.visible = false;
        break;
      case 'hide inactives':
        // The electrode has no value, hide
        if( active_test ){
          mesh.visible = true;
        }else{
          mesh.visible = false;
        }
        break;
    }
    // 5. check if mixer exists, update
    if( mesh.userData.ani_mixer ){
      mesh.userData.ani_mixer.update( results.current_time_delta - mesh.userData.ani_mixer.time );
    }

    // 6. if the object is chosen, display information
    if( mesh === canvas.object_chosen ){
      mesh.userData.display_info.threshold_name = track_name;
      mesh.userData.display_info.threshold_value = current_value;
      mesh.userData.display_info.display_name = canvas.state_data.get('display_variable') || '[None]';
    }

  }

  switch_material( material_type, update_canvas = false ){
    if( material_type in this._materials ){
      const _m = this._materials[ material_type ];
      this._material_type = material_type;
      this._mesh.material = _m;
      this._mesh.material.needsUpdate = true;
      if( update_canvas ){
        this._canvas.start_animation( 0 );
      }
    }
  }


  add_track_data( track_name, data_type, value, time_stamp = 0 ){
    let first_value = value, track_value = value;
    if(Array.isArray(time_stamp)){
      if(!Array.isArray(value) || time_stamp.length !== value.length ){
        return;
      }
      first_value = value[0];
    }else if(Array.isArray(value)){
      first_value = value[0];
      track_value = first_value;
    }
    if( !data_type ){
      data_type = (typeof first_value === 'number')? 'continuous' : 'discrete';
    }
    this._mesh.userData.ani_exists = true;
    this._mesh.userData.ani_params[track_name] = {
      "name"      : track_name,
      "time"      : time_stamp,
      "value"     : value,
      "data_type" : data_type,
      "target"    : ".material.color",
      "cached"    : false
    };
    if( !Array.isArray( this._mesh.userData.ani_all_names ) ){
      this._mesh.userData.ani_all_names = [];
    }
    if(!this._mesh.userData.ani_all_names.includes( track_name )){
      this._mesh.userData.ani_all_names.push( track_name );
    }
  }

  get_track_data( track_name, reset_material ){
    let re;

    if( this._mesh.userData.ani_exists ){
      if( track_name === undefined ){ track_name = this._mesh.userData.ani_name; }
      re = this._mesh.userData.ani_params[ track_name ];
    }

    if( reset_material ){
      if( re && re.value !== null ){
        this._mesh.material = this._materials.MeshBasicMaterial;
        this._mesh.userData.ani_active = true;
      }else{
        this._mesh.material = this._materials.MeshLambertMaterial;
        this._mesh.userData.ani_active = false;
      }
    }

    return( re );
  }


  finish_init(){

    super.finish_init();

    if( is_electrode( this.object ) ){

      const g = this._params,
            subject_code = this.subject_code;

      this.register_object( ['electrodes'] );
      // electrodes must be clickable, ignore the default settings
      this._canvas.add_clickable( this.name, this.object );


      let gp_position = this.get_group_object().position.clone();

      // For electrode, we need some calculation
      // g = this.object.userData.construct_params

      if( (
            !g.vertex_number || g.vertex_number < 0 ||
            !g.hemisphere || !['left', 'right'].includes( g.hemisphere )
          ) && g.is_surface_electrode ){
        // surface electrode, need to calculate nearest node
        const snap_surface = g.surface_type,
              search_group = this.group.get( `Surface - ${snap_surface} (${subject_code})` );

        // Search 141 only
        if( search_group && search_group.userData ){
          const lh_vertices = search_group.userData.group_data[
            `free_vertices_Standard 141 Left Hemisphere - ${snap_surface} (${subject_code})`];
          const rh_vertices = search_group.userData.group_data[
            `free_vertices_Standard 141 Right Hemisphere - ${snap_surface} (${subject_code})`];
          const mesh_center = search_group.getWorldPosition( gp_position );
          if( lh_vertices && rh_vertices ){
            // calculate
            let _tmp = new THREE.Vector3(),
                node_idx = -1,
                min_dist = Infinity,
                side = '',
                _dist = 0;

            lh_vertices.forEach((v, ii) => {
              _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( this.object.position );
              if( _dist < min_dist ){
                min_dist = _dist;
                node_idx = ii;
                side = 'left';
              }
            });
            rh_vertices.forEach((v, ii) => {
              _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( this.object.position );
              if( _dist < min_dist ){
                min_dist = _dist;
                node_idx = ii;
                side = 'right';
              }
            });

            if( node_idx >= 0 ){
              g.vertex_number = node_idx;
              g.hemisphere = side;
            }
            console.log(`Electrode ${this.object.name}: ${node_idx}, ${side}`);
          }
        }

      }

    }


  }

}


function gen_sphere(g, canvas){
  const subject_code = g.subject_code;

  if( subject_code ){
    // make sure subject group exists
    if( g.group && g.group.group_name ){
      const group_name = g.group.group_name;

      if( !canvas.group.has(group_name) ){
        canvas.add_group( {
          name : group_name, layer : 0, position : [0,0,0],
          disable_trans_mat: true, group_data: null,
          parent_group: null, subject_code: subject_code,
          trans_mat: null
        });
      }
    }
  }

  const el = new Sphere(g, canvas);

  if( subject_code ){
    // make sure subject array exists
    canvas.init_subject( subject_code );
  }
  return( el );
}

function add_electrode (canvas, number, name, position, surface_type = 'NA',
                        custom_info = '', is_surface_electrode = false,
                        radius = 2, color = [1,1,0],
                        group_name = '__electrode_editor__',
                        subject_code = '__localization__') {
  if( subject_code === '__localization__' ){
    name = `__localization__, ${number} - `
  }
  let _el;
  if( !canvas.group.has(group_name) ){
    canvas.add_group( {
      name : group_name, layer : 0, position : [0,0,0],
      disable_trans_mat: false, group_data: null,
      parent_group: null, subject_code: subject_code, trans_mat: null
    } );
  }

  // Check if electrode has been added, if so, remove it
  try {
    _el = canvas.electrodes.get( subject_code )[ name ];
    _el.parent.remove( _el );
  } catch (e) {}

  const g = { "name":name, "type":"sphere", "time_stamp":[], "position":position,
          "value":null, "clickable":true, "layer":0,
          "group":{"group_name":group_name,"group_layer":0,"group_position":[0,0,0]},
          "use_cache":false, "custom_info":custom_info,
          "subject_code":subject_code, "radius":radius,
          "width_segments":10,"height_segments":6,
          "is_electrode":true,
          "is_surface_electrode": is_surface_electrode,
          "use_template":false,
          "surface_type": surface_type,
          "hemisphere":null,"vertex_number":-1,"sub_cortical":true,"search_geoms":null};

  if( subject_code === '__localization__' ){
    // look for current subject code
    const scode = canvas.state_data.get("target_subject");
    const search_group = canvas.group.get( `Surface - ${surface_type} (${scode})` );

    const gp_position = new THREE.Vector3(),
          _mpos = new THREE.Vector3();
    _mpos.fromArray( position );

    // Search 141 nodes
    if( search_group && search_group.userData ){
      let lh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Left Hemisphere - ${surface_type} (${scode})`],
          rh_vertices = search_group.userData.group_data[`free_vertices_Standard 141 Right Hemisphere - ${surface_type} (${scode})`],
          is_141 = true;

      if( !lh_vertices || !rh_vertices ){
        is_141 = false;
        lh_vertices = search_group.userData.group_data[`free_vertices_FreeSurfer Left Hemisphere - ${surface_type} (${scode})`];
        rh_vertices = search_group.userData.group_data[`free_vertices_FreeSurfer Right Hemisphere - ${surface_type} (${scode})`];
      }


      const mesh_center = search_group.getWorldPosition( gp_position );
      if( lh_vertices && rh_vertices ){
        // calculate
        let _tmp = new THREE.Vector3(),
            node_idx = -1,
            min_dist = Infinity,
            side = '',
            _dist = 0;

        lh_vertices.forEach((v, ii) => {
          _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( _mpos );
          if( _dist < min_dist ){
            min_dist = _dist;
            node_idx = ii;
            side = 'left';
          }
        });
        rh_vertices.forEach((v, ii) => {
          _dist = _tmp.fromArray( v ).add( mesh_center ).distanceToSquared( _mpos );
          if( _dist < min_dist ){
            min_dist = _dist;
            node_idx = ii;
            side = 'right';
          }
        });
        if( node_idx >= 0 ){
          if( is_141 ){
            g.vertex_number = node_idx;
            g.hemisphere = side;
            g._distance_to_surf = Math.sqrt(min_dist);
          }else{
            g.vertex_number = -1;
            g.hemisphere = side;
            g._distance_to_surf = Math.sqrt(min_dist);
          }
        }

      }
    }
    // calculate MNI305 coordinate
    const mat1 = new THREE.Matrix4(),
          pos_targ = new THREE.Vector3();
    const v2v_orig = get_or_default( canvas.shared_data, scode, {} ).vox2vox_MNI305;

    if( v2v_orig ){
      mat1.set( v2v_orig[0][0], v2v_orig[0][1], v2v_orig[0][2], v2v_orig[0][3],
                v2v_orig[1][0], v2v_orig[1][1], v2v_orig[1][2], v2v_orig[1][3],
                v2v_orig[2][0], v2v_orig[2][1], v2v_orig[2][2], v2v_orig[2][3],
                v2v_orig[3][0], v2v_orig[3][1], v2v_orig[3][2], v2v_orig[3][3] );
      pos_targ.fromArray( position ).applyMatrix4(mat1);
      g.MNI305_position = pos_targ.toArray();
    }

  }

  canvas.add_object( g );


  _el = canvas.electrodes.get( subject_code )[ name ];
  _el.userData.electrode_number = number;

  if( subject_code === '__localization__' ){
    // make electrode color red
    _el.material.color.setRGB(color[0], color[1], color[2]);
  }

  return( _el );
}


function add_electrode2 (g, canvas){
  const subject_code = g.subject_code;

  if( !subject_code ){
    throw Error("No subject code in `add_electrode2`");
  }

  if( g.group && g.group.group_name ){
    const group_name = g.group.group_name;

    if( !canvas.group.has(group_name) ){
      canvas.add_group( {
        name : group_name, layer : 0, position : [0,0,0],
        disable_trans_mat: true, group_data: null,
        parent_group: null, subject_code: subject_code,
        trans_mat: null
      });
    }
  }
  const el = gen_sphere(g, canvas);

  if( !el || typeof(el) !== 'object' || !el.object ){
    return;
  }

  // make sure subject array exists
  canvas.init_subject( subject_code );
  el.finish_init();
  return( el );
}

function is_electrode(e) {
  if(e && e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
    return(true);
  }else{
    return(false);
  }
}

export { gen_sphere, add_electrode, is_electrode, add_electrode2 };
