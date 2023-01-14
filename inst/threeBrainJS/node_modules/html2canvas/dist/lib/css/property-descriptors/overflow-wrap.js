"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overflowWrap = exports.OVERFLOW_WRAP = void 0;
var IPropertyDescriptor_1 = require("../IPropertyDescriptor");
var OVERFLOW_WRAP;
(function (OVERFLOW_WRAP) {
    OVERFLOW_WRAP["NORMAL"] = "normal";
    OVERFLOW_WRAP["BREAK_WORD"] = "break-word";
})(OVERFLOW_WRAP = exports.OVERFLOW_WRAP || (exports.OVERFLOW_WRAP = {}));
exports.overflowWrap = {
    name: 'overflow-wrap',
    initialValue: 'normal',
    prefix: false,
    type: IPropertyDescriptor_1.PropertyDescriptorParsingType.IDENT_VALUE,
    parse: function (overflow) {
        switch (overflow) {
            case 'break-word':
                return OVERFLOW_WRAP.BREAK_WORD;
            case 'normal':
            default:
                return OVERFLOW_WRAP.NORMAL;
        }
    }
};
//# sourceMappingURL=overflow-wrap.js.map