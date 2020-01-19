
class AbstractThreeBrainObject {
  constructor(g, canvas){
    this._params = g;
    this._canvas = canvas;
    this.type = 'AbstractThreeBrainObject';
    this.isThreeBrainObject = true;
    this.name = g.name;
    if( typeof g.group === 'object' ){
      this.group_name = g.group.group_name;
    }

  }

  warn( s ){
    console.warn(this._name + ' ' + s);
  }

  dispose(){
    this.warn('method dispose() not implemented...');
  }

  get_track_data( track_name, reset_material ){
    this.warn('method get_track_data(track_name, reset_material) not implemented...');
  }

  pre_render( results ){
    // usually does nothing
  }

  add_track_data( track_name, data_type, value, time_stamp = 0 ){

  }
}

export { AbstractThreeBrainObject };
