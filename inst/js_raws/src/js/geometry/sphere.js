import { THREE } from '../threeplugins.js';
import { to_array } from '../utils.js';

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

  return(mesh);
}

export { gen_sphere };
