/*
* Sprite fonts, modified from
* https://github.com/vasturiano/THREE-spritetext/blob/master/src/index.js
* Thanks vasturiano for providing the source code
*/

function add_text_sprite(THREE){

  class TextSprite extends THREE.Sprite {
    constructor(text = '', textHeight = 10, color = 'rgba(255, 255, 255, 1)', font_face = 'Arial') {
      super(new THREE.SpriteMaterial({ map: new THREE.Texture(), transparent:true, opacity: 0.5 }));
      this._text = text;
      this._textHeight = textHeight;
      this._color = color;

      this._fontFace = font_face;
      this._fontSize = 90; // defines text resolution
      this._fontWeight = 'normal';

      this._canvas = document.createElement('canvas');
      this._texture = this.material.map;
      this._texture.minFilter = THREE.LinearFilter;

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
      THREE.Sprite.prototype.copy.call(this, source);

      this.color = source.color;
      this.fontFace = source.fontFace;
      this.fontSize = source.fontSize;
      this.fontWeight = source.fontWeight;

      return this;
    }

  }

  THREE.TextSprite = TextSprite;

  return(THREE);

}


export { add_text_sprite };
