

class CanvasEvent {
  constructor(el, container_id) {
    // el must be a DOM element, no check here
    if( el ) {
      if(! el instanceof window.HTMLElement ) {
        throw Error("CanvasEvent(el): el must be an HTMLElement.")
      }
      this._el = el;
    } else {
      this._el = document.createElement("div");
    }

    this._dispose_functions = new Map();
    this._event_buffer = new Map();
    this._container_id = container_id || this._el.getAttribute( 'data-target' );

    this.throttle = true;
    this.timeout = 100;
  }

  bind( name, evtstr, fun, target, options = false ){
    // this.bind( "event name", "click", (evt) => {...} );

    const _target = target || this._el;

    // Dispose existing function
    const _f = this._dispose_functions.get( name );
    if( typeof _f === 'function' ){
      try {
        _f();
      } catch (e) {}
      this._dispose_functions.delete( name );
    }
    this._dispose_functions.set( name, () => {
      console.debug('Calling dispose function ' + name);
      try {
        _target.removeEventListener( evtstr , fun );
      } catch (e) {
        console.warn('Unable to dispose ' + name);
      }
    });

    console.debug(`Registering event ${evtstr} (${name})`);
    _target.addEventListener( evtstr , fun, options );
  }

  unbind( name ) {
    const _f = this._dispose_functions.get( name );
    if( typeof _f === 'function' ){
      try {
        _f();
      } catch (e) {}
      this._dispose_functions.delete( name );
    }
  }

  dispose() {
    this._dispose_functions.forEach((_, _name) => {
      this.unbind(_name);
    });
    this._dispose_functions.clear();
  }

  dispatch_event( type, data, immediate = false ){

    if( typeof(type) !== "string" || type.length === 0 ) {
      throw TypeError( 'CanvasEvent.dispatch_event: Can only dispatch event with type of none-empty string' );
    }

    if( !this._event_buffer.has(type) ) {
      this._event_buffer.set(type, {
        type: type,
        throttlePause: false,
        data: data,
        dispatched: false
      });
    }
    const evt_buffer = this._event_buffer.get(type);
    evt_buffer.data = data;
    evt_buffer.dispatched = false;

    const immediate_ = this.throttle || immediate;
    if( !immediate && evt_buffer.throttlePause ) {
      // update data, but hold it
      return;
    }

    evt_buffer.throttlePause = true;

    const do_dispatch = () => {
      evt_buffer.throttlePause = false;
      if( evt_buffer.dispatched ) { return; }

      // fire event with the newest data
      const event = new CustomEvent(
        evt_buffer.type,
        {
          container_id: this._container_id,
          detail: evt_buffer.data
        }
      );

      // Dispatch the event.
      console.debug(`Dispatching event: ${evt_buffer.type} - ${evt_buffer.data}`);
      this._el.dispatchEvent(event);
      evt_buffer.dispatched = true;
    };

    if( immediate ) {
      do_dispatch();
    } else {
      setTimeout(() => { do_dispatch(); }, this.timeout);
    }

  }

  available_events() {
    return [...this._dispose_functions.keys()];
  }
}

export { CanvasEvent };
