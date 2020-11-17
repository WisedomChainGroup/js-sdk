import { ABI_DATA_TYPE, AbiInput, Binary, Digital } from "./types";
import BN = require('../bn');
export declare function isBin(r?: any): boolean;
/**
 * 计算 keccak256哈希
 */
export declare function digest(_msg: Binary): Uint8Array;
/**
 * rmd160 哈希值计算
 */
export declare function rmd160(bin: Uint8Array | ArrayBuffer): Uint8Array;
export declare function assert(truth: any, err: string): void;
/**
 * 解析十六进制字符串
 * decode hex string
 */
export declare function hex2bin(s: string | ArrayBuffer | Uint8Array): Uint8Array;
export declare function dig2str(s: Digital): string;
/**
 * 比较两个字节数组
 */
export declare function compareBytes(_a: Uint8Array | ArrayBuffer, _b: Uint8Array | ArrayBuffer): number;
/**
 * 私钥转公钥
 */
export declare function privateKey2PublicKey(_privateKey: Binary): Uint8Array;
/**
 * 公钥转公钥哈希
 */
export declare function publicKey2Hash(_publicKey: Binary): Uint8Array;
/**
 * 地址转公钥哈希
 */
export declare function address2PublicKeyHash(str: string): Uint8Array;
/**
 * 公钥哈希转地址
 */
export declare function publicKeyHash2Address(_hash: Uint8Array | ArrayBuffer): string;
/**
 * 32 字节私钥转成 64字节私钥
 */
export declare function extendPrivateKey(_sk: Binary): Uint8Array;
export declare function concatArray(arr: Array<Uint8Array | ArrayBuffer>): Uint8Array;
export declare function concatBytes(_x: Uint8Array | ArrayBuffer, _y: Uint8Array | ArrayBuffer): Uint8Array;
/**
 * 断言正确的地址
 * @param {string} address
 */
export declare function assertAddress(address: string): void;
/**
 * 公钥、地址、或者公钥哈希 转成公钥哈希
 * @returns  {Uint8Array}
 */
export declare function normalizeAddress(_addr: Binary): Uint8Array;
/**
 * 字符串 utf8 编码
 * @param str 字符串
 */
export declare function str2bin(str: string): Uint8Array;
export declare function trimLeadingZeros(data: Uint8Array): Uint8Array;
/**
 * 浮点数转字节数组
 */
export declare function f64ToBytes(f: number): Uint8Array;
/**
 * pad prefix to size
 */
export declare function padPrefix(arr: Uint8Array, prefix: number, size: number): Uint8Array;
/**
 * 字节数组转浮点数
 * @param {Uint8Array} buf
 */
export declare function bytesToF64(buf: Uint8Array | ArrayBuffer): number;
export declare function convert(o: AbiInput, type: ABI_DATA_TYPE): string | Uint8Array | BN;
/**
 * 对字节数组取反
 */
export declare function inverse(arr: Uint8Array): Uint8Array;
export declare function toSafeInt(x: string | number | BN | ArrayBuffer | Uint8Array | bigint): string | number;
/**
 * decode binary as utf8 string
 */
export declare function bin2str(_bin: Binary): string;
export declare function uuidv4(): string;
export declare function bin2hex(s: Binary): string;
