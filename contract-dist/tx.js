"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
/**
 * 事务
 */
var types_1 = require("./types");
var utils_1 = require("./utils");
var utils_2 = require("./utils");
var BN = require("../bn");
var rlp = require("./rlp");
var nacl = require("../nacl.min.js");
var contract_1 = require("./contract");
var Transaction = /** @class */ (function () {
    /**
     * constructor of transaction
     */
    function Transaction(version, type, nonce, from, gasPrice, amount, payload, to, signature, __abi, __inputs) {
        this.version = utils_1.dig2str(version || 0);
        this.type = utils_1.dig2str(type || 0);
        this.nonce = utils_1.dig2str(nonce || 0);
        this.from = utils_2.bin2hex(from || '');
        this.gasPrice = utils_1.dig2str(gasPrice || 0);
        this.amount = utils_1.dig2str(amount || 0);
        this.payload = utils_2.bin2hex(payload || '');
        this.to = utils_2.bin2hex(to || '');
        this.signature = utils_2.bin2hex(signature || '');
        this.__abi = __abi;
        this.__inputs = __inputs;
    }
    Transaction.clone = function (o) {
        return new Transaction(o.version, o.type, o.nonce, o.from, o.gasPrice, o.amount, o.payload, o.to, o.signature);
    };
    /**
     * 解析16进制字符串的事务，包含哈希值
     * @param x
     */
    Transaction.fromRPCBytes = function (x) {
        return Transaction.fromRaw(x, true);
    };
    /**
     *
     * @param x 解析16进制字符串的事务
     */
    Transaction.fromRaw = function (x, hash) {
        if (hash === void 0) { hash = false; }
        var args = [];
        var offset = 0;
        var shift = function (n) {
            offset = offset + n;
            return offset;
        };
        var u8 = utils_1.hex2bin(x);
        // version
        args.push(u8[offset++]);
        // skip hash
        if (hash)
            offset += 32;
        // type
        args.push(u8[offset++]);
        // nonce
        args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'));
        // from
        args.push(u8.slice(offset, shift(32)));
        // gasprice
        args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'));
        // amount
        args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'));
        // signature
        var sig = u8.slice(offset, shift(64));
        // to
        var to = u8.slice(offset, shift(20));
        // payload length
        var len = (new BN(u8.slice(offset, shift(4)), 'hex', 'be')).toNumber();
        // payload
        var p = u8.slice(offset, shift(len));
        args.push(p, to, sig);
        return new (Transaction.bind.apply(Transaction, __spreadArrays([void 0], args)))();
    };
    /**
     * 计算事务哈希值
     */
    Transaction.prototype.getHash = function () {
        return utils_1.digest(this.getRaw(false));
    };
    /**
     * 生成事务签名或者哈希值计算需要的原文
     * 如果需要签名的话 getRaw 填写 true
     */
    Transaction.prototype.getRaw = function (nullSig) {
        var sig = nullSig ? new Uint8Array(64) : utils_1.hex2bin(this.signature);
        var p = utils_1.hex2bin(this.payload);
        return utils_1.concatArray([
            new Uint8Array([parseInt(this.version)]),
            new Uint8Array([parseInt(this.type)]),
            utils_1.padPrefix((new BN(this.nonce)).toArrayLike(Uint8Array, 'be'), 0, 8),
            utils_1.hex2bin(this.from),
            utils_1.padPrefix((new BN(this.gasPrice)).toArrayLike(Uint8Array, 'be'), 0, 8),
            utils_1.padPrefix((new BN(this.amount)).toArrayLike(Uint8Array, 'be'), 0, 8),
            sig,
            utils_1.hex2bin(this.to),
            utils_1.padPrefix((new BN(p.length)).toArrayLike(Uint8Array, 'be'), 0, 4),
            p
        ]);
    };
    /**
     * rlp 编码结果
     */
    Transaction.prototype.getEncoded = function () {
        var arr = this.__toArr();
        return rlp.encode(arr);
    };
    Transaction.prototype.__toArr = function () {
        return [
            utils_1.convert(this.version || 0, types_1.ABI_DATA_TYPE.u64),
            utils_1.convert(this.type || 0, types_1.ABI_DATA_TYPE.u64),
            utils_1.convert(this.nonce || '0', types_1.ABI_DATA_TYPE.u64),
            utils_1.convert(this.from || '', types_1.ABI_DATA_TYPE.bytes),
            utils_1.convert(this.gasPrice || '0', types_1.ABI_DATA_TYPE.u256),
            utils_1.convert(this.amount || '0', types_1.ABI_DATA_TYPE.u256),
            utils_1.convert(this.payload || '', types_1.ABI_DATA_TYPE.bytes),
            utils_1.hex2bin(this.to),
            utils_1.convert(this.signature || '', types_1.ABI_DATA_TYPE.bytes)
        ];
    };
    /**
     * 签名
     */
    Transaction.prototype.sign = function (_sk) {
        var sk = utils_1.hex2bin(_sk);
        sk = utils_1.extendPrivateKey(sk);
        this.signature = utils_2.bin2hex(nacl.sign(this.getRaw(true), sk).slice(0, 64));
    };
    Transaction.prototype.__setInputs = function (__inputs) {
        var cnv = function (x) {
            if (x instanceof ArrayBuffer || x instanceof Uint8Array)
                return utils_2.bin2hex(x);
            if (x instanceof BN || typeof x === 'bigint')
                return utils_1.toSafeInt(x);
            return x;
        };
        if (Array.isArray(__inputs)) {
            this.__inputs = __inputs.map(cnv);
        }
        else {
            this.__inputs = {};
            for (var _i = 0, _a = Object.keys(__inputs); _i < _a.length; _i++) {
                var k = _a[_i];
                this.__inputs[k] = cnv(__inputs[k]);
            }
        }
        if (Array.isArray(this.__inputs)) {
            var c = new contract_1.Contract('', this.__abi);
            var a = c.getABI(this.getMethod(), 'function');
            if (a.inputsObj()) {
                this.__inputs = a.toObj(this.__inputs, true);
            }
        }
    };
    Transaction.prototype.getMethod = function () {
        var t = parseInt(this.type);
        return t === types_1.constants.WASM_DEPLOY ? 'init' : utils_1.bin2str((rlp.decode(utils_1.hex2bin(this.payload)))[1]);
    };
    Transaction.prototype.isDeployOrCall = function () {
        var t = parseInt(this.type);
        return t === types_1.constants.WASM_DEPLOY || t === types_1.constants.WASM_CALL;
    };
    return Transaction;
}());
exports.Transaction = Transaction;
//# sourceMappingURL=tx.js.map