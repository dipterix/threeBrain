import { AbstractThreeBrainObject } from './abstract.js';
import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';
import { to_array, get_or_default } from '../utils.js';

/* WebGL doesn't take transparency into consideration when calculating depth
https://stackoverflow.com/questions/11165345/three-js-webgl-transparent-planes-hiding-other-planes-behind-them

The hack is to rewrite shader, force transparent fragments to have depth of 1, which means transparent parts
always hide behind other objects.

However, is we set brain mesh to be transparent, the volume is still hidden behind the mesh and invisible.
This is because when the renderer calculate depth first, and the mesh is in the front, then volume gets
not rendered.
What we need to do is to set render order to be -1, which means always render volume first, then the opaque
parts will show.

*/

class DataCube extends AbstractThreeBrainObject {
  constructor(g, canvas){
    super(g, canvas);

    this.type = 'DataCube';
    this.isDataCube = true;

    let mesh, group_name;

    let line_material = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true }),
        line_geometry = new THREE.BufferGeometry();
    line_material.depthTest = false;


    // Cube values Must be from 0 to 1, float
    const cube_values = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name),
          cube_dimension = canvas.get_data('datacube_dim_'+g.name, g.name, g.group.group_name),
          cube_half_size = canvas.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
          cube_center = g.position,
          volume = {
            'xLength' : cube_half_size[0]*2,
            'yLength' : cube_half_size[1]*2,
            'zLength' : cube_half_size[2]*2
          };

    // Generate texture
    let texture = new THREE.DataTexture2DArray( new Uint8Array(cube_values), cube_dimension[0], cube_dimension[1], cube_dimension[2] );
    texture.format = THREE.RedFormat;
  	texture.type = THREE.UnsignedByteType;
  	texture.needsUpdate = true;
  	this._texture = texture;


    // Shader - XY plane
  	const shader_xy = THREE.Volume2dArrayShader_xy;
  	let material_xy = new THREE.ShaderMaterial({
  	  uniforms : {
    		diffuse: { value: texture },
    		depth: { value: cube_half_size[2] },  // initial in the center of data cube
    		size: { value: new THREE.Vector3( volume.xLength, volume.yLength, cube_dimension[2] ) },
    		threshold: { value : 0.0 },
    		renderDepth: { value : 1.0 }
    	},
    	vertexShader: shader_xy.vertexShader,
  		fragmentShader: shader_xy.fragmentShader,
  		side: THREE.DoubleSide,
  		transparent: true
  	});
  	let geometry_xy = new THREE.PlaneBufferGeometry( volume.xLength, volume.yLength );


  	let mesh_xy = new THREE.Mesh( geometry_xy, material_xy );
  	// let mesh_xy2 = new THREE.Mesh( geometry_xy, material_xy );
  	mesh_xy.renderOrder = -1;
  	mesh_xy.position.copy( CONSTANTS.VEC_ORIGIN );
  	mesh_xy.name = 'mesh_datacube__axial_' + g.name;


  	// Shader - XZ plane
  	const shader_xz = THREE.Volume2dArrayShader_xz;
  	let material_xz = new THREE.ShaderMaterial({
  	  uniforms : {
    		diffuse: { value: texture },
    		depth: { value: cube_half_size[1] },  // initial in the center of data cube
    		size: { value: new THREE.Vector3( volume.xLength, cube_dimension[1], volume.zLength ) },
    		threshold: { value : 0.0 },
    		renderDepth: { value : 1.0 }
    	},
    	vertexShader: shader_xz.vertexShader,
  		fragmentShader: shader_xz.fragmentShader,
  		side: THREE.DoubleSide,
  		transparent: true
  	});
  	let geometry_xz = new THREE.PlaneBufferGeometry( volume.xLength, volume.zLength );

  	let mesh_xz = new THREE.Mesh( geometry_xz, material_xz );
  	mesh_xz.rotateX( Math.PI / 2 );
  	mesh_xz.renderOrder = -1;
  	mesh_xz.position.copy( CONSTANTS.VEC_ORIGIN );
  	mesh_xz.name = 'mesh_datacube__coronal_' + g.name;


  	// Shader - YZ plane
  	const shader_yz = THREE.Volume2dArrayShader_yz;
  	let material_yz = new THREE.ShaderMaterial({
  	  uniforms : {
    		diffuse: { value: texture },
    		depth: { value: cube_half_size[0] },  // initial in the center of data cube
    		size: { value: new THREE.Vector3( cube_dimension[0], volume.yLength, volume.zLength ) },
    		threshold: { value : 0.0 },
    		renderDepth: { value : 1.0 }
    	},
    	vertexShader: shader_yz.vertexShader,
  		fragmentShader: shader_yz.fragmentShader,
  		side: THREE.DoubleSide,
  		transparent: true
  	});
  	let geometry_yz = new THREE.PlaneBufferGeometry( volume.xLength, volume.zLength );

  	let mesh_yz = new THREE.Mesh( geometry_yz, material_yz );
  	mesh_yz.rotateY( Math.PI / 2);
  	mesh_yz.rotateZ( Math.PI / 2); // Back side
  	mesh_yz.renderOrder = -1;
  	mesh_yz.position.copy( CONSTANTS.VEC_ORIGIN );
  	mesh_yz.name = 'mesh_datacube__sagittal_' + g.name;

    // coronal (xz), axial (xy), sagittal (yz)
  	mesh = [ mesh_xz, mesh_xy, mesh_yz ];

  	// generate diagonal line
  	const _mhw = Math.max( ...cube_half_size );

    const line_vert = [];
  	line_vert.push(
    	new THREE.Vector3( -_mhw, -_mhw, 0 ),
    	new THREE.Vector3( _mhw, _mhw, 0 )
    );
    line_geometry.setFromPoints( line_vert );

    let line_mesh_xz = new THREE.Line( line_geometry, line_material ),
        line_mesh_xy = new THREE.Line( line_geometry, line_material ),
        line_mesh_yz = new THREE.Line( line_geometry, line_material );
    line_mesh_xz.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    line_mesh_xy.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    line_mesh_yz.renderOrder = CONSTANTS.RENDER_ORDER.DataCube;
    line_mesh_xz.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
    line_mesh_xz.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    line_mesh_xy.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    line_mesh_xy.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
    line_mesh_yz.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
    line_mesh_yz.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
    mesh_xz.add( line_mesh_xz );
    mesh_xy.add( line_mesh_xy );
    mesh_yz.add( line_mesh_yz );


    mesh_xy.userData.dispose = () => {
  	  material_xy.dispose();
  	  geometry_xy.dispose();
      line_material.dispose();
      line_geometry.dispose();
      texture.dispose();
    };
    mesh_xy.userData.instance = this;
    this._line_material = line_material;
    this._line_geometry = line_geometry;
    this._texture = texture;

    this._mesh_xy = mesh_xy;
    this._material_xy = material_xy;
    this._geometry_xy = geometry_xy;

    mesh_xz.userData.dispose = () => {
  	  material_xz.dispose();
  	  geometry_xz.dispose();
      line_material.dispose();
      line_geometry.dispose();
      texture.dispose();
    };
    mesh_xz.userData.instance = this;
    this._mesh_xz = mesh_xz;
    this._material_xz = material_xz;
    this._geometry_xz = geometry_xz;

    mesh_yz.userData.dispose = () => {
  	  material_yz.dispose();
  	  geometry_yz.dispose();
      line_material.dispose();
      line_geometry.dispose();
      texture.dispose();
    };
    mesh_yz.userData.instance = this;
    this._mesh_yz = mesh_yz;
    this._geometry_yz = geometry_yz;
    this._material_yz = material_yz;

    this.object = mesh;
  }

  dispose(){
    this._line_material.dispose();
    this._line_geometry.dispose();
    this._material_xy.dispose();
    this._geometry_xy.dispose();
    this._material_yz.dispose();
  	this._geometry_yz.dispose();
  	this._material_yz.dispose();
  	this._geometry_yz.dispose();
    this._texture.dispose();
  }

  get_track_data( track_name, reset_material ){}

  pre_render( results ){}

  finish_init(){
    // Special, as m is a array of three planes
    // this.object = mesh = [ mesh_xz, mesh_xy, mesh_yz ];

    this._canvas.mesh.set( '_coronal_' + this.name, this._mesh_xz );
    this._canvas.mesh.set( '_axial_' + this.name, this._mesh_xy );
    this._canvas.mesh.set( '_sagittal_' + this.name, this._mesh_yz );

    if( this.clickable ){
      this._canvas.add_clickable( '_coronal_' + this.name, this._mesh_xz );
      this._canvas.add_clickable( '_axial_' + this.name, this._mesh_xy );
      this._canvas.add_clickable( '_sagittal_' + this.name, this._mesh_yz );
    }

    // data cube must have groups
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    this._canvas.origin.remove( gp );
    this._canvas.scene.add( gp );

    // set layer, add tp group
    this.object.forEach((plane) => {

      this.set_layer( [], plane );

      gp.add( plane );
      plane.userData.construct_params = this._params;
      plane.updateMatrixWorld();
    });

    this.register_object( ['volumes'] );

    // flaw there, if volume has no subject, then subject_code is '',
    // if two volumes with '' exists, we lose track of the first volume
    // and switch_volume will fail in setting this cube invisible
    // TODO: force subject_code for all volumes or use random string as subject_code
    // or parse subject_code from volume name
    if( !this._canvas._has_datacube_registered ){
      this._canvas._register_datacube( this.object );
      this._canvas._has_datacube_registered = true;
    }

  }

}


function gen_datacube(g, canvas){
  return( new DataCube(g, canvas) );
}

export { gen_datacube };
