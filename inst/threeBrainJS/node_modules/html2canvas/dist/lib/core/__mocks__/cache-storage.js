"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheStorage = void 0;
var MockCache = /** @class */ (function () {
    function MockCache() {
        this._cache = {};
    }
    MockCache.prototype.addImage = function (src) {
        var result = Promise.resolve();
        this._cache[src] = result;
        return result;
    };
    return MockCache;
}());
var current = new MockCache();
var CacheStorage = /** @class */ (function () {
    function CacheStorage() {
    }
    CacheStorage.getInstance = function () {
        return current;
    };
    return CacheStorage;
}());
exports.CacheStorage = CacheStorage;
//# sourceMappingURL=cache-storage.js.map