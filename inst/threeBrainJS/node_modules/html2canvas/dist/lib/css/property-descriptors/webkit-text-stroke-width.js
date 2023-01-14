"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webkitTextStrokeWidth = void 0;
var parser_1 = require("../syntax/parser");
var IPropertyDescriptor_1 = require("../IPropertyDescriptor");
exports.webkitTextStrokeWidth = {
    name: "-webkit-text-stroke-width",
    initialValue: '0',
    type: IPropertyDescriptor_1.PropertyDescriptorParsingType.VALUE,
    prefix: false,
    parse: function (token) {
        if (parser_1.isDimensionToken(token)) {
            return token.number;
        }
        return 0;
    }
};
//# sourceMappingURL=webkit-text-stroke-width.js.map