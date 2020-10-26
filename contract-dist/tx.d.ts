/// <reference types="node" />
/**
 * 事务
 */
import { AbiInput, Binary, Digital, Readable } from "./types";
import BN = require("../bn");
import { Encoder } from "./rlp";
import { ABI } from "./contract";
import Dict = NodeJS.Dict;
export declare class Transaction implements Encoder {
    version: string;
    type: string;
    nonce: string;
    from: string;
    gasPrice: string;
    amount: string;
    payload: string;
    to: string;
    signature: string;
    __abi?: ABI[];
    __inputs?: Readable[] | Dict<Readable>;
    /**
     * constructor of transaction
     */
    constructor(version?: Digital, type?: Digital, nonce?: Digital, from?: Binary, gasPrice?: Digital, amount?: Digital, payload?: Binary, to?: Binary, signature?: Binary, __abi?: any, __inputs?: any);
    static clone(o: any): Transaction;
    /**
     * 计算事务哈希值
     */
    getHash(): Uint8Array;
    /**
     * 生成事务签名或者哈希值计算需要的原文
     */
    getRaw(nullSig: boolean): Uint8Array;
    /**
     * rlp 编码结果
     */
    getEncoded(): Uint8Array;
    __toArr(): Array<string | Uint8Array | BN>;
    /**
     * 签名
     */
    sign(_sk: Binary): void;
    __setInputs(__inputs: AbiInput[] | Dict<AbiInput>): void;
    getMethod(): string;
    isDeployOrCall(): boolean;
}
