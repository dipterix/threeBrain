import { AbstractThreeBrainObject } from './abstract.js';
import { Curve, Vector3, MeshLambertMaterial, Mesh } from 'three';
import { to_array, min2, sub2 } from '../utils.js';
import { TubeBufferGeometry2 } from '../ext/geometries/TubeBufferGeometry2.js';

// construct curve
function CustomLine( targets ) {
	Curve.call( this );
	this.targets = targets;
	this._cached = targets.map((v) => {
	  return(new Vector3());
	});
}
CustomLine.prototype = Object.create( Curve.prototype );
CustomLine.prototype.constructor = CustomLine;
CustomLine.prototype.getPoint = function ( t, optionalTarget ) {
  const tp = optionalTarget || new Vector3();
	tp.x = this.targets[0].x * (1.0 - t) + this.targets[1].x * t;
  tp.y = this.targets[0].y * (1.0 - t) + this.targets[1].y * t;
  tp.z = this.targets[0].z * (1.0 - t) + this.targets[1].z * t;
  return( tp );
};
CustomLine.prototype._changed = function() {

  return(this.targets.every((v, ii) => {
    const _c = this._cached[ii];
    if( _c && _c.isVector3 ){
      if( v.equals(_c) ){
        return(true);
      }
      this._cached[ii].copy( v );
    } else {
      this._cached[ii] = v.clone();
    }

    return( false );

  }));

};


class TubeMesh extends AbstractThreeBrainObject {

  constructor(g, canvas){

    super( g, canvas );
    // this._params is g
    // this.name = this._params.name;
    // this.group_name = this._params.group.group_name;

    this.type = 'TubeMesh';
    this.isTubeMesh = true;

    this.radius = g.radius || 0.4;
    this.tubularSegments = g.tubular_segments || 3;
    this.radialSegments = g.radial_egments || 6;
    this.is_closed = g.is_closed || false;

    this.path_names = g.paths;

    // TODO: validate paths
    let t1;
    this._targets = this.path_names.map((name) => {
      t1 = canvas.threebrain_instances.get( name );
      if( t1 && t1.isThreeBrainObject ){
        return( t1 );
      } else {
        throw( `Cannot find object ${ name }.` );
      }
    });
    this._target_positions = [
      this._targets[0].world_position,
      this._targets[1].world_position
    ];




    this._curve = new CustomLine( this._target_positions );

    this._geometry = new TubeBufferGeometry2( this._curve, this.tubularSegments,
                                              this.radius, this.radialSegments, this.is_closed );

    this._material = new MeshLambertMaterial();

    this.object = new Mesh( this._geometry, this._material );
    this._mesh = this.object;


    this._geometry.name = 'geom_tube2_' + g.name;
    this._mesh.name = 'mesh_tube2_' + g.name;

    // cache
  	this._cached_position = [];

  }


  finish_init(){

    super.finish_init();

    // data cube 2 must have groups and group parent is scene
    let gp = this.get_group_object();
    // Move gp to global scene as its center is always 0,0,0
    gp.remove( this.object );
    this._canvas.scene.add( this.object );

  }

  dispose(){
    this._targets.length = 0;
    this._mesh.material.dispose();
    this._mesh.geometry.dispose();
  }


  pre_render(){

    if( this.object ){
      this._targets.forEach( (v, ii) => {
        if( v._last_rendered !== results.elapsed_time ){
          v.get_world_position();
        }
      } );

      /*
      if(
        this._cached_position[0] !== this._target_positions[0] ||
        this._cached_position[1] !== this._target_positions[1]
      ) {
        // position changed
      }
      */

      // update positions
      this._geometry.generateBufferData( true, false, false, true );
    }
  }


}


function gen_tube(g, canvas){
  return( new TubeMesh(g, canvas) );
}


export { gen_tube };


