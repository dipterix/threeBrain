/*Make resizable div by Hung Nguyen*/
function makeResizable(elem, force_ratio = false, on_resize = (w, h) => {}, on_stop = (w, h) => {}) {
  const element = elem; // elem.querySelector('.resizable');
  const resizers = elem.querySelectorAll('.resizable .resizer');
  const minimum_size = 20;
  let original_width = 0,
      original_height = 0,
      ratio = -1;
  let original_x = 0,
      original_y = 0,
      original_mouse_x = 0,
      original_mouse_y = 0;
  let width = 0,
      height = 0;
  for (let i = 0; i < resizers.length; i++) {
    let currentResizer = resizers[i];

    let resize = (e) => {
      width = original_width + (e.pageX - original_mouse_x);
      height = original_height + (e.pageY - original_mouse_y);

      if( force_ratio ){
        if( original_width > original_height ){
          width = height / ratio;
        }else{
          height = width * ratio;
        }
      }

      width = width > minimum_size ? width : minimum_size;
      if( force_ratio ){
        height = height > (minimum_size * ratio)? height : (minimum_size*ratio);
      }else{
        height = height > minimum_size? height : minimum_size;
      }



      element.style.width = width + 'px';
      element.style.height = height + 'px';
      if (currentResizer.classList.contains('bottom-right')) {
        // do nothing
      }
      else if (currentResizer.classList.contains('bottom-left')) {
        element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
      }
      else if (currentResizer.classList.contains('top-right')) {
        element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
      }
      else {
        element.style.left = original_x + (e.pageX - original_mouse_x) + 'px';
        element.style.top = original_y + (e.pageY - original_mouse_y) + 'px';
      }

      on_resize(width, height);
    };

    let stopResize = () => {
      window.removeEventListener('mousemove', resize);
      on_stop(width, height);
    };


    currentResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      original_width = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
      original_height = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
      width = original_width;
      height = original_height;
      if( ratio <= 0 ){
        ratio = original_height / original_width;
      }

      original_x = element.getBoundingClientRect().left;
      original_y = element.getBoundingClientRect().top;
      original_mouse_x = e.pageX;
      original_mouse_y = e.pageY;
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    });

  }
}

// makeResizableDiv('.resizable')


export { makeResizable };
