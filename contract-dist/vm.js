"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualMachine = exports.isZero = exports.MemoryView = void 0;
var utils_1 = require("./utils");
var contract_1 = require("./contract");
var types_1 = require("./types");
var hosts_1 = require("./hosts");
var BN = require("../bn");
var rlp = require("./rlp");
var utf16Decoder = new TextDecoder('utf-16');
var utf8Decoder = new TextDecoder();
function strEncodeUTF16(str) {
    var buf = new ArrayBuffer(str.length * 2);
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}
var MemoryView = /** @class */ (function () {
    function MemoryView(mem) {
        this.view = new DataView(mem.buffer);
    }
    MemoryView.prototype.loadUTF8 = function (offset, length) {
        return utf8Decoder.decode(this.loadN(offset, length));
    };
    MemoryView.prototype.loadUTF16 = function (offset) {
        return utf16Decoder.decode(this.loadBuffer(Number(offset)));
    };
    MemoryView.prototype.loadU32 = function (offset) {
        return this.view.getUint32(Number(offset), true);
    };
    MemoryView.prototype.loadBuffer = function (offset) {
        var len = this.loadU32(Number(offset) - 4);
        return this.loadN(offset, len);
    };
    MemoryView.prototype.loadN = function (offset, length) {
        return this.view.buffer.slice(Number(offset), Number(offset) + Number(length));
    };
    MemoryView.prototype.put = function (offset, data) {
        new Uint8Array(this.view.buffer).set(new Uint8Array(data), Number(offset));
    };
    return MemoryView;
}());
exports.MemoryView = MemoryView;
function isZero(n) {
    return n === 0 || n === BigInt(0);
}
exports.isZero = isZero;
/**
 * virtual machine for chrome debugging
 */
var VirtualMachine = /** @class */ (function () {
    function VirtualMachine() {
        // current block height
        this.height = 0;
        // current block hash
        this.hash = (new Uint8Array(32)).buffer;
        // contract address -> url
        this.contractCode = new Map();
        // cache for abi
        this.abiCache = new Map();
        // record nonce
        this.nonceMap = new Map();
        this.balanceMap = new Map();
        this.storage = new Map();
        if (typeof WebAssembly !== 'object')
            throw new Error('webassembly not available here');
        this.nextBlock();
    }
    VirtualMachine.prototype.normParams = function (abi, params) {
        var p = contract_1.normalizeParams(params);
        if (Array.isArray(p))
            return p;
        var ret = [];
        abi.inputs.forEach(function (i) {
            ret.push(params[i.name]);
        });
        return ret;
    };
    VirtualMachine.prototype.putParams = function (instance, abi, params) {
        var arr;
        if (Array.isArray(params)) {
            arr = params;
        }
        else {
            arr = [];
            abi.inputs.forEach(function (x) { return arr.push(params[x.name]); });
        }
        for (var i = 0; i < abi.inputs.length; i++) {
            var t = types_1.ABI_DATA_TYPE[abi.inputs[i].type];
            var id = instance.exports.__idof(t);
        }
    };
    VirtualMachine.prototype.malloc = function (instance, val, type) {
        var view = new MemoryView(instance.exports.memory);
        var data;
        var id = Number(instance.exports.__idof(type));
        var offset;
        switch (type) {
            case types_1.ABI_DATA_TYPE.bool:
            case types_1.ABI_DATA_TYPE.f64:
            case types_1.ABI_DATA_TYPE.i64:
            case types_1.ABI_DATA_TYPE.u64: {
                var converted = utils_1.convert(val, type);
                var l = (converted instanceof Uint8Array ? new BN(converted, 10, 'be') : converted);
                return BigInt(l.toString(10));
            }
            case types_1.ABI_DATA_TYPE.string: {
                var converted = utils_1.convert(val, type);
                data = strEncodeUTF16(converted);
                offset = instance.exports.__alloc(data.byteLength, id);
                break;
            }
            case types_1.ABI_DATA_TYPE.bytes: {
                data = utils_1.convert(val, types_1.ABI_DATA_TYPE.bytes).buffer;
                offset = instance.exports.__alloc(data.byteLength, id);
                break;
            }
            case types_1.ABI_DATA_TYPE.u256: {
                var converted = utils_1.convert(val, type);
                var buf = utils_1.encodeBE(converted).buffer;
                var ptr = this.malloc(instance, buf, types_1.ABI_DATA_TYPE.bytes);
                data = utils_1.encodeUint32(ptr);
                offset = instance.exports.__alloc(4, id);
                break;
            }
            case types_1.ABI_DATA_TYPE.address: {
                var buf = utils_1.convert(val, types_1.ABI_DATA_TYPE.address).buffer;
                offset = instance.exports.__alloc(4, id);
                var ptr = this.malloc(instance, buf, types_1.ABI_DATA_TYPE.bytes);
                data = utils_1.encodeUint32(ptr);
                break;
            }
        }
        view.put(offset, data);
        instance.exports.__retain(offset);
        return offset;
    };
    VirtualMachine.prototype.alloc = function (address, amount) {
        this.balanceMap.set(utils_1.bin2hex(utils_1.normalizeAddress(address)), utils_1.convert(amount, types_1.ABI_DATA_TYPE.u256));
    };
    // 模拟下一区块的生成
    VirtualMachine.prototype.nextBlock = function () {
        this.height++;
        this.parentHash = this.hash;
        this.hash = utils_1.digest(rlp.encode(this.height)).buffer;
        this.now = Math.floor((new Date()).valueOf() / 1000);
    };
    VirtualMachine.prototype.addBalance = function (addr, amount) {
        var hex = utils_1.bin2hex(utils_1.normalizeAddress(addr));
        var balance = this.balanceMap.get(hex) || types_1.ZERO;
        balance = balance.add(utils_1.dig2BN(amount || types_1.ZERO));
        this.balanceMap.set(hex, balance);
    };
    VirtualMachine.prototype.subBalance = function (addr, amount) {
        var hex = utils_1.bin2hex(utils_1.normalizeAddress(addr));
        var balance = this.balanceMap.get(hex) || types_1.ZERO;
        var a = utils_1.dig2BN(amount || types_1.ZERO);
        if (balance.cmp(a) < 0)
            throw new Error("the balance of " + hex + " is not enough");
        balance = balance.sub(a);
        this.balanceMap.set(hex, balance);
    };
    VirtualMachine.prototype.increaseNonce = function (sender) {
        var senderHex = utils_1.bin2hex(utils_1.normalizeAddress(sender));
        var n = (this.nonceMap.get(senderHex) || 0) + 1;
        this.nonceMap.set(senderHex, n);
        return n;
    };
    VirtualMachine.prototype.call = function (sender, addr, method, params, amount) {
        var origin = utils_1.normalizeAddress(sender).buffer;
        var n = this.increaseNonce(sender);
        return this.callInternal(method, {
            type: null,
            sender: origin,
            to: utils_1.normalizeAddress(addr).buffer,
            amount: utils_1.dig2BN(amount || types_1.ZERO),
            nonce: n,
            origin: origin,
            txHash: utils_1.digest(rlp.encode([utils_1.normalizeAddress(sender), n])).buffer,
            contractAddress: utils_1.normalizeAddress(addr).buffer,
            readonly: false
        }, params);
    };
    VirtualMachine.prototype.callInternal = function (method, ctx, params) {
        return __awaiter(this, void 0, void 0, function () {
            var file, abi, mem, env, hosts, instance, a, arr, args, i, ret;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 1. substract amount
                        this.subBalance(ctx.sender, ctx.amount);
                        this.addBalance(ctx.contractAddress, ctx.amount);
                        ctx.type = method === 'init' ? 16 : 17;
                        file = this.contractCode.get(utils_1.bin2hex(ctx.contractAddress));
                        return [4 /*yield*/, this.fetchABI(file)];
                    case 1:
                        abi = _a.sent();
                        mem = new WebAssembly.Memory({ initial: 10, maximum: 65535 });
                        env = {
                            memory: mem,
                        };
                        hosts = [
                            new hosts_1.Log(this), new hosts_1.Abort(this), new hosts_1.Util(this),
                            new hosts_1.HashHost(this), new hosts_1.EventHost(this, ctx), new hosts_1.DBHost(this, ctx),
                            new hosts_1.ContextHost(this, ctx), new hosts_1.RLPHost(this), new hosts_1.Reflect(this),
                            new hosts_1.Transfer(this, ctx), new hosts_1.Uint256Host(this)
                        ];
                        hosts.forEach(function (h) {
                            h.init(env);
                            env[h.name()] = function () {
                                var args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    args[_i] = arguments[_i];
                                }
                                return h.execute(args);
                            };
                        });
                        return [4 /*yield*/, WebAssembly.instantiateStreaming(fetch(file), {
                                env: env
                            })];
                    case 2:
                        instance = (_a.sent()).instance;
                        if (typeof instance.exports[method] !== 'function') {
                            throw new Error("call internal failed: " + method + " not found");
                        }
                        a = abi.filter(function (x) { return x.type === 'function' && x.name === method; })[0];
                        arr = this.normParams(a, params);
                        args = [];
                        for (i = 0; i < a.inputs.length; i++) {
                            args.push(this.malloc(instance, arr[i], types_1.ABI_DATA_TYPE[a.inputs[i].type]));
                        }
                        ret = instance.exports[method].apply(window, args);
                        if (a.outputs && a.outputs.length)
                            return [2 /*return*/, this.extractRet(instance, ret, types_1.ABI_DATA_TYPE[a.outputs[0].type])];
                        return [2 /*return*/];
                }
            });
        });
    };
    VirtualMachine.prototype.extractRet = function (ins, offset, type) {
        var ret = this.extractRetInternal(ins, offset, type);
        if (ret instanceof ArrayBuffer)
            return utils_1.bin2hex(ret);
        return ret;
    };
    VirtualMachine.prototype.extractRetInternal = function (ins, offset, type) {
        var view = new MemoryView(ins.exports.memory);
        switch (type) {
            case types_1.ABI_DATA_TYPE.bool:
                return Number(type) !== 0;
            case types_1.ABI_DATA_TYPE.i64:
            case types_1.ABI_DATA_TYPE.u64:
                return utils_1.toSafeInt(offset);
            case types_1.ABI_DATA_TYPE.f64: {
                return offset;
            }
            case types_1.ABI_DATA_TYPE.string: {
                return utf16Decoder.decode(this.extractRetInternal(ins, offset, types_1.ABI_DATA_TYPE.bytes));
            }
            case types_1.ABI_DATA_TYPE.bytes: {
                var len = view.loadU32(Number(offset) - 4);
                return view.loadN(offset, len);
            }
            case types_1.ABI_DATA_TYPE.address:
            case types_1.ABI_DATA_TYPE.u256: {
                var ptr = view.loadU32(offset);
                return this.extractRetInternal(ins, ptr, types_1.ABI_DATA_TYPE.bytes);
            }
        }
    };
    VirtualMachine.prototype.view = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, null];
            });
        });
    };
    // 合约部署
    VirtualMachine.prototype.deploy = function (sender, wasmFile, parameters, amount) {
        return __awaiter(this, void 0, void 0, function () {
            var senderAddress, n, txHash, contractAddress, contractAddressHex, abi, a;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        senderAddress = utils_1.normalizeAddress(sender);
                        n = this.increaseNonce(sender);
                        txHash = utils_1.digest(rlp.encode([utils_1.normalizeAddress(sender), n]));
                        contractAddress = utils_1.normalizeAddress(contract_1.getContractAddress(txHash));
                        contractAddressHex = utils_1.bin2hex(contractAddress);
                        return [4 /*yield*/, this.fetchABI(wasmFile)];
                    case 1:
                        abi = _a.sent();
                        this.abiCache.set(contractAddressHex, abi);
                        this.contractCode.set(contractAddressHex, wasmFile);
                        a = abi.filter(function (x) { return x.type === 'function' && x.name === 'init'; })[0];
                        // try to execute init function
                        if (a) {
                            return [2 /*return*/, this.callInternal('init', {
                                    type: null,
                                    sender: senderAddress,
                                    to: new Uint8Array(20).buffer,
                                    amount: utils_1.dig2BN(amount || types_1.ZERO),
                                    nonce: n,
                                    origin: senderAddress,
                                    txHash: txHash.buffer,
                                    contractAddress: contractAddress.buffer,
                                    readonly: false
                                }, parameters)];
                        }
                        this.nextBlock();
                        return [2 /*return*/, null];
                }
            });
        });
    };
    // 根据文件名规范获取 abi
    VirtualMachine.prototype.fetchABI = function (wasmFile) {
        return __awaiter(this, void 0, void 0, function () {
            var f, resp, buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        f = wasmFile.replace(/^(.*)\.wasm$/, '$1.abi.json');
                        if (this.abiCache.has(f))
                            return [2 /*return*/, this.abiCache.get(f)];
                        return [4 /*yield*/, fetch(f)];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.arrayBuffer()];
                    case 2:
                        buf = _a.sent();
                        return [2 /*return*/, JSON.parse(utils_1.bin2str(buf))];
                }
            });
        });
    };
    return VirtualMachine;
}());
exports.VirtualMachine = VirtualMachine;
