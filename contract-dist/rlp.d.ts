import { RLPElement } from "./types";
import BN = require('../bn');
export interface Encoder {
    getEncoded(): Uint8Array;
}
/**
 * 字节数组转 number
 */
export declare function byteArrayToInt(bytes: ArrayBuffer | Uint8Array): number;
/**
 * number 转字节数组
 */
export declare function numberToByteArray(u: number): Uint8Array;
/**
 * encode elements to rlp list
 */
export declare function encodeElements(elements: Uint8Array[]): Uint8Array;
export declare function encodeString(s: string): Uint8Array;
export declare function encode(o?: string | any[] | number | null | BN | Uint8Array | ArrayBuffer | Encoder | boolean): Uint8Array;
export declare function decode(e: Uint8Array | ArrayBuffer): RLPElement | RLPElement[];
export declare function decodeElements(enc: Uint8Array | ArrayBuffer): Uint8Array[];
export declare class RLPList {
    readonly elements: Uint8Array[];
    static EMPTY: RLPList;
    constructor(elements: Uint8Array[]);
    static fromEncoded(encoded: Uint8Array | ArrayBuffer): RLPList;
    list(index: number): RLPList;
    length(): number;
    raw(index: number): ArrayBuffer;
    isNull(index: number): boolean;
    number(idx: number): number;
    bool(idx: number): boolean;
    bytes(idx: number): Uint8Array;
}
