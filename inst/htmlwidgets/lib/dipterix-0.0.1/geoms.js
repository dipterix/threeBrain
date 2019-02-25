window.THREEJSRGEOMS = (function(){

  function _get_color(col1, col2, a, b){
    if(col1 === undefined && col2 === undefined){
      return(null);
    }

    if(col1 === undefined){
      col1 = col2;
      a = b = 0.5;
    }

    if(col2 === undefined){
      col2 = col1;
      a = b = 0.5;
    }

    a = a / (a + b);
    b = 1-a;

    var re = new Array(col1.length), ic;

    for(ic = 0; ic < col1.length; ic++){
      re[ic] = col1[ic] * a + col2[ic] * b;
    }


    return(re);
  }

  function _pad_color(tmp, dpp){
    var c;
    switch (dpp) {
        case '1':
          tmp = tmp[0];
          c = [tmp,tmp,tmp,tmp];
          break;

        case '2':
          c = [tmp[0],tmp[0],tmp[0],tmp[1]];
          break;

        case '3':
          c = [tmp[0],tmp[1],tmp[2],1];
          break;

        default:
          c = [tmp[0],tmp[1],tmp[2],tmp[3]];
      }
    return(c);
  }

  function freemesh(init_args){
    var g = new THREE.BufferGeometry();


    g.setIndex( init_args.faces );
    g.addAttribute( 'position', new THREE.Float32BufferAttribute( init_args.vertices, 3 ) );
		g.addAttribute( 'normal', new THREE.Float32BufferAttribute( init_args.normals, 3 ) );
		g.addAttribute( 'color', new THREE.Float32BufferAttribute( init_args.colors, 3 ) );
		g.computeVertexNormals();

    // Tricky here, customized data will be textured for each vertices
    var __mesh,
        __dat,
        __width = 8;
    var set_data_texture = function( mesh, data, pixel_size = 3, max_anisotropy = 1 ){
      /*
      We don't set texture to customized mesh data. Instead, we set vertex colors
      */
      __dat = data;
      __mesh = mesh;
			return(null);
    };

    var update_data_texture = function( key, key_2, a, b, update_texture = true ){
      var col = __dat[key],
          col_2 = __dat[key_2], c1,c2,c3;
      if(col === undefined && col_2 === undefined){
        return(null);
      }

      if(col === undefined){
        col = col_2;
        a = b = 0.5;
      }

      if(col_2 === undefined){
        col_2 = col;
        a = b = 0.5;
      }

      a = a / (a + b);
      b = 1-a;

      // TODO
      // what's the width of texture?
      /*for(var i = 0; i < (__width*__width * 3); i++){
        __cols[i] = col[i] * a + col_2[i] * b;
      }

      if(update_texture){
        __dataTexture.needsUpdate=true;
      }*/

    };

    return({
      'geom' : g,
      'set_data_texture' : set_data_texture,
      'update_data_texture' : update_data_texture
    });
  }



  function sphere(init_args){
    var radius=init_args.radius,
        widthSegments=init_args.widthSegments,
        heightSegments=init_args.heightSegments,
        phiStart=init_args.phiStart,
        phiLength=init_args.phiLength,
        thetaStart=init_args.thetaStart,
        thetaLength=init_args.thetaLength;
    var g = new THREE.SphereBufferGeometry(

      radius = (radius === undefined? 50 : radius),
      widthSegments = (widthSegments === undefined? 10 : widthSegments),
      heightSegments = (widthSegments === undefined? 6 : heightSegments),
      phiStart = (phiStart === undefined? 0 : phiStart),
      phiLength = (phiLength === undefined? 6.28318530717959 : phiLength),
      thetaStart = (thetaStart === undefined? 0 : thetaStart),
      thetaLength = (thetaLength === undefined? 3.1415926535 : thetaLength)

    );

    var __dat,
        __dataTexture,
        __width = 8,
        __data_point_pixel,
        __mesh,
        __cols = new Float32Array( 4 * __width * __width );
    var set_data_texture = function( mesh, data, pixel_size = 3, max_anisotropy = 1 ){
      /*
      * For sphere object, data will be: [key: val] - val is
      * single color - new Uint8Array( 3 );
      */
      __dat = data;
      __data_point_pixel = pixel_size;

			__dataTexture = new THREE.DataTexture(
			      __cols , __width, __width,
			      THREE.RGBAFormat,
			      THREE.FloatType,
			      THREE.UVMapping,
			      anisotropy = 1);

			__mesh = mesh;

			mesh.material = new THREE.MeshBasicMaterial({ 'map' : __dataTexture, 'transparent' : true });
			return(__dataTexture);
    };

    var update_data_texture = function( key, key_2, a, b, update_texture = true ){
      var col = __dat[key],
          col_2 = __dat[key_2], c,
          threshold = __mesh.userData.texture_threshold || 0,
          alpha = __mesh.userData.texture_alpha || false,
          dpp = String(parseInt(__data_point_pixel));


      var tmp = _get_color(col, col_2, a, b);
      c = _pad_color(tmp, dpp);

      if(!alpha){
        c[3] = 1;
      }else if(c[3] < threshold){
        c[3] = 0;
      }

      for(var i = 0; i<(__width*__width); i++){
        __cols[0 + 4*i] = c[0];
        __cols[1 + 4*i] = c[1];
        __cols[2 + 4*i] = c[2];
        __cols[3 + 4*i] = c[3];
      }

      if(update_texture){
        __dataTexture.needsUpdate=true;
      }

    };

    return({
      'geom' : g,
      'set_data_texture' : set_data_texture,
      'update_data_texture' : update_data_texture
    });
  }


  function plane(init_args){
    init_args.widthSegments = init_args.widthSegments || 1;
    init_args.heightSegments = init_args.heightSegments || 1;
    var g = new THREE.PlaneBufferGeometry(
      width = init_args.width,
      height = init_args.height,
      widthSegments = init_args.widthSegments,
      heightSegments = init_args.heightSegments
    );

    var __dat,
        __dataTexture,
        __width,// = Math.pow(2, Math.floor(Math.log(Math.min(init_args.width, init_args.height)) / Math.log(2))),
        __mesh,
        __cols;// = new Uint8Array( 3 * __width * __width );

    var set_data_texture = function( mesh, data, pixel_size = 3, max_anisotropy = 1 ){
      /*
      * For plane object, data will be: [key: val] - val is
      * image - new Uint8Array( 3 x width x height );
      */
      __dat = data;
      __data_point_pixel = pixel_size;
      __width = Math.floor(Math.sqrt(__dat[Object.keys(__dat)[0]].length / pixel_size));
      __cols = new Float32Array( 4 * __width * __width );

      window.ccc = __cols;

			__dataTexture = new THREE.DataTexture(
			      __cols , __width, __width,
			      THREE.RGBAFormat,
			      THREE.FloatType,
			      THREE.UVMapping,
			      anisotropy = max_anisotropy
			);

			__dataTexture.wrapS = __dataTexture.wrapT = THREE.ClampToEdgeWrapping;

			__mesh = mesh;
			mesh.material = new THREE.MeshBasicMaterial({ 'map' : __dataTexture, 'side' : THREE.DoubleSide, 'transparent' : true });
			return(__dataTexture);
    };

    var update_data_texture = function( key, key_2, a, b, update_texture = true ){
      var col = __dat[key],
          col_2 = __dat[key_2], c1,c2,c3,
          dpp = String(parseInt(__data_point_pixel)),
          threshold = __mesh.userData.texture_threshold || 0.005,
          alpha = __mesh.userData.texture_alpha || false;
      if(col === undefined && col_2 === undefined){
        return(null);
      }

      if(col === undefined){
        col = col_2;
        a = b = 0.5;
      }

      if(col_2 === undefined){
        col_2 = col;
        a = b = 0.5;
      }

      a = a / (a + b);
      b = 1-a;

      // what's the width of texture?
      var tmp, i;

      switch (dpp) {
        case '1':
          for(i = 0; i < (__width*__width); i++){
            // strip = __data_point_pixel
            tmp = __data_point_pixel*i;
            __cols[4*i] = col[tmp] * a + col_2[tmp] * b;
            __cols[4*i+1] = __cols[4*i];
            __cols[4*i+2] = __cols[4*i];
            __cols[4*i+3] = __cols[4*i];
          }
          break;

        case '2':
          for(i = 0; i < (__width*__width); i++){
            // strip = __data_point_pixel
            tmp = __data_point_pixel*i;
            __cols[4*i] = col[tmp] * a + col_2[tmp] * b;
            __cols[4*i+1] = __cols[4*i];
            __cols[4*i+2] = __cols[4*i];
            __cols[4*i+3] = col[tmp+1] * a + col_2[tmp+1] * b;
          }
          break;

        case '3':
          for(i = 0; i < (__width*__width); i++){
            // strip = __data_point_pixel
            tmp = __data_point_pixel*i;
            __cols[4*i] = col[tmp] * a + col_2[tmp] * b;
            __cols[4*i+1] = col[tmp+1] * a + col_2[tmp+1] * b;
            __cols[4*i+2] = col[tmp+2] * a + col_2[tmp+2] * b;
            __cols[4*i+3] = 1;
          }
          break;

        default:
          for(i = 0; i < (__width*__width); i++){
            // strip = __data_point_pixel
            tmp = __data_point_pixel*i;
            __cols[4*i] = col[tmp] * a + col_2[tmp] * b;
            __cols[4*i+1] = col[tmp+1] * a + col_2[tmp+1] * b;
            __cols[4*i+2] = col[tmp+2] * a + col_2[tmp+2] * b;
            __cols[4*i+3] = col[tmp+3] * a + col_2[tmp+3] * b;
          }
      }

      // threshold alpha
      if(!alpha){
        for(i = 0; i < (__width*__width); i++){
          __cols[4*i+3] = 1;
        }
      }else if(threshold > 0){
        for(i = 0; i < (__width*__width); i++){
          if(__cols[4*i+3] < threshold){
            __cols[4*i+3] = 0;
          }
        }
      }

      if(update_texture){
        __dataTexture.needsUpdate=true;
      }

    };

    return({
      'geom' : g,
      'set_data_texture' : set_data_texture,
      'update_data_texture' : update_data_texture
    });
  }

  function linesegment(init_args){
    /*
    init_args:
    vertices: position of each dots
    indices: sequence of segments starting from 0
    **/
    var g = new THREE.BufferGeometry();

    var position = new Float32Array(init_args.vertices);


    g.setIndex( init_args.faces );
    g.addAttribute( 'position', new THREE.BufferAttribute( position, 3 ) );
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(init_args.indices), 1));
		// g.addAttribute( 'normal', new THREE.Float32BufferAttribute( init_args.normals, 3 ) );
		// g.addAttribute( 'color', new THREE.Float32BufferAttribute( init_args.colors, 3 ) );
		// g.computeVertexNormals();
		// window.gg =g;

    // Tricky here, customized data will be textured for each vertices
    var __mesh,
        __dat,
        __lineTexture;
    var set_data_texture = function( mesh, data, pixel_size = 3, max_anisotropy = 1 ){
      /*
      We don't set texture to customized mesh data. Instead, we set vertex colors
      also the last two args are ignored
      */
      __lineTexture = new THREE.LineBasicMaterial({
        color: 0xff0000
      });

			__mesh = mesh;
			__dat = data;

			mesh.material = __lineTexture;
			return(null);
    };

    var update_data_texture = function( key, key_2, a, b, update_texture = true ){
      var col = _get_color(__dat[key],  __dat[key_2], a, b);

      col = _pad_color(col, 3);

      __lineTexture.color.setRGB(col[0], col[1], col[2]);

      if(update_texture){
        __lineTexture.needsUpdate=true;
      }

    };

    return({
      'geom' : g,
      'set_data_texture' : set_data_texture,
      'update_data_texture' : update_data_texture
    });
  }



  return({
    'linesegment' : linesegment,
    'sphere' : sphere,
    'plane' : plane,
    'freemesh' : freemesh
  });
})();
