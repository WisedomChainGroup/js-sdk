"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contract = exports.normalizeParams = exports.ABI = exports.TypeDef = exports.compileABI = exports.compileContract = exports.getContractAddress = void 0;
var types_1 = require("./types");
var child_process = require("child_process");
var utils_1 = require("./utils");
var BN = require("../bn");
var utils_2 = require("./utils");
var rlp = require("./rlp");
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
    var cmd = ascPath + ' ' + src + ' -b '; // 执行的命令
    if (opts && opts.debug)
        cmd += ' --debug ';
    if (opts && opts.optimize)
        cmd += ' --optimize ';
    return new Promise(function (resolve, reject) {
        child_process.exec(cmd, { encoding: 'buffer' }, function (err, stdout, stderr) {
            if (err) {
                // err.code 是进程退出时的 exit code，非 0 都被认为错误
                // err.signal 是结束进程时发送给它的信号值
                reject(stderr.toString('ascii'));
            }
            resolve(stdout);
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
        utils_1.assert(types_1.ABI_DATA_TYPE_TABLE.indexOf(type) >= 0, "invalid abi type def name = " + name + " type = " + type);
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
    if (typeof params === 'string' || typeof params === 'boolean' || typeof params === 'number' || params instanceof ArrayBuffer || params instanceof Uint8Array || params instanceof BN)
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
                val = utils_2.bin2hex(arr[i]);
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
var Contract = /** @class */ (function () {
    function Contract(address, abi, binary) {
        if (address)
            this.address = utils_2.bin2hex(utils_1.normalizeAddress(address));
        this.abi = (abi || []).map(ABI.from);
        if (binary)
            this.binary = utils_1.hex2bin(binary);
    }
    Contract.prototype.abiEncode = function (name, li) {
        var func = this.getABI(name, 'function');
        var retType = func.outputs && func.outputs[0] && func.outputs[0].type;
        var retTypes = retType ? [types_1.ABI_DATA_TYPE_TABLE.indexOf(retType)] : [];
        if (typeof li === 'string' || typeof li === 'number' || li instanceof BN || li instanceof ArrayBuffer || li instanceof Uint8Array || typeof li === 'boolean')
            return this.abiEncode(name, [li]);
        if (li === undefined || li === null)
            return [[], [], retTypes];
        if (Array.isArray(li)) {
            var arr_1 = [];
            var types_2 = [];
            if (li.length != func.inputs.length)
                throw new Error("abi encode failed for " + func.name + ", expect " + func.inputs.length + " parameters while " + li.length + " found");
            for (var i = 0; i < li.length; i++) {
                arr_1[i] = utils_1.convert(li[i], types_1.ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type));
                types_2[i] = types_1.ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type);
            }
            return [types_2, arr_1, retTypes];
        }
        var arr = [];
        var types = [];
        for (var i = 0; i < func.inputs.length; i++) {
            var input = func.inputs[i];
            types[i] = types_1.ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type);
            if (!(input.name in li)) {
                throw new Error("key " + input.name + " not found in parameters");
            }
            arr[i] = utils_1.convert(li[input.name], types_1.ABI_DATA_TYPE_TABLE.indexOf(input.type));
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
        var ret = [];
        for (var _i = 0, _a = this.abi; _i < _a.length; _i++) {
            var a = _a[_i];
            ret.push([a.name, a.type === 'function' ? 0 : 1, a.inputs.map(function (x) { return types_1.ABI_DATA_ENUM[x.type]; }), a.outputs.map(function (x) { return types_1.ABI_DATA_ENUM[x.type]; })]);
        }
        return ret;
    };
    Contract.prototype.getABI = function (name, type) {
        var funcs = this.abi.filter(function (x) { return x.type === type && x.name === name; });
        utils_1.assert(funcs.length === 1, "exact exists one and only one abi " + name + ", while found " + funcs.length);
        return funcs[0];
    };
    return Contract;
}());
exports.Contract = Contract;
