import { THREE } from '../threeplugins.js';
import { to_array, get_or_default } from '../utils.js';

function gen_sphere(g, canvas){
  const gb = new THREE.SphereBufferGeometry( g.radius, g.width_segments, g.height_segments ),
      values = g.keyframes,
      n_keyframes = to_array( g.keyframes ).length;
  let material_basic = new THREE.MeshBasicMaterial({ 'transparent' : false }),
      material_lambert = new THREE.MeshLambertMaterial({ 'transparent' : false }),
      material;
  gb.name = 'geom_sphere_' + g.name;

  // Make material based on value
  if( n_keyframes > 0 ){
    // Use the first value
    material = material_basic;
  }else{
    material = material_lambert;
  }

  const mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_sphere_' + g.name;

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
  mesh.userData.ani_params = {...values};
  mesh.userData.ani_name = 'default';
  mesh.userData.ani_all_names = Object.keys( mesh.userData.ani_params );

  mesh.userData.get_track_data = ( track_name, reset_material ) => {
    let re;

    if( mesh.userData.ani_exists ){
      if( track_name === undefined ){ track_name = mesh.userData.ani_name; }
      re = values[ track_name ];
    }

    if( reset_material ){
      if( re && re.value !== null ){
        mesh.material = material_basic;
      }else{
        mesh.material = material_lambert;
      }
    }

    return( re );
  };


  // Set animation keyframes, will set material color
  // Not used. to be deleted
  mesh.userData.generate_keyframe_tracks = ( track_name ) => {
    if( !values ){ return( undefined ); }
    if( track_name === undefined ){
      track_name = mesh.userData.ani_name;
    }else{
      mesh.userData.ani_name = track_name;
    }
    const cols = [], time_stamp = [];
    const ani_data = values[ track_name ];

    if( ani_data ){

      mesh.material = material_basic;

      to_array( ani_data.value ).forEach((v) => {
        let c = canvas.get_color(v);
        cols.push( c.r, c.g, c.b );
      });
      to_array( ani_data.key_frame ).forEach((v) => {
        time_stamp.push( v - canvas.time_range_min );
      });
      return([new THREE.ColorKeyframeTrack(
        '.material.color',
        time_stamp, cols, THREE.InterpolateDiscrete
      )]);
    }else{
      // No animation for current mesh, set to MeshLambertMaterial
      mesh.material = material_lambert;
      return( undefined );
    }

  };

  /* Add point light
  const point_light = new THREE.PointLight(0x000000, 1, 6, 1);
  point_light.visible = false;
  mesh.userData.point_light = point_light;
  mesh.add(point_light);
  */
  mesh.userData.dispose = () => {
    mesh.material.dispose();
    mesh.geometry.dispose();
  };
  return(mesh);
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

function is_electrode(e) {
  if(e && e.isMesh && e.userData.construct_params && e.userData.construct_params.is_electrode){
    return(true);
  }else{
    return(false);
  }
}

export { gen_sphere, add_electrode, is_electrode };
