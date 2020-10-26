"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util = exports.U256 = void 0;
var UtilType;
(function (UtilType) {
    UtilType[UtilType["CONCAT_BYTES"] = 0] = "CONCAT_BYTES";
    UtilType[UtilType["DECODE_HEX"] = 1] = "DECODE_HEX";
    UtilType[UtilType["ENCODE_HEX"] = 2] = "ENCODE_HEX";
    UtilType[UtilType["BYTES_TO_U64"] = 3] = "BYTES_TO_U64";
    UtilType[UtilType["U64_TO_BYTES"] = 4] = "U64_TO_BYTES";
})(UtilType || (UtilType = {}));
var U256Type;
(function (U256Type) {
    U256Type[U256Type["PARSE"] = 0] = "PARSE";
    U256Type[U256Type["TOSTRING"] = 1] = "TOSTRING";
    U256Type[U256Type["ADD"] = 2] = "ADD";
    U256Type[U256Type["SUB"] = 3] = "SUB";
    U256Type[U256Type["MUL"] = 4] = "MUL";
    U256Type[U256Type["DIV"] = 5] = "DIV";
    U256Type[U256Type["MOD"] = 6] = "MOD";
})(U256Type || (U256Type = {}));
var U256 = /** @class */ (function () {
    function U256(buf) {
        this.buf = buf;
        assert(buf.byteLength <= 32, 'invalid u256: overflow');
    }
    U256.__op_add = function (left, right) {
        return left.safeAdd(right);
    };
    U256.__op_sub = function (left, right) {
        return left.safeSub(right);
    };
    U256.__op_mul = function (left, right) {
        return left.safeMul(right);
    };
    U256.__op_div = function (left, right) {
        return left.safeDiv(right);
    };
    U256.__op_mod = function (left, right) {
        return left.safeMod(right);
    };
    U256.__op_gt = function (left, right) {
        return left.compareTo(right) > 0;
    };
    U256.__op_gte = function (left, right) {
        return left.compareTo(right) >= 0;
    };
    U256.__op_lt = function (left, right) {
        return left.compareTo(right) < 0;
    };
    U256.__op_lte = function (left, right) {
        return left.compareTo(right) <= 0;
    };
    U256.__op_eq = function (left, right) {
        return left.compareTo(right) == 0;
    };
    U256.__op_ne = function (left, right) {
        return left.compareTo(right) != 0;
    };
    U256.fromU64 = function (u) {
        var buf = Util.u64ToBytes(u);
        return new U256(buf);
    };
    U256.prototype.arithmetic = function (t, u) {
        var len = _u256(t, changetype(this.buf), this.buf.byteLength, changetype(u.buf), u.buf.byteLength, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _u256(t, changetype(this.buf), this.buf.byteLength, changetype(u.buf), u.buf.byteLength, changetype(ret), 1);
        return new U256(ret);
    };
    U256.prototype.add = function (u) {
        return this.arithmetic(U256Type.ADD, u);
    };
    U256.prototype.safeAdd = function (u) {
        var c = this.add(u);
        assert(c.compareTo(this) >= 0 && c.compareTo(u) >= 0, "SafeMath: addition overflow");
        return c;
    };
    U256.prototype.sub = function (u) {
        return this.arithmetic(U256Type.SUB, u);
    };
    U256.prototype.safeSub = function (u) {
        assert(u.compareTo(this) <= 0, "SafeMath: subtraction overflow x = " + this.toString() + " y = " + u.toString());
        return this.sub(u);
    };
    U256.prototype.mul = function (u) {
        return this.arithmetic(U256Type.MUL, u);
    };
    U256.prototype.safeMul = function (u) {
        if (this == u) {
            return U256.ZERO;
        }
        var c = this.mul(u);
        assert(c.div(this).compareTo(u) == 0, "SafeMath: multiplication overflow ");
        return c;
    };
    U256.prototype.div = function (u) {
        return this.arithmetic(U256Type.DIV, u);
    };
    U256.prototype.safeDiv = function (u) {
        assert(u.compareTo(U256.ZERO) > 0, "SafeMath: modulo by zero");
        return this.div(u);
    };
    U256.prototype.mod = function (u) {
        return this.arithmetic(U256Type.MOD, u);
    };
    U256.prototype.safeMod = function (u) {
        assert(u.compareTo(U256.ZERO) > 0, "SafeMath: modulo by zero");
        return this.mod(u);
    };
    U256.prototype.compareTo = function (u) {
        return Util.compareBytes(this.buf, u.buf);
    };
    U256.prototype.toString = function (radix) {
        if (radix === void 0) { radix = 10; }
        var len = _u256(U256Type.TOSTRING, changetype(this.buf), this.buf.byteLength, radix, 0, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _u256(U256Type.TOSTRING, changetype(this.buf), this.buf.byteLength, radix, 0, changetype(ret), 1);
        return String.UTF8.decode(ret);
    };
    U256.parse = function (str, radix) {
        if (radix === void 0) { radix = 10; }
        var strbuf = String.UTF8.encode(str);
        var len = _u256(U256Type.PARSE, changetype(strbuf), strbuf.byteLength, radix, 0, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _u256(U256Type.PARSE, changetype(strbuf), strbuf.byteLength, radix, 0, changetype(ret), 1);
        return new U256(ret);
    };
    U256.ZERO = new U256(new ArrayBuffer(0));
    U256.ONE = U256.fromU64(1);
    __decorate([
        operator("+")
    ], U256, "__op_add", null);
    __decorate([
        operator("-")
    ], U256, "__op_sub", null);
    __decorate([
        operator("*")
    ], U256, "__op_mul", null);
    __decorate([
        operator("/")
    ], U256, "__op_div", null);
    __decorate([
        operator("%")
    ], U256, "__op_mod", null);
    __decorate([
        operator(">")
    ], U256, "__op_gt", null);
    __decorate([
        operator(">=")
    ], U256, "__op_gte", null);
    __decorate([
        operator("<")
    ], U256, "__op_lt", null);
    __decorate([
        operator("<=")
    ], U256, "__op_lte", null);
    __decorate([
        operator("==")
    ], U256, "__op_eq", null);
    __decorate([
        operator("!=")
    ], U256, "__op_ne", null);
    return U256;
}());
exports.U256 = U256;
var Util = /** @class */ (function () {
    function Util() {
    }
    Util.concatBytes = function (a, b) {
        var len = _util(UtilType.CONCAT_BYTES, changetype(a), a.byteLength, changetype(b), b.byteLength, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _util(UtilType.CONCAT_BYTES, changetype(a), a.byteLength, changetype(b), b.byteLength, changetype(buf), 1);
        return buf;
    };
    // decode 
    Util.decodeHex = function (hex) {
        var str = this.str2bin(hex);
        var len = _util(UtilType.DECODE_HEX, changetype(str), str.byteLength, 0, 0, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _util(UtilType.DECODE_HEX, changetype(str), str.byteLength, 0, 0, changetype(buf), 1);
        return buf;
    };
    Util.encodeHex = function (data) {
        var len = _util(UtilType.ENCODE_HEX, changetype(data), data.byteLength, 0, 0, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _util(UtilType.ENCODE_HEX, changetype(data), data.byteLength, 0, 0, changetype(buf), 1);
        return String.UTF8.decode(buf);
    };
    Util.compareBytes = function (a, b) {
        var x = Uint8Array.wrap(a);
        var y = Uint8Array.wrap(b);
        if (x.length > y.length)
            return 1;
        if (x.length < y.length)
            return -1;
        for (var i = 0; i < x.length; i++) {
            if (x[i] > y[i])
                return 1;
            if (x[i] < y[i])
                return -1;
        }
        return 0;
    };
    Util.str2bin = function (str) {
        return String.UTF8.encode(str);
    };
    // convert u64 to bytes without leading zeros
    Util.u64ToBytes = function (u) {
        var len = _util(UtilType.U64_TO_BYTES, u, 0, 0, 0, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _util(UtilType.U64_TO_BYTES, u, 0, 0, 0, changetype(buf), 1);
        return buf;
    };
    Util.bytesToU64 = function (bytes) {
        return _util(UtilType.BYTES_TO_U64, changetype(bytes), bytes.byteLength, 0, 0, 0, 0);
    };
    return Util;
}());
exports.Util = Util;
