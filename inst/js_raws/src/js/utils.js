
const invertColor = function(hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    // invert color components
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return '#' + padZero(r) + padZero(g) + padZero(b);
};

const padZero = function(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
};

const to_dict = function(x, keys){

  if(typeof(x) !== 'object'){
    x = [x];
  }
  if(x === null){
    return({});
  }
  x = {...x};
  if(keys !== undefined){
    old_keys = Object.keys(x);
    let y = {};

    [...old_keys.keys()].forEach((ii) => {y[keys[ii]] = x[old_keys[ii]]});

    x = y;
  }

  return(x);
};

const to_array = function(x){
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

const min2 = function(x, init = -Infinity){
  if(x.length === 0){
    return( init );
  }
  let re = Infinity;
  for(let i in x){
    let tmp = x[i];
    if( Array.isArray(tmp) ){
      tmp = min2(tmp, re, true);
    }
    if( tmp < re ){
      re = tmp;
    }
  }
  return( re );
};

const max2 = function(x, init = Infinity){
  if(x.length === 0){
    return( init );
  }
  let re = -Infinity;
  for(let i in x){
    let tmp = x[i];
    if( Array.isArray(tmp) ){
      tmp = max2(tmp, re, true);
    }
    if( tmp > re ){
      re = tmp;
    }
  }
  return( re );
};

const sub2 = function(x, val){
  for(let i in x){
    let tmp = x[i];
    if( Array.isArray(tmp) ){
      sub2(tmp, val);
    } else {
      x[i] = tmp - val;
    }
  }
  return( x );
}

function get_element_size(el){
  const width = parseFloat(getComputedStyle(el, null).getPropertyValue('width').replace('px', ''));
  const height = parseFloat(getComputedStyle(el, null).getPropertyValue('height').replace('px', ''));
  return([width, height]);
}

function get_or_default(map, key, _default = undefined){
  if( map.has( key ) ){
    return( map.get(key) );
  }else{
    map.set( key, _default );
    return( _default );
  }
}

function vec3_to_string(v, ifInvalid = ""){
  if( !v ){ return( ifInvalid ); }
  if( Array.isArray(v) ){
    return(`${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}`)
  }
  if( v.isVector3 ){
    return(`${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`)
  }
  return( ifInvalid );
}


function throttle_promise(){
  let blocked = false;

  const new_promise = (f) => {
    if( blocked ){ return; }
    blocked = true;
    const p = new Promise((resolve, reject) => {
      try {
        f(resolve, reject);
      } catch (e) {}
      blocked = false;
    });
    return( p );
  };

  return( new_promise );

}


// Credit: David Walsh (https://davidwalsh.name/javascript-debounce-function)

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout;

  // This is the function that is actually executed when
  // the DOM event is triggered.
  return function executedFunction() {
    // Store the context of this and any
    // parameters passed to executedFunction
    var context = this;
    var args = arguments;

    // The function to be called after
    // the debounce time has elapsed
    var later = function() {
      // null timeout to indicate the debounce ended
      timeout = null;

      // Call function now if you did not on the leading end
      if (!immediate) func.apply(context, args);
    };

    // Determine if you should call the function
    // on the leading or trail end
    var callNow = immediate && !timeout;

    // This will reset the waiting every function execution.
    // This is the step that prevents the function from
    // being executed because it will never reach the
    // inside of the previous setTimeout
    clearTimeout(timeout);

    // Restart the debounce waiting period.
    // setTimeout returns a truthy value (it differs in web vs node)
    timeout = setTimeout(later, wait);

    // Call immediately if you're dong a leading
    // end execution
    if (callNow) func.apply(context, args);
  };
};


// source: https://github.com/mrdoob/three.js/blob/790811db742ea9d7c54fe28f83865d7576f14134/examples/jsm/loaders/RGBELoader.js#L352-L396
const float_to_int32 = ( function () {

	// Source: http://gamedev.stackexchange.com/questions/17326/conversion-of-a-number-from-single-precision-floating-point-representation-to-a/17410#17410

	var floatView = new Float32Array( 1 );
	var int32View = new Int32Array( floatView.buffer );

	/* This method is faster than the OpenEXR implementation (very often
	 * used, eg. in Ogre), with the additional benefit of rounding, inspired
	 * by James Tursa?s half-precision code. */
	function toHalf( val ) {

		floatView[ 0 ] = val;
		var x = int32View[ 0 ];

		var bits = ( x >> 16 ) & 0x8000; /* Get the sign */
		var m = ( x >> 12 ) & 0x07ff; /* Keep one extra bit for rounding */
		var e = ( x >> 23 ) & 0xff; /* Using int is faster here */

		/* If zero, or denormal, or exponent underflows too much for a denormal
		 * half, return signed zero. */
		if ( e < 103 ) return bits;

		/* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
		if ( e > 142 ) {

			bits |= 0x7c00;
			/* If exponent was 0xff and one mantissa bit was set, it means NaN,
					 * not Inf, so make sure we set one mantissa bit too. */
			bits |= ( ( e == 255 ) ? 0 : 1 ) && ( x & 0x007fffff );
			return bits;

		}

		/* If exponent underflows but not too much, return a denormal */
		if ( e < 113 ) {

			m |= 0x0800;
			/* Extra rounding may overflow and set mantissa to 0 and exponent
			 * to 1, which is OK. */
			bits |= ( m >> ( 114 - e ) ) + ( ( m >> ( 113 - e ) ) & 1 );
			return bits;

		}

		bits |= ( ( e - 112 ) << 10 ) | ( m >> 1 );
		/* Extra rounding. An overflow will set mantissa to 0 and increment
		 * the exponent, which is OK. */
		bits += m & 1;
		return bits;

	}

	return toHalf;

} )();



export { invertColor, padZero, to_dict, to_array,
  get_element_size, get_or_default, debounce, min2,
  sub2, float_to_int32, vec3_to_string, throttle_promise };




