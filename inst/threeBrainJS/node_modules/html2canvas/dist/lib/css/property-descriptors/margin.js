"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marginLeft = exports.marginBottom = exports.marginRight = exports.marginTop = void 0;
var IPropertyDescriptor_1 = require("../IPropertyDescriptor");
var marginForSide = function (side) { return ({
    name: "margin-" + side,
    initialValue: '0',
    prefix: false,
    type: IPropertyDescriptor_1.PropertyDescriptorParsingType.TOKEN_VALUE
}); };
exports.marginTop = marginForSide('top');
exports.marginRight = marginForSide('right');
exports.marginBottom = marginForSide('bottom');
exports.marginLeft = marginForSide('left');
//# sourceMappingURL=margin.js.map