import { THREE } from '../threeplugins.js';
import { CONSTANTS } from '../constants.js';



function gen_datacube2(g, canvas){

  let mesh;

  // Cube values Must be from 0 to 1, float
  const cube_values = canvas.get_data('datacube_value_'+g.name, g.name, g.group.group_name),
        cube_half_size = canvas.get_data('datacube_half_size_'+g.name, g.name, g.group.group_name),
        volume = {
          'xLength' : cube_half_size[0]*2,
          'yLength' : cube_half_size[1]*2,
          'zLength' : cube_half_size[2]*2
        };
  // const cube_values_float = cube_values.map((v) => {return(v / 255)});

  // If webgl2 is enabled, then we can show 3d texture, otherwise we can only show 3D plane
  if( canvas.has_webgl2 ){
    // Generate 3D texture, to do so, we need to customize shaders

    // 3D texture
    let texture = new THREE.DataTexture3D(
      new Uint8Array(cube_values),
      cube_half_size[0]*2,
      cube_half_size[1]*2,
      cube_half_size[2]*2
    );


    texture.minFilter = texture.magFilter = THREE.LinearFilter;

    // Needed to solve error: INVALID_OPERATION: texImage3D: ArrayBufferView not big enough for request
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    // texture.unpackAlignment = 1;

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
  	uniforms.u_renderstyle.value = 1; // 0: MIP, 1: ISO
  	uniforms.u_renderthreshold.value = Math.max( g.threshold || 0, 1 ); // For ISO renderstyle
  	uniforms.u_cmdata.value = cmtextures.viridis;

    let material = new THREE.ShaderMaterial( {
  		uniforms: uniforms,
  		vertexShader: shader.vertexShader,
  		fragmentShader: shader.fragmentShader,
  		side: THREE.BackSide // The volume shader uses the backface as its "reference point"
  	} );

  	let geometry = new THREE.BoxBufferGeometry( volume.xLength, volume.yLength, volume.zLength );


  	// This translate will make geometry rendered correctly
  	geometry.translate( volume.xLength / 2, volume.yLength / 2, volume.zLength / 2 );

  	mesh = new THREE.Mesh( geometry, material );
  	mesh.name = 'mesh_datacube_' + g.name;

    mesh.position.fromArray([
      g.position[0] - cube_half_size[0],
      g.position[1] - cube_half_size[1],
      g.position[2] - cube_half_size[2]
    ]);
    // mesh.position.fromArray( g.position );

    mesh.userData.dispose = () => {
      material.dispose();
      geometry.dispose();
      texture.dispose();
    };
  }

	return(mesh);

}

export { gen_datacube2 };
