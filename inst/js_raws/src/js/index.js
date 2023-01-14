/**
 * @Author: Zhengjia Wang
 * Adapter of model (threejs_scene) and viewer (htmlwidgets)
 */

// External libraries
import * as THREE from 'three';
import WebGL from './jsm/capabilities/WebGL.js'
import * as download from 'downloadjs';
import { json2csv } from 'json-2-csv';
import ClipboardJS from 'clipboard';

// Viewer class
import { CONSTANTS } from './core/constants.js';
import { ViewerWrapper } from './core/ViewerWrapper.js';
import { ViewerApp } from './core/ViewerApp.js';
import { StorageCache } from './core/StorageCache.js';
import css from '../css/dipterix.css';

/*
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
    ClipboardJS       : ClipboardJS
  }
}
*/

const Constants = CONSTANTS;
const ExternLibs = {
  THREE             : THREE,
  WebGL             : WebGL,
  json2csv          : json2csv,
  downloadjs        : download,
  ClipboardJS       : ClipboardJS
};

export { ViewerApp, ViewerWrapper, StorageCache, Constants, ExternLibs };
