import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { to_array, min2, sub2 } from '../utils.js';

const MATERIAL_PARAMS = {
  'transparent' : true,
  'side': THREE.DoubleSide,
  'wireframeLinewidth' : 0.1
};

class FreeMesh extends AbstractThreeBrainObject {

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'FreeMesh';
    this.isFreeMesh = true;

    // STEP 1: initial settings
    // when subject brain is messing, subject_code will be template subject such as N27,
    // and display_code will be the missing subject
    // actuall subject
    this.subject_code = this._params.subject_code;
    // display subject
    this.display_code = canvas.get_data('subject_code', this._params.name,
                                        this.group_name) || this.subject_code;
    this.hemisphere = this._params.hemisphere || 'left';
    this.surface_type = this._params.surface_type;
    this.misc_name = '_misc_' + this.subject_code;
    this.misc_group_name = '_internal_group_data_' + this.subject_code;
    this._vertex_cname = this._canvas.get_data(
      `default_vertex_${ this.hemisphere[0] }h_${ this.surface_type }`, this.name, this.group_name);

    // STEP 2: data settings
    const vertices = this._canvas.get_data('free_vertices_'+this.name, this.name, this.group_name);
    const faces = this._canvas.get_data('free_faces_'+g.name, this.name, this.group_name);

    // Make sure face index starts from 0
    const _face_min = min2(faces, 0);
    if(_face_min !== 0) {
      sub2(faces, _face_min);
    }

    // STEP 3: mesh settings
    this._materials = {
      'MeshPhongMaterial' : new THREE.MeshPhongMaterial( MATERIAL_PARAMS ),
      'MeshLambertMaterial': new THREE.MeshLambertMaterial( MATERIAL_PARAMS )
    };
    this._material_color = THREE.NoColors;

    this._geometry = new THREE.BufferGeometry();

    // construct geometry

    const vertex_positions = [], face_orders = [];
    vertices.forEach((v) => {
      vertex_positions.push(v[0], v[1], v[2]);
    });
    faces.forEach((v) => {
      face_orders.push(v[0], v[1], v[2]);
    });


    this._geometry.setIndex( face_orders );
    this._geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertex_positions, 3 ) );
    // gb.setAttribute( 'color', new THREE.Float32BufferAttribute( vertex_colors, 3 ) );
    // gb.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

    this._geometry.computeVertexNormals();
    this._geometry.computeBoundingBox();
    this._geometry.computeBoundingSphere();
    //gb.faces = faces;

    this._geometry.name = 'geom_free_' + g.name;

    this._material_type = this._materials[g.material_type] || 'MeshPhongMaterial';
    this._mesh = new THREE.Mesh(this._geometry, this._materials[this._material_type]);
    this._mesh.name = 'mesh_free_' + g.name;

    this._mesh.position.fromArray(g.position);

    // register userData to comply with main framework
    this._mesh.userData.construct_params = g;

    // animation data
    this._mesh.userData.ani_name = 'default';
    this._mesh.userData.ani_all_names = Object.keys( g.keyframes );
    this._mesh.userData.ani_exists = this._mesh.userData.ani_all_names.length > 0;

    // register object
    this.object = this._mesh;

    this._link_userData();
  }

  finish_init(){

    super.finish_init();

    // Need to registr surface
    // instead of using surface name, use
    this.register_object( ['surfaces'] );

    this.set_vertex_color(this._vertex_cname, true);
  }

  _link_userData(){
    // register for compatibility
    this._mesh.userData.get_track_data = ( track_name, reset_material ) => {
      return( this.get_track_data( track_name, reset_material ) );
    };
    this._mesh.userData.generate_animation = ( track_data, cmap, animation_clips, mixer ) => {
      return( this.generate_animation( track_data, cmap, animation_clips, mixer ) );
    };
    this._mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
    this._mesh.userData.dispose = () => { this.dispose(); };
  }

  // internally used
  _set_vertex_color( cname, color_data, update_color = false ){
    const g = this._params;

    let colattr = this._geometry.getAttribute('color'),
        missattr = colattr === undefined;
    let scale = 1;


    if( color_data && Array.isArray(color_data.value) &&
        this._mesh.geometry.attributes.position.count == color_data.value.length ){
      // test passed
      this._vertex_cname = cname;

      if( missattr ){
        colattr = new THREE.Uint8BufferAttribute( new Uint8Array(color_data.value.length * 3), 3, true );
      }


      if( !Array.isArray(color_data.range) || color_data.range.length < 2 ){
        color_data.range = [-1, 1];
      }

      scale = Math.max(color_data.range[1], -color_data.range[0]);

      // generate color for each vertices
      const _transform = (v, b = 10 / scale) => {
        // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
        let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
        return( s );
      };
      color_data.value.forEach((v, ii) => {
        let col;
        // Make it lighter using sigmoid function
        col = _transform(v);
        colattr.setXYZ(ii, col, col, col);
      });


      if( update_color ){
        // update color to geometry
        if( missattr ){
          this._mesh.geometry.setAttribute( 'color', colattr );
        }
        this._mesh.material.vertexColors = THREE.VertexColors;
        this._mesh.material.needsUpdate = true;
        this._material_color = THREE.VertexColors;
      }

    }else if( update_color ){
      this._mesh.material.vertexColors = THREE.NoColors;
      this._mesh.material.needsUpdate = true;
      this._material_color = THREE.NoColors;
    }
  }

  set_vertex_color( color_name, update_color = false ){

    let cname = color_name || this._vertex_cname;

    // color data is lazy-loaded
    const color_data = this._canvas.get_data(cname, this.misc_name, this.misc_group_name);

    this._set_vertex_color(cname, color_data, update_color);

  }

  dispose(){
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
  }


  get_track_data( track_name, reset_material ){
    const g = this._params;
    let re, tname = track_name;
    // this._material_type

    if( this._mesh.userData.ani_exists ){
      if( tname === undefined ){ tname = this._mesh.userData.ani_name; }
      re = g.keyframes[ tname ];
    }else{
      re = g.keyframes[ tname ];
    }
    // remember last choice
    this._mesh.userData.ani_name = tname;

    if( reset_material !== false ){
      if( !re ){
        // track data not found, ignore vertex color
        this._mesh.material.vertexColors = THREE.NoColors;
        this._mesh.material.needsUpdate=true;
      }else {
        this._mesh.material.vertexColors = THREE.VertexColors;
        this._mesh.material.needsUpdate=true;
      }
    }

    if( !re ){
      return;
    }
    console.log('Using track name ' + tname);

    if( re.cached ){
      let value = this._canvas.get_data('free_vertex_colors_' + re.name + '_'+g.name, g.name, g.group.group_name);
      if( !value || typeof value !== 'object' || !Array.isArray(value.value) || value.value.length === 0 ){
        // value should be cached but not found or invalid
        return;
      }
      re.value = value.value;
      re.cached = false;
    }
    return(re);

  }


  generate_animation( track_data, cmap, animation_clips, mixer ){
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
    this._mesh.userData.animation_target = track_data.target;

    const keyframe = new THREE.NumberKeyframeTrack(
      '.userData[animationIndex]',
      time_stamp, values, THREE.InterpolateDiscrete
    );

    return( keyframe );
  }


  _check_material( update_canvas = false ){
    const _mty = this._canvas.state_data.get('surface_material_type') || this._material_type;
    if( !this._mesh.material['is' + _mty] ){
      this.switch_material( _mty, update_canvas );
    }
  }

  pre_render( results ){
    // check material
    this._check_material( false );

    // console.log( mesh.userData.animationIndex );
    // get current index
    let vidx = this._mesh.userData.animationIndex;
    if( typeof vidx !== 'number' ){ return; }

    // get current track_data
    const track_data = this._mesh.userData.get_track_data( this._mesh.userData.ani_name, false );
    if( !track_data ){ return; }

    vidx = Math.floor( vidx );
    if( vidx < 0 ){ vidx = 0; }
    if( vidx >= track_data.cvalues.length ){ vidx = track_data.cvalues.length-1; }

    const cvalue = track_data.cvalues[ vidx ];

    // check? TODO
    for( let ii=0; ii<cvalue.length; ii++ ){
      this._mesh.geometry.attributes.color.array[ ii ] = cvalue[ ii ];
    }
    this._mesh.geometry.attributes.color.needsUpdate=true;

  }

  switch_material( material_type, update_canvas = false ){
    if( material_type in this._materials ){
      const _m = this._materials[ material_type ];
      const _o = this._canvas.state_data.get("surface_opacity_left") || 0;
      this._material_type = material_type;
      this._mesh.material = _m;
      this._mesh.material.vertexColors = this._material_color;
      this._mesh.material.opacity = _o;
      this._mesh.material.needsUpdate = true;
      if( update_canvas ){
        this._canvas.start_animation( 0 );
      }
    }
  }

}


function gen_free(g, canvas){
  return( new FreeMesh(g, canvas) );
}

/*
function render_curvature(canvas, mesh, curv_type, update_color = false){

  // surf_group$set_group_data('curvature_subject', template_subject)
  const g = mesh.userData.construct_params,
        curvature_subject = canvas.get_data('curvature_subject', g.name, g.group.group_name) || g.subject_code;

  const curv_data = canvas.get_data(`Curvature - ${g.hemisphere[0]}h.${curv_type} (${curvature_subject})`,
                                    g.name, g.group.group_name);
  const vertex_colors = [];
  let scale = 1;

  if( curv_data && Array.isArray(curv_data.value) &&
      mesh.geometry.attributes.position.count == curv_data.value.length ){

    if( !Array.isArray(curv_data.range) || curv_data.range.length < 2 ){
      curv_data.range = [-1, 1];
    }

    scale = Math.max(curv_data.range[1], -curv_data.range[0]);

    // generate color for each vertices
    const _transform = (v, b = 10 / scale) => {
      // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
      let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
      return( s );
    };
    curv_data.value.forEach((v) => {
      let col;
      // col = 127.5 - (v / scale * 127.5);
      // Make it lighter using sigmoid function
      col = _transform(v);
      vertex_colors.push( col );
      vertex_colors.push( col );
      vertex_colors.push( col );
    });


    if( update_color ){
      // update color to geometry
      mesh.geometry.setAttribute( 'color', new THREE.Uint8BufferAttribute( vertex_colors, 3, true ) );
      mesh.material.vertexColors = THREE.VertexColors;
      mesh.material.needsUpdate = true;
    }

  }else if( update_color ){
    mesh.material.vertexColors = THREE.NoColors;
    mesh.material.needsUpdate = true;
  }

}



function gen_free(g, canvas){
  const gb = new THREE.BufferGeometry(),
      vertices = canvas.get_data('free_vertices_'+g.name, g.name, g.group.group_name),
      faces = canvas.get_data('free_faces_'+g.name, g.name, g.group.group_name),
      curvature_type = canvas.get_data("curvature", g.name, g.group.group_name);

  const vertex_positions = [],
        // vertex_colors = [],
        face_orders = [];
      //normals = [];


  vertices.forEach((v) => {
    vertex_positions.push(v[0], v[1], v[2]);
    // normals.push(0,0,1);
    // vertex_colors.push( 0, 0, 0);
  });

  faces.forEach((v) => {
    face_orders.push(v[0], v[1], v[2]);
  });

  gb.setIndex( face_orders );
  gb.setAttribute( 'position', new THREE.Float32BufferAttribute( vertex_positions, 3 ) );
  // gb.setAttribute( 'color', new THREE.Float32BufferAttribute( vertex_colors, 3 ) );
  // gb.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

  gb.computeVertexNormals();
  gb.computeBoundingBox();
  gb.computeBoundingSphere();
  //gb.computeFaceNormals();
  //gb.faces = faces;

  gb.name = 'geom_free_' + g.name;

  // https://github.com/mrdoob/three.js/issues/3490
  let material = new THREE.MeshPhongMaterial({ 'transparent' : true, side: THREE.DoubleSide });

  let mesh = new THREE.Mesh(gb, material);
  mesh.name = 'mesh_free_' + g.name;

  mesh.position.fromArray(g.position);

  // mesh.userData.ani_value = values;
  // mesh.userData.ani_time = to_array(g.time_stamp);

  // have to assign construct_params to use render_curvature
  mesh.userData.construct_params = g;

  if( typeof curvature_type === 'string' ){
    render_curvature(canvas, mesh, curvature_type, true);
  }


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


  mesh.userData.generate_animation = (track_data, cmap, animation_clips, mixer) => {
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

  mesh.userData.pre_render = ( results ) => {
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

*/

export { gen_free };
