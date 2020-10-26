/// <reference types="node" />
import { AbiInput, Binary, Readable, RLPElement, TransactionResult, TX_STATUS, WS_CODES } from "./types";
import { Contract } from "./contract";
import { Transaction } from "./tx";
import Dict = NodeJS.Dict;
export interface Resp {
    code: WS_CODES;
    nonce: number;
    body: RLPElement | RLPElement[];
}
export declare class RPC {
    host: string;
    port: string;
    private callbacks;
    private id2key;
    private id2hash;
    private eventHandlers;
    private txObservers;
    private cid;
    private rpcCallbacks;
    private nonce;
    private ws;
    private uuid;
    /**
     *
     * @param host  主机名
     * @param port  端口号
     */
    constructor(host?: string, port?: string | number);
    private tryConnect;
    private parse;
    private handleData;
    /**
     * 监听合约事件
     * @param {Contract} contract 合约
     * @param {string} event 事件
     * @param {Function} func 合约事件回调 {name: event, data: data}
     * @returns {number} 监听器的 id
     */
    private __listen;
    listen(contract: Contract, event: string, func?: (e: Dict<Readable>) => void): Promise<Dict<Readable>>;
    /**
     * 移除监听器
     * @param {number} id 监听器的 id
     */
    removeListener(id: number): void;
    listenOnce(contract: Contract, event: string, func?: (e: Dict<Readable>) => void): Promise<Dict<Readable>>;
    /**
     * 添加事务观察者，如果事务最终被确认或者异常终止，观察者会被移除
     */
    private __observe;
    /**
     * 查看合约方法
     * @param  { Contract } contract 合约
     * @param {string} method  查看的方法
     * @param { Object | Array } parameters  额外的参数，字节数组，参数列表
     * @returns {Promise<Object>}
     */
    viewContract(contract: Contract, method: string, parameters?: AbiInput | AbiInput[] | Dict<AbiInput>): Promise<Readable>;
    /**
     * 通过 websocket 发送事务
     * @param tx {Transaction | Array<Transaction> }事务
     * @returns {Promise<Object>}
     */
    sendTransaction(tx: any): Promise<void>;
    observe(tx: Transaction, status: TX_STATUS.INCLUDED | TX_STATUS.CONFIRMED, timeout: number): Promise<TransactionResult>;
    private wsRpc;
    /**
     * 发送事务的同时监听事务的状态
     */
    sendAndObserve(tx: Transaction, status: TX_STATUS.INCLUDED | TX_STATUS.CONFIRMED, timeout: number): Promise<TransactionResult>;
    /**
     * 获取 nonce
     */
    getNonce(_pkOrAddress: Binary): Promise<number | string>;
    /**
     * 获取 账户余额
     */
    getBalance(_pkOrAddress: Binary): Promise<number | string>;
    close(): void;
}
