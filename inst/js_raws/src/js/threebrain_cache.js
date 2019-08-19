


class THREEBRAIN_STORAGE {
  constructor(){
    this._d = {};
  }

  check_item( path ){
    return( this._d.hasOwnProperty( path ) || this._d[ path ] !== undefined );
  }

  get_item( path , ifnotfound = '' ){
    if(this.check_item( path )){
      return( this._d[ path ] );
    }else{
      return( ifnotfound );
    }
  }

  set_item( path, obj ){
    this._d[ path ] = obj;
  }

  get_hash( path ){
    var hash = 0;
    var s = this.get_item( path );
    var i, chr;
    if (s.length === 0) return hash;
    for (i = 0; i < s.length; i++) {
      chr   = s.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash;
  }

  clear_items( paths ){
    if( paths === undefined ){
      paths = Object.keys( this._d );
    }
    paths.forEach((p) => {
      if( this.check_item( p ) ){
        this._d[ p ] = undefined;
      }
    });
  }

}

export { THREEBRAIN_STORAGE };
