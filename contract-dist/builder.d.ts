/// <reference types="node" />
import { AbiInput, Binary, Digital } from "./types";
import Dict = NodeJS.Dict;
import { Contract } from "./contract";
import { Transaction } from "./tx";
export declare class TransactionBuilder {
    version: string;
    sk: string;
    gasLimit: string;
    gasPrice: string;
    nonce: string;
    constructor(version?: Digital, sk?: Binary, gasLimit?: Digital, gasPrice?: Digital, nonce?: Digital);
    increaseNonce(): void;
    /**
     * 构造部署合约的事务
     */
    buildDeploy(contract: Contract, _parameters?: AbiInput | AbiInput[] | Dict<AbiInput>, amount?: Digital): Transaction;
    /**
     * 构造合约调用事务
     * @param { Contract} contract 合约
     * @param {string} method 调用合约的方法
     * @param { Array | Object } [parameters] 方法参数
     * @param amount [number] 金额
     * @returns { Transaction }
     */
    buildContractCall(contract: Contract, method: string, _parameters?: AbiInput | AbiInput[] | Dict<AbiInput>, amount?: Digital): Transaction;
    /**
     * 创建事务
     */
    buildCommon(type: Digital, amount: Digital, payload: Binary, to: Binary): Transaction;
}
