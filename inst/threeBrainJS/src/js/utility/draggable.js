
function get_size(el){
  const width = parseFloat(getComputedStyle(el, null).getPropertyValue('width').replace('px', ''));
  const height = parseFloat(getComputedStyle(el, null).getPropertyValue('height').replace('px', ''));
  return([width, height]);
}

function makeDraggable(
  elmnt, elmnt_header,
  // top range and left range
  parent_el = undefined,
  mousedown_callback = (e, state)=>{}) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  var range = [-Infinity, Infinity, -Infinity, Infinity];
  var state = 'pan', state_old;
  var el_x, el_y;

  if ( elmnt_header ) {
    /* if present, the header is where you move the DIV from:*/
    elmnt_header.onmousedown = dragMouseDown;
    elmnt_header.oncontextmenu = right_clicked;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
    elmnt.oncontextmenu = right_clicked;
  }


  function right_clicked ( e ){
    const state_old = state;
    state = 'pan';
    dragMouseDown(e);
    state = state_old;
    return(false);
  }


  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;

    if( state === 'pan' ){
      if( parent_el ){
        // calculate range
        // parent size
        const parent_size = get_size(parent_el);
        const el_size = get_size(elmnt);
        if( parent_size[0] > el_size[0] ){
          range[1] = parent_size[0] - el_size[0];
          range[0] = 0;
        }else{
          range[0] = parent_size[0] - el_size[0];
          range[1] = 0;
        }

        if( parent_size[1] > el_size[1] ){
          range[3] = parent_size[1] - el_size[1];
          range[2] = 0;
        }else{
          range[2] = parent_size[1] - el_size[1];
          range[3] = 0;
        }
      }




      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;

      mousedown_callback(e, {
        state: 'pan'
      });
    }else{
      // get xy location and return
      el_x = elmnt.getBoundingClientRect().left;
      el_y = elmnt.getBoundingClientRect().top;

      document.onmousemove = mouseMove;

      mousedown_callback(e, {
        state : 'select',
        x     : pos3 - el_x,
        y     : pos4 - el_y
      });
    }

    document.onmouseup = closeDragElement;

  }

  function mouseMove(e) {
    if( state === 'select' && e.shiftKey ){
      pos3 = e.clientX;
      pos4 = e.clientY;
      el_x = elmnt.getBoundingClientRect().left;
      el_y = elmnt.getBoundingClientRect().top;

      mousedown_callback(e, {
        state : 'select',
        x     : pos3 - el_x,
        y     : pos4 - el_y
      });
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    let eltop = elmnt.offsetTop - pos2,
        elleft = elmnt.offsetLeft - pos1;

    if( eltop < range[0] ){ eltop = range[0]; }
    if( eltop > range[1] ){ eltop = range[1]; }
    if( elleft < range[2] ){ elleft = range[2]; }
    if( elleft > range[3] ){ elleft = range[3]; }

    elmnt.style.top = eltop + "px";
    elmnt.style.left = elleft + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }

  return((s) => {
    state = s;
  });
}


export { makeDraggable };
