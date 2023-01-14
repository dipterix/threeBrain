import { Color } from 'three';

function asColor( hex, c ) {

  if( !c || (typeof c !== 'object') || !c.isColor ) {
    throw TypeError('asColor: c must be a THREE.Color');
  }

  if( typeof hex === 'object' && hex ) {

    // assume hex = { r: ?, g: ?, b: ? }
    return c.copy( hex );

  }

  if( typeof hex === 'number' ) {

    // e.g.: hex = 0xccff99
    return c.set( hex );

  }

  if( typeof hex === 'string' ) {
    if ( hex.indexOf('#') !== 0 ) {
        hex = "#" + hex;
    }
    if ( hex.length > 7 ) {
      hex = hex.slice( 0 , 7 );
    }
    return c.setStyle( hex );
  }

  if( Array.isArray( hex ) ) {
    c.fromArray( hex );
    if ( hex.some( v => { return v > 1 ; }) ) {
      c.multiplyScalar( 1/ 255 );
    }
    return c;
  }

  throw TypeError('asColor: unknown input type.');
}


function invertColor ( c ) {

  c.r = 1 - c.r;
  c.g = 1 - c.g;
  c.b = 1 - c.b;

  return c;

};

// returns 0 for darkest dark and 1 for whitest white
function colorLuma ( c ) {
  // per ITU-R BT.709 ( if color luma < 0.4, then it's too dark?)

  // https://contrastchecker.online/color-relative-luminance-calculator
  const r = c.r <= 0.03928 ? c.r / 12.92 : ((c.r+0.055)/1.055) ^ 2.4;
  const g = c.g <= 0.03928 ? c.g / 12.92 : ((c.g+0.055)/1.055) ^ 2.4;
  const b = c.b <= 0.03928 ? c.b / 12.92 : ((c.b+0.055)/1.055) ^ 2.4;

  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export { asColor , invertColor, colorLuma };
