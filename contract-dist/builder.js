"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = void 0;
var types_1 = require("./types");
var utils_1 = require("./utils");
var utils_2 = require("./utils");
var BN = require("../bn");
var contract_1 = require("./contract");
var tx_1 = require("./tx");
var rlp = require("./rlp");
var TransactionBuilder = /** @class */ (function () {
    function TransactionBuilder(version, sk, gasLimit, gasPrice, nonce) {
        this.version = utils_1.dig2str(version || '1');
        this.sk = utils_2.bin2hex(sk || '');
        this.gasPrice = utils_1.dig2str(gasPrice || 0);
        this.nonce = utils_1.dig2str(nonce || 0);
        this.gasLimit = utils_1.dig2str(gasLimit || 0);
    }
    TransactionBuilder.prototype.increaseNonce = function () {
        var nonce = new BN(this.nonce);
        nonce = nonce.add(types_1.ONE);
        this.nonce = nonce.toString(10);
    };
    /**
     * 构造部署合约的事务
     */
    TransactionBuilder.prototype.buildDeploy = function (contract, _parameters, amount) {
        utils_1.assert(contract instanceof contract_1.Contract, 'create a instanceof Contract by new tool.Contract(addr, abi)');
        utils_1.assert(utils_1.isBin(contract.binary), 'contract binary should be uint8 array');
        utils_1.assert(contract.abi, 'missing contract abi');
        var parameters = contract_1.normalizeParams(_parameters);
        var inputs;
        var binary = contract.binary;
        if (contract.abi.filter(function (x) { return x.name === 'init'; }).length > 0)
            inputs = contract.abiEncode('init', parameters);
        else
            inputs = [[], [], []];
        var ret = this.buildCommon(types_1.constants.WASM_DEPLOY, amount, rlp.encode([
            utils_2.convert(this.gasLimit || 0, types_1.ABI_DATA_TYPE.u256),
            utils_1.hex2bin(binary),
            inputs,
            contract.abiToBinary()
        ]), new Uint8Array(20));
        ret.__abi = contract.abi;
        ret.__setInputs(parameters);
        return ret;
    };
    /**
     * 构造合约调用事务
     */
    TransactionBuilder.prototype.buildContractCall = function (contract, method, _parameters, amount) {
        utils_1.assert(contract instanceof contract_1.Contract, 'create a instanceof Contract by new tool.Contract(addr, abi)');
        utils_1.assert(contract.abi, 'missing contract abi');
        utils_1.assert(contract.address, 'missing contract address');
        var parameters = contract_1.normalizeParams(_parameters);
        var addr = utils_1.normalizeAddress(contract.address);
        var inputs = contract.abiEncode(method, parameters);
        var ret = this.buildCommon(types_1.constants.WASM_CALL, amount, rlp.encode([utils_2.convert(this.gasLimit || 0, types_1.ABI_DATA_TYPE.u256), method, inputs]), utils_2.bin2hex(addr));
        ret.__abi = contract.abi;
        ret.__setInputs(parameters);
        return ret;
    };
    /**
     * 创建事务
     */
    TransactionBuilder.prototype.buildCommon = function (type, amount, payload, to) {
        var ret = new tx_1.Transaction(this.version, type, 0, utils_1.privateKey2PublicKey(this.sk), this.gasPrice, amount || 0, payload || '', to);
        if (this.nonce) {
            ret.nonce = utils_1.dig2str(this.nonce);
            this.increaseNonce();
            ret.sign(this.sk);
        }
        return ret;
    };
    return TransactionBuilder;
}());
exports.TransactionBuilder = TransactionBuilder;
