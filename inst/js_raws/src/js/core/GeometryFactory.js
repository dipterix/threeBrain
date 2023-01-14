import { gen_sphere, is_electrode } from '../geometry/sphere.js';
import { gen_datacube } from '../geometry/datacube.js';
import { gen_datacube2 } from '../geometry/datacube2.js';
import { gen_tube } from '../geometry/tube.js';
import { gen_free } from '../geometry/free.js';
import { gen_linesements } from '../geometry/line.js';


const GeometryFactory = {
  'sphere'    : gen_sphere,
  'free'      : gen_free,
  'datacube'  : gen_datacube,
  'datacube2' : gen_datacube2,
  'tube'      : gen_tube,
  'linesegments' : gen_linesements,
  'blank'     : (g, canvas) => { return(null) }
}


export { GeometryFactory };
