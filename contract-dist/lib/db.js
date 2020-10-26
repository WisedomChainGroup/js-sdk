"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBIterator = exports.DB = exports.Globals = exports.Store = exports.Entry = void 0;
var _1 = require(".");
var Type;
(function (Type) {
    Type[Type["SET"] = 0] = "SET";
    Type[Type["GET"] = 1] = "GET";
    Type[Type["REMOVE"] = 2] = "REMOVE";
    Type[Type["HAS"] = 3] = "HAS";
    Type[Type["NEXT"] = 4] = "NEXT";
    Type[Type["CURRENT_KEY"] = 5] = "CURRENT_KEY";
    Type[Type["CURRENT_VALUE"] = 6] = "CURRENT_VALUE";
    Type[Type["HAS_NEXT"] = 7] = "HAS_NEXT";
    Type[Type["RESET"] = 8] = "RESET";
})(Type || (Type = {}));
var Entry = /** @class */ (function () {
    function Entry(key, value) {
        this.key = key;
        this.value = value;
    }
    return Entry;
}());
exports.Entry = Entry;
var Store = /** @class */ (function () {
    function Store(prefix) {
        this.prefix = prefix;
    }
    Store.from = function (str) {
        return new Store(_1.Util.str2bin(str));
    };
    Store.prototype._key = function (key) {
        return _1.Util.concatBytes(this.prefix, _1.RLP.encode(key));
    };
    Store.prototype.set = function (key, value) {
        DB.set(this._key(key), _1.RLP.encode(value));
    };
    Store.prototype.remove = function (key) {
        DB.remove(this._key(key));
    };
    Store.prototype.has = function (key) {
        return DB.has(this._key(key));
    };
    Store.prototype.getOrDefault = function (key, def) {
        return this.has(key) ? this.get(key) : def;
    };
    Store.prototype.get = function (key) {
        return _1.RLP.decode(DB.get(this._key(key)));
    };
    return Store;
}());
exports.Store = Store;
var Globals = /** @class */ (function () {
    function Globals() {
    }
    Globals.set = function (str, value) {
        DB.set(_1.Util.str2bin(str), _1.RLP.encode(value));
    };
    Globals.get = function (str) {
        return _1.RLP.decode(DB.get(_1.Util.str2bin(str)));
    };
    Globals.getOrDefault = function (str, value) {
        return DB.has(_1.Util.str2bin(str)) ? _1.RLP.decode(DB.get(_1.Util.str2bin(str))) : value;
    };
    Globals.has = function (str) {
        return DB.has(_1.Util.str2bin(str));
    };
    Globals.remove = function (str) {
        DB.remove(_1.Util.str2bin(str));
    };
    return Globals;
}());
exports.Globals = Globals;
var DB = /** @class */ (function () {
    function DB() {
    }
    DB.set = function (key, value) {
        _db(Type.SET, changetype(key), key.byteLength, changetype(value), value.byteLength);
    };
    DB.remove = function (key) {
        _db(Type.REMOVE, changetype(key), key.byteLength, 0, 0);
    };
    DB.has = function (key) {
        return _db(Type.HAS, changetype(key), key.byteLength, 0, 0) != 0;
    };
    DB.get = function (key) {
        var len = _db(Type.GET, changetype(key), key.byteLength, 0, 0);
        var buf = new ArrayBuffer(i32(len));
        _db(Type.GET, changetype(key), key.byteLength, changetype(buf), 1);
        return buf;
    };
    return DB;
}());
exports.DB = DB;
var DBIterator = /** @class */ (function () {
    function DBIterator() {
    }
    DBIterator.next = function () {
        _db(Type.NEXT, 0, 0, 0, 0);
        var keyBuf = new ArrayBuffer(i32(_db(Type.CURRENT_KEY, 0, 0, 0, 0)));
        _db(Type.CURRENT_KEY, changetype(keyBuf), 1, 0, 0);
        var valueBuf = new ArrayBuffer(i32(_db(Type.CURRENT_VALUE, 0, 0, 0, 0)));
        _db(Type.CURRENT_KEY, changetype(valueBuf), 1, 0, 0);
        return new Entry(keyBuf, valueBuf);
    };
    DBIterator.hasNext = function () {
        return _db(Type.HAS_NEXT, 0, 0, 0, 0) != 0;
    };
    DBIterator.reset = function () {
        _db(Type.RESET, 0, 0, 0, 0);
    };
    return DBIterator;
}());
exports.DBIterator = DBIterator;
