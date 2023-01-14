import {
	BufferGeometry,
	Float32BufferAttribute,
	Vector2,
	Vector3
} from "three";

// TubeBufferGeometry2

class TubeBufferGeometry2 extends BufferGeometry {
  constructor ( path, tubularSegments, radius, radialSegments, closed ) {

    super();

  	this.type = 'TubeBufferGeometry2';

  	this.parameters = {
  		path: path,
  		tubularSegments: tubularSegments,
  		radius: radius,
  		radialSegments: radialSegments,
  		closed: closed
  	};

  	tubularSegments = tubularSegments || 64;
  	radius = radius || 1;
  	radialSegments = radialSegments || 8;
  	closed = closed || false;


  	this.tubularSegments = tubularSegments;
  	this.radialSegments = radialSegments;
  	this.radius = radius;
  	this.closed = closed;

  	// expose internals
  	this.computeFrenetFrames();

  	// helper variables

  	this._vertex = new Vector3();
  	this._normal = new Vector3();
  	this._uv = new Vector2();
  	this._P = new Vector3();

  	// buffer

  	const arr_vertices = new Array( (this.radialSegments + 1) * (this.tubularSegments + 1) * 3 ).fill(0);
  	const arr_normals = new Array( (this.radialSegments + 1) * (this.tubularSegments + 1) * 3 ).fill(0);
  	const arr_uvs = new Array( (this.radialSegments + 1) * (this.tubularSegments + 1) * 2 ).fill(0);

  	this._indices = new Array( this.radialSegments * this.tubularSegments * 6 ).fill(0);
  	this._vertices = new Float32BufferAttribute( arr_vertices, 3 );
  	this._normals = new Float32BufferAttribute( arr_normals, 3 );
  	this._uvs = new Float32BufferAttribute( arr_uvs, 2 );

  	// create buffer data

  	this.generateBufferData( true, true, true, false );

  	// build geometry
  	this.setIndex( this._indices );
  	this.setAttribute( 'position', this._vertices );
  	this.setAttribute( 'normal', this._normals );
  	this.setAttribute( 'uv', this._uvs );


  }

  computeFrenetFrames(){
    const frames = this.parameters.path.computeFrenetFrames( this.tubularSegments, this.closed );

  	this.tangents = frames.tangents;
  	this.normals = frames.normals;
  	this.binormals = frames.binormals;
  }



  generateBufferData( vertices = true, uvs = false, indices = false, check_normal = false ) {

    if( check_normal ){
      if( !this.normals || this.normals.length < 1 || this.normals[ 0 ].length() === 0 ){
        // normal is generated wrong, need to update
        this.computeFrenetFrames();
      }

    }

    if( vertices ){
  		for ( let i = 0; i < this.tubularSegments; i ++ ) {

  			this.generateSegment( i );

  		}

  		// if the geometry is not closed, generate the last row of vertices and normals
  		// at the regular position on the given path
  		//
  		// if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)

  		this.generateSegment( ( this.closed === false ) ? this.tubularSegments : 0 );

  		this._vertices.needsUpdate = true;
    }


    if( uvs ){

		  // uvs are generated in a separate function.
  		// this makes it easy compute correct values for closed geometries

  		this.generateUVs();

  		this._uvs.needsUpdate = true;
    }


    if( indices ){
  		// finally create faces

  		this.generateIndices();

    }

	}

  generateSegment( i ) {

		// we use getPointAt to sample evenly distributed points from the given path

		this._P = this.parameters.path.getPoint( i / this.tubularSegments, this._P );


		const N = this.normals[ i ];
		const B = this.binormals[ i ];

		// generate normals and vertices for the current segment

		for ( let j = 0; j <= this.radialSegments; j ++ ) {

			const v = j / this.radialSegments * Math.PI * 2;

			const sin = Math.sin( v );
			const cos = - Math.cos( v );

			// normal

			this._normal.x = ( cos * N.x + sin * B.x );
			this._normal.y = ( cos * N.y + sin * B.y );
			this._normal.z = ( cos * N.z + sin * B.z );
			this._normal.normalize();

			this._normals.setXYZ(
			  ( this.radialSegments + 1 ) * i + j,
			  this._normal.x, this._normal.y, this._normal.z
			);

			// vertex

			this._vertex.x = this._P.x + this.radius * this._normal.x;
			this._vertex.y = this._P.y + this.radius * this._normal.y;
			this._vertex.z = this._P.z + this.radius * this._normal.z;

      this._vertices.setXYZ(
        ( this.radialSegments + 1 ) * i + j,
        this._vertex.x, this._vertex.y, this._vertex.z
      );

		}

	}

	generateUVs() {

		for ( let i = 0; i <= this.tubularSegments; i ++ ) {

			for ( let j = 0; j <= this.radialSegments; j ++ ) {

				this._uv.x = i / this.tubularSegments;
				this._uv.y = j / this.radialSegments;

				this._uvs.setXY( ( this.radialSegments + 1 ) * i + j, this._uv.x, this._uv.y );

			}

		}

	}

	generateIndices() {

		for ( let j = 1; j <= this.tubularSegments; j ++ ) {

			for ( let i = 1; i <= this.radialSegments; i ++ ) {

				const a = ( this.radialSegments + 1 ) * ( j - 1 ) + ( i - 1 );
				const b = ( this.radialSegments + 1 ) * j + ( i - 1 );
				const c = ( this.radialSegments + 1 ) * j + i;
				const d = ( this.radialSegments + 1 ) * ( j - 1 ) + i;

				// faces
        const idx = (j - 1) * this.radialSegments + i - 1;
        this._indices[ idx * 6 ] = a;
        this._indices[ idx * 6 + 1 ] = b;
        this._indices[ idx * 6 + 2 ] = d;

        this._indices[ idx * 6 + 3 ] = b;
        this._indices[ idx * 6 + 4 ] = c;
        this._indices[ idx * 6 + 5 ] = d;

				// this.indices.push( a, b, d );
				// this.indices.push( b, c, d );

			}

		}

	}


  toJSON () {
    const data = super.toJSON();

  	data.path = this.parameters.path.toJSON();

  	return data;
  }
}


export { TubeBufferGeometry2 };
