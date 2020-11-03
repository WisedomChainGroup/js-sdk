import BN = require("../bn")
import Dict = NodeJS.Dict;
export type Digital = string | number | BN
export type Readable = string | number | boolean
export type AbiInput = string | number | boolean | ArrayBuffer | Uint8Array | BN
export type RLPElement = Uint8Array | Uint8Array[]

export type Binary = string | Uint8Array | ArrayBuffer

export type ABI_TYPE = 'function' | 'event'

/**
 * 合约事件
 */
export interface Event {
    name: string;
    data: Dict<Readable>;
}

export interface TransactionResult {
    blockHeight: number | string
    blockHash: string
    gasUsed: string | number
    events?: Array<Event>
    result?: Readable
    transactionHash: string
    fee: string | number
    method?: string
    inputs: Object | Array<Readable>
}


export enum WS_CODES {
    NULL,
    EVENT_EMIT,
    EVENT_SUBSCRIBE,
    TRANSACTION_EMIT,
    TRANSACTION_SUBSCRIBE,
    TRANSACTION_SEND,
    ACCOUNT_QUERY,
    CONTRACT_QUERY
}

export const constants = {
    DEFAULT_TX_VERSION: 1,
    WASM_DEPLOY: 16,
    WASM_CALL: 17,
}

export enum TX_STATUS {
    PENDING,
    INCLUDED,
    CONFIRMED,
    DROPPED
}

export enum ABI_DATA_TYPE {
    bool,
    i64,
    u64,
    f64,
    string,
    bytes,
    address,
    u256
}

export const MAX_U64 = new BN('ffffffffffffffff', 16)
export const MAX_U256 = new BN('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 16)
export const MAX_I64 = new BN('9223372036854775807', 10)
export const MIN_I64 = new BN('-9223372036854775808', 10)

export const MAX_SAFE_INTEGER = new BN(Number.MAX_SAFE_INTEGER)
export const MIN_SAFE_INTEGER = new BN(Number.MIN_SAFE_INTEGER)
export const ONE = new BN(1)
export const ZERO = new BN(0)
