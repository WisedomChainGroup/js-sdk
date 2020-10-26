import { AbiInput, Binary, constants, Digital, ONE } from "./types";
import { dig2str, assert, privateKey2PublicKey, normalizeAddress } from "./utils";
import { bin2hex } from "../contract";
import BN = require("../bn");
import Dict = NodeJS.Dict;
import { Contract, normalizeParams } from "./contract";
import { Transaction } from "./tx";
import rlp = require('./rlp')

export class TransactionBuilder {
    version: string
    sk: string
    gasLimit: string
    gasPrice: string
    nonce: string

    constructor(version?: Digital, sk?: Binary, gasLimit?: Digital, gasPrice?: Digital, nonce?: Digital) {
        this.version = dig2str(version || '1')
        this.sk = bin2hex(sk || '')
        this.gasPrice = dig2str(gasPrice || 0)
        this.nonce = dig2str(nonce || 0)
        this.gasLimit = dig2str(gasLimit || 0)
    }

    increaseNonce() {
        let nonce = new BN(this.nonce)
        nonce = nonce.add(ONE)
        this.nonce = nonce.toString(10)
    }

    /**
     * 构造部署合约的事务
     */
    buildDeploy(contract: Contract, _parameters?: AbiInput | AbiInput[] | Dict<AbiInput>, amount?: Digital): Transaction {
        if (!(contract instanceof Contract))
            throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

        assert(contract.binary, 'contract binary is uint8 array')

        if (!contract.abi)
            throw new Error('missing contract abi')


        let parameters = normalizeParams(_parameters)
        let inputs
        const binary = contract.binary
        if (contract.abi.filter(x => x.name === 'init').length > 0)
            inputs = contract.abiEncode('init', parameters)
        else
            inputs = [[], [], []]

        const ret = this.buildCommon(constants.WASM_DEPLOY, amount, rlp.encode([this.gasLimit || 0, binary, parameters, contract.abiToBinary()]), new Uint8Array(20))
        ret.__abi = contract.abi
        ret.__setInputs(inputs)
        return ret
    }

    /**
     * 构造合约调用事务
     * @param { Contract} contract 合约
     * @param {string} method 调用合约的方法
     * @param { Array | Object } [parameters] 方法参数
     * @param amount [number] 金额
     * @returns { Transaction }
     */
    buildContractCall(contract: Contract, method: string, _parameters?: AbiInput | AbiInput[] | Dict<AbiInput>, amount?: Digital) {
        if (!(contract instanceof Contract))
            throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

        if (!contract.abi)
            throw new Error('missing contract abi')

        if (!contract.address)
            throw new Error('missing contract address')

        let parameters = normalizeParams(_parameters)

        const addr = normalizeAddress(contract.address)
        let inputs = contract.abiEncode(method, parameters)

        const ret = this.buildCommon(constants.WASM_CALL, amount, rlp.encode([this.gasLimit || 0, method, inputs]), bin2hex(addr))
        ret.__abi = contract.abi
        ret.__setInputs(inputs)
        return ret
    }

    /**
     * 创建事务
     */
    buildCommon(type: Digital, amount: Digital, payload: Binary, to: Binary) {
        const ret = new Transaction(
            this.version,
            type,
            0,
            privateKey2PublicKey(this.sk),
            this.gasPrice,
            amount || 0,
            payload || '',
            normalizeAddress(to)
        )

        if (this.nonce) {
            ret.nonce = dig2str(this.nonce)
            this.increaseNonce()
            ret.sign(this.sk)
        }

        return ret
    }

}
