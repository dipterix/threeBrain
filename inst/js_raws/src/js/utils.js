
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




// Credit David Walsh (https://davidwalsh.name/javascript-debounce-function)

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



export { invertColor, padZero, to_dict, to_array,
  get_element_size, get_or_default, debounce, min2, sub2 };




