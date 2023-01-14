"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOpacityEffect = exports.isClipEffect = exports.isTransformEffect = exports.OpacityEffect = exports.ClipEffect = exports.TransformEffect = void 0;
var TransformEffect = /** @class */ (function () {
    function TransformEffect(offsetX, offsetY, matrix) {
        this.type = 0 /* TRANSFORM */;
        this.target = 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.matrix = matrix;
    }
    return TransformEffect;
}());
exports.TransformEffect = TransformEffect;
var ClipEffect = /** @class */ (function () {
    function ClipEffect(path, target) {
        this.type = 1 /* CLIP */;
        this.target = target;
        this.path = path;
    }
    return ClipEffect;
}());
exports.ClipEffect = ClipEffect;
var OpacityEffect = /** @class */ (function () {
    function OpacityEffect(opacity) {
        this.type = 2 /* OPACITY */;
        this.target = 2 /* BACKGROUND_BORDERS */ | 4 /* CONTENT */;
        this.opacity = opacity;
    }
    return OpacityEffect;
}());
exports.OpacityEffect = OpacityEffect;
var isTransformEffect = function (effect) {
    return effect.type === 0 /* TRANSFORM */;
};
exports.isTransformEffect = isTransformEffect;
var isClipEffect = function (effect) { return effect.type === 1 /* CLIP */; };
exports.isClipEffect = isClipEffect;
var isOpacityEffect = function (effect) { return effect.type === 2 /* OPACITY */; };
exports.isOpacityEffect = isOpacityEffect;
//# sourceMappingURL=effects.js.map