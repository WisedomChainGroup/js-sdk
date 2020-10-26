"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RLPList = exports.RLPItem = exports.RLP = void 0;
var _1 = require(".");
var util_1 = require("./util");
var OFFSET_SHORT_LIST = 0xc0;
var Type;
(function (Type) {
    Type[Type["ENCODE_U64"] = 0] = "ENCODE_U64";
    Type[Type["ENCODE_BYTES"] = 1] = "ENCODE_BYTES";
    Type[Type["DECODE_BYTES"] = 2] = "DECODE_BYTES";
    Type[Type["RLP_LIST_SET"] = 3] = "RLP_LIST_SET";
    Type[Type["RLP_LIST_CLEAR"] = 4] = "RLP_LIST_CLEAR";
    Type[Type["RLP_LIST_LEN"] = 5] = "RLP_LIST_LEN";
    Type[Type["RLP_LIST_GET"] = 6] = "RLP_LIST_GET";
    Type[Type["RLP_LIST_PUSH"] = 7] = "RLP_LIST_PUSH";
    Type[Type["RLP_LIST_BUILD"] = 8] = "RLP_LIST_BUILD"; // build 
})(Type || (Type = {}));
var RLP = /** @class */ (function () {
    function RLP() {
    }
    RLP.emptyList = function () {
        var ret = new Uint8Array(1);
        ret[0] = OFFSET_SHORT_LIST;
        return ret.buffer;
    };
    // supported types： u64 i64 f64 bool U256 string ArrayBuffer Address
    RLP.encode = function (t) {
        if (isFunction()) {
            assert(false, 'rlp encode failed, invalid type ' + nameof());
            return new ArrayBuffer(0);
        }
        if (isFloat()) {
            return RLP.encodeU64(reinterpret(t));
        }
        if (isInteger()) {
            return RLP.encodeU64(u64(t));
        }
        if (isString()) {
            return RLP.encodeString(changetype(t));
        }
        if (!isManaged()) {
            var name_1 = nameof();
            var abi = RLPList.fromEncoded(_1.Context.self().abi());
            for (var i = 0; i < abi.length(); i++) {
                var li = abi.getList(i);
                if (li.getItem(0).string() == name_1 && li.getItem(1).u64() == 1) {
                    var outputs = li.getList(3);
                    var data = new Array();
                    var offset = 0;
                    var ptr = changetype(t);
                    for (var j = 0; j < outputs.length(); j++) {
                        switch (outputs.getItem(j).u32()) {
                            case _1.ABI_DATA_TYPE.BOOL: {
                                assert(false, 'bool is not stable in unmanaged runtime');
                            }
                            case _1.ABI_DATA_TYPE.F64:
                            case _1.ABI_DATA_TYPE.I64:
                            case _1.ABI_DATA_TYPE.U64: {
                                assert(false, 'native number is not stable in unmanaged runtime');
                                break;
                            }
                            case _1.ABI_DATA_TYPE.BYTES: {
                                data.push(RLP.encodeBytes(load(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.STRING: {
                                data.push(RLP.encodeString(load(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.U256: {
                                data.push(RLP.encodeU256(load(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.ADDRESS: {
                                data.push(RLP.encode(load(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            default:
                                assert(false, ' invalid abi type ' + outputs.getItem(j).u32().toString());
                        }
                    }
                    var buf = RLP.encodeElements(data);
                    return buf;
                }
            }
            assert(false, 'rlp encode ' + name_1 + ' failed, abi not found');
            return new ArrayBuffer(0);
        }
        switch (idof()) {
            case idof():
                return RLP.encodeBytes(changetype(t));
            case idof():
                return RLP.encodeBytes(changetype(t).buf);
            case idof():
                return RLP.encodeBytes(changetype(t).buf);
        }
        assert(false, 'rlp encode failed, invalid type ' + nameof());
        return new ArrayBuffer(0);
    };
    // supported types： u64 i64 f64 bool U256 string ArrayBuffer Address
    RLP.decode = function (buf) {
        if (isFunction()) {
            assert(false, 'rlp encode failed, invalid type ' + nameof());
            return changetype(null);
        }
        if (isFloat()) {
            return reinterpret(RLP.decodeU64(buf));
        }
        if (isBoolean()) {
            return RLP.decodeU64(buf) != 0;
        }
        if (isInteger()) {
            var ret = RLP.decodeU64(buf);
            if (sizeof() == 8) {
                return ret;
            }
            if (sizeof() == 4) {
                assert(ret <= u32.MAX_VALUE, 'invalid u32: overflow');
                return u32(ret);
            }
            if (sizeof() == 2) {
                assert(ret <= u16.MAX_VALUE, 'invalid u32: overflow');
                return u16(ret);
            }
            if (sizeof() == 1) {
                assert(ret <= u8.MAX_VALUE, 'invalid u32: overflow');
                return u8(ret);
            }
        }
        if (isString()) {
            return changetype(RLP.decodeString(buf));
        }
        if (!isManaged()) {
            var name_2 = nameof();
            var p = __alloc(offsetof(), 0);
            __retain(p);
            var abi = RLPList.fromEncoded(_1.Context.self().abi());
            var rlp = RLPList.fromEncoded(buf);
            for (var i = 0; i < abi.length(); i++) {
                var li = abi.getList(i);
                if (li.getItem(0).string() == name_2 && li.getItem(1).u64() == 1) {
                    var outputs = li.getList(3);
                    var offset = 0;
                    for (var j = 0; j < outputs.length(); j++) {
                        switch (outputs.getItem(j).u32()) {
                            case _1.ABI_DATA_TYPE.BOOL: {
                                assert(false, 'bool is not stable in runtime, please convert to string');
                                break;
                            }
                            case _1.ABI_DATA_TYPE.F64:
                            case _1.ABI_DATA_TYPE.I64:
                            case _1.ABI_DATA_TYPE.U64: {
                                assert(false, 'native number is not stable in unmanaged runtime, please convert to string');
                                break;
                            }
                            case _1.ABI_DATA_TYPE.BYTES: {
                                store(p + offset, rlp.getItem(j).bytes());
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.STRING: {
                                store(p + offset, rlp.getItem(j).string());
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.U256: {
                                store(p + offset, rlp.getItem(j).u256());
                                offset += 4;
                                break;
                            }
                            case _1.ABI_DATA_TYPE.ADDRESS: {
                                store(p + offset, rlp.getItem(j).address());
                                offset += 4;
                                break;
                            }
                            default:
                                assert(false, ' invalid abi type ' + outputs.getItem(j).u32().toString());
                        }
                    }
                    return changetype(p);
                }
            }
            assert(false, 'rlp decode failed, invalid type ' + nameof());
            return changetype(0);
        }
        switch (idof()) {
            case idof():
                return changetype(RLP.decodeBytes(buf));
            case idof():
                return changetype(new _1.U256(RLP.decodeBytes(buf)));
            case idof():
                return changetype(new _1.Address(RLP.decodeBytes(buf)));
        }
        assert(false, 'rlp encode failed, invalid type ' + nameof());
        return changetype(0);
    };
    // if the byte array was encoded from a list
    RLP.isList = function (encoded) {
        var arr = Uint8Array.wrap(encoded);
        return arr[0] >= OFFSET_SHORT_LIST;
    };
    RLP.encodeU64 = function (u) {
        var len = _rlp(Type.ENCODE_U64, u, 0, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _rlp(Type.ENCODE_U64, u, 0, changetype(buf), 1);
        return buf;
    };
    RLP.encodeU256 = function (u) {
        return encodeBytes(u.buf);
    };
    RLP.decodeU64 = function (u) {
        return RLPItem.fromEncoded(u).u64();
    };
    RLP.decodeU256 = function (u) {
        return RLPItem.fromEncoded(u).u256();
    };
    RLP.decodeString = function (encoded) {
        return RLPItem.fromEncoded(encoded).string();
    };
    // encode a string
    RLP.encodeString = function (s) {
        return encodeBytes(String.UTF8.encode(s));
    };
    // encode string list
    RLP.encodeStringArray = function (s) {
        var elements = new Array(s.length);
        for (var i = 0; i < elements.length; i++) {
            elements[i] = this.encodeString(s[i]);
        }
        return encodeElements(elements);
    };
    // encode a byte array
    RLP.encodeBytes = function (bytes) {
        return encodeBytes(bytes);
    };
    RLP.encodeElements = function (elements) {
        return encodeElements(elements);
    };
    RLP.decodeBytes = function (data) {
        var len = _rlp(Type.DECODE_BYTES, changetype(data), data.byteLength, 0, 0);
        var buf = new ArrayBuffer(u32(len));
        _rlp(Type.DECODE_BYTES, changetype(data), data.byteLength, changetype(buf), 1);
        return buf;
    };
    return RLP;
}());
exports.RLP = RLP;
var RLPItem = /** @class */ (function () {
    function RLPItem(data) {
        this.data = data;
    }
    RLPItem.fromEncoded = function (encoded) {
        var decoded = RLP.decodeBytes(encoded);
        return new RLPItem(decoded);
    };
    RLPItem.prototype.u8 = function () {
        assert(this.u64() <= u8.MAX_VALUE, 'integer overflow');
        return u8(this.u64());
    };
    RLPItem.prototype.u16 = function () {
        assert(this.u64() <= u16.MAX_VALUE, 'integer overflow');
        return u16(this.u64());
    };
    RLPItem.prototype.u32 = function () {
        assert(this.u64() <= u32.MAX_VALUE, 'integer overflow');
        return u32(this.u64());
    };
    RLPItem.prototype.u64 = function () {
        assert(this.data.byteLength <= 8, 'invalid u64: overflow');
        return util_1.Util.bytesToU64(this.data);
    };
    RLPItem.prototype.u256 = function () {
        return new _1.U256(this.bytes());
    };
    RLPItem.prototype.bytes = function () {
        return this.data;
    };
    RLPItem.prototype.string = function () {
        return String.UTF8.decode(this.data);
    };
    RLPItem.prototype.isNull = function () {
        return this.data.byteLength == 0;
    };
    RLPItem.prototype.address = function () {
        return new _1.Address(this.bytes());
    };
    return RLPItem;
}());
exports.RLPItem = RLPItem;
var RLPList = /** @class */ (function () {
    function RLPList(elements, encoded) {
        this.elements = elements;
        this.encoded = encoded;
    }
    RLPList.fromEncoded = function (encoded) {
        _rlp(Type.RLP_LIST_SET, changetype(encoded), encoded.byteLength, 0, 0);
        var len = u32(_rlp(Type.RLP_LIST_LEN, 0, 0, 0, 0));
        var elements = new Array(len);
        for (var i = 0; i < len; i++) {
            var bufLen = _rlp(Type.RLP_LIST_GET, i, 0, 0, 0);
            var buf = new ArrayBuffer(u32(bufLen));
            _rlp(Type.RLP_LIST_GET, i, 0, changetype(buf), 1);
            elements[i] = buf;
        }
        _rlp(Type.RLP_LIST_CLEAR, 0, 0, 0, 0);
        return new RLPList(elements, encoded);
    };
    RLPList.prototype.getItem = function (index) {
        return RLPItem.fromEncoded(this.getRaw(index));
    };
    RLPList.prototype.getList = function (index) {
        return RLPList.fromEncoded(this.getRaw(index));
    };
    RLPList.prototype.length = function () {
        return this.elements.length;
    };
    RLPList.prototype.getRaw = function (index) {
        return this.elements[index];
    };
    RLPList.prototype.isNull = function (index) {
        return this.elements[index].byteLength == 1 && Uint8Array.wrap(this.elements[index])[0] == 0x80;
    };
    RLPList.EMPTY = new RLPList([], RLP.emptyList());
    return RLPList;
}());
exports.RLPList = RLPList;
function encodeBytes(bytes) {
    var len = _rlp(Type.ENCODE_BYTES, changetype(bytes), bytes.byteLength, 0, 0);
    var buf = new ArrayBuffer(u32(len));
    _rlp(Type.ENCODE_BYTES, changetype(bytes), bytes.byteLength, changetype(buf), 1);
    return buf;
}
function encodeElements(elements) {
    if (elements.length == 0)
        return RLP.emptyList();
    for (var i = 0; i < elements.length; i++) {
        var buf_1 = elements[i];
        _rlp(Type.RLP_LIST_PUSH, changetype(buf_1), buf_1.byteLength, 0, 0);
    }
    var len = _rlp(Type.RLP_LIST_BUILD, 0, 0, 0, 0);
    var buf = new ArrayBuffer(u32(len));
    _rlp(Type.RLP_LIST_BUILD, 0, 0, changetype(buf), 1);
    return buf;
}
