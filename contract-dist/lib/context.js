"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.Contract = exports.Transaction = exports.Msg = exports.Header = exports.Parameters = exports.ParametersBuilder = exports.TransactionType = exports.Address = exports.ABI_DATA_TYPE = exports.___idof = void 0;
var rlp_1 = require("./rlp");
var util_1 = require("./util");
/**
 * host function interface
 * @param type
 */
function ___idof(type) {
    switch (type) {
        case ABI_DATA_TYPE.STRING:
            return idof();
        case ABI_DATA_TYPE.BYTES:
            return idof();
        case ABI_DATA_TYPE.ADDRESS:
            return idof();
        case ABI_DATA_TYPE.U256:
            return idof();
    }
    return 0;
}
exports.___idof = ___idof;
function __getAbiOf() {
    if (isBoolean()) {
        return ABI_DATA_TYPE.BOOL;
    }
    if (isInteger()) {
        if (isSigned()) {
            return ABI_DATA_TYPE.I64;
        }
        else {
            return ABI_DATA_TYPE.U64;
        }
    }
    if (isFloat())
        return ABI_DATA_TYPE.F64;
    if (isString())
        return ABI_DATA_TYPE.STRING;
    if (idof() == idof())
        return ABI_DATA_TYPE.ADDRESS;
    if (idof() == idof())
        return ABI_DATA_TYPE.U256;
    assert(false, 'unexpected type ' + nameof());
    return ABI_DATA_TYPE.BOOL;
}
var ABI_DATA_TYPE;
(function (ABI_DATA_TYPE) {
    ABI_DATA_TYPE[ABI_DATA_TYPE["BOOL"] = 0] = "BOOL";
    ABI_DATA_TYPE[ABI_DATA_TYPE["I64"] = 1] = "I64";
    ABI_DATA_TYPE[ABI_DATA_TYPE["U64"] = 2] = "U64";
    ABI_DATA_TYPE[ABI_DATA_TYPE["F64"] = 3] = "F64";
    ABI_DATA_TYPE[ABI_DATA_TYPE["STRING"] = 4] = "STRING";
    ABI_DATA_TYPE[ABI_DATA_TYPE["BYTES"] = 5] = "BYTES";
    ABI_DATA_TYPE[ABI_DATA_TYPE["ADDRESS"] = 6] = "ADDRESS";
    ABI_DATA_TYPE[ABI_DATA_TYPE["U256"] = 7] = "U256";
})(ABI_DATA_TYPE = exports.ABI_DATA_TYPE || (exports.ABI_DATA_TYPE = {}));
function getBytes(type) {
    var len = u32(_context(type, 0, 0, 0, 0));
    var buf = new ArrayBuffer(u32(len));
    _context(type, changetype(buf), 1, 0, 0);
    return buf;
}
function getU64(type) {
    return _context(type, 0, 0, 0, 0);
}
var ReflectType;
(function (ReflectType) {
    ReflectType[ReflectType["CALL_WITHOUT_PUT"] = 0] = "CALL_WITHOUT_PUT";
    ReflectType[ReflectType["CALL_WITH_PUT"] = 1] = "CALL_WITH_PUT";
    ReflectType[ReflectType["CREATE"] = 2] = "CREATE";
})(ReflectType || (ReflectType = {}));
var Address = /** @class */ (function () {
    function Address(buf) {
        this.buf = buf;
    }
    Address.__op_gt = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) > 0;
    };
    Address.__op_gte = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) >= 0;
    };
    Address.__op_lt = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) < 0;
    };
    Address.__op_lte = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) <= 0;
    };
    Address.__op_eq = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) == 0;
    };
    Address.__op_ne = function (left, right) {
        return util_1.Util.compareBytes(left.buf, right.buf) != 0;
    };
    Address.prototype.transfer = function (amount) {
        var ptr = changetype(this.buf);
        _transfer(0, ptr, this.buf.byteLength, changetype(amount.buf), amount.buf.byteLength);
    };
    Address.prototype.call = function (method, parameters, amount) {
        var abiType = isVoid() ? rlp_1.RLP.emptyList() : rlp_1.RLP.encodeU64(__getAbiOf());
        abiType = isVoid() ? abiType : rlp_1.RLP.encodeElements([abiType]);
        var arr = [rlp_1.RLP.encodeElements(parameters.types), rlp_1.RLP.encodeElements(parameters.li), abiType];
        var buf = rlp_1.RLP.encodeElements(arr);
        var ptr0 = changetype(this.buf);
        var ptr0len = this.buf.byteLength;
        var str = String.UTF8.encode(method);
        var ptr1 = changetype(str);
        var ptr1len = str.byteLength;
        var ptr2 = changetype(buf);
        var ptr2len = buf.byteLength;
        var len = _reflect(ReflectType.CALL_WITHOUT_PUT, ptr0, ptr0len, ptr1, ptr1len, ptr2, ptr2len, changetype(amount.buf), amount.buf.byteLength, 0);
        var ret = new ArrayBuffer(u32(len));
        _reflect(ReflectType.CALL_WITH_PUT, ptr0, ptr0len, ptr1, ptr1len, ptr2, ptr2len, changetype(amount.buf), amount.buf.byteLength, changetype(ret));
        if (!isVoid()) {
            return rlp_1.RLP.decode(rlp_1.RLPList.fromEncoded(ret).getRaw(0));
        }
    };
    Address.prototype.balance = function () {
        var len = _context(ContextType.ACCOUNT_BALANCE, changetype(this.buf), this.buf.byteLength, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _context(ContextType.ACCOUNT_BALANCE, changetype(this.buf), this.buf.byteLength, changetype(ret), 1);
        return new util_1.U256(ret);
    };
    Address.prototype.nonce = function () {
        var ptr = changetype(this.buf);
        return _context(ContextType.ACCOUNT_NONCE, ptr, this.buf.byteLength, 0, 0);
    };
    // get contract code
    Address.prototype.code = function () {
        var ptr = changetype(this.buf);
        var len = _context(ContextType.CONTRACT_CODE, ptr, this.buf.byteLength, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _context(ContextType.CONTRACT_CODE, ptr, this.buf.byteLength, changetype(ret), 1);
        return ret;
    };
    // get contract abi
    Address.prototype.abi = function () {
        var ptr = changetype(this.buf);
        var len = _context(ContextType.CONTRACT_ABI, ptr, this.buf.byteLength, 0, 0);
        var ret = new ArrayBuffer(u32(len));
        _context(ContextType.CONTRACT_ABI, ptr, this.buf.byteLength, changetype(ret), 1);
        return ret;
    };
    Address.prototype.toString = function () {
        return util_1.Util.encodeHex(this.buf);
    };
    __decorate([
        operator(">")
    ], Address, "__op_gt", null);
    __decorate([
        operator(">=")
    ], Address, "__op_gte", null);
    __decorate([
        operator("<")
    ], Address, "__op_lt", null);
    __decorate([
        operator("<=")
    ], Address, "__op_lte", null);
    __decorate([
        operator("==")
    ], Address, "__op_eq", null);
    __decorate([
        operator("!=")
    ], Address, "__op_ne", null);
    return Address;
}());
exports.Address = Address;
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
var TransactionType;
(function (TransactionType) {
    TransactionType[TransactionType["COIN_BASE"] = 0] = "COIN_BASE";
    TransactionType[TransactionType["TRANSFER"] = 1] = "TRANSFER";
    TransactionType[TransactionType["CONTRACT_DEPLOY"] = 2] = "CONTRACT_DEPLOY";
    TransactionType[TransactionType["CONTRACT_CALL"] = 3] = "CONTRACT_CALL";
})(TransactionType = exports.TransactionType || (exports.TransactionType = {}));
var ParametersBuilder = /** @class */ (function () {
    function ParametersBuilder() {
        this.elements = new Array();
        this.types = new Array();
    }
    ParametersBuilder.prototype.push = function (data) {
        this.types.push(rlp_1.RLP.encodeU64(__getAbiOf()));
        this.elements.push(rlp_1.RLP.encode(data));
    };
    ParametersBuilder.prototype.build = function () {
        var ar = rlp_1.RLP.encodeElements(this.elements);
        return new Parameters(this.types, this.elements);
    };
    return ParametersBuilder;
}());
exports.ParametersBuilder = ParametersBuilder;
var Parameters = /** @class */ (function () {
    function Parameters(types, li) {
        this.types = types;
        this.li = li;
    }
    Parameters.EMPTY = new Parameters([], []);
    return Parameters;
}());
exports.Parameters = Parameters;
var Header = /** @class */ (function () {
    function Header(parentHash, createdAt, height) {
        this.parentHash = parentHash;
        this.createdAt = createdAt;
        this.height = height;
    }
    return Header;
}());
exports.Header = Header;
var Msg = /** @class */ (function () {
    function Msg(sender, amount) {
        this.sender = sender;
        this.amount = amount;
    }
    return Msg;
}());
exports.Msg = Msg;
var Transaction = /** @class */ (function () {
    function Transaction(nonce, origin, gasPrice, amount, to, signature, hash) {
        this.nonce = nonce;
        this.origin = origin;
        this.gasPrice = gasPrice;
        this.amount = amount;
        this.to = to;
        this.signature = signature;
        this.hash = hash;
    }
    return Transaction;
}());
exports.Transaction = Transaction;
var Contract = /** @class */ (function () {
    function Contract(address, nonce) {
        this.address = address;
        this.nonce = nonce;
    }
    return Contract;
}());
exports.Contract = Contract;
var Context = /** @class */ (function () {
    function Context() {
    }
    /**
     * get address of current contract
     */
    Context.self = function () {
        return new Address(getBytes(ContextType.CONTRACT_ADDRESS));
    };
    Context.emit = function (t) {
        var name = nameof();
        var nameBuf = util_1.Util.str2bin(name);
        if (isManaged())
            assert(false, 'class ' + name + ' should be annotated with @unmanaged');
        var buf = rlp_1.RLP.encode(t);
        _event(changetype(nameBuf), nameBuf.byteLength, changetype(buf), buf.byteLength);
    };
    Context.header = function () {
        return new Header(getBytes(ContextType.HEADER_PARENT_HASH), getU64(ContextType.HEADER_CREATED_AT), getU64(ContextType.HEADER_HEIGHT));
    };
    Context.msg = function () {
        return new Msg(new Address(getBytes(ContextType.MSG_SENDER)), new util_1.U256(getBytes(ContextType.MSG_AMOUNT)));
    };
    Context.transaction = function () {
        return new Transaction(getU64(ContextType.TX_NONCE), new Address(getBytes(ContextType.TX_ORIGIN)), new util_1.U256(getBytes(ContextType.TX_GAS_PRICE)), new util_1.U256(getBytes(ContextType.TX_AMOUNT)), new Address(getBytes(ContextType.TX_TO)), getBytes(ContextType.TX_SIGNATURE), getBytes(ContextType.TX_HASH));
    };
    Context.contract = function () {
        return new Contract(new Address(getBytes(ContextType.CONTRACT_ADDRESS)), getU64(ContextType.CONTRACT_NONCE));
    };
    Context.create = function (code, abi, parameters, amount) {
        var ptr0 = changetype(code);
        var ptr0len = code.byteLength;
        var arr = [rlp_1.RLP.encodeElements(parameters.types), rlp_1.RLP.encodeElements(parameters.li), rlp_1.RLP.emptyList()];
        var buf = rlp_1.RLP.encodeElements(arr);
        var ptr1 = changetype(buf);
        var ptr1len = buf.byteLength;
        var ret = new ArrayBuffer(20);
        _reflect(ReflectType.CREATE, ptr0, ptr0len, ptr1, ptr1len, changetype(abi), abi.byteLength, changetype(amount.buf), amount.buf.byteLength, changetype(ret));
        return new Address(ret);
    };
    return Context;
}());
exports.Context = Context;
