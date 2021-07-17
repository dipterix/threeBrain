import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';
import { to_array, min2, sub2 } from '../utils.js';
import { compile_free_material } from '../shaders/SurfaceShader.js';

const MATERIAL_PARAMS = {
  'transparent' : true,
  'side': THREE.DoubleSide,
  'wireframeLinewidth' : 0.1,
  'vertexColors' : THREE.VertexColors
};

// freemesh
// CONSTANTS.DEFAULT_COLOR = 0;
// CONSTANTS.VERTEX_COLOR = 1;
// CONSTANTS.VOXEL_COLOR = 2;
// CONSTANTS.ELECTRODE_COLOR = 3;

class FreeMesh extends AbstractThreeBrainObject {

  _ensure_track_color(){
    if( !this._track_color ){
      const track_color = new Uint8Array( this.__nvertices * 3 ).fill(255);
      this._track_color = track_color;
      this._geometry.setAttribute( 'track_color', new THREE.BufferAttribute( track_color, 3, true ) );
    }
  }

  _link_userData(){
    // register for compatibility
    this._mesh.userData.pre_render = ( results ) => { return( this.pre_render( results ) ); };
    this._mesh.userData.dispose = () => { this.dispose(); };
  }

  // internally used
  _set_track( skip_frame ){
    // prepare
    if( skip_frame !== undefined && skip_frame >= 0 ){
      this.__skip_frame = skip_frame;
    }
    const value = this._params.value;
    if( !value ){ return; }


    const skip_items = this.__nvertices * this.__skip_frame;
    if( skip_items > value.length ){ return; }

    if( !this.__initialized ) {
      value.forEach((v, ii) => {
        value[ ii ] = Math.floor( v );
      });
    }
    this._ensure_track_color();

    // start settings track values
    const lut = this._canvas.global_data('__global_data__.SurfaceColorLUT'),
          lut_map = lut.map,
          tcol = this._track_color;

    // only set RGB, ignore A
    let c, jj = skip_items;
    for( let ii = 0; ii < this.__nvertices; ii++, jj++ ){
      if( jj >= value.length ){
        tcol[ ii * 3 ] = 0;
        tcol[ ii * 3 + 1 ] = 0;
        tcol[ ii * 3 + 2 ] = 0;
      } else {
        c = lut_map[ value[ jj ] ];
        if( c ){
          tcol[ ii * 3 ] = c.R;
          tcol[ ii * 3 + 1 ] = c.G;
          tcol[ ii * 3 + 2 ] = c.B;
        } else {
          tcol[ ii * 3 ] = 0;
          tcol[ ii * 3 + 1 ] = 0;
          tcol[ ii * 3 + 2 ] = 0;
        }
      }
    }
    // this._mesh.material.needsUpdate = true;
    this._geometry.attributes.track_color.needsUpdate = true;

  }

  // Primary color (Curv, sulc...)
  _set_primary_color( color_name, update_color = false ){

    let cname = color_name || this._vertex_cname;

    // color data is lazy-loaded
    const color_data = this._canvas.get_data(cname, this.misc_name, this.misc_group_name);

    if( !(color_data && Array.isArray(color_data.value)) ){
      if( update_color ){
        this._mesh.material.needsUpdate = true;
      }
      return;
    }

    const g = this._params;
    const nvertices = this._mesh.geometry.attributes.position.count;
    if( !Array.isArray(color_data.range) || color_data.range.length < 2 ){
      color_data.range = [-1, 1];
    }

    let scale = Math.max(color_data.range[1], -color_data.range[0]);

    // generate color for each vertices
    const _transform = (v, b = 10 / scale) => {
      // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
      let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
      return( s );
    };

    color_data.value.forEach((v, ii) => {
      if( ii >= nvertices ){ return; }
      // Make it lighter using sigmoid function
      let col = _transform(v);
      this._vertex_color[ ii * 3 ] = col;
      this._vertex_color[ ii * 3 + 1 ] = col;
      this._vertex_color[ ii * 3 + 2 ] = col;
    });

    if( update_color ){
      // update color to geometry
      this._mesh.material.needsUpdate = true;
    }

  }

  _check_material( update_canvas = false ){
    const _mty = this._canvas.state_data.get('surface_material_type') || this._material_type;
    if( !this._mesh.material['is' + _mty] ){
      this.switch_material( _mty, update_canvas );
    }
  }

  _set_color_from_datacube2( m, bias = 3.0 ){
    if( !m || !m.isDataCube2 ){
      this._material_options.which_map.value = CONSTANTS.DEFAULT_COLOR;
      return;
    }


    this._volume_texture.image = m._color_texture.image;

    this._material_options.scale_inv.value.set(
      1 / m._cube_dim[0],
      1 / m._cube_dim[1],
      1 / m._cube_dim[2]
    )
    this._material_options.shift.value.copy( this._mesh.parent.position );
    this._volume_texture.needsUpdate = true;
    this._material_options.which_map.value = CONSTANTS.VOXEL_COLOR;
    this._material_options.sampler_bias.value = bias;
    this._material_options.sampler_step.value = bias / 2;

  }

  switch_material( material_type, update_canvas = false ){
    if( material_type in this._materials ){
      const _m = this._materials[ material_type ];
      const _o = this._canvas.state_data.get("surface_opacity_left") || 0;

      this._material_type = material_type;
      this._mesh.material = _m;
      this._mesh.material.vertexColors = THREE.VertexColors;
      this._mesh.material.opacity = _o;
      this._mesh.material.needsUpdate = true;
      if( update_canvas ){
        this._canvas.start_animation( 0 );
      }
    }
  }

  finish_init(){

    super.finish_init();

    // Need to registr surface
    // instead of using surface name, use
    this.register_object( ['surfaces'] );

    this._set_primary_color(this._vertex_cname, true);
    this._set_track( 0 );


    this.__initialized = true;
  }

  dispose(){
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
    try {
      this._volume_texture.dispose();
    } catch (e) {}
  }

  pre_render( results ){
    // check material
    this._check_material( false );

    // get current frame
    if( this._material_options.which_map.value === CONSTANTS.VERTEX_COLOR &&
        this.time_stamp.length > 0){
      let skip_frame = 0;

      this.time_stamp.forEach((v, ii) => {
        if( v <= results.current_time ){
          skip_frame = ii - 1;
        }
      });
      if( skip_frame < 0 ){ skip_frame = 0; }

      if( this.__skip_frame !== skip_frame){
        this._set_track( skip_frame );
      }

    }
  }

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
    // For volume colors
    this._volume_margin_size = 128;
    this._volume_array = new Uint8Array( 32 );
    // fake texture, will update later
    this._volume_texture = new THREE.DataTexture3D(
      this._volume_array, 2, 2, 2
    );
    this._volume_texture.minFilter = THREE.NearestFilter;
    this._volume_texture.magFilter = THREE.LinearFilter;
    this._volume_texture.format = THREE.RGBAFormat;
    this._volume_texture.type = THREE.UnsignedByteType;
    this._volume_texture.unpackAlignment = 1;


    this._material_options = {
      'which_map' : { value : CONSTANTS.DEFAULT_COLOR },
      'volume_map' : { value : this._volume_texture },
      'scale_inv' : {
        value : new THREE.Vector3(
          1 / this._volume_margin_size, 1 / this._volume_margin_size,
          1 / this._volume_margin_size
        )
      },
      'shift' : { value : new THREE.Vector3() },
      'sampler_bias' : { value : 3.0 },
      'sampler_step' : { value : 1.5 }
    };

    this._materials = {
      'MeshPhongMaterial' : compile_free_material(
        new THREE.MeshPhongMaterial( MATERIAL_PARAMS),
        this._material_options, this._canvas.main_renderer
      ),
      'MeshLambertMaterial': compile_free_material(
        new THREE.MeshLambertMaterial( MATERIAL_PARAMS ),
        this._material_options, this._canvas.main_renderer
      )
    };

    this._geometry = new THREE.BufferGeometry();

    // construct geometry
    this.__nvertices = vertices.length;
    const vertex_positions = new Float32Array( this.__nvertices * 3 ),
          face_orders = new Uint32Array( faces.length * 3 ),
          vertex_color = new Uint8Array( this.__nvertices * 3 ).fill(255);

    this._vertex_color = vertex_color;

    vertices.forEach((v, ii) => {
      vertex_positions[ ii * 3 ] = v[0];
      vertex_positions[ ii * 3 + 1 ] = v[1];
      vertex_positions[ ii * 3 + 2 ] = v[2];
    });
    faces.forEach((v, ii) => {
      face_orders[ ii * 3 ] = v[0];
      face_orders[ ii * 3 + 1 ] = v[1];
      face_orders[ ii * 3 + 2 ] = v[2];
    });

    this._geometry.setIndex( new THREE.BufferAttribute(face_orders, 1) );
    this._geometry.setAttribute( 'position', new THREE.BufferAttribute(vertex_positions, 3) );
    this._geometry.setAttribute( 'color', new THREE.BufferAttribute( vertex_color, 3, true ) );


    // gb.setAttribute( 'color', new THREE.Float32BufferAttribute( vertex_colors, 3 ) );
    // gb.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );

    this._geometry.computeVertexNormals();
    this._geometry.computeBoundingBox();
    this._geometry.computeBoundingSphere();
    //gb.faces = faces;

    this._geometry.name = 'geom_free_' + g.name;

    this._material_type = g.material_type || 'MeshPhongMaterial';
    this._mesh = new THREE.Mesh(this._geometry, this._materials[this._material_type]);
    this._mesh.name = 'mesh_free_' + g.name;

    this._mesh.position.fromArray(g.position);

    // calculate timestamps
    this.time_stamp = to_array( this._params.time_stamp );
    if(this.time_stamp.length > 0){

      let min, max;
      this.time_stamp.forEach((v) => {
        if( min === undefined || min > v ){ min = v; }
        if( max === undefined || max < v){ max = v; }
      });
      if( min !== undefined ){
        let min_t = this._canvas.state_data.get( 'time_range_min0' );
        if( min_t === undefined || min < min_t ){
          this._canvas.state_data.set( 'time_range_min0', min );
        }
      }
      if( max !== undefined ){
        let max_t = this._canvas.state_data.get( 'time_range_max0' );
        if( max_t === undefined || max < max_t ){
          this._canvas.state_data.set( 'time_range_max0', max );
        }
      }

    }

    // register userData to comply with main framework
    this._mesh.userData.construct_params = g;

    // animation data (for backward-compatibility)
    this._mesh.userData.ani_name = 'default';
    this._mesh.userData.ani_all_names = Object.keys( g.keyframes );
    this._mesh.userData.ani_exists = false;

    // register object
    this.object = this._mesh;

    this._link_userData();
  }

}


function gen_free(g, canvas){
  return( new FreeMesh(g, canvas) );
}

export { gen_free };
