"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uint256Host = exports.Transfer = exports.Reflect = exports.RLPHost = exports.ContextHost = exports.DBHost = exports.EventHost = exports.HashHost = exports.Util = exports.Abort = exports.Log = exports.AbstractHost = void 0;
var vm_1 = require("./vm");
var utils_1 = require("./utils");
var utils_2 = require("./utils");
var BN = require("../bn");
var types_1 = require("./types");
var contract_1 = require("./contract");
var rlp = require("./rlp");
var AbstractHost = /** @class */ (function () {
    function AbstractHost(world) {
        this.instance = null;
        this.world = world;
        this.utf8Decoder = new TextDecoder('utf-8');
        this.utf16Decoder = new TextDecoder('utf-16');
    }
    AbstractHost.prototype.init = function (env) {
        this.view = new vm_1.MemoryView(env.memory);
    };
    return AbstractHost;
}());
exports.AbstractHost = AbstractHost;
var Log = /** @class */ (function (_super) {
    __extends(Log, _super);
    function Log() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Log.prototype.name = function () {
        return '_log';
    };
    Log.prototype.execute = function (args) {
        console.log(this.view.loadUTF8(args[0], args[1]));
    };
    return Log;
}(AbstractHost));
exports.Log = Log;
var Abort = /** @class */ (function (_super) {
    __extends(Abort, _super);
    function Abort() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Abort.prototype.execute = function (args) {
        var msg = vm_1.isZero(args[0]) ? '' : this.view.loadUTF16(args[0]);
        var file = vm_1.isZero(args[1]) ? '' : this.view.loadUTF16(args[1]);
        throw new Error(file + " " + msg + " error at line " + args[2] + " column " + args[3]);
    };
    Abort.prototype.name = function () {
        return 'abort';
    };
    return Abort;
}(AbstractHost));
exports.Abort = Abort;
var UtilType;
(function (UtilType) {
    UtilType[UtilType["CONCAT_BYTES"] = 0] = "CONCAT_BYTES";
    UtilType[UtilType["DECODE_HEX"] = 1] = "DECODE_HEX";
    UtilType[UtilType["ENCODE_HEX"] = 2] = "ENCODE_HEX";
    UtilType[UtilType["BYTES_TO_U64"] = 3] = "BYTES_TO_U64";
    UtilType[UtilType["U64_TO_BYTES"] = 4] = "U64_TO_BYTES";
})(UtilType || (UtilType = {}));
var Util = /** @class */ (function (_super) {
    __extends(Util, _super);
    function Util() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Util.prototype.execute = function (args) {
        var t = Number(args[0]);
        var put = !vm_1.isZero(args[6]);
        var data = null;
        var ret = BigInt(0);
        switch (t) {
            case UtilType.CONCAT_BYTES: {
                var a = this.view.loadN(args[1], args[2]);
                var b = this.view.loadN(args[3], args[4]);
                data = utils_1.concatBytes(new Uint8Array(a), new Uint8Array(b)).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case UtilType.DECODE_HEX: {
                var a = this.view.loadN(args[1], args[2]);
                var str = utils_2.bin2str(a);
                data = utils_2.hex2bin(str).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case UtilType.ENCODE_HEX: {
                var a = this.view.loadN(args[1], args[2]);
                var str = utils_2.bin2hex(a);
                data = utils_2.str2bin(str);
                ret = BigInt(data.byteLength);
                break;
            }
            case UtilType.BYTES_TO_U64: {
                var a = new Uint8Array(this.view.loadN(args[1], args[2]));
                var b = utils_1.padPrefix(a, 0, 8);
                ret = new DataView(b.buffer).getBigUint64(0, false);
                break;
            }
            case UtilType.U64_TO_BYTES: {
                data = utils_1.encodeBE(args[1]);
                ret = BigInt(data.byteLength);
                break;
            }
        }
        if (put) {
            this.view.put(args[5], data);
        }
        return ret;
    };
    Util.prototype.name = function () {
        return '_util';
    };
    return Util;
}(AbstractHost));
exports.Util = Util;
var ContextType;
(function (ContextType) {
    ContextType[ContextType["HEADER_PARENT_HASH"] = 0] = "HEADER_PARENT_HASH";
    ContextType[ContextType["HEADER_CREATED_AT"] = 1] = "HEADER_CREATED_AT";
    ContextType[ContextType["HEADER_HEIGHT"] = 2] = "HEADER_HEIGHT";
    ContextType[ContextType["TX_TYPE"] = 3] = "TX_TYPE";
    ContextType[ContextType["TX_CREATED_AT"] = 4] = "TX_CREATED_AT";
    ContextType[ContextType["TX_NONCE"] = 5] = "TX_NONCE";
    ContextType[ContextType["TX_ORIGIN"] = 6] = "TX_ORIGIN";
    ContextType[ContextType["TX_GAS_PRICE"] = 7] = "TX_GAS_PRICE";
    ContextType[ContextType["TX_AMOUNT"] = 8] = "TX_AMOUNT";
    ContextType[ContextType["TX_TO"] = 9] = "TX_TO";
    ContextType[ContextType["TX_SIGNATURE"] = 10] = "TX_SIGNATURE";
    ContextType[ContextType["TX_HASH"] = 11] = "TX_HASH";
    ContextType[ContextType["CONTRACT_ADDRESS"] = 12] = "CONTRACT_ADDRESS";
    ContextType[ContextType["CONTRACT_NONCE"] = 13] = "CONTRACT_NONCE";
    ContextType[ContextType["ACCOUNT_NONCE"] = 14] = "ACCOUNT_NONCE";
    ContextType[ContextType["ACCOUNT_BALANCE"] = 15] = "ACCOUNT_BALANCE";
    ContextType[ContextType["MSG_SENDER"] = 16] = "MSG_SENDER";
    ContextType[ContextType["MSG_AMOUNT"] = 17] = "MSG_AMOUNT";
    ContextType[ContextType["CONTRACT_CODE"] = 18] = "CONTRACT_CODE";
    ContextType[ContextType["CONTRACT_ABI"] = 19] = "CONTRACT_ABI";
})(ContextType || (ContextType = {}));
var DBType;
(function (DBType) {
    DBType[DBType["SET"] = 0] = "SET";
    DBType[DBType["GET"] = 1] = "GET";
    DBType[DBType["REMOVE"] = 2] = "REMOVE";
    DBType[DBType["HAS"] = 3] = "HAS";
    DBType[DBType["NEXT"] = 4] = "NEXT";
    DBType[DBType["CURRENT_KEY"] = 5] = "CURRENT_KEY";
    DBType[DBType["CURRENT_VALUE"] = 6] = "CURRENT_VALUE";
    DBType[DBType["HAS_NEXT"] = 7] = "HAS_NEXT";
    DBType[DBType["RESET"] = 8] = "RESET";
})(DBType || (DBType = {}));
var Algorithm;
(function (Algorithm) {
    Algorithm[Algorithm["KECCAK256"] = 0] = "KECCAK256";
})(Algorithm || (Algorithm = {}));
var HashHost = /** @class */ (function (_super) {
    __extends(HashHost, _super);
    function HashHost() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    HashHost.prototype.execute = function (args) {
        var bin = this.view.loadN(args[1], args[2]);
        var t = Number(args[0]);
        var ret;
        switch (t) {
            case Algorithm.KECCAK256: {
                ret = utils_1.digest(bin).buffer;
                break;
            }
            default:
                throw new Error("hash host: invalid type " + t);
        }
        if (!vm_1.isZero(args[4]))
            this.view.put(args[3], ret);
        return BigInt(ret.byteLength);
    };
    HashHost.prototype.name = function () {
        return '_hash';
    };
    return HashHost;
}(AbstractHost));
exports.HashHost = HashHost;
var EventHost = /** @class */ (function (_super) {
    __extends(EventHost, _super);
    function EventHost(world, ctx) {
        var _this = _super.call(this, world) || this;
        _this.ctx = ctx;
        return _this;
    }
    EventHost.prototype.execute = function (args) {
        var name = this.view.loadUTF8(args[0], args[1]);
        var abi = this.world.abiCache.get(utils_2.bin2hex(this.ctx.contractAddress));
        var c = new contract_1.Contract('', abi);
        var fields = rlp.decode(this.view.loadN(args[2], args[3]));
        var o = c.abiDecode(name, fields, 'event');
        console.log("Event emit, name = " + name);
        console.log(o);
    };
    EventHost.prototype.name = function () {
        return '_event';
    };
    return EventHost;
}(AbstractHost));
exports.EventHost = EventHost;
var DBHost = /** @class */ (function (_super) {
    __extends(DBHost, _super);
    function DBHost(world, ctx) {
        var _this = _super.call(this, world) || this;
        _this.ctx = ctx;
        return _this;
    }
    DBHost.prototype.execute = function (args) {
        var t = Number(args[0]);
        switch (t) {
            case DBType.SET: {
                var addr = utils_2.bin2hex(this.ctx.contractAddress);
                var k = this.view.loadN(args[1], args[2]);
                var val = this.view.loadN(args[3], args[4]);
                var m = this.world.storage.get(addr) || new Map();
                m.set(utils_2.bin2hex(k), val);
                this.world.storage.set(addr, m);
                return BigInt(0);
            }
            case DBType.GET: {
                var addr = utils_2.bin2hex(this.ctx.contractAddress);
                var k = utils_2.bin2hex(this.view.loadN(args[1], args[2]));
                var m = this.world.storage.get(addr) || new Map();
                if (!m.has(k))
                    throw new Error("key " + k + " not found in db");
                var val = m.get(k);
                if (!vm_1.isZero(args[4])) {
                    this.view.put(args[3], val);
                }
                return BigInt(val.byteLength);
            }
            case DBType.HAS: {
                var addr = utils_2.bin2hex(this.ctx.contractAddress);
                var k = utils_2.bin2hex(this.view.loadN(args[1], args[2]));
                var m = this.world.storage.get(addr) || new Map();
                return m.has(k) ? BigInt(1) : BigInt(0);
            }
            case DBType.NEXT:
            case DBType.CURRENT_KEY:
            case DBType.HAS_NEXT:
            case DBType.CURRENT_VALUE:
            case DBType.RESET: {
                throw new Error('not implemented yet');
            }
        }
    };
    DBHost.prototype.name = function () {
        return '_db';
    };
    return DBHost;
}(AbstractHost));
exports.DBHost = DBHost;
var ContextHost = /** @class */ (function (_super) {
    __extends(ContextHost, _super);
    function ContextHost(world, ctx) {
        var _this = _super.call(this, world) || this;
        _this.ctx = ctx;
        return _this;
    }
    ContextHost.prototype.execute = function (args) {
        var type = Number(args[0]);
        var ret = BigInt(0);
        var put = !vm_1.isZero(args[2]);
        var data = null;
        var offset = args[1];
        switch (type) {
            case ContextType.HEADER_PARENT_HASH: {
                data = this.world.parentHash;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.HEADER_CREATED_AT: {
                put = false;
                ret = BigInt(this.world.now);
                break;
            }
            case ContextType.HEADER_HEIGHT: {
                put = false;
                ret = BigInt(this.world.height);
                break;
            }
            case ContextType.TX_TYPE: {
                put = false;
                ret = BigInt(this.ctx.type);
                break;
            }
            case ContextType.TX_CREATED_AT: {
                put = false;
                break;
            }
            case ContextType.TX_ORIGIN: {
                data = this.ctx.origin;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.TX_GAS_PRICE: {
                break;
            }
            case ContextType.TX_AMOUNT: {
                data = utils_1.encodeBE(this.ctx.amount).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.TX_TO: {
                data = this.ctx.to;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.TX_SIGNATURE: {
                data = (new Uint8Array(32)).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.TX_HASH: {
                data = this.ctx.txHash;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.CONTRACT_ADDRESS: {
                data = this.ctx.contractAddress;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.CONTRACT_NONCE: {
                put = false;
                ret = BigInt(this.world.nonceMap.get(utils_2.bin2hex(this.ctx.contractAddress)) || 0);
                break;
            }
            case ContextType.ACCOUNT_NONCE: {
                put = false;
                var addr = utils_2.bin2hex(this.view.loadN(args[1], args[2]));
                ret = BigInt(this.world.nonceMap.get(utils_2.bin2hex(addr)) || 0);
                break;
            }
            case ContextType.ACCOUNT_BALANCE: {
                var addr = utils_2.bin2hex(this.view.loadN(args[1], args[2]));
                var b = this.world.balanceMap.get(utils_2.bin2hex(addr)) || types_1.ZERO;
                data = utils_1.encodeBE(b).buffer;
                offset = args[3];
                put = !vm_1.isZero(args[4]);
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.MSG_SENDER: {
                data = this.ctx.sender;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.MSG_AMOUNT: {
                data = utils_1.encodeBE(this.ctx.amount).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case ContextType.CONTRACT_CODE: {
                var addr = utils_2.bin2hex(this.view.loadN(args[1], args[2]));
                var code = this.world.contractCode.get(addr);
                data = utils_2.str2bin(code);
                put = !vm_1.isZero(args[4]);
                offset = args[3];
                break;
            }
            case ContextType.CONTRACT_ABI: {
                var abi = this.world.abiCache.get(utils_2.bin2hex(this.ctx.contractAddress));
                data = rlp.encode(contract_1.abiToBinary(abi));
                ret = BigInt(data.byteLength);
                put = !vm_1.isZero(args[4]);
                offset = args[3];
                break;
            }
        }
        if (put)
            this.view.put(offset, data);
        return ret;
    };
    ContextHost.prototype.name = function () {
        return '_context';
    };
    return ContextHost;
}(AbstractHost));
exports.ContextHost = ContextHost;
var RLPType;
(function (RLPType) {
    RLPType[RLPType["ENCODE_U64"] = 0] = "ENCODE_U64";
    RLPType[RLPType["ENCODE_BYTES"] = 1] = "ENCODE_BYTES";
    RLPType[RLPType["DECODE_BYTES"] = 2] = "DECODE_BYTES";
    RLPType[RLPType["RLP_LIST_SET"] = 3] = "RLP_LIST_SET";
    RLPType[RLPType["RLP_LIST_CLEAR"] = 4] = "RLP_LIST_CLEAR";
    RLPType[RLPType["RLP_LIST_LEN"] = 5] = "RLP_LIST_LEN";
    RLPType[RLPType["RLP_LIST_GET"] = 6] = "RLP_LIST_GET";
    RLPType[RLPType["RLP_LIST_PUSH"] = 7] = "RLP_LIST_PUSH";
    RLPType[RLPType["RLP_LIST_BUILD"] = 8] = "RLP_LIST_BUILD"; // build
})(RLPType || (RLPType = {}));
var RLPHost = /** @class */ (function (_super) {
    __extends(RLPHost, _super);
    function RLPHost() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RLPHost.prototype.execute = function (args) {
        var t = Number(args[0]);
        var ret = BigInt(0);
        var put = !vm_1.isZero(args[4]);
        var data;
        switch (t) {
            case RLPType.ENCODE_U64: {
                data = rlp.encode(args[1]).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case RLPType.ENCODE_BYTES: {
                var before = this.view.loadN(args[1], args[2]);
                data = rlp.encode(before).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case RLPType.DECODE_BYTES: {
                var encoded = this.view.loadN(args[1], args[2]);
                var decoded = rlp.decode(encoded);
                if (!(decoded instanceof Uint8Array))
                    throw new Error('rlp decode failed, not a rlp item');
                data = decoded.buffer;
                ret = BigInt(data.byteLength);
                break;
            }
            case RLPType.RLP_LIST_SET: {
                put = false;
                this.list = rlp.RLPList.fromEncoded(this.view.loadN(args[1], args[2]));
                break;
            }
            case RLPType.RLP_LIST_CLEAR: {
                put = false;
                this.list = null;
                break;
            }
            case RLPType.RLP_LIST_LEN: {
                put = false;
                ret = BigInt(this.list.elements.length);
                break;
            }
            case RLPType.RLP_LIST_GET: {
                data = this.list.raw(Number(args[1]));
                ret = BigInt(data.byteLength);
                break;
            }
            case RLPType.RLP_LIST_PUSH: {
                put = false;
                if (!this.elements)
                    this.elements = [];
                this.elementsEncoded = null;
                var bytes = this.view.loadN(args[1], args[2]);
                this.elements.push(new Uint8Array(bytes));
                break;
            }
            case RLPType.RLP_LIST_BUILD: {
                if (!this.elementsEncoded)
                    this.elementsEncoded = rlp.encodeElements(this.elements).buffer;
                data = this.elementsEncoded;
                ret = BigInt(data.byteLength);
                if (!vm_1.isZero(args[4])) {
                    this.elementsEncoded = null;
                    this.elements = null;
                }
                break;
            }
            default: {
                throw new Error("rlp: unknown type: " + t);
            }
        }
        if (put)
            this.view.put(args[3], data);
        return ret;
    };
    RLPHost.prototype.name = function () {
        return '_rlp';
    };
    return RLPHost;
}(AbstractHost));
exports.RLPHost = RLPHost;
var Reflect = /** @class */ (function (_super) {
    __extends(Reflect, _super);
    function Reflect() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Reflect.prototype.execute = function (args) {
        throw new Error('Method not implemented.');
    };
    Reflect.prototype.name = function () {
        return '_reflect';
    };
    return Reflect;
}(AbstractHost));
exports.Reflect = Reflect;
var Transfer = /** @class */ (function (_super) {
    __extends(Transfer, _super);
    function Transfer(world, ctx) {
        var _this = _super.call(this, world) || this;
        _this.ctx = ctx;
        return _this;
    }
    Transfer.prototype.execute = function (args) {
        if (!vm_1.isZero(args[0]))
            throw new Error('transfer: unexpected');
        var amount = new BN(new Uint8Array(this.view.loadN(args[3], args[4])), 10, 'be');
        var to = this.view.loadN(args[1], args[2]);
        this.world.subBalance(this.ctx.contractAddress, amount);
        this.world.addBalance(to, amount);
    };
    Transfer.prototype.name = function () {
        return '_transfer';
    };
    return Transfer;
}(AbstractHost));
exports.Transfer = Transfer;
var Uint256Type;
(function (Uint256Type) {
    Uint256Type[Uint256Type["PARSE"] = 0] = "PARSE";
    Uint256Type[Uint256Type["TOSTRING"] = 1] = "TOSTRING";
    Uint256Type[Uint256Type["ADD"] = 2] = "ADD";
    Uint256Type[Uint256Type["SUB"] = 3] = "SUB";
    Uint256Type[Uint256Type["MUL"] = 4] = "MUL";
    Uint256Type[Uint256Type["DIV"] = 5] = "DIV";
    Uint256Type[Uint256Type["MOD"] = 6] = "MOD";
})(Uint256Type || (Uint256Type = {}));
function mod(n) {
    while (n.isNeg())
        n = n.add(types_1.MAX_U256);
    return n.mod(types_1.MAX_U256);
}
var Uint256Host = /** @class */ (function (_super) {
    __extends(Uint256Host, _super);
    function Uint256Host() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Uint256Host.prototype.execute = function (args) {
        var t = Number(args[0]);
        var data;
        var put = !vm_1.isZero(args[6]);
        var ret = BigInt(0);
        var offset = args[5];
        switch (t) {
            case Uint256Type.ADD: {
                data = utils_1.encodeBE(mod(this.getX(args).add(this.getY(args))));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.SUB: {
                data = utils_1.encodeBE(mod(this.getX(args).sub(this.getY(args))));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.MUL: {
                data = utils_1.encodeBE(mod(this.getX(args).mul(this.getY(args))));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.DIV: {
                data = utils_1.encodeBE(mod(this.getX(args).div(this.getY(args))));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.MOD: {
                data = utils_1.encodeBE(mod(this.getX(args).mod(this.getY(args))));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.PARSE: {
                var str = this.view.loadUTF8(args[1], args[2]);
                var radix = Number(args[3]);
                data = utils_1.encodeBE(mod(new BN(str, radix)));
                ret = BigInt(data.byteLength);
                break;
            }
            case Uint256Type.TOSTRING: {
                data = utils_2.str2bin(this.getX(args).toString(Number(args[3]))).buffer;
                ret = BigInt(data.byteLength);
                break;
            }
        }
        if (put)
            this.view.put(offset, data);
        return ret;
    };
    Uint256Host.prototype.name = function () {
        return '_u256';
    };
    Uint256Host.prototype.getX = function (args) {
        return new BN(new Uint8Array(this.view.loadN(args[1], args[2])), 10, 'be');
    };
    Uint256Host.prototype.getY = function (args) {
        return new BN(new Uint8Array(this.view.loadN(args[3], args[4])), 10, 'be');
    };
    return Uint256Host;
}(AbstractHost));
exports.Uint256Host = Uint256Host;
