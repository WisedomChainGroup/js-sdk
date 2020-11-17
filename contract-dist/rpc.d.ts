import { AbiInput, Binary, Readable, RLPElement, TransactionResult, TX_STATUS, WS_CODES } from "./types";
import { Contract } from "./contract";
import { Transaction } from "./tx";
export interface Resp {
    code: WS_CODES;
    nonce: number;
    body: RLPElement | RLPElement[];
}
export declare class RPC {
    host: string;
    port: string;
    timeout: number;
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
     * @param timeout 超时时间，单位是秒，默认15秒
     */
    constructor(host?: string, port?: string | number, timeout?: number);
    private tryConnect;
    private parse;
    private handleData;
    /**
     * 监听合约事件
     */
    private __listen;
    listen(contract: Contract, event: string, func?: (e: Record<string, Readable>) => void): Promise<Record<string, Readable>>;
    /**
     * 移除监听器
     * @param {number} id 监听器的 id
     */
    removeListener(id: number): void;
    listenOnce(contract: Contract, event: string, func?: (e: Record<string, Readable>) => void): Promise<Record<string, Readable>>;
    /**
     * 添加事务观察者，如果事务最终被确认或者异常终止，观察者会被移除
     */
    private __observe;
    /**
     * 查看合约方法
     */
    viewContract(contract: Contract, method: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>): Promise<Readable>;
    /**
     * 通过 websocket 发送事务
     * @param tx 事务
     */
    sendTransaction(tx: Transaction | Transaction[]): Promise<void>;
    observe(tx: Transaction, status: TX_STATUS, timeout?: number): Promise<TransactionResult>;
    private wsRpc;
    /**
     * 发送事务的同时监听事务的状态
     */
    sendAndObserve(tx: Transaction | Transaction[], status: TX_STATUS, timeout?: number): Promise<TransactionResult | TransactionResult[]>;
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
