function vector3ToString(v, ifInvalid = "", precision = 2){
  if( !v ){ return( ifInvalid ); }
  if( Array.isArray(v) && v.length >= 3 ){
    return(`${v[0].toFixed(precision)}, ${v[1].toFixed(precision)}, ${v[2].toFixed(precision)}`)
  }
  if( v.isVector3 ){
    return(`${v.x.toFixed(precision)}, ${v.y.toFixed(precision)}, ${v.z.toFixed(precision)}`)
  }
  return( ifInvalid );
}

export { vector3ToString };
