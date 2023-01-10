

class ThrottledEventDispatcher {
  constructor( $el, containerID, debug = false ) {
    // el must be a DOM element, no check here
    if( $el ) {
      if(! $el instanceof window.HTMLElement ) {
        throw Error("new ThrottledEventDispatcher($el): `$el` must be an HTMLElement.")
      }
      this.$el = $el;
    } else {
      this.$el = document.createElement("div");
    }

    this._listeners = new Map();
    this._eventBuffers = new Map();
    this.containerID = containerID || this.$el.getAttribute( 'data-target' );

    this.throttle = true;
    this.timeout = 100;
    this.debug = debug;
  }

  bind( type, callback, { name, options = false, executePrevious = false } = {}) {

    let _callbackId = name;

    if( typeof _callbackId !== "string" ) {
      _callbackId = type;
    }

    if( this._listeners.has( _callbackId ) ) {
      const existingCallback = this._listeners.get( _callbackId );
      if( this.debug ) {
        console.debug( `Executing previous listener - ${ _callbackId }` );
      }
      this._listeners.delete( _callbackId );
      if( executePrevious && typeof existingCallback === 'function' ) {
        try { existingCallback(); } catch (e) {}
      }
      this._listeners.set( _callbackId , () => {
        if( this.debug ) {
          console.debug( `Re-registering listener - ${ _callbackId }` );
        }
        try {
          this.$el.removeEventListener( type, existingCallback );
        } catch (e) {
          console.warn('Unable to dispose listener: ' + _callbackId);
        }
        this.$el.addEventListener( type , callback , options );
      })

    }

  }

  unbind( name, { executePrevious = false } = {} ) {
    if( !this._listeners.has( name ) ) { return; }
    const previousCallback = this._listeners.get( name );
    this._listeners.delete( name );

    if( typeof previousCallback !== 'function' ) { return; }
    if( executePrevious ) {
      try { previousCallback(); } catch (e) {}
    }

    try {
      this.$el.removeEventListener( name , previousCallback );
    } catch (e) {}

  }

  dispose() {
    this._listeners.forEach( ( _ , name ) => {
      this.unbind( name );
    });
    this._listeners.clear();
  }

  dispatch( type, data, immediate = false ){

    if( typeof(type) !== "string" || type.length === 0 ) {
      throw TypeError( 'ThrottledEventDispatcher.dispatch: Can only dispatch event of none-empty type' );
    }

    let buffer;
    if( !this._eventBuffers.has( type ) ) {
      buffer = {
        type: type,

        // make sure doDispatch only called once
        throttlePause: false,
        data: data,
        dispatched: false
      }
      this._eventBuffers.set( type , buffer );
    } else {
      buffer = this._eventBuffers.get( type );
      buffer.data = data;
      buffer.dispatched = false;
    }

    // whether to fire event right now
    const immediate_ = !this.throttle || immediate;

    if( !immediate_ && buffer.throttlePause ) {
      // update data, but hold it
      return;
    }

    buffer.throttlePause = true;

    const doDispatch = () => {

      const data = buffer.data;

      buffer.throttlePause = false;
      if( buffer.dispatched ) { return; }
      buffer.dispatched = true;

      // fire event with the newest data
      const event = new CustomEvent(
        buffer.type,
        {
          containerID : this.containerID,
          container_id: this.containerID,  // compatible
          detail: data
        }
      );

      // Dispatch the event.
      console.debug(`Dispatching event: ${ buffer.type }`);
      this.$el.dispatchEvent(event);

    };

    if( immediate_ ) {
      doDispatch();
    } else {
      setTimeout(() => { doDispatch(); }, this.timeout );
    }

  }

  availableEventNames() {
    return [ ...this._listeners.keys() ];
  }
}

export { ThrottledEventDispatcher };
