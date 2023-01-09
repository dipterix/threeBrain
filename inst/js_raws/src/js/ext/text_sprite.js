import { Vector3, Sprite, Texture, SpriteMaterial, LinearFilter } from 'three';


class TextSprite extends Sprite {
  constructor(text = '', textHeight = 10, color = 'rgba(255, 255, 255, 1)', font_face = 'Arial') {
    super(new SpriteMaterial({ map: new Texture(), transparent:true, opacity: 0.5 }));
    this._text = text;
    this._textHeight = textHeight;
    this._color = color;

    this._fontFace = font_face;
    this._fontSize = 90; // defines text resolution
    this._fontWeight = 'normal';

    this._canvas = document.createElement('canvas');
    this._texture = this.material.map;
    this._texture.minFilter = LinearFilter;

    this._genCanvas();
  }

  get text() { return this._text; }
  set text(text) { this._text = text; this._genCanvas(); }
  get textHeight() { return this._textHeight; }
  set textHeight(textHeight) { this._textHeight = textHeight; this._genCanvas(); }
  get color() { return this._color; }
  set color(color) { this._color = color; this._genCanvas(); }
  get fontFace() { return this._fontFace; }
  set fontFace(fontFace) { this._fontFace = fontFace; this._genCanvas(); }
  get fontSize() { return this._fontSize; }
  set fontSize(fontSize) { this._fontSize = fontSize; this._genCanvas(); }
  get fontWeight() { return this._fontWeight; }
  set fontWeight(fontWeight) { this._fontWeight = fontWeight; this._genCanvas(); }


  _genCanvas() {
    const canvas = this._canvas;
    const ctx = canvas.getContext('2d');

    const font = `${this.fontWeight} ${this.fontSize}px ${this.fontFace}`;

    ctx.font = font;
    const textWidth = ctx.measureText(this.text).width;
    canvas.width = textWidth;
    canvas.height = this.fontSize;

    ctx.font = font;
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.text, 0, canvas.height);

    // Inject canvas into sprite
    this._texture.image = canvas;
    this._texture.needsUpdate = true;

    this.scale.set(this.textHeight * canvas.width / canvas.height, this.textHeight);
  }

  clone() {
    return new this.constructor(this.text, this.textHeight, this.color, this._fontFace).copy(this);
  }

  copy(source) {
    Sprite.prototype.copy.call(this, source);

    this.color = source.color;
    this.fontFace = source.fontFace;
    this.fontSize = source.fontSize;
    this.fontWeight = source.fontWeight;

    return this;
  }

}

class Sprite2 extends Sprite {
  constructor( material ) {
    super( material );

    if( material.map.isTextTexture ){
      material.map.object = this;
      // re-draw texture
      material.map.draw_text( material.map.text );
    }

  }
}

class TextTexture extends Texture {

  constructor( text, mapping, wrapS, wrapT, magFilter, minFilter, format,
    type, anisotropy, font = "Courier", size = 32
  ) {

    const canvas = document.createElement("canvas");
    super( canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

    // this._text = text || " ";
    this._size = Math.ceil( size );
    this._canvas = canvas;
    // this._canvas.height = this._size;
    // this._canvas.width = Math.ceil( this._text.length * this._size * 0.6 );
    this._context = this._canvas.getContext("2d");
    // this._context.font = `${this._size}px ${font}`;
    // this._context.fillText( this._text, 0, this._size * 26 / 32);
    this._font = font;
		// this.needsUpdate = true;
		this.isTextTexture = true;
		this.object = null;

		this.draw_text( text );

	}

	update_scale( v ) {
	  if( this.object && typeof this.object === "object" &&
        this.object.isSprite === true )
    {
      if( v ){
        this.object.scale.z = v;
      }
      const base_scale = this.object.scale.z;
      this.object.scale.x = this._text.length * 0.6 * this.object.scale.z;
      this.object.scale.y = 1 * this.object.scale.z;
    }
	}

  // align (0: center, 1: left, 2: right, 3: based on "-" or center)
	draw_text( text, more_args = {} ){

    this.text = text || "";

    // color = "#000000", shadow_color = "#FFFFF", shadow_blur = 4
    this._align = more_args.align || "smart";
    this._color = more_args.color || this._color || "#000000";
    this._shadow_color = more_args.shadow_color || this._shadow_color || "#FFFFFF";
    this._shadow_blur = more_args.shadow_blur ||
                              typeof this._shadow_blur === "undefined" ? 4 : this._shadow_blur;

    if( this.object && typeof this.object === "object" &&
        this.object.isSprite === true )
    {
  	  switch ( this._align ) {
  	    case 'left':
  	      this.object.center.x = 0.5 / this.text.length;
  	      break;
  	    case 'center':
  	      this.object.center.x = 0.5;
  	      break;
  	    case 'right':
  	      this.object.center.x = 1.0 - 0.5 / this.text.length;
  	      break;
  	    case 'smart':
  	      // find the first '-'
  	      const dash = this.text.indexOf("-");
  	      if( dash >= 0 ){
  	        this.object.center.x = dash * 0.5 / this.text.length;
  	      } else {
  	        this.object.center.x = 0.5;
  	      }
  	      break;
  	    default:
  	      // do nothing
  	  }
    }
	  this._text = this.text;

    this._canvas.width = Math.ceil( this._text.length * this._size * 0.6 );
    this._canvas.height = this._size;
    // this._context.clearRect( 0 , 0 , this._canvas.width , this._canvas.height );
    this._context.fillStyle = 'rgba( 0, 0, 0, 0 )';
    this._context.fillRect( 0 , 0 , this._canvas.width , this._canvas.height );
    this._context.font = `${this._size}px ${this._font}`;
    this._context.fillStyle = this._color;
    this._context.shadowBlur = this._shadow_blur || 0;
    this._context.shadowColor = this._shadow_color;
    this._context.fillText(this._text, 0, this._size * 26 / 32);
    this.needsUpdate = true;

    this.update_scale();

	}

}




export { TextSprite, Sprite2, TextTexture };
