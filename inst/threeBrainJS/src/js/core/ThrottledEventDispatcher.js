

class ThrottledEventDispatcher {
  constructor( $wrapper, containerID, debug = false ) {
    // el must be a DOM element, no check here
    if( $wrapper ) {
      if(! $wrapper instanceof window.HTMLElement ) {
        throw Error("new ThrottledEventDispatcher($wrapper): `$wrapper` must be an HTMLElement.")
      }
      this.$wrapper = $wrapper;
    } else {
      this.$wrapper = document.createElement("div");
    }

    this._listeners = new Map();
    this._eventBuffers = new Map();
    this.containerID = containerID || this.$wrapper.getAttribute( 'data-target' ) || this.$wrapper.id || "UnknownContainerID";

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
      this.debugVerbose( `Executing previous listener - ${ _callbackId }` );
      this._listeners.delete( _callbackId );
      if( executePrevious && typeof existingCallback === 'function' ) {
        try { existingCallback(); } catch (e) {}
      }
      this._listeners.set( _callbackId , () => {
        this.debugVerbose( `Re-registering listener - ${ _callbackId }` );
        try {
          this.$wrapper.removeEventListener( type, existingCallback );
        } catch (e) {
          console.warn('Unable to dispose listener: ' + _callbackId);
        }
        this.$wrapper.addEventListener( type , callback , options );
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
      this.$wrapper.removeEventListener( name , previousCallback );
    } catch (e) {}

  }

  dispose() {
    this._listeners.forEach( ( _ , name ) => {
      this.unbind( name );
    });
    this._listeners.clear();
  }

  dispatch({ type, data, immediate = false, muffled = false}){

    if( typeof(type) !== "string" || type.length === 0 ) {
      throw TypeError( 'ThrottledEventDispatcher.dispatch: Can only dispatch event of none-empty type' );
    }

    // whether to fire event right now
    const immediate_ = !this.throttle || immediate;

    let buffer, exists = false;
    if( !this._eventBuffers.has( type ) ) {
      buffer = {
        type: type,

        // make sure doDispatch only called once
        throttlePause: false,
        data: data,
        muffled: muffled,
        dispatched: false
      }
      if( !immediate_ ) {
        this._eventBuffers.set( type , buffer );
      }
    } else {
      buffer = this._eventBuffers.get( type );
      buffer.data = data;
      buffer.muffled = muffled;
      buffer.dispatched = false;
      exists = true;
    }

    if( immediate_ ) {
      buffer.dispatched = true;
      buffer.throttlePause = false;

      // if( exists ) { try { this._eventBuffers.delete( type ); } catch (e) {} }

      const event = new CustomEvent(
        buffer.type,
        {
          containerID : this.containerID,
          container_id: this.containerID,  // compatible
          detail: buffer.data
        }
      );

      // Dispatch the event.
      if( !buffer.muffled ) {
        this.debugVerbose(`[${ this.constructor.name }] is dispatching an immediate event: ${ buffer.type }`);
      }
      this.$wrapper.dispatchEvent(event);

      return;
    }

    // the followings are for throttled
    if( buffer.throttlePause ) {
      // update data, but hold it
      return;
    }

    buffer.throttlePause = true;

    const doDispatch = () => {

      const data = buffer.data;

      // remove buffer. It's ok if this operation fails
      // buffer.dispatched=true will prevent buffer from being fired again
      // this operation is to release memory

      // try { this._eventBuffers.delete( type ); } catch (e) {}

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
      if( !buffer.muffled ) {
        this.debugVerbose(`[${ this.constructor.name }] is dispatching an throttled event: ${ buffer.type }`);
      }
      this.$wrapper.dispatchEvent(event);

    };

    setTimeout(() => { doDispatch(); }, this.timeout );

  }

  availableEventNames() {
    return [ ...this._listeners.keys() ];
  }

  debugVerbose( message ) {
    if( this.debug ) {
      console.debug( message )
    }
  }
}

export { ThrottledEventDispatcher };
