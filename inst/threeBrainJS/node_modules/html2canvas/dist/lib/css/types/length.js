"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLength = void 0;
var tokenizer_1 = require("../syntax/tokenizer");
var isLength = function (token) {
    return token.type === tokenizer_1.TokenType.NUMBER_TOKEN || token.type === tokenizer_1.TokenType.DIMENSION_TOKEN;
};
exports.isLength = isLength;
//# sourceMappingURL=length.js.map