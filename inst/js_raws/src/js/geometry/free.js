import { THREE } from '../threeplugins.js';

function gen_free(g, canvas){
  const gb = new THREE.BufferGeometry(),
      vertices = canvas.get_data('free_vertices_'+g.name, g.name, g.group.group_name),
      faces = canvas.get_data('free_faces_'+g.name, g.name, g.group.group_name);

  const vertex_positions = [],
      face_orders = [];
      //normals = [];

  vertices.forEach((v) => {
    vertex_positions.push(v[0], v[1], v[2]);
    // normals.push(0,0,1);
  });

  faces.forEach((v) => {
    face_orders.push(v[0], v[1], v[2]);
  });

  gb.setIndex( face_orders );
  gb.addAttribute( 'position', new THREE.Float32BufferAttribute( vertex_positions, 3 ) );
  // gb.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
  gb.computeVertexNormals();
  gb.computeBoundingBox();
  gb.computeBoundingSphere();
  //gb.computeFaceNormals();
  //gb.faces = faces;


  gb.name = 'geom_free_' + g.name;

  // https://github.com/mrdoob/three.js/issues/3490
  let material = new THREE.MeshLambertMaterial({ 'transparent' : false });

  let mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_free_' + g.name;

  mesh.position.fromArray(g.position);

  // mesh.userData.ani_value = values;
  // mesh.userData.ani_time = to_array(g.time_stamp);

  return(mesh);

}

export { gen_free };
