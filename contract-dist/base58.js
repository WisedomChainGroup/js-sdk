"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base58 = exports.Base = void 0;
/**
 * base58 编码工具
 * @param {string} ALPHABET
 */
var utils_1 = require("./utils");
var Base = /** @class */ (function () {
    function Base(ALPHABET) {
        this.ALPHABET_MAP = {};
        this.BASE = ALPHABET.length;
        this.LEADER = ALPHABET.charAt(0);
        // pre-compute lookup table
        for (var z = 0; z < ALPHABET.length; z++) {
            var x = ALPHABET.charAt(z);
            if (this.ALPHABET_MAP[x] !== undefined)
                throw new TypeError(x + ' is ambiguous');
            this.ALPHABET_MAP[x] = z;
        }
        this.ALPHABET = ALPHABET;
    }
    Base.prototype.encode = function (src) {
        var source = utils_1.hex2bin(src);
        if (source.length === 0)
            return '';
        var digits = [0];
        for (var i = 0; i < source.length; ++i) {
            var carry = source[i];
            for (var j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8;
                digits[j] = carry % this.BASE;
                carry = (carry / this.BASE) | 0;
            }
            while (carry > 0) {
                digits.push(carry % this.BASE);
                carry = (carry / this.BASE) | 0;
            }
        }
        var string = '';
        // deal with leading zeros
        for (var k = 0; source[k] === 0 && k < source.length - 1; ++k)
            string += this.LEADER;
        // convert digits to a string
        for (var q = digits.length - 1; q >= 0; --q)
            string += this.ALPHABET[digits[q]];
        return string;
    };
    Base.prototype.decodeUnsafe = function (str) {
        if (typeof str !== 'string')
            throw new TypeError('Expected String');
        if (str.length === 0)
            return new Uint8Array(0);
        var bytes = [0];
        for (var i = 0; i < str.length; i++) {
            var value = this.ALPHABET_MAP[str[i]];
            if (value === undefined)
                throw new Error("invalid char " + str[i]);
            var carry = value;
            for (var j = 0; j < bytes.length; ++j) {
                carry += bytes[j] * this.BASE;
                bytes[j] = carry & 0xff;
                carry >>= 8;
            }
            while (carry > 0) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
        }
        // deal with leading zeros
        for (var k = 0; str[k] === this.LEADER && k < str.length - 1; ++k) {
            bytes.push(0);
        }
        return new Uint8Array(bytes.reverse());
    };
    Base.prototype.decode = function (str) {
        var buffer = this.decodeUnsafe(str);
        if (buffer)
            return buffer;
        throw new Error('Non-base' + this.BASE + ' character');
    };
    return Base;
}());
exports.Base = Base;
exports.Base58 = new Base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
//# sourceMappingURL=base58.js.map