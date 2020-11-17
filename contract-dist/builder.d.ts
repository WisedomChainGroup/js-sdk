import { AbiInput, Binary, Digital } from "./types";
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
    buildDeploy(contract: Contract, _parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Transaction;
    /**
     * 构造合约调用事务
     */
    buildContractCall(contract: Contract, method: string, _parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Transaction;
    /**
     * 创建事务
     */
    buildCommon(type: Digital, amount: Digital, payload: Binary, to: Binary): Transaction;
}
