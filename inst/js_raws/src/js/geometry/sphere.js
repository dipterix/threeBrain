import { THREE } from '../threeplugins.js';
import { to_dict, to_array } from '../utils.js';

function gen_sphere(g, canvas){
  const gb = new THREE.SphereBufferGeometry( g.radius, g.width_segments, g.height_segments ),
      values = to_array(g.value);
  let material;
  gb.name = 'geom_sphere_' + g.name;

  // Make material based on value
  if(values.length === 0){
    material = new THREE.MeshLambertMaterial({ 'transparent' : true });
  }else{
    // Use the first value
    material = new THREE.MeshBasicMaterial({ 'transparent' : true });
  }

  const mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_sphere_' + g.name;

  let linked = false;
  if(g.use_link){
    // This is a linkedSphereGeom which should be attached to a surface mesh
    let vertex_ind = Math.floor(g.vertex_number - 1),
        target_name = g.linked_geom,
        target_mesh = canvas.mesh[target_name];

    if(target_mesh && target_mesh.isMesh){
      let target_pos = target_mesh.geometry.attributes.position.array;
      mesh.position.set(target_pos[vertex_ind * 3], target_pos[vertex_ind * 3+1], target_pos[vertex_ind * 3+2]);
      linked = true;
    }
  }

  if(!linked){
    mesh.position.fromArray(g.position);
  }


  mesh.userData.ani_value = values;
  mesh.userData.ani_time = to_array(g.time_stamp);

  if(values.length > 0){
    // Set animation keyframes, will set material color
    mesh.userData.generate_keyframe_tracks = () => {
      let cols = [], time_stamp = [];
      mesh.userData.ani_value.forEach((v) => {
        let c = canvas.get_color(v);
        cols.push( c.r, c.g, c.b );
      });
      mesh.userData.ani_time.forEach((v) => {
        time_stamp.push( v - canvas.time_range_min );
      });
      return([new THREE.ColorKeyframeTrack(
        '.material.color',
        time_stamp, cols, THREE.InterpolateDiscrete
      )]);

    };

  }

  return(mesh);
}

export { gen_sphere };
