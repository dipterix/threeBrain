/* JS to shiny callbacks

This file defines shiny callback functions (js to shiny)
*/

function storageAvailable(type) {
  try {
    var storage = window[type],
        x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  }
  catch(e) {
    return e instanceof DOMException && (
        // everything except Firefox
        e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === 'QuotaExceededError' ||
        // Firefox
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage.length !== 0;
  }
}

class THREE_BRAIN_SHINY {
  constructor(outputId, shiny_mode = true) {

    this.outputId = outputId;
    this.shiny_mode = shiny_mode;
  }

  set_token( token ){
    if(storageAvailable('localStorage') && typeof(token) === 'string'){
      this.token = token;
    }
  }

  to_shiny(data, method = 'callback'){
    // method won't be checked, assuming string
    // Callback ID will be outputId_callbackname

    let time_stamp = new Date();
    let re = {...data, '.__timestamp__.': time_stamp};
    let callback_id = this.outputId + '_' + method;

    if(this.shiny_mode){
      Shiny.onInputChange(callback_id, re);
    }

    // Add RAVE support
    if(typeof(this.token) === 'string'){
      // Get item and set back
      // let rave_msg = window.localStorage.getItem('rave-messages');
      let msg = {
        'token' : this.token,           // Used by RAVE to tell differences
        'item_id' : this.outputId,      // UI output ID
        'message_type' : 'threeBrain',               // potentially used by session to communicate (not yet supported)
        'method' : method,
        'callback_id' : callback_id,
        'time_stamp' : Date.now(),      //
        'content' : re                  // Actuall data
      };

      window.localStorage.setItem('rave-messages', JSON.stringify(msg));
    }


  }

}

export { THREE_BRAIN_SHINY };
// window.THREE_BRAIN_SHINY = THREE_BRAIN_SHINY;
