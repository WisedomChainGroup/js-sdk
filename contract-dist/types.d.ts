/// <reference types="node" />
import BN = require("../bn");
import Dict = NodeJS.Dict;
export declare type Digital = string | number | BN;
export declare type Readable = string | number | boolean;
export declare type AbiInput = string | number | boolean | ArrayBuffer | Uint8Array | BN;
export declare type RLPElement = Uint8Array | Uint8Array[];
export declare type Binary = string | Uint8Array | ArrayBuffer;
export declare type ABI_DATA_TYPE = 'bool' | 'i64' | 'u64' | 'f64' | 'string' | 'bytes' | 'address' | 'u256';
export declare const ABI_DATA_TYPE_TABLE: ABI_DATA_TYPE[];
export declare type ABI_TYPE = 'function' | 'event';
/**
 * 合约事件
 */
export interface Event {
    name: string;
    data: Dict<Readable>;
}
export interface TransactionResult {
    blockHeight: number | string;
    blockHash: string;
    gasUsed: string | number;
    events?: Array<Event>;
    result?: Readable;
    transactionHash: string;
    fee: string | number;
    method?: string;
    inputs: Object | Array<Readable>;
}
export declare enum WS_CODES {
    NULL = 0,
    EVENT_EMIT = 1,
    EVENT_SUBSCRIBE = 2,
    TRANSACTION_EMIT = 3,
    TRANSACTION_SUBSCRIBE = 4,
    TRANSACTION_SEND = 5,
    ACCOUNT_QUERY = 6,
    CONTRACT_QUERY = 7
}
export declare const constants: {
    DEFAULT_TX_VERSION: number;
    WASM_DEPLOY: number;
    WASM_CALL: number;
};
export declare enum TX_STATUS {
    PENDING = 0,
    INCLUDED = 1,
    CONFIRMED = 2,
    DROPPED = 3
}
export declare enum ABI_DATA_ENUM {
    bool = 0,
    i64 = 1,
    u64 = 2,
    f64 = 3,
    string = 4,
    bytes = 5,
    address = 6,
    u256 = 7
}
export declare const MAX_U64: BN;
export declare const MAX_U256: BN;
export declare const MAX_I64: BN;
export declare const MIN_I64: BN;
export declare const MAX_SAFE_INTEGER: BN;
export declare const MIN_SAFE_INTEGER: BN;
export declare const ONE: BN;
export declare const ZERO: BN;
