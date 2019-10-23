import { THREE } from '../threeplugins.js';
import { to_array } from '../utils.js';

function gen_free(g, canvas){
  const gb = new THREE.BufferGeometry(),
      vertices = canvas.get_data('free_vertices_'+g.name, g.name, g.group.group_name),
      faces = canvas.get_data('free_faces_'+g.name, g.name, g.group.group_name);

  const vertex_positions = [],
        vertex_colors = [],
        face_orders = [];
      //normals = [];

  vertices.forEach((v) => {
    vertex_positions.push(v[0], v[1], v[2]);
    // normals.push(0,0,1);
    vertex_colors.push( 0, 0, 0);
  });

  faces.forEach((v) => {
    face_orders.push(v[0], v[1], v[2]);
  });

  gb.setIndex( face_orders );
  gb.addAttribute( 'position', new THREE.Float32BufferAttribute( vertex_positions, 3 ) );
  gb.addAttribute( 'color', new THREE.Float32BufferAttribute( vertex_colors, 3 ) );
  // gb.addAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
  gb.computeVertexNormals();
  gb.computeBoundingBox();
  gb.computeBoundingSphere();
  //gb.computeFaceNormals();
  //gb.faces = faces;


  gb.name = 'geom_free_' + g.name;

  // https://github.com/mrdoob/three.js/issues/3490
  let material = new THREE.MeshLambertMaterial({ 'transparent' : true, side: THREE.DoubleSide });

  let mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_free_' + g.name;

  mesh.position.fromArray(g.position);

  // mesh.userData.ani_value = values;
  // mesh.userData.ani_time = to_array(g.time_stamp);

  mesh.userData.dispose = () => {
    mesh.material.dispose();
    mesh.geometry.dispose();
  };


  // animation data
  mesh.userData.ani_name = 'default';
  mesh.userData.ani_all_names = Object.keys( g.keyframes );

  mesh.userData.ani_exists = mesh.userData.ani_all_names.length > 0;

  mesh.userData.get_track_data = ( track_name, reset_material ) => {
    let re, tname = track_name;

    if( mesh.userData.ani_exists ){
      if( tname === undefined ){ tname = mesh.userData.ani_name; }
      re = g.keyframes[ tname ];
    }else{
      re = g.keyframes[ tname ];
    }
    // remember last choice
    mesh.userData.ani_name = tname;

    if( reset_material !== false ){
      if( !re ){
        // track data not found, ignore vertex color
        mesh.material.vertexColors = THREE.NoColors;
        mesh.material.needsUpdate=true;
      }else {
        mesh.material.vertexColors = THREE.VertexColors;
        mesh.material.needsUpdate=true;
      }
    }

    if( !re ){
      return;
    }
    console.log('Using track name ' + tname);

    if( re.cached ){
      let value = canvas.get_data('free_vertex_colors_' + re.name + '_'+g.name, g.name, g.group.group_name);
      if( !value || typeof value !== 'object' || !Array.isArray(value.value) || value.value.length === 0 ){
        // value should be cached but not found or invalid
        return;
      }
      re.value = value.value;
      re.cached = false;
    }
    return(re);

  };


  mesh.userData.generate_animation = (track_data, cmap, animation_clips, animation_mixers) => {
    console.log('Using customized animation mixer');

    // Generate keyframes
    const _time_min = cmap.time_range[0],
          _time_max = cmap.time_range[1];
    // Prepare color map
    const color_trans = {};
    cmap.value_names.map((nm, ii) => {
      color_trans[ nm ] = cmap.lut.getColor(ii);
    });

    // 1. timeStamps, TODO: get from settings the time range
    const values = [], time_stamp = [], cvalues = [];
    to_array( track_data.time ).forEach((v, ii) => {
      time_stamp.push( v - _time_min );
      values.push( ii );
    });

    const _size = track_data.value.length / time_stamp.length;
    let _value = [];

    track_data.value.forEach((v, ii) => {
      let _c = color_trans[ v ] || cmap.lut.getColor(v) || {r:0,g:0,b:0};
      _value.push( _c.r, _c.g, _c.b );
      if( (ii+1) % _size === 0 && _value.length > 0 ){
        cvalues.push( _value );
        _value = [];
      }
    });
    if( _value.length > 0 ){
      cvalues.push( _value );
      _value = [];
    }
    track_data.cvalues = cvalues;

    // We cannot morph vertex colors, but can still use the animation
    // The key is to set mesh.userData.animationIndex to be value index, and
    mesh.userData.animation_target = track_data.target;

    const keyframe = new THREE.NumberKeyframeTrack(
      '.userData[animationIndex]',
      time_stamp, values, THREE.InterpolateDiscrete
    );

    return( keyframe );
  };

  mesh.userData.pre_render = () => {
    // console.log( mesh.userData.animationIndex );
    // get current index
    let vidx = mesh.userData.animationIndex;
    if( typeof vidx !== 'number' ){ return; }

    // get current track_data
    const track_data = mesh.userData.get_track_data( mesh.userData.ani_name, false );
    if( !track_data ){ return; }

    vidx = Math.floor( vidx );
    if( vidx < 0 ){ vidx = 0; }
    if( vidx >= track_data.cvalues.length ){ vidx = track_data.cvalues.length-1; }

    const cvalue = track_data.cvalues[ vidx ];

    // check? TODO
    for( let ii=0; ii<cvalue.length; ii++ ){
      mesh.geometry.attributes.color.array[ ii ] = cvalue[ ii ];
    }
    mesh.geometry.attributes.color.needsUpdate=true;

  };

  return(mesh);

}

export { gen_free };
