import { AbstractThreeBrainObject } from './abstract.js';
import { TwoPassDoubleSide, BufferAttribute, DataTexture, NearestFilter,
         LinearFilter, RGBAFormat, UnsignedByteType, Vector3,
         MeshPhongMaterial, MeshLambertMaterial, BufferGeometry, Mesh,
         Data3DTexture } from 'three';
import { CONSTANTS } from '../core/constants.js';
import { to_array, min2, sub2 } from '../utils.js';
import { compile_free_material } from '../shaders/SurfaceShader.js';

const MATERIAL_PARAMS = {
  'transparent' : true,
  'side': TwoPassDoubleSide,
  'wireframeLinewidth' : 0.1,
  'vertexColors' : true
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
      this._geometry.setAttribute( 'track_color', new BufferAttribute( track_color, 3, true ) );
    }
  }

  _link_userData(){
    // register for compatibility
    this._mesh.userData.pre_render = () => { return( this.pre_render() ); };
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
          lutMap = lut.map,
          tcol = this._track_color;

    // only set RGB, ignore A
    let c, jj = skip_items;
    for( let ii = 0; ii < this.__nvertices; ii++, jj++ ){
      if( jj >= value.length ){
        tcol[ ii * 3 ] = 0;
        tcol[ ii * 3 + 1 ] = 0;
        tcol[ ii * 3 + 2 ] = 0;
        // tcol[ ii * 4 + 3 ] = 0;
      } else {
        c = lutMap[ value[ jj ] ];
        if( c ){
          tcol[ ii * 3 ] = c.R;
          tcol[ ii * 3 + 1 ] = c.G;
          tcol[ ii * 3 + 2 ] = c.B;
          // tcol[ ii * 4 + 3 ] = 255;
        } else {
          tcol[ ii * 3 ] = 0;
          tcol[ ii * 3 + 1 ] = 0;
          tcol[ ii * 3 + 2 ] = 0;
          // tcol[ ii * 4 + 3 ] = 0;
        }
      }
    }
    // this._mesh.material.needsUpdate = true;
    this._geometry.attributes.track_color.needsUpdate = true;

  }

  // Primary color (Curv, sulc...)
  _set_primary_color( color_name, update_color = false ){
    if( update_color ) {
      this.object.geometry.attributes.color.needsUpdate = true
    }

    let cname = color_name || this._vertex_cname;

    // color data is lazy-loaded
    const color_data = this._canvas.get_data(cname, this.misc_name, this.misc_group_name);
    const g = this._params;
    const nvertices = this._mesh.geometry.attributes.position.count;
    let valueRange = [-1, 1];
    let valueData;

    if( (color_data && Array.isArray(color_data.value)) ){

      if( !Array.isArray(color_data.range) || color_data.range.length < 2 ){
        color_data.range = [-1, 1];
      } else {
        valueRange = color_data.range;
      }

      valueData = color_data.value;


    } else {

      // directly set by lh_primary_vertex_color
      const prefix = this.hemisphere.toLocaleLowerCase()[0];
      const vertexValues = this._canvas.get_data(`${ prefix }h_primary_vertex_color`, this.name, this.group_name);

      if( vertexValues && vertexValues.isFreeSurferNodeValues ) {

        valueRange = [ vertexValues.min , vertexValues.max ];
        valueData = vertexValues._frameData;

      } else {
        return;
      }
    }


    let scale = Math.max(valueRange[1], -valueRange[0]);

    // generate color for each vertices
    const _transform = (v, b = 10 / scale) => {
      // let _s = 1.0 / ( 1.0 + Math.exp(b * 1)) - 0.5 * 2.0001;
      let s = Math.floor( 153.9 / ( 1.0 + Math.exp(b * v)) ) + 100;
      return( s / 255 );
    };

    valueData.forEach((v, ii) => {
      if( ii >= nvertices ){ return; }
      // Make it lighter using sigmoid function
      let col = _transform(v);
      this._vertex_color[ ii * 4 ] = col;
      this._vertex_color[ ii * 4 + 1 ] = col;
      this._vertex_color[ ii * 4 + 2 ] = col;
      this._vertex_color[ ii * 4 + 3 ] = 1;
    });

  }

  _check_material( update_canvas = false ){
    const _mty = this._canvas.get_state('surface_material_type') || this._material_type;
    if( !this._mesh.material['is' + _mty] ){
      this.switch_material( _mty, update_canvas );
    }
  }

  _set_color_from_datacube2( m, bias = 3.0 ){
    // console.debug("Generating surface colors from volume data...");

    if( !m || !m.isDataCube2 ){
      this._material_options.mapping_type.value = CONSTANTS.DEFAULT_COLOR;
      return;
    }

    if( this._material_options.mapping_type.value === CONSTANTS.DEFAULT_COLOR ) {
      return;
    }

    this._volume_texture.image = m.colorTexture.image;


    this._material_options.scale_inv.value.set(
      1 / m.modelShape.x,
      1 / m.modelShape.y,
      1 / m.modelShape.z
    );

    /**
     * We want to enable USE_COLOR_ALPHA so that vColor is vec4,
     * This requires vertexAlphas to be true
     * https://github.com/mrdoob/three.js/blob/be137e6da5fd682555cdcf5c8002717e4528f879/src/renderers/WebGLRenderer.js#L1442
    */
    this._mesh.material.vertexColors = true;
    this._material_options.sampler_bias.value = bias;
    this._material_options.sampler_step.value = bias / 2;
    this._volume_texture.needsUpdate = true;

  }

  switch_material( material_type, update_canvas = false ){
    if( material_type in this._materials ){
      const _m = this._materials[ material_type ];
      const _o = this._canvas.get_state("surface_opacity_left") || 0;

      this._material_type = material_type;
      this._mesh.material = _m;
      this._mesh.material.vertexColors = true;
      this._mesh.material.opacity = _o;
      this._mesh.material.needsUpdate = true;
      if( update_canvas ){
        this._canvas.start_animation( 0 );
      }
    }
  }

  _link_electrodes(){

    if( !Array.isArray( this._linked_electrodes ) ){
      this._linked_electrodes = [];
      this._canvas.electrodes.forEach((v) => {
        for( let k in v ){
          this._linked_electrodes.push( v[ k ] );
        }
      });

      // this._linked_electrodes to shaders
      const elec_size = this._linked_electrodes.length;
      if( elec_size == 0 ){ return; }
      const elec_locs = new Uint8Array( elec_size * 4 );
      const locs_texture = new DataTexture( elec_locs, elec_size, 1 );

      locs_texture.minFilter = NearestFilter;
      locs_texture.magFilter = NearestFilter;
      locs_texture.format = RGBAFormat;
      locs_texture.type = UnsignedByteType;
      locs_texture.unpackAlignment = 1;
      locs_texture.needsUpdate = true;
      this._material_options.elec_locs.value = locs_texture;

      const elec_cols = new Uint8Array( elec_size * 4 );
      const cols_texture = new DataTexture( elec_cols, elec_size, 1 );

      cols_texture.minFilter = NearestFilter;
      cols_texture.magFilter = NearestFilter;
      cols_texture.format = RGBAFormat;
      cols_texture.type = UnsignedByteType;
      cols_texture.unpackAlignment = 1;
      cols_texture.needsUpdate = true;
      this._material_options.elec_cols.value = cols_texture;

      this._material_options.elec_size.value = elec_size;
      this._material_options.elec_active_size.value = elec_size;
    }

    const e_size = this._linked_electrodes.length;
    if( !e_size ){ return; }

    const e_locs = this._material_options.elec_locs.value.image.data;
    const e_cols = this._material_options.elec_cols.value.image.data;

    const p = new Vector3();
    let ii = 0;
    this._linked_electrodes.forEach((el) => {
      if( el.material.isMeshBasicMaterial ){
        el.getWorldPosition( p );
        p.addScalar( 128 );
        e_locs[ ii * 4 ] = Math.round( p.x );
        e_locs[ ii * 4 + 1 ] = Math.round( p.y );
        e_locs[ ii * 4 + 2 ] = Math.round( p.z );
        e_cols[ ii * 4 ] = Math.floor( el.material.color.r * 255 );
        e_cols[ ii * 4 + 1 ] = Math.floor( el.material.color.g * 255 );
        e_cols[ ii * 4 + 2 ] = Math.floor( el.material.color.b * 255 );
        ii++;
      }
    });
    this._material_options.elec_locs.value.needsUpdate = true;
    this._material_options.elec_cols.value.needsUpdate = true;
    this._material_options.elec_active_size.value = ii;

  }

  finish_init(){

    super.finish_init();

    // Need to registr surface
    // instead of using surface name, use
    this.register_object( ['surfaces'] );

    this._material_options.shift.value.copy( this._mesh.parent.position );

    this._set_primary_color(this._vertex_cname, true);
    this._set_track( 0 );


    /*this._canvas.bind( this.name + "_link_electrodes", "canvas.finish_init", () => {
      let nm, el;
      this._canvas.electrodes.forEach((v) => {
        for(nm in v){
          el = v[ nm ];
        }
      });
    }, this._canvas.el );*/


    this.__initialized = true;
  }

  dispose(){
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
    try {
      this._volume_texture.dispose();
    } catch (e) {}
  }

  pre_render(){
    // check material
    super.pre_render();
    this._check_material( false );

    if( !this.object.visible ) { return; }

    // need to get current active datacube2
    const atlas_type = this._canvas.get_state("atlas_type", "none"),
          sub = this._canvas.get_state("target_subject", "none"),
          inst = this._canvas.threebrain_instances.get(`Atlas - ${atlas_type} (${sub})`),
          ctype = this._canvas.get_state("surface_color_type", "vertices"),
          sigma = this._canvas.get_state("surface_color_sigma", 3.0),
          blend = this._canvas.get_state("surface_color_blend", 0.4),
          decay = this._canvas.get_state("surface_color_decay", 0.15),
          radius = this._canvas.get_state("surface_color_radius", 10.0),
          refresh_flag = this._canvas.get_state("surface_color_refresh", undefined);

    let col_code, material_needs_update = false;

    this._mesh.material.transparent = this._mesh.material.opacity < 0.99;
    switch (ctype) {
      case 'vertices':
        col_code = CONSTANTS.VERTEX_COLOR;
        break;

      case 'sync from voxels':
        col_code = CONSTANTS.VOXEL_COLOR;
        this._mesh.material.transparent = true;

        // get current frame
        if( this.time_stamp.length ){
          let skip_frame = 0;

          const currentTime = this._canvas.animParameters.time;

          this.time_stamp.forEach((v, ii) => {
            if( v <= currentTime ){
              skip_frame = ii - 1;
            }
          });
          if( skip_frame < 0 ){ skip_frame = 0; }

          if( this.__skip_frame !== skip_frame){
            this._set_track( skip_frame );
          }
        }
        break;

      case 'sync from electrodes':
        col_code = CONSTANTS.ELECTRODE_COLOR;
        this._link_electrodes();
        break;

      default:
        col_code = CONSTANTS.DEFAULT_COLOR;
    };

    if( this._material_options.mapping_type.value !== col_code ){
      this._material_options.mapping_type.value = col_code;
      material_needs_update = true;
    }
    if( this._material_options.blend_factor.value !== blend ){
      this._material_options.blend_factor.value = blend;
      material_needs_update = true;
    }
    if( this._material_options.elec_decay.value !== decay ){
      this._material_options.elec_decay.value = decay;
      material_needs_update = true;
    }
    if( this._material_options.elec_radius.value !== radius ){
      this._material_options.elec_radius.value = radius;
      material_needs_update = true;
    }
    if( this._blend_sigma !== sigma ){
      this._blend_sigma = sigma;
      material_needs_update = true;
    }
    if( this._refresh_flag !== refresh_flag ){
      this._refresh_flag = refresh_flag;
      material_needs_update = true;
    }

    // This step is slow
    if( material_needs_update && col_code === CONSTANTS.VOXEL_COLOR ){
      // need to get current active datacube2
      this._set_color_from_datacube2(inst, this._blend_sigma);
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
      `default_vertex_${ this.hemisphere[0] }h_${ this.surface_type }`, this.name, this.group_name) || "sulc";

    // STEP 2: data settings
    this._geometry = new BufferGeometry();

    const loaderData = this._canvas.get_data('free_vertices_'+this.name, this.name, this.group_name);
    if( loaderData.isFreeSurferMesh ) {

      this.__nvertices = loaderData.nVertices;
      this._geometry.setIndex( new BufferAttribute(loaderData.index, 1, false) );
      this._geometry.setAttribute( 'position', new BufferAttribute(loaderData.position, 3) );

    } else {
      const vertices = loaderData;
      const faces = this._canvas.get_data('free_faces_'+g.name, this.name, this.group_name);
      // Make sure face index starts from 0
      const _face_min = min2(faces, 0);
      if(_face_min !== 0) {
        sub2(faces, _face_min);
      }

      // construct geometry
      this.__nvertices = vertices.length;
      const vertex_positions = new Float32Array( this.__nvertices * 3 ),
            face_orders = new Uint32Array( faces.length * 3 );

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

      this._geometry.setIndex( new BufferAttribute(face_orders, 1, false) );
      this._geometry.setAttribute( 'position', new BufferAttribute(vertex_positions, 3) );
    }

    this._vertex_color = new Float32Array( this.__nvertices * 4 ).fill(1);
    this._geometry.setAttribute( 'color', new BufferAttribute( this._vertex_color, 4, true ) );

    // gb.setAttribute( 'color', new Float32BufferAttribute( vertex_colors, 3 ) );
    // gb.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );

    this._geometry.computeVertexNormals();
    this._geometry.computeBoundingBox();
    this._geometry.computeBoundingSphere();


    // STEP 3: mesh settings
    // For volume colors
    this._volume_margin_size = 128;
    this._volume_array = new Uint8Array( 32 );
    // fake texture, will update later
    this._volume_texture = new Data3DTexture(
      this._volume_array, 2, 2, 2
    );
    this._volume_texture.minFilter = NearestFilter;
    this._volume_texture.magFilter = LinearFilter;
    this._volume_texture.format = RGBAFormat;
    this._volume_texture.type = UnsignedByteType;
    this._volume_texture.unpackAlignment = 1;


    this._material_options = {
      'mapping_type'      : { value : CONSTANTS.DEFAULT_COLOR },
      'volume_map'        : { value : this._volume_texture },
      'scale_inv'         : {
        value : new Vector3(
          1 / this._volume_margin_size, 1 / this._volume_margin_size,
          1 / this._volume_margin_size
        )
      },
      'shift'             : { value : new Vector3() },
      'sampler_bias'      : { value : 3.0 },
      'sampler_step'      : { value : 1.5 },
      'elec_cols'         : { value : null },
      'elec_locs'         : { value : null },
      'elec_size'         : { value : 0 },
      'elec_active_size'  : { value : 0 },
      'elec_radius'       : { value: 10.0 },
      'elec_decay'        : { value : 0.15 },
      'blend_factor'      : { value : 0.4 }
    };

    this._materials = {
      'MeshPhongMaterial' : compile_free_material(
        new MeshPhongMaterial( MATERIAL_PARAMS),
        this._material_options, this._canvas.main_renderer
      ),
      'MeshLambertMaterial': compile_free_material(
        new MeshLambertMaterial( MATERIAL_PARAMS ),
        this._material_options, this._canvas.main_renderer
      )
    };




    //gb.faces = faces;

    this._geometry.name = 'geom_free_' + g.name;

    this._material_type = g.material_type || 'MeshPhongMaterial';
    this._mesh = new Mesh(this._geometry, this._materials[this._material_type]);
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
        let min_t = this._canvas.get_state( 'time_range_min0' );
        if( min_t === undefined || min < min_t ){
          this._canvas.set_state( 'time_range_min0', min );
        }
      }
      if( max !== undefined ){
        let max_t = this._canvas.get_state( 'time_range_max0' );
        if( max_t === undefined || max < max_t ){
          this._canvas.set_state( 'time_range_max0', max );
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
