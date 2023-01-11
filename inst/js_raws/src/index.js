/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */

// External libraries
import * as THREE from 'three';
import WebGL from './js/jsm/capabilities/WebGL.js'
import { download } from './js/download.js';
import { json2csv } from 'json-2-csv';

// Viewer class
import { CONSTANTS } from './js/constants.js';
import { ViewerWrapper } from './js/core/ViewerWrapper.js';
import { ViewerApp } from './js/core/ViewerApp.js';
import { StorageCache } from './js/core/StorageCache.js';
import css from './css/dipterix.css';

const ThreeBrainLib = {
  ViewerApp           : ViewerApp,
  ViewerWrapper       : ViewerWrapper,
  StorageCache        : StorageCache,
  constants           : CONSTANTS,
  utils : {
    THREE             : THREE,
    WebGL             : WebGL,
    json2csv          : json2csv,
    download          : download,
  }
}


try {
  window.ThreeBrainLib = ThreeBrainLib;
} catch (e) {}

export { ThreeBrainLib };
