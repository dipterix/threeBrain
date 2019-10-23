import { THREE } from '../threeplugins.js';
import { to_array } from '../utils.js';

function generate_animation_default(m, track_data, cmap, animation_clips, animation_mixers) {

    // Generate keyframes
    const _time_min = cmap.time_range[0],
          _time_max = cmap.time_range[1];

    // 1. timeStamps, TODO: get from settings the time range
    const colors = [], time_stamp = [];
    to_array( track_data.time ).forEach((v) => {
      time_stamp.push( v - _time_min );
    });
    if( track_data.data_type === 'continuous' ){
      to_array( track_data.value ).forEach((v) => {
        let c = cmap.lut.getColor(v);
        colors.push( c.r, c.g, c.b );
      });
    }else{
      // discrete
      const mapping = new Map(cmap.value_names.map((v, ii) => {return([v, ii])}));
      to_array( track_data.value ).forEach((v) => {
        let c = cmap.lut.getColor(mapping.get( v ));
        if( !c ) {
          console.log( v );
          console.log( mapping.get( v ) );
        }
        colors.push( c.r, c.g, c.b );
      });
    }
    const keyframe = new THREE.ColorKeyframeTrack(
      track_data.target || '.material.color',
      time_stamp, colors, THREE.InterpolateDiscrete
    );

    return(keyframe);
}

export { generate_animation_default };
