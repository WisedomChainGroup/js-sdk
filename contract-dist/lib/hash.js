"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hash = void 0;
var Algorithm;
(function (Algorithm) {
    Algorithm[Algorithm["KECCAK256"] = 0] = "KECCAK256";
})(Algorithm || (Algorithm = {}));
var Hash = /** @class */ (function () {
    function Hash() {
    }
    Hash.hash = function (data, alg) {
        var len = _hash(alg, changetype(data), data.byteLength, 0, 0);
        var res = new ArrayBuffer(i32(len));
        _hash(alg, changetype(data), data.byteLength, changetype(res), 1);
        return res;
    };
    Hash.keccak256 = function (data) {
        return Hash.hash(data, Algorithm.KECCAK256);
    };
    return Hash;
}());
exports.Hash = Hash;
