import BN = require("./bn");

declare type AbiVMType = 'bool' | 'i64' | 'u64' | 'f64' | 'string' | 'bytes' | 'address' | 'u256'
declare type AbiType = 'function' | 'event'

type AbiJSType = string | number | Uint8Array | ArrayBuffer | BN | boolean

type Readable = string | number | boolean

type Numeric = string | number | BN
type Binary = string | Uint8Array | ArrayBuffer


declare namespace contractTool {
    export enum TX_STATUS {
        PENDING,
        INCLUDED,
        CONFIRMED,
        DROPPED
    }

    export interface Encodable {
        getEncoded(): Uint8Array;
    }

    export class RLP {
        /**
         * 对字符串 rlp 编码
         * @param s 字符串
         */
        static encodeString(s: string): Uint8Array;

        /**
         * 对字节数组进行 rlp 编码
         * @param bytes 
         */
        static encodeBytes(bytes: Uint8Array | ArrayBuffer);

        /**
         * 
         * @param o 
         */
        static encode(o: Uint8Array | string | Array<any> | ArrayBuffer | number | BN | null | Encodable): Uint8Array;

        static decode(encoded: ArrayBuffer | Uint8Array): Uint8Array | Array<any>;
    }

    export class RPC {
        constructor(host?: string, port?: string | number);

        /**
         * 监听合约事件
         * @param contract 合约
         * @param event 事件名称
         * @param func 回调函数
         */
        listen(contract: Contract, event: string, func?: (x: Object) => void): number | Promise<Object>;

        /**
         * 监听合约事件，但只监听一次
         * @param contract 合约
         * @param event 事件名称
         * @param func 回调函数
         */
        listenOnce(contract: Contract, event: string, func?: (x: Object) => void): number | Promise<Object>;

        /**
         * 查看合约
         * @param contract 合约
         * @param method 方法名称
         * @param parameters 参数
         */
        viewContract(contract: Contract, method: string, parameters: Array<AbiJSType> | Object | AbiJSType): Promise<Readable>;

        /**
         * 发送事务并进入观察
         * @param tx 事务
         * @param status INCLUDED 或者 CONFIRMED
         * @param timeout 
         */
        sendAndObserve(tx: Transaction, status?: TX_STATUS, timeout?: number): Promise<TransactionResult>;

        /**
         * 获取 nonce
         * @param pkOrAddress 公钥、地址或者公钥哈希
         */
        getNonce(pkOrAddress: Binary): Promise<string | number>;

        /**
         * 发送事务
         * @param tx 事务
         */
        sendTransaction(tx: Transaction): Promise<void>;

        /**
         * 
         * @param tx 事务
         * @param status 事务状态
         * @param timeout 超时时间
         */
        observe(tx: Transaction, status?: TX_STATUS, timeout?: number): Promise<TransactionResult>;
        close(): void
    }


    export class TransactionBuilder {
        /**
         *
         * @param version 版本号
         * @param sk 私钥
         * @param gasLimit 最大gas限制
         * @param gasPrice gas 单价
         * @param nonce 事务开始序号
         */
        constructor(version?: Numeric, sk?: Binary, gasLimit?: Numeric, gasPrice?: Numeric, nonce?: Numeric);

        buildDeploy(contract: Contract, parameters?: Array<AbiJSType> | Object | AbiJSType, amount?: Numeric): Transaction;

        buildContractCall(contract: Contract, method: string, parameters?: Array<AbiJSType> | Object | AbiJSType, amount?: Numeric): Transaction;
    }

    export class Transaction implements Encodable {
        version: string;
        type: string;
        nonce: string;
        from: string;
        gasPrice: string;
        amount: string;
        payload: string;
        to: string;
        signature: string;
        constructor(version?: Numeric, type?: Numeric, nonce?: Numeric, from?: Binary, gasPrice?: Numeric, amount?: Numeric, payload?: Binary, to?: Binary, signature?: Binary);
        // 得到事务哈希
        getHash(): Uint8Array;
        // 用私钥签名事务
        sign(sk: Binary): void;
        static clone(o: Object): Transaction;
        // rlp 编码
        getEncoded(): Uint8Array;
    }

    /**
     * 合约
     */
    export class Contract {
        address?: string;
        abi?: Array<ABI>;
        binary?: Uint8Array;
        constructor(address?: Binary, abi?: Array<ABI>, binary?: Uint8Array);
    }

    /**
     * 私钥转公钥
     * @param buf 私钥
     */
    export function privateKey2PublicKey(buf: Binary): Uint8Array;

    /**
     * 公钥转公钥哈希
     * @param buf 公钥
     */
    export function publicKey2Hash(buf: Binary): Uint8Array;

    /**
     * 十六进制编码
     * @param buf 
     */
    export function bin2hex(buf: Binary): string;

    /**
     * 计算 rmd160 哈希
     * @param x 消息原文
     */
    export function rmd160(x: Uint8Array | ArrayBuffer): Uint8Array;

    /**
     * 地址转公钥哈希
     * @param x 地址
     */
    export function address2PublicKeyHash(x: string): Uint8Array;

    /**
     * 编译生成 abi
     * @param src 源代码
     */
    export function compileABI(src: Binary): Array<ABI>;

    /**
     * 编译合约
     * @param ascPath asc 所在路径
     * @param src 源文件名
     */
    export function compileContract(ascPath: string, src: string): Promise<Uint8Array>;

    /**
     * 计算合约地址
     * @param hash 事务哈希值
     */
    export function getContractAddress(hash: Binary): string;

    /**
     * 公钥哈希转地址
     * @param hash 公钥哈希
     */
    export function publicKeyHash2Address(hash: Uint8Array): string;
}


declare interface ABI {
    name: string;
    type: AbiType;
    inputs?: Array<TypeDef>;
    outputs?: Array<TypeDef>;
}

declare interface TypeDef {
    type: AbiVMType;
    name?: string;
}

/**
 * 合约调用的结果
 */
declare interface TransactionResult {
    blockHeight: number;
    blockHash: string;
    gasUsed: string | number;
    events?: Array<Event>;
    result?: Readable;
    transactionHash: string;
    fee: string | number;
    method?: string;
    inputs: Object | Array<Readable>
}

/**
 * 合约事件
 */
declare interface Event {
    name: string;
    data: Object;
}

export = contractTool
export as namespace contractTool
