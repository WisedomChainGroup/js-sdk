
type AbiType = string | number | Uint8Array | ArrayBuffer | BN | boolean

type Numeric = string | number | BN
type Binary = string | Uint8Array | ArrayBuffer

export enum TX_STATUS {
    PENDING,
    INCLUDED,
    CONFIRMED,
    DROPPED
}

export class RPC {
    constructor(host?: string, port?: string | number);
    // 监听合约事件
    listen(contract: Contract, event: string, func?: (x: Object) => void): number | Promise<Object>;
    // 只监听一次
    listenOnce(contract: Contract, event: string, func?: (x: Object) => void): number | Promise<Object>;
    // 查看合约
    viewContract(contract: Contract, method: string, parameters: Array<AbiType> | Object);
    // 
    sendAndObserve(tx: Transaction, status?: TX_STATUS, timeout?: number)
    getNonce(pkOrAddress: Binary): string | number;
    sendTransaction(tx: Transaction): Promise<void>;
    close(): void
}


export class TransactionBuilder {
    constructor(version?: Numeric, sk?: Binary, gasLimit?: Numeric, gasPrice?: Numeric, nonce?: Numeric);
    // 构造合约部署事务
    buildDeploy(contract: Contract, parameters?: Array<AbiType> | Object | AbiType, amount?: Numeric): Transaction;

    // 构造合约调用事务
    buildContractCall(contract: Contract, method: string, parameters?: Array<AbiType> | Object | AbiType, amount?: Numeric): Transaction;
}
export class Transaction {
    version: string;
    type: string;
    nonce: string;
    from: string;
    gasPrice: string;
    amount: string;
    payload: string;
    to: string;
    signature: string
    constructor(version?: Numeric, type?: Numeric, nonce?: Numeric, from?: Binary, gasPrice?: Numeric, amount?: Numeric, payload?: Binary, to?: Binary, signature?: Binary);
    // 得到事务哈希
    getHash(): Uint8Array;
    // 用私钥签名事务
    sign(sk: Binary): void;
}

declare interface ABI {
    name: string;
    type: string;
    inputs?: Array<TypeDef>;
    outputs?: Array<TypeDef>;
}

declare interface TypeDef {
    type: string;
    name?: string;
}

// 合约类
declare class Contract {
    address?: string;
    abi?: Array<ABI>;
    binary?: Uint8Array;
    constructor(address?: string, abi?: Array<ABI>, binary?: Uint8Array);
}

declare interface BN {
    toString(n?: number): string;
}



export function privateKey2PublicKey(buf: Binary): Uint8Array;
export function publicKey2Hash(buf: Binary): Uint8Array;
export function bin2hex(buf: Binary): string;
export function rmd160(x: Uint8Array | ArrayBuffer): Uint8Array;
export function address2PublicKeyHash(x: string): Uint8Array;
export function compileABI(src: Binary): Array<ABI>;
export function compileContract(ascPath: string, src: string): Promise<Uint8Array>;
export function getContractAddress(hash: Binary): string;