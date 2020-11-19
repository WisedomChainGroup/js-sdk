"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dig2BigInt = exports.dig2BN = exports.encodeUint32 = exports.encodeBE = exports.bin2hex = exports.uuidv4 = exports.bin2str = exports.toSafeInt = exports.inverse = exports.convert = exports.bytesToF64 = exports.padPrefix = exports.f64ToBytes = exports.trimLeadingZeros = exports.str2bin = exports.normalizeAddress = exports.assertAddress = exports.concatBytes = exports.concatArray = exports.extendPrivateKey = exports.publicKeyHash2Address = exports.address2PublicKeyHash = exports.publicKey2Hash = exports.privateKey2PublicKey = exports.compareBytes = exports.dig2str = exports.hex2bin = exports.assert = exports.rmd160 = exports.digest = exports.isBin = void 0;
var types_1 = require("./types");
var nacl = require("../nacl.min.js");
var RMD160 = (new (require('../hashes.js').RMD160));
var _keccak256 = require('../sha3.js').keccak256;
var base58_1 = require("./base58");
var BN = require("../bn");
RMD160.setUTF8(false);
var EMPTY_BYTES = new Uint8Array(0);
function isBin(r) {
    return r && (r instanceof Uint8Array || r instanceof ArrayBuffer);
}
exports.isBin = isBin;
/**
 * 计算 keccak256哈希
 */
function digest(_msg) {
    var msg = hex2bin(_msg);
    var hasher = _keccak256.create();
    hasher.update(msg);
    return new Uint8Array(hasher.arrayBuffer());
}
exports.digest = digest;
/**
 * rmd160 哈希值计算
 */
function rmd160(bin) {
    var o = hex2bin(bin);
    return hex2bin(RMD160.hex(new FakeString(o)));
}
exports.rmd160 = rmd160;
// rmd 不支持对 Uint8Array 进行哈希值计算，需要把 Uint8Array 类型伪装成字符串
var FakeString = /** @class */ (function () {
    function FakeString(u8) {
        this.u8 = hex2bin(u8);
        this.length = this.u8.length;
    }
    FakeString.prototype.charCodeAt = function (i) {
        return this.u8[i];
    };
    return FakeString;
}());
function assert(truth, err) {
    if (!truth)
        throw new Error(err);
}
exports.assert = assert;
/**
 * 解析十六进制字符串
 * decode hex string
 */
function hex2bin(s) {
    if (s instanceof ArrayBuffer)
        return new Uint8Array(s);
    if (s instanceof Uint8Array)
        return s;
    if (s.startsWith('0x'))
        s = s.substr(2, s.length - 2);
    assert(s.length % 2 === 0, 'invalid char');
    var ret = new Uint8Array(s.length / 2);
    for (var i = 0; i < s.length / 2; i++) {
        var h = s.charCodeAt(i * 2);
        var l = s.charCodeAt(i * 2 + 1);
        ret[i] = (hexToInt(h) << 4) + hexToInt(l);
    }
    return ret;
}
exports.hex2bin = hex2bin;
function hexToInt(x) {
    if (48 <= x && x <= 57)
        return x - 48;
    if (97 <= x && x <= 102)
        return x - 87;
    if (65 <= x && x <= 70)
        return x - 55;
    return 0;
}
function dig2str(s) {
    if (typeof s === 'string') {
        if (s.startsWith('0x'))
            s = new BN(s.substr(2), 16);
        else
            return s;
    }
    return s.toString(10);
}
exports.dig2str = dig2str;
/**
 * 比较两个字节数组
 */
function compareBytes(_a, _b) {
    var a = hex2bin(_a);
    var b = hex2bin(_b);
    if (a.length > b.length)
        return 1;
    if (b.length > a.length)
        return -1;
    for (var i = 0; i < a.length; i++) {
        var ai = a[i];
        var bi = b[i];
        if (ai > bi)
            return 1;
        if (bi > ai)
            return -1;
    }
    return 0;
}
exports.compareBytes = compareBytes;
/**
 * 私钥转公钥
 */
function privateKey2PublicKey(_privateKey) {
    var privateKey = hex2bin(_privateKey);
    if (privateKey.length === 64)
        privateKey = privateKey.slice(32);
    var pair = nacl.sign.keyPair.fromSeed(privateKey);
    return pair.publicKey;
}
exports.privateKey2PublicKey = privateKey2PublicKey;
/**
 * 公钥转公钥哈希
 */
function publicKey2Hash(_publicKey) {
    var publicKey = hex2bin(_publicKey);
    publicKey = digest(publicKey);
    return rmd160(publicKey);
}
exports.publicKey2Hash = publicKey2Hash;
/**
 * 地址转公钥哈希
 */
function address2PublicKeyHash(str) {
    assert(typeof str === 'string', 'address is string');
    var r5;
    if (str.indexOf("1") === 0) {
        r5 = base58_1.Base58.decode(str);
    }
    else {
        r5 = base58_1.Base58.decode(str.substr(2));
    }
    return r5.slice(1, r5.length - 4);
}
exports.address2PublicKeyHash = address2PublicKeyHash;
/**
 * 公钥哈希转地址
 */
function publicKeyHash2Address(_hash) {
    var hash = hex2bin(_hash);
    var r2 = concatBytes(new Uint8Array([0]), hash);
    var r3 = digest(digest(hash));
    var b4 = r3.slice(0, 4);
    var b5 = concatBytes(r2, b4);
    return base58_1.Base58.encode(b5);
}
exports.publicKeyHash2Address = publicKeyHash2Address;
/**
 * 32 字节私钥转成 64字节私钥
 */
function extendPrivateKey(_sk) {
    var sk = hex2bin(_sk);
    if (sk.length === 64)
        return sk;
    return concatBytes(sk, privateKey2PublicKey(sk));
}
exports.extendPrivateKey = extendPrivateKey;
function concatArray(arr) {
    var ret = new Uint8Array(0);
    arr.forEach(function (a) {
        ret = concatBytes(ret, a);
    });
    return ret;
}
exports.concatArray = concatArray;
function concatBytes(_x, _y) {
    var x = hex2bin(_x);
    var y = hex2bin(_y);
    var ret = new Uint8Array(x.length + y.length);
    for (var i = 0; i < x.length; i++) {
        ret[i] = x[i];
    }
    for (var i = 0; i < y.length; i++) {
        ret[x.length + i] = y[i];
    }
    return ret;
}
exports.concatBytes = concatBytes;
/**
 * 断言正确的地址
 * @param {string} address
 */
function assertAddress(address) {
    if (typeof address !== 'string')
        throw new Error('invalid address not a string');
    if (!address.startsWith('1') && !address.startsWith('WX') && !address.startsWith('WR')) {
        throw new Error('address should starts with 1, WX or WR');
    }
    if (address.startsWith('WX') || address.startsWith('WR'))
        address = address.substr(2);
    var _r5 = base58_1.Base58.decode(address);
    var a = address2PublicKeyHash(address);
    var c = digest(a);
    var r3 = digest(c);
    var b4 = r3.slice(0, 4);
    var _b4 = _r5.slice(21, 25);
    if (compareBytes(b4, _b4) != 0) {
        throw new Error('invalid address ' + address);
    }
}
exports.assertAddress = assertAddress;
/**
 * 公钥、地址、或者公钥哈希 转成公钥哈希
 * @returns  {Uint8Array}
 */
function normalizeAddress(_addr) {
    var addr;
    if ((typeof _addr === 'string' && isHex(_addr)) || _addr instanceof Uint8Array || _addr instanceof ArrayBuffer) {
        addr = hex2bin(_addr);
        if (addr.length === 20)
            return addr;
        if (addr.length === 32)
            return publicKey2Hash(addr);
        throw new Error("invalid size " + addr.length);
    }
    // 地址转公钥哈希
    assertAddress(_addr);
    return address2PublicKeyHash(_addr);
}
exports.normalizeAddress = normalizeAddress;
/**
 * 判断是否是合法的十六进制字符串
 * @param {string} hex
 * @returns {boolean}
 */
function isHex(hex) {
    if (hex.startsWith('0x'))
        hex = hex.substr(2);
    if (hex.length % 2 !== 0)
        return false;
    hex = hex.toLowerCase();
    for (var i = 0; i < hex.length; i++) {
        var code = hex.charCodeAt(i);
        if ((code >= 48 && code <= 57) || (code >= 97 && code <= 102)) {
        }
        else {
            return false;
        }
    }
    return true;
}
/**
 * 字符串 utf8 编码
 * @param str 字符串
 */
function str2bin(str) {
    if (typeof Buffer === 'function')
        return Buffer.from(str, 'utf-8');
    if (typeof TextEncoder === 'function')
        return new TextEncoder().encode(str);
    throw new Error('encode string to utf8 failed');
}
exports.str2bin = str2bin;
function trimLeadingZeros(data) {
    var k = -1;
    for (var i = 0; i < data.length; i++) {
        if (data[i] !== 0) {
            k = i;
            break;
        }
    }
    if (k === -1)
        return new Uint8Array(0);
    return data.slice(k, data.length);
}
exports.trimLeadingZeros = trimLeadingZeros;
function reverse(_arr) {
    var arr = hex2bin(_arr);
    var ret = new Uint8Array(arr.length);
    for (var i = 0; i < arr.length; i++) {
        ret[i] = arr[arr.length - i - 1];
    }
    return ret;
}
/**
 * 浮点数转字节数组
 */
function f64ToBytes(f) {
    var _buf = new ArrayBuffer(8);
    var float = new Float64Array(_buf);
    float[0] = f;
    var buf = new Uint8Array(_buf);
    return trimLeadingZeros(reverse(buf));
}
exports.f64ToBytes = f64ToBytes;
/**
 * pad prefix to size
 */
function padPrefix(arr, prefix, size) {
    if (arr.length >= size)
        return arr;
    var ret = new Uint8Array(size);
    for (var i = 0; i < ret.length; i++) {
        ret[i + size - arr.length] = arr[i];
    }
    if (prefix === 0)
        return ret;
    for (var i = 0; i < size - arr.length; i++)
        ret[i] = prefix;
}
exports.padPrefix = padPrefix;
/**
 * 字节数组转浮点数
 * @param {Uint8Array} buf
 */
function bytesToF64(buf) {
    return new Float64Array(padPrefix(reverse(buf), 0, 8).buffer)[0];
}
exports.bytesToF64 = bytesToF64;
function convert(o, type) {
    if (typeof o === 'bigint')
        o = new BN(o.toString());
    if (o instanceof Uint8Array || o instanceof ArrayBuffer) {
        switch (type) {
            case types_1.ABI_DATA_TYPE.bool:
            case types_1.ABI_DATA_TYPE.u256:
            case types_1.ABI_DATA_TYPE.i64:
            case types_1.ABI_DATA_TYPE.u64:
            case types_1.ABI_DATA_TYPE.f64: {
                throw new Error('cannot convert uint8array to u64, u256 or bool');
            }
            case types_1.ABI_DATA_TYPE.string: {
                throw new Error('cannot convert uint8array to string');
            }
            case types_1.ABI_DATA_TYPE.bytes:
                return hex2bin(o);
            case types_1.ABI_DATA_TYPE.address:
                return normalizeAddress(o);
        }
        throw new Error("unexpected abi type " + type);
    }
    if (typeof o === 'string') {
        switch (type) {
            case types_1.ABI_DATA_TYPE.u256:
            case types_1.ABI_DATA_TYPE.u64: {
                var ret = void 0;
                if (o.substr(0, 2) === '0x') {
                    ret = new BN(o.substr(2, o.length - 2), 16);
                }
                else {
                    ret = new BN(o, 10);
                }
                if (type === types_1.ABI_DATA_TYPE.u64)
                    assert(ret.cmp(types_1.MAX_U64) <= 0 && !ret.isNeg(), ret.toString(10) + " overflows max u64 " + types_1.MAX_U64.toString(10));
                if (type === types_1.ABI_DATA_TYPE.u256)
                    assert(ret.cmp(types_1.MAX_U256) <= 0 && !ret.isNeg(), ret.toString(10) + " overflows max u256 " + types_1.MAX_U256.toString(10));
                return ret;
            }
            case types_1.ABI_DATA_TYPE.i64: {
                if (o.substr(0, 2) === '0x') {
                    var ret = new BN(o.substr(2, o.length - 2), 16);
                    assert(ret.cmp(types_1.MAX_I64) <= 0, ret.toString(10) + " overflows max i64 " + types_1.MAX_I64.toString(10));
                    assert(ret.cmp(types_1.MIN_I64) >= 0, ret.toString(10) + " overflows min i64 " + types_1.MIN_I64.toString(10));
                    return ret;
                }
                return convert(parseInt(o), types_1.ABI_DATA_TYPE.i64);
            }
            case types_1.ABI_DATA_TYPE.f64: {
                var f = parseFloat(o);
                return f64ToBytes(f);
            }
            case types_1.ABI_DATA_TYPE.string: {
                return o;
            }
            case types_1.ABI_DATA_TYPE.bool: {
                var l = o.toLowerCase();
                if ('true' === l)
                    return types_1.ONE;
                if ('false' === l)
                    return types_1.ZERO;
                // @ts-ignore
                if (isNaN(o))
                    throw new Error("cannot convert " + o + " to bool");
                var ln = parseInt(o);
                if (1 === ln || 0 === ln)
                    return l;
                throw new Error("convert " + l + " to bool failed, provide 1 or 0");
            }
            case types_1.ABI_DATA_TYPE.bytes:
                return hex2bin(o);
            case types_1.ABI_DATA_TYPE.address: {
                return normalizeAddress(o);
            }
        }
        throw new Error("unexpected abi type " + type);
    }
    if (typeof o === 'number') {
        switch (type) {
            case types_1.ABI_DATA_TYPE.u256:
            case types_1.ABI_DATA_TYPE.u64: {
                if (o < 0 || !Number.isInteger(o))
                    throw new Error('o is negative or not a integer');
                return new BN(o);
            }
            case types_1.ABI_DATA_TYPE.string: {
                return o.toString(10);
            }
            case types_1.ABI_DATA_TYPE.bool: {
                if (1 === o || 0 === o)
                    return 1 === o ? types_1.ONE : types_1.ZERO;
                throw new Error("convert " + o + " to bool failed, provide 1 or 0");
            }
            case types_1.ABI_DATA_TYPE.bytes:
            case types_1.ABI_DATA_TYPE.address: {
                throw new Error("cannot convert number to address or bytes");
            }
            case types_1.ABI_DATA_TYPE.i64: {
                if (!Number.isInteger(o))
                    throw new Error('o is negative or not a integer');
                if (o >= 0)
                    return new BN(o);
                return convert(new BN(o), types_1.ABI_DATA_TYPE.i64);
            }
            case types_1.ABI_DATA_TYPE.f64: {
                return f64ToBytes(o);
            }
        }
        throw new Error("unexpected abi type " + type);
    }
    if (o instanceof BN) {
        switch (type) {
            case types_1.ABI_DATA_TYPE.u256:
            case types_1.ABI_DATA_TYPE.u64: {
                if (o.isNeg())
                    throw new Error("cannot convert negative " + o.toString() + " to uint");
                return o;
            }
            case types_1.ABI_DATA_TYPE.string: {
                return o.toString(10);
            }
            case types_1.ABI_DATA_TYPE.bytes:
            case types_1.ABI_DATA_TYPE.address: {
                throw new Error("cannot convert big number to address or bytes");
            }
            case types_1.ABI_DATA_TYPE.bool: {
                if (o.cmp(new BN(1)) === 0 || o.cmp(new BN(0)) === 0)
                    return o;
                throw new Error("convert " + o + " to bool failed, provide 1 or 0");
            }
            case types_1.ABI_DATA_TYPE.i64: {
                assert(o.cmp(types_1.MAX_I64) <= 0, o.toString(10) + " overflows max i64 " + types_1.MAX_I64.toString(10));
                assert(o.cmp(types_1.MIN_I64) >= 0, o.toString(10) + " overflows min i64 " + types_1.MIN_I64.toString(10));
                if (o.cmp(new BN(0)) >= 0)
                    return o;
                var buf = o.neg().toArrayLike(Uint8Array, 'be', 8);
                buf = inverse(buf);
                return new BN(buf).add(types_1.ONE);
            }
            case types_1.ABI_DATA_TYPE.f64: {
                return f64ToBytes(o.toNumber());
            }
        }
        throw new Error("unexpected abi type " + type);
    }
    if (typeof o === 'boolean') {
        switch (type) {
            case types_1.ABI_DATA_TYPE.u256:
            case types_1.ABI_DATA_TYPE.i64:
            case types_1.ABI_DATA_TYPE.u64: {
                return o ? types_1.ONE : types_1.ZERO;
            }
            case types_1.ABI_DATA_TYPE.string: {
                return o.toString();
            }
            case types_1.ABI_DATA_TYPE.bytes:
            case types_1.ABI_DATA_TYPE.address: {
                throw new Error("cannot convert boolean to address or bytes");
            }
            case types_1.ABI_DATA_TYPE.bool: {
                return o ? types_1.ONE : types_1.ZERO;
            }
            case types_1.ABI_DATA_TYPE.f64: {
                return f64ToBytes(o ? 1 : 0);
            }
        }
        throw new Error("unexpected abi type " + type);
    }
    throw new Error("unexpected type " + o);
}
exports.convert = convert;
/**
 * 对字节数组取反
 */
function inverse(arr) {
    var ret = new Uint8Array(arr.length);
    for (var i = 0; i < ret.length; i++) {
        ret[i] = (~arr[i] & 0xff);
    }
    return ret;
}
exports.inverse = inverse;
function toSafeInt(x) {
    var bn;
    if (typeof x === 'bigint')
        x = new BN(x.toString());
    if (typeof x === 'number')
        return x;
    if (typeof x === 'string') {
        var hex = x.startsWith('0x');
        x = hex ? x.substr(2, x.length - 2) : x;
        bn = new BN(x, hex ? 16 : 10);
    }
    if (x instanceof ArrayBuffer || x instanceof Uint8Array) {
        var arr = x instanceof ArrayBuffer ? new Uint8Array(x) : x;
        bn = new BN(arr);
    }
    if (x instanceof BN)
        bn = x;
    if (bn.cmp(types_1.MAX_SAFE_INTEGER) <= 0 && bn.cmp(types_1.MIN_SAFE_INTEGER) >= 0)
        return bn.toNumber();
    return bn.toString(10);
}
exports.toSafeInt = toSafeInt;
/**
 * decode binary as utf8 string
 */
function bin2str(_bin) {
    if (typeof _bin === 'string')
        return _bin;
    var bin = hex2bin(_bin);
    if (typeof TextDecoder === 'function')
        return new TextDecoder().decode(bin);
    if (typeof Buffer === 'function')
        return Buffer.from(bin).toString('utf8');
    throw new Error('bin2str failed');
}
exports.bin2str = bin2str;
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.uuidv4 = uuidv4;
function bin2hex(s) {
    if (typeof s === 'string') {
        assert(isHex(s), 'hex string');
        return s;
    }
    if (!(s instanceof ArrayBuffer) &&
        !(s instanceof Uint8Array) &&
        !Array.isArray(s))
        throw new Error("input " + s + " is not ArrayBuffer Uint8Array or Buffer and other array-like ");
    if (!(s instanceof Uint8Array))
        s = new Uint8Array(s);
    // input maybe Buffer or Uint8Array
    if (typeof Buffer === 'function')
        return Buffer.from(s).toString('hex');
    return Array.prototype.map.call(s, function (x) { return ('00' + x.toString(16)).slice(-2); }).join('');
}
exports.bin2hex = bin2hex;
function encodeBE(i) {
    var n = dig2BN(i);
    return trimLeadingZeros(n.toArrayLike(Uint8Array, 'be'));
}
exports.encodeBE = encodeBE;
function encodeUint32(i) {
    var buf = new ArrayBuffer(4);
    var v = new DataView(buf);
    v.setUint32(0, Number(i), true);
    return buf;
}
exports.encodeUint32 = encodeUint32;
function dig2BN(i) {
    return i instanceof BN ? i : new BN(i.toString());
}
exports.dig2BN = dig2BN;
function dig2BigInt(i) {
    if (typeof i === 'bigint')
        return i;
    if (typeof i === 'string')
        return i.startsWith('0x') ? BigInt(new BN(i, 16).toString(10)) : BigInt(i);
    if (i instanceof BN)
        return BigInt(i.toString(10));
    return BigInt(i);
}
exports.dig2BigInt = dig2BigInt;
