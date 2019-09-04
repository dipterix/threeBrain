import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';

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

function gen_datacube(g, canvas){
  let mesh, group_name;

  let line_material = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true }),
      line_geometry = new THREE.Geometry();
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
	let mesh_xy2 = new THREE.Mesh( geometry_xy, material_xy );
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

	line_geometry.vertices.push(
  	new THREE.Vector3( -_mhw, -_mhw, 0 ),
  	new THREE.Vector3( _mhw, _mhw, 0 )
  );
  let line_mesh_xz = new THREE.Line( line_geometry, line_material ),
      line_mesh_xy = new THREE.Line( line_geometry, line_material ),
      line_mesh_yz = new THREE.Line( line_geometry, line_material );
  line_mesh_xz.renderOrder = CONSTANTS.MAX_RENDER_ORDER - 1;
  line_mesh_xy.renderOrder = CONSTANTS.MAX_RENDER_ORDER - 1;
  line_mesh_yz.renderOrder = CONSTANTS.MAX_RENDER_ORDER - 1;
  line_mesh_xz.layers.set( CONSTANTS.LAYER_SYS_AXIAL_10 );
  line_mesh_xz.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
  line_mesh_xy.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
  line_mesh_xy.layers.enable( CONSTANTS.LAYER_SYS_SAGITTAL_11 );
  line_mesh_yz.layers.set( CONSTANTS.LAYER_SYS_CORONAL_9 );
  line_mesh_yz.layers.enable( CONSTANTS.LAYER_SYS_AXIAL_10 );
  mesh_xz.add( line_mesh_xz );
  mesh_xy.add( line_mesh_xy );
  mesh_yz.add( line_mesh_yz );

  /*
  // Cube values Must be from 0 to 1, float
  const cube_values = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name),
        cube_half_size = canvas.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
        volume = {
          'xLength' : cube_half_size[0]*2,
          'yLength' : cube_half_size[1]*2,
          'zLength' : cube_half_size[2]*2
        };

  // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
  if( canvas.has_webgl2 ){
    // Generate 3D texture, to do so, we need to customize shaders

    // 3D texture
    let texture = new THREE.DataTexture3D(
      new Float32Array(cube_values),
      cube_half_size[0]*2,
      cube_half_size[1]*2,
      cube_half_size[2]*2
    );

    texture.minFilter = texture.magFilter = THREE.LinearFilter;

    // Needed to solve error: INVALID_OPERATION: texImage3D: ArrayBufferView not big enough for request
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.unpackAlignment = 1;

    texture.needsUpdate = true;

    // Colormap textures, using datauri hard-coded
  	let cmtextures = {
  		viridis: new THREE.TextureLoader().load( "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAIAAAC+O+cgAAAAtUlEQVR42n2Q0W3FMAzEyNNqHaH7j2L1w3ZenDwUMAwedXKA+MMvSqJiiBoiCWqWxKBEXaMZ8Sqs0zcmIv1p2nKwEvpLZMYOe3R4wku+TO7es/O8H+vHlH/KR9zQT8+z8F4531kRe379MIK4oD3v/SP7iplyHTKB5WNPs4AFH3kzO446Y+y6wA4TxqfMXBmzVrtwREY5ZrMY069dxr28Yb+wVjp02QWhSwKFJcHCaGGwTLBIzB9eyYkORwhbNAAAAABJRU5ErkJggg==" ),
  		gray: new THREE.TextureLoader().load( "data:;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAIAAAC+O+cgAAAAEklEQVR42mNkYGBgHAWjYKQCAH7BAv8WAlmwAAAAAElFTkSuQmCC" )
  	};

  	// Material
  	const shader = THREE.VolumeRenderShader1;

  	let uniforms = THREE.UniformsUtils.clone( shader.uniforms );
  	uniforms.u_data.value = texture;
  	uniforms.u_size.value.set( volume.xLength, volume.yLength, volume.zLength );
  	uniforms.u_clim.value.set( 0, 1 );
  	uniforms.u_renderstyle.value = 0; // 0: MIP, 1: ISO
  	uniforms.u_renderthreshold.value = 0.015; // For ISO renderstyle
  	uniforms.u_cmdata.value = cmtextures.gray;

    let material = new THREE.ShaderMaterial( {
  		uniforms: uniforms,
  		vertexShader: shader.vertexShader,
  		fragmentShader: shader.fragmentShader,
  		side: THREE.BackSide // The volume shader uses the backface as its "reference point"
  	} );

  	let geometry = new THREE.BoxBufferGeometry( volume.xLength, volume.yLength, volume.zLength );

  	// TODO: Make sure this translate is correct
  	geometry.translate( volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5 );

  	mesh = new THREE.Mesh( geometry, material );
  	mesh.name = 'mesh_datacube_' + g.name;

    mesh.position.fromArray(g.position);
  }
  */

	return(mesh);

}

export { gen_datacube };
