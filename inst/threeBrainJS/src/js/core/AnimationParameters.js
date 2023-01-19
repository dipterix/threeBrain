import { EventDispatcher, Clock, Vector3 } from 'three';

class AnimationParameters extends EventDispatcher {
  constructor () {
    super();
    this._eventDispatcher = new EventDispatcher();
    this.object = {
      'Play/Pause' : false,
      'Time' : 0,
      'Speed' : 1
    }
    this.exists = false;
    this.min = 0;
    this.max = 0;
    this.loop = true;
    this.display = '[None]';
    this.threshold = '[None]';

    this._clock = new Clock();
    this.oldTime = 0;
    this.clockDelta = 0;

    this.userData = {
      objectFocused : {
        enabled : false,
        position : new Vector3(),
        templateMapping : {}
      }
    };
  }
  get play() {
    return this.object[ 'Play/Pause' ];
  }
  get time() {
    return this.object[ 'Time' ];
  }
  get speed() {
    return this.object[ 'Speed' ];
  }
  get renderLegend() {
    return this.object[ 'Show Legend' ] ?? true;
  }

  get renderTimestamp () {
    return this.object['Show Time'] ?? false;
  }

  set time ( v ) {
    if( typeof v !== "number" ) {
      v = this.min;
    } else {
      if( v < this.min ) {
        v = this.min;
      } else if( v > this.max ) {
        v = v - this.max + this.min;
        if( v > this.max ) {
          v = this.min;
        }
      }
    }
    this.object[ 'Time' ] = v;
    this._eventDispatcher.dispatchEvent({
      type : "animation.time.onChange",
      value : v
    })
  }

  dispose() {
    this._clock.stop();
  }

  get elapsedTime () {
    return (this.time - this.oldTime) / 1000;
  }

  get trackPosition () {
    return this.time - this.min;
  }

  incrementTime () {
    // tok clock anyway

    const clockDelta = this._clock.getDelta();
    this.oldTime = this.time;

    if( !this.exists ) {
      this.clockDelta = 0;
      this.currentTime = 0;
      return false;
    }

    this.clockDelta = clockDelta;

    // update time
    if( this.play ) {
      this.time = this.oldTime + this.clockDelta * this.speed;
      return true;
    }
    return false;


  }

}

export { AnimationParameters };
