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
exports.Contract = exports.normalizeParams = exports.ABI = exports.TypeDef = exports.compileABI = exports.compileContract = exports.getContractAddress = exports.abiToBinary = void 0;
var types_1 = require("./types");
var utils_1 = require("./utils");
var BN = require("../bn");
var rlp = require("./rlp");
/**
 * 合约部署的 paylod
 */
function abiToBinary(abi) {
    var ret = [];
    for (var _i = 0, abi_1 = abi; _i < abi_1.length; _i++) {
        var a = abi_1[_i];
        ret.push([a.name, a.type === 'function' ? 0 : 1, a.inputs.map(function (x) { return types_1.ABI_DATA_TYPE[x.type]; }), a.outputs.map(function (x) { return types_1.ABI_DATA_TYPE[x.type]; })]);
    }
    return ret;
}
exports.abiToBinary = abiToBinary;
/**
 * 计算合约地址
 */
function getContractAddress(hash) {
    var buf = rlp.encode([utils_1.hex2bin(hash), 0]);
    buf = utils_1.rmd160(buf);
    return utils_1.publicKeyHash2Address(buf);
}
exports.getContractAddress = getContractAddress;
function compileContract(ascPath, src, opts) {
    return __awaiter(this, void 0, void 0, function () {
        var child_process_1, cmd_1, asc, arr, stdout, stderr;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (typeof ascPath === 'string' && typeof src === 'string') {
                        child_process_1 = require('child_process');
                        cmd_1 = ascPath + ' ' + src + ' -b ' // 执行的命令
                        ;
                        if (opts && opts.debug)
                            cmd_1 += ' --debug ';
                        if (opts && opts.optimize)
                            cmd_1 += ' --optimize ';
                        return [2 /*return*/, new Promise(function (rs, rj) {
                                child_process_1.exec(cmd_1, { encoding: 'buffer' }, function (err, stdout, stderr) {
                                    if (err) {
                                        // err.code 是进程退出时的 exit code，非 0 都被认为错误
                                        // err.signal 是结束进程时发送给它的信号值
                                        rj(stderr.toString('ascii'));
                                        return;
                                    }
                                    rs(stdout);
                                });
                            })];
                    }
                    asc = require("assemblyscript/cli/asc");
                    if (typeof src !== 'string') {
                        src = ascPath;
                    }
                    if (typeof src !== 'string')
                        throw new Error('invalid source file ' + src);
                    arr = [
                        src,
                        "-b"
                    ];
                    stdout = new MemoryOutputStream();
                    stderr = new MemoryOutputStream();
                    if (opts && opts.debug)
                        arr.push('--debug');
                    if (opts && opts.optimize)
                        arr.push('--optimize');
                    return [4 /*yield*/, asc.ready];
                case 1:
                    _a.sent();
                    return [2 /*return*/, new Promise(function (rs, rj) {
                            asc.main(arr, {
                                stdout: stdout,
                                stderr: stderr
                            }, function (err) {
                                if (err) {
                                    rj(utils_1.bin2str(stderr.buf));
                                    return;
                                }
                                rs(stdout.buf);
                            });
                        })];
            }
        });
    });
}
exports.compileContract = compileContract;
/**
 * 编译合约 ABI
 */
function compileABI(_str) {
    var str = utils_1.bin2str(_str);
    var TYPES = {
        u64: 'u64',
        i64: 'i64',
        f64: 'f64',
        bool: 'bool',
        string: 'string',
        ArrayBuffer: 'bytes',
        Address: 'address',
        U256: 'u256',
        String: 'string',
        boolean: 'bool'
    };
    function getOutputs(str) {
        if (str === 'void')
            return [];
        var ret = TYPES[str];
        if (!ret)
            throw new Error("invalid type: " + str);
        return [new TypeDef(ret)];
    }
    function getInputs(str, event) {
        var ret = [];
        for (var _i = 0, _a = str.split(','); _i < _a.length; _i++) {
            var p = _a[_i];
            if (!p)
                continue;
            var lr = p.split(':');
            var l = lr[0].trim();
            if (event) {
                if (!l.startsWith('readonly'))
                    throw new Error("event constructor field " + l + " should starts with readonly");
                l = l.split(' ')[1];
            }
            var r = lr[1].trim();
            var o = new TypeDef(TYPES[r], l);
            if (!o.type)
                throw new Error("invalid type: " + r);
            ret.push(o);
        }
        return ret;
    }
    var ret = [];
    var funRe = /export[\s\n\t]+function[\s\n\t]+([a-zA-Z_][a-zA-Z0-9_]*)[\s\n\t]*\(([a-z\n\s\tA-Z0-9_,:]*)\)[\s\n\t]*:[\s\n\t]*([a-zA-Z_][a-zA-Z0-9_]*)[\s\n\t]*{/g;
    var eventRe = /@unmanaged[\s\n\t]+class[\s\n\t]+([a-zA-Z_][a-zA-Z0-9]*)[\s\n\t]*\{[\s\n\t]*constructor[\s\n\t]*\(([a-z\n\s\tA-Z0-9_,:]*)\)/g;
    var contains__idof = false;
    for (var _i = 0, _a = (str.match(funRe) || []); _i < _a.length; _i++) {
        var m = _a[_i];
        funRe.lastIndex = 0;
        var r = funRe.exec(m);
        if (r[1] === '__idof') {
            contains__idof = true;
            continue;
        }
        ret.push(new ABI(r[1], 'function', getInputs(r[2]), getOutputs(r[3])));
    }
    for (var _b = 0, _c = (str.match(eventRe) || []); _b < _c.length; _b++) {
        var m = _c[_b];
        eventRe.lastIndex = 0;
        var r = eventRe.exec(m);
        ret.push(new ABI(r[1], 'event', [], getInputs(r[2], true)));
    }
    if (!contains__idof)
        throw new Error('any contract must contains an __idof function');
    return ret;
}
exports.compileABI = compileABI;
var TypeDef = /** @class */ (function () {
    function TypeDef(type, name) {
        type = type && type.toLocaleLowerCase();
        utils_1.assert(types_1.ABI_DATA_TYPE[type] !== undefined, "invalid abi type def name = " + name + " type = " + type);
        this.type = type;
        this.name = name;
    }
    TypeDef.from = function (o) {
        return new TypeDef(o.type, o.name);
    };
    return TypeDef;
}());
exports.TypeDef = TypeDef;
var ABI = /** @class */ (function () {
    function ABI(name, type, inputs, outputs) {
        utils_1.assert(name, 'expect name of abi');
        utils_1.assert(type === 'function' || type === 'event', "invalid abi type " + type);
        utils_1.assert(!inputs || Array.isArray(inputs), "invalid inputs " + inputs);
        utils_1.assert(!outputs || Array.isArray(outputs), "invalid inputs " + outputs);
        this.name = name;
        this.type = type;
        this.inputs = (inputs || []).map(TypeDef.from);
        this.outputs = (outputs || []).map(TypeDef.from);
    }
    ABI.from = function (o) {
        return new ABI(o.name, o.type, o.inputs, o.outputs);
    };
    // able to return object instead of array
    ABI.prototype.returnsObj = function () {
        return this.outputs.every(function (v) { return v.name; }) && ((new Set(this.outputs.map(function (v) { return v.name; }))).size === this.outputs.length);
    };
    // able to input object instead of array
    ABI.prototype.inputsObj = function () {
        return this.inputs.every(function (v) { return v.name; }) && ((new Set(this.inputs.map(function (v) { return v.name; }))).size === this.inputs.length);
    };
    ABI.prototype.toObj = function (arr, input) {
        var p = input ? this.inputs : this.outputs;
        var o = {};
        for (var i = 0; i < p.length; i++) {
            o[p[i].name] = arr[i];
        }
        return o;
    };
    ABI.prototype.toArr = function (obj, input) {
        var p = input ? this.inputs : this.outputs;
        var arr = [];
        for (var i = 0; i < p.length; i++) {
            arr.push(obj[p[i].name]);
        }
        return arr;
    };
    return ABI;
}());
exports.ABI = ABI;
function normalizeParams(params) {
    if (params === null || params === undefined)
        return [];
    if (typeof params === 'bigint' || typeof params === 'string' || typeof params === 'boolean' || typeof params === 'number' || params instanceof ArrayBuffer || params instanceof Uint8Array || params instanceof BN)
        return [params];
    return params;
}
exports.normalizeParams = normalizeParams;
function abiDecode(outputs, buf) {
    buf = buf || [];
    var len = buf.length;
    if (len === 0)
        return [];
    var arr = buf;
    var returnObject = outputs.every(function (v) { return v.name; }) && ((new Set(outputs.map(function (v) { return v.name; }))).size === outputs.length);
    if (arr.length != outputs.length)
        throw new Error("abi decode failed , expect " + outputs.length + " returns while " + arr.length + " found");
    var ret = returnObject ? {} : [];
    for (var i = 0; i < arr.length; i++) {
        var t = outputs[i].type;
        var name_1 = outputs[i].name;
        var val = void 0;
        switch (t) {
            case 'bytes': {
                val = utils_1.bin2hex(arr[i]);
                break;
            }
            case 'address': {
                val = utils_1.publicKeyHash2Address(arr[i]);
                break;
            }
            case 'u256':
            case 'u64': {
                var n = new BN(arr[i]);
                if (t === 'u64')
                    utils_1.assert(n.cmp(types_1.MAX_U64) <= 0, n.toString(10) + " overflows max u64 " + types_1.MAX_U64.toString(10));
                if (t === 'u256')
                    utils_1.assert(n.cmp(types_1.MAX_U256) <= 0, n.toString(10) + " overflows max u256 " + types_1.MAX_U256.toString(10));
                val = utils_1.toSafeInt(n);
                break;
            }
            case 'i64': {
                var n = void 0;
                var padded = utils_1.padPrefix(arr[i], 0, 8);
                var isneg = padded[0] & 0x80;
                if (!isneg) {
                    n = new BN(arr[i]);
                }
                else {
                    n = new BN(utils_1.inverse(padded));
                    n = n.add(types_1.ONE);
                    n = n.neg();
                }
                val = utils_1.toSafeInt(n);
                break;
            }
            case 'f64': {
                val = utils_1.bytesToF64(arr[i]);
                break;
            }
            case 'string': {
                val = utils_1.bin2str(arr[i]);
                break;
            }
            case 'bool': {
                val = arr[i].length > 0;
                break;
            }
        }
        if (returnObject)
            ret[name_1] = val;
        else
            ret[i] = val;
    }
    return ret;
}
var MemoryOutputStream = /** @class */ (function () {
    function MemoryOutputStream() {
        this.buf = new Uint8Array();
    }
    MemoryOutputStream.prototype.write = function (chunk) {
        if (typeof chunk === 'string')
            this.buf = utils_1.concatBytes(this.buf, utils_1.str2bin(chunk));
        else
            this.buf = utils_1.concatBytes(this.buf, chunk);
    };
    return MemoryOutputStream;
}());
var Contract = /** @class */ (function () {
    function Contract(address, abi, binary) {
        if (address)
            this.address = utils_1.bin2hex(utils_1.normalizeAddress(address));
        this.abi = (abi || []).map(ABI.from);
        if (binary)
            this.binary = utils_1.hex2bin(binary);
    }
    Contract.prototype.abiEncode = function (name, li) {
        var func = this.getABI(name, 'function');
        var retType = func.outputs && func.outputs[0] && func.outputs[0].type;
        var retTypes = retType ? [types_1.ABI_DATA_TYPE[retType]] : [];
        if (typeof li === 'string' || typeof li === 'number' || li instanceof BN || li instanceof ArrayBuffer || li instanceof Uint8Array || typeof li === 'boolean' || typeof li === 'bigint')
            return this.abiEncode(name, [li]);
        if (li === undefined || li === null)
            return [[], [], retTypes];
        if (Array.isArray(li)) {
            var arr_1 = [];
            var types_2 = [];
            if (li.length != func.inputs.length)
                throw new Error("abi encode failed for " + func.name + ", expect " + func.inputs.length + " parameters while " + li.length + " found");
            for (var i = 0; i < li.length; i++) {
                var t = types_1.ABI_DATA_TYPE[func.inputs[i].type];
                arr_1[i] = utils_1.convert(li[i], t);
                types_2[i] = t;
            }
            return [types_2, arr_1, retTypes];
        }
        var arr = [];
        var types = [];
        for (var i = 0; i < func.inputs.length; i++) {
            var input = func.inputs[i];
            types[i] = types_1.ABI_DATA_TYPE[func.inputs[i].type];
            if (!(input.name in li)) {
                throw new Error("key " + input.name + " not found in parameters");
            }
            arr[i] = utils_1.convert(li[input.name], types_1.ABI_DATA_TYPE[input.type]);
        }
        return [types, arr, retTypes];
    };
    Contract.prototype.abiDecode = function (name, buf, type) {
        type = type || 'function';
        buf = buf || [];
        if (buf.length === 0)
            return [];
        var a = this.getABI(name, type);
        var ret = abiDecode(a.outputs, buf);
        if (type === 'function')
            return ret && ret[0];
        return ret;
    };
    /**
     * 合约部署的 paylod
     */
    Contract.prototype.abiToBinary = function () {
        return abiToBinary(this.abi);
    };
    Contract.prototype.getABI = function (name, type) {
        var funcs = this.abi.filter(function (x) { return x.type === type && x.name === name; });
        utils_1.assert(funcs.length === 1, "exact exists one and only one abi " + name + ", while found " + funcs.length);
        return funcs[0];
    };
    return Contract;
}());
exports.Contract = Contract;
