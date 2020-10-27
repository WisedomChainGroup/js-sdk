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
     */
    viewContract(contract: Contract, method: string, parameters?: AbiInput | AbiInput[] | Dict<AbiInput>): Promise<Readable>;
    /**
     * 通过 websocket 发送事务
     * @param tx 事务
     */
    sendTransaction(tx: Transaction | Transaction[]): Promise<void>;
    observe(tx: Transaction, status: TX_STATUS.INCLUDED | TX_STATUS.CONFIRMED, timeout: number): Promise<TransactionResult>;
    private wsRpc;
    /**
     * 发送事务的同时监听事务的状态
     */
    sendAndObserve(tx: Transaction | Transaction[], status: TX_STATUS.INCLUDED | TX_STATUS.CONFIRMED, timeout: number): Promise<TransactionResult | TransactionResult[]>;
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
