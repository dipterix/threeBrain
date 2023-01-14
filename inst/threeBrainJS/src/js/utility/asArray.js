function asArray(x){
  if( x === undefined || x === null ){
    return([]);
  }

  if( Array.isArray(x) ){
    return( x );
  }

  if(typeof(x) !== 'object'){
    return( [x] );
  }


  if( x instanceof Map ){
    return( [...x.values()] );
  }

  if( Object.prototype.toString.call(x) === "[object Map Iterator]" ) {
    return( [...x] );
  }

  return( Object.values(x) );
};


export { asArray };
