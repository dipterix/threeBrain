"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paddingLeft = exports.paddingBottom = exports.paddingRight = exports.paddingTop = void 0;
var IPropertyDescriptor_1 = require("../IPropertyDescriptor");
var paddingForSide = function (side) { return ({
    name: "padding-" + side,
    initialValue: '0',
    prefix: false,
    type: IPropertyDescriptor_1.PropertyDescriptorParsingType.TYPE_VALUE,
    format: 'length-percentage'
}); };
exports.paddingTop = paddingForSide('top');
exports.paddingRight = paddingForSide('right');
exports.paddingBottom = paddingForSide('bottom');
exports.paddingLeft = paddingForSide('left');
//# sourceMappingURL=padding.js.map