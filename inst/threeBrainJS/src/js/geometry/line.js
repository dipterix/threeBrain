import { CONSTANTS } from '../core/constants.js';
import { AbstractThreeBrainObject } from './abstract.js';
import { Vector3, Color, Mesh, DoubleSide, VertexColors, InstancedBufferAttribute } from 'three';
import { LineSegments2 } from '../jsm/lines/LineSegments2.js';
import { LineMaterial } from '../jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from '../jsm/lines/LineSegmentsGeometry.js';
import { to_array } from '../utils.js';

const tmp_vec3 = new Vector3();
const tmp_col = new Color();

function get_line_segments_singleton ( canvas ) {

  if( canvas.singletons.has(CONSTANTS.SINGLETONS["line-segments"]) ) {
    return( canvas.singletons.get(CONSTANTS.SINGLETONS["line-segments"]) );
  }
  const singleton = new LineSegmentsSingleton(canvas);
  canvas.singletons.set(CONSTANTS.SINGLETONS["line-segments"], singleton);
  canvas.add_to_scene( singleton.mesh, true );

  return( singleton );
}

class LineSegmentsSingleton {

  ensure_nvertices( len ) {

    if( this.vertex_positions.length < len * 3 ) {
      // this._reset_attributes = true;
      let tmp = this.vertex_positions;
      this.vertex_positions = new Float32Array( len * 3 * 2 );
      this.vertex_positions.set( tmp );

      tmp = this.vertex_colors;
      this.vertex_colors = new Float32Array( len * 3 * 2 );
      this.vertex_colors.set( tmp );


      tmp = this.line_widths;
      this.line_widths = new Float32Array( len * 2 );
      this.line_widths.set( tmp );

      this.geometry.setPositions( this.vertex_positions );
      this.geometry.setColors( this.vertex_colors );
      this.geometry.setAttribute(
        "linewidth",
        new InstancedBufferAttribute(this.line_widths, 1));
      // this.geometry.setDrawRange( 0, this.nvertices );
      this.needsUpdate = true;
    }
  }

  constructor (canvas) {

    this._canvas = canvas;
    this._segments = [];
    this.vertex_positions = new Float32Array( 1500 );
    this.vertex_colors = new Float32Array( 1500 );
    this.line_widths = new Float32Array( 500 );
    this.nvertices = 0;
    this.geometry = new LineSegmentsGeometry();
    this.geometry.setPositions( this.vertex_positions );
    this.geometry.setColors( this.vertex_colors );

    this.geometry.setAttribute(
        "linewidth",
        new InstancedBufferAttribute(this.line_widths, 1));
    this.needsUpdate = false;
    // this.geometry.setDrawRange( 0, 0 );

    this.material = new LineMaterial({
      // color: 0x0000ff,
      vertexColors: true,
      // depthTest: false,
      dashed: false,
      worldUnits: false,
      linewidth: 1,
      // side: DoubleSide,
      alphaToCoverage: false,

      onBeforeCompile: (shader) => {
        shader.vertexShader = `
          ${shader.vertexShader}
        `.replace(`uniform float linewidth;`, `attribute float linewidth;`);
      }
    });


    this.mesh = new LineSegments2( this.geometry, this.material );
    this.mesh.computeLineDistances();

    this.material.resolution.set(
      this._canvas.client_width || window.innerWidth,
      this._canvas.client_height || window.innerHeight
    );

  }

  add_segment( inst ) {

    if( !inst.isLineSegmentMesh ) {
      throw "Can only add LineSegmentMesh instances to segment singleton";
    }
    const nverts = inst._nvertices;
    if( nverts <= 1 ) {
      throw "Cannot insert a line segment with less than 2 vertices";
    }
    const buff_starts = this.nvertices;

    this.ensure_nvertices( this.nvertices + nverts );

    // add inst to _segments
    this._segments.push( inst );

    // fill with 0 for both colors and vertices

    for( let i = this.nvertices; i < this.nvertices + nverts; i++ ) {

      // set segment positions
      this.vertex_positions[ 3 * i ] = 0;
      this.vertex_positions[ 3 * i + 1 ] = 0;
      this.vertex_positions[ 3 * i + 2 ] = 0;

      // set colors
      this.vertex_colors[ 3 * i ] = 0;
      this.vertex_colors[ 3 * i + 1 ] = 0;
      this.vertex_colors[ 3 * i + 2 ] = 0;

      // set line widths
      this.line_widths[ i ] = 0;

    }

    this.nvertices = this.nvertices + nverts;
    const buff_ends = this.nvertices;

    inst._buffer_starts = buff_starts;
    inst._buffer_ends = buff_ends;

    // this.geometry.setDrawRange( 0, buff_ends );

    return([ buff_starts, buff_ends ]);
  }

  dispose() {
    this.disposed = true;
    this.mesh.removeFromParent();
    this._segments.length = 0;
    this.geometry.dispose();
    this.material.dispose();
    this.vertex_positions = null;
    this.vertex_colors = null;
    if( this._canvas.singletons.has(CONSTANTS.SINGLETONS["line-segments"]) ) {
      this._canvas.singletons.delete(CONSTANTS.SINGLETONS["line-segments"]);
    }
  }

  update_segments() {

    this._segments.forEach((s) => {
      s.compute_vertices();
    });

  }

  pre_render() {
    super.pre_render();
    if( this.disposed ) { return; }
    this.material.resolution.set(
    	this._canvas.client_width || window.innerWidth,
      this._canvas.client_height || window.innerHeight
    );

    if( this.needsUpdate ) {
      this.mesh.computeLineDistances();
      this.geometry.attributes.instanceStart.needsUpdate = true;
      this.geometry.attributes.instanceEnd.needsUpdate = true;
      this.geometry.attributes.instanceColorStart.needsUpdate = true;
      this.geometry.attributes.instanceColorEnd.needsUpdate = true;
      this.geometry.attributes.linewidth.needsUpdate = true;
    }
  }

}

// shouldn't call it a mesh, but whatever, I'm already here

class LineSegmentMesh extends AbstractThreeBrainObject {

  compute_vertices() {

    const bstarts = this._buffer_starts;
    if( bstarts < 0 ) { return; }

    const vpositions = this._singleton.vertex_positions;
    const vcolors = this._singleton.vertex_colors;
    const lwidths = this._singleton.line_widths;

    if( this.valid ) {
      if( this.isDynamic ) {

        for( let ii = 0; ii < this._anchors.length; ii++ ){
          const buff_pos = bstarts + ii;

          const anchor = this._anchors[ii];
          if( anchor.type === "dynamic" ) {
            anchor.linked_to.object.getWorldPosition( tmp_vec3 );
          } else {
            tmp_vec3.fromArray( anchor.linked_to );
          }

          vpositions[ buff_pos * 3 ] = tmp_vec3.x;
          vpositions[ buff_pos * 3 + 1 ] = tmp_vec3.y;
          vpositions[ buff_pos * 3 + 2 ] = tmp_vec3.z;

        }

      } else {

        for( let ii = 0; ii < this._nvertices; ii++ ) {

          const buff_pos = bstarts + ii;
          vpositions[ buff_pos * 3 ] = this._vertices[ ii * 3 ];
          vpositions[ buff_pos * 3 + 1 ] = this._vertices[ ii * 3 + 1 ];
          vpositions[ buff_pos * 3 + 2 ] = this._vertices[ ii * 3 + 2 ];

        }
      }

      let color_idx = 0;
      let width_idx = 0;
      const this_vcolors = this.vertex_colors;
      const this_lwidths = this.line_widths;

      for( let ii = bstarts; ii < bstarts + this._nvertices; ii++, color_idx++, width_idx++ ){
        if( 3 * color_idx >= this_vcolors.length ) {
          color_idx = 0;
        }

        vcolors[ ii * 3 ] = this_vcolors[ color_idx * 3 ];
        vcolors[ ii * 3 + 1 ] = this_vcolors[ color_idx * 3 + 1 ];
        vcolors[ ii * 3 + 2 ] = this_vcolors[ color_idx * 3 + 2 ];


        if( width_idx >= this_lwidths.length ) {
          width_idx = 0;
        }

        lwidths[ ii / 2 ] = this_lwidths[ width_idx ];

      }

    } else {

      let j;
      for( let i = bstarts; i < bstarts + this._nvertices; i++ ) {
        for( j = 0; j < 3; j++ ) {
          vpositions[ i * 3 + j ] = 0;
          vcolors[ i * 3 + j ] = 0;
        }
      }

    }

    this._singleton.needsUpdate = true;

  }

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'LineSegmentMesh';
    this.isLineSegmentMesh = true;
    this.valid = true;
    this._singleton = get_line_segments_singleton( canvas );

    // check if the line type is static or dynamic
    // for dynamic lines, the positions must be a vectors of
    // electrode names.
    this.isDynamic = this._params.dynamic || false;

    this._anchors = [];   // only used when dynamic
    this._vertices = [];  // only used when static
    this._nvertices = this._params.vertices.length;
    this._buffer_starts = -1;
    this._buffer_ends = -1;


    const vcolors = to_array( this._params.vertex_colors || this._params.color );
    if( vcolors.length === 0 ) {
      this.vertex_colors = [0, 0, 0];
    } else {
      this.vertex_colors = new Array( vcolors.length * 3 );

      vcolors.forEach( (col, i) => {
        tmp_col.set( col );
        this.vertex_colors[ i * 3 ] = tmp_col.r;
        this.vertex_colors[ i * 3 + 1 ] = tmp_col.g;
        this.vertex_colors[ i * 3 + 2 ] = tmp_col.b;
      });
    }

    const lwidths = to_array( this._params.line_widths || this._params.width );
    if( lwidths.length === 0 ) {
      this.line_widths = [1];
    } else {
      this.line_widths = lwidths;
    }

    this._singleton.add_segment(this);


    this.reference_position = new Vector3();
    if( !this.isDynamic ) {
      const pos = to_array( this._params.position );
      if( pos.length === 3 ) {
        this.reference_position.fromArray(pos);
      }
    }

    this.finish_init();

    // Do not use object. This is not regular mesh
    this.object = null;

  }


  finish_init(){

    // super.finish_init();

    // data cube 2 must have groups and group parent is scene
    // let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    // gp.remove( this.object );
    // this._canvas.scene.add( this.object );

    if( this.isDynamic ) {
      // use _anchors
      this._params.vertices.forEach( (v, ii) => {
        if( !this.valid ) { return; }

        if( v.hasOwnProperty("subject_code") ) {
          const subject_code = v["subject_code"];
          const electrode_number = v["electrode"];

          const elist = this._canvas.electrodes.get(subject_code);

          // mark as invalid, and this line will (should) be hidden
          if( !elist ) { this.valid = false; }

          let electrode = undefined;

          for(let k in elist) {
            const elec = elist[k];
            // check if object is electrode and number matches
            if( typeof(elec) === "object" ) {
              const inst = elec.userData.instance;
              if( inst && inst.isSphere && inst._params.number === electrode_number ) {
                // this is it
                electrode = inst;
              }
            }
          }

          if( !electrode ) { this.valid = false; }
          this._anchors[ii] = {
            "type" : "dynamic",
            "linked_to" : electrode,
          };
        } else {

          const v_ = to_array( v["position"] );
          if( v_.length === 3 ) {
            this._anchors[ii] = {
              "type" : "static",
              "linked_to" : v_,
            };
          } else {
            this.valid = false;
          }

        }




      });

    } else {
      // static: this._params.vertices could be a simple array ?
      this._params.vertices.forEach( (v, ii) => {
        if( !this.valid ) { return; }

        const v_ = to_array( v );
        if( v_.length != 3 ) {
          this.valid = false;
          return;
        }
        this._vertices.push(
          v_[0], v_[1], v_[2]
        );
      });
    }


    if( !this.valid ) { return; }

    this.compute_vertices();

  }

  dispose(){
  }


  pre_render(){}


}


function gen_linesements(g, canvas){
  return( new LineSegmentMesh(g, canvas) );
}


export { gen_linesements };


