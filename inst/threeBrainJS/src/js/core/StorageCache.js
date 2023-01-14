


class StorageCache {
  constructor(){
    this._d = new Map();
  }

  check_item( path ){
    return( this._d.has( path ) || this._d.get( path ) !== undefined );
  }

  get_item( path , ifnotfound = '' ){
    const re = this._d.get( path );
    if( re !== undefined ){
      return( re );
    }else{
      return( ifnotfound );
    }
  }

  set_item( path, obj ){
    this._d.set( path , obj );
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
      // Remove all
      this._d.clear();
    }else{
      paths.forEach((p) => {
        this._d.delete( p );
      });
    }
  }

}

export { StorageCache };
