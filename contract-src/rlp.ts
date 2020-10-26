import { RLPElement } from "./types";

const OFFSET_SHORT_ITEM = 0x80;
const SIZE_THRESHOLD = 56;
const OFFSET_LONG_ITEM = 0xb7;
const OFFSET_SHORT_LIST = 0xc0;
const OFFSET_LONG_LIST = 0xf7;
const EMPTY_BYTES = new Uint8Array(0);
const EMPTY_RLP_ARRAY = new Uint8Array([0xc0])
const NULL_RLP = new Uint8Array([0x80])

import { hex2bin, str2bin, trimLeadingZeros } from "./utils"
import BN = require('../bn')


export interface Encoder {
    getEncoded(): Uint8Array
}

function assert(bool: any, msg: string) {
    if (!bool)
        throw new Error(msg)
}

function isBytes(s: any): boolean {
    return s instanceof Uint8Array || s instanceof ArrayBuffer
}

/**
 * 字节数组转 number
 * @param {Uint8Array | ArrayBuffer} bytes
 * @returns {number}
 */
export function byteArrayToInt(bytes: ArrayBuffer | Uint8Array): number {
    let arr = hex2bin(bytes)
    let ret = 0;
    for (let i = 0; i < arr.length; i++) {
        const u = arr[arr.length - i - 1];
        ret += (u << (i * 8))
    }
    return ret;
}


/**
 * number 转字节数组
 * @param {number} u
 * @returns {Uint8Array}
 */
export function numberToByteArray(u: number): Uint8Array {
    if (u < 0 || !Number.isInteger(u))
        throw new Error(`cannot convert number ${u} to byte array`)
    const buf = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        buf[buf.length - 1 - i] = u & 0xff;
        u = u >>> 8;
    }
    let k = 8;
    for (let i = 0; i < 8; i++) {
        if (buf[i] !== 0) {
            k = i;
            break;
        }
    }
    return buf.slice(k, buf.length);
}



function isRLPList(encoded) {
    return encoded[0] >= OFFSET_SHORT_LIST;
}


function encodeBytes(b: ArrayBuffer | Uint8Array): Uint8Array {
    let bytes = b instanceof Uint8Array ? b : new Uint8Array(b)

    if (bytes.length === 0) {
        const ret = new Uint8Array(1);
        ret[0] = OFFSET_SHORT_ITEM;
        return ret;
    }
    if (bytes.length === 1 && (bytes[0] & 0xFF) < OFFSET_SHORT_ITEM) {
        return bytes;
    }
    if (bytes.length < SIZE_THRESHOLD) {
        // length = 8X
        const prefix = OFFSET_SHORT_ITEM + bytes.length;
        const ret = new Uint8Array(bytes.length + 1);
        for (let i = 0; i < bytes.length; i++) {
            ret[i + 1] = bytes[i];
        }
        ret[0] = prefix;
        return ret;
    }
    let tmpLength = bytes.length;
    let lengthOfLength = 0;
    while (tmpLength !== 0) {
        lengthOfLength = lengthOfLength + 1;
        tmpLength = tmpLength >> 8;
    }

    const ret = new Uint8Array(1 + lengthOfLength + bytes.length);
    ret[0] = OFFSET_LONG_ITEM + lengthOfLength;

    // copy length after first byte
    tmpLength = bytes.length;
    for (let i = lengthOfLength; i > 0; --i) {
        ret[i] = (tmpLength & 0xFF);
        tmpLength = tmpLength >> 8;
    }
    for (let i = 0; i < bytes.length; i++) {
        ret[i + 1 + lengthOfLength] = bytes[i]
    }
    return ret;
}

/**
 * encode elements to rlp list
 * @param { Array<Uint8Array> } elements
 * @returns { Uint8Array } rlp encoded
 */
export function encodeElements(elements: Uint8Array[]): Uint8Array {
    let totalLength = 0;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        totalLength += el.length;
    }
    let data;
    let copyPos;
    if (totalLength < SIZE_THRESHOLD) {
        data = new Uint8Array(1 + totalLength);
        data[0] = OFFSET_SHORT_LIST + totalLength;
        copyPos = 1;
    } else {
        // length of length = BX
        // prefix = [BX, [length]]
        let tmpLength = totalLength;
        let byteNum = 0;
        while (tmpLength !== 0) {
            ++byteNum;
            tmpLength = tmpLength >> 8;
        }
        tmpLength = totalLength;
        let lenBytes = new Uint8Array(byteNum);
        for (let i = 0; i < byteNum; ++i) {
            lenBytes[byteNum - 1 - i] = ((tmpLength >> (8 * i)) & 0xFF);
        }
        // first byte = F7 + bytes.length
        data = new Uint8Array(1 + lenBytes.length + totalLength);
        data[0] = OFFSET_LONG_LIST + byteNum;
        for (let i = 0; i < lenBytes.length; i++) {
            data[i + 1] = lenBytes[i];
        }
        copyPos = lenBytes.length + 1;
    }
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        for (let j = 0; j < el.length; j++) {
            data[j + copyPos] = el[j];
        }
        copyPos += el.length;
    }
    return data;
}


function copyOfRange(bytes: Uint8Array, from: number, to: number): Uint8Array {
    const ret = new Uint8Array(to - from);
    let j = 0;
    for (let i = from; i < to; i++) {
        ret[j] = bytes[i];
        j++;
    }
    return ret;
}

function estimateSize(encoded: Uint8Array): number {
    const parser = new RLPParser(encoded, 0, encoded.length);
    return parser.peekSize();
}

function validateSize(encoded) {
    assert(encoded.length === estimateSize(encoded), 'invalid rlp format');
}


export function encodeString(s: string): Uint8Array {
    return encodeBytes(str2bin(s))
}

export function encode(o: string | any[] | number | null | BN | Uint8Array | ArrayBuffer | Encoder | boolean): Uint8Array {
    if (o && (typeof (<Encoder>o).getEncoded === 'function')) {
        return (<Encoder>o).getEncoded()
    }
    if (o === null || o === undefined)
        return NULL_RLP
    if (o instanceof ArrayBuffer)
        o = new Uint8Array(o)
    if (typeof o === 'string')
        return encodeString(o)
    if (typeof o === 'number') {
        assert(o >= 0 && Number.isInteger(o), `${o} is not a valid non-negative integer`)
        return encodeBytes(numberToByteArray(o))
    }
    if (typeof o === 'boolean')
        return o ? new Uint8Array([0x01]) : NULL_RLP
    if (o instanceof Uint8Array)
        return encodeBytes(o)
    if (o instanceof BN) {
        return encodeBytes(trimLeadingZeros(o.toArrayLike(Uint8Array, 'be')))
    }
    if (Array.isArray(o)) {
        const elements = o.map(x => encode(x))
        return encodeElements(elements)
    }
}



export function decode(e: Uint8Array | ArrayBuffer):
    RLPElement | RLPElement[] {
    const encoded = e instanceof ArrayBuffer ? new Uint8Array(e) : e
    validateSize(encoded)
    if (!isRLPList(encoded)) {
        const parser = new RLPParser(encoded, 0, encoded.length);
        if (encoded.length === 1 && encoded[0] === 0x80)
            return EMPTY_BYTES;
        if (parser.remained() > 1) {
            parser.skip(parser.prefixLength());
        }
        return parser.bytes(parser.remained());
    }
    const parser = new RLPParser(encoded, 0, encoded.length);
    parser.skip(parser.prefixLength());
    const ret = [];
    while (parser.remained() > 0) {
        ret.push(decode(parser.bytes(parser.peekSize())));
    }
    return ret;
}


export function decodeElements(enc: Uint8Array | ArrayBuffer): Uint8Array[] {
    let encoded = enc instanceof Uint8Array ? enc : new Uint8Array(enc)
    validateSize(encoded);
    if (!isRLPList(encoded)) {
        throw new Error('not a rlp list')
    }
    const parser = new RLPParser(encoded, 0, encoded.length);
    parser.skip(parser.prefixLength());
    const ret = [];
    while (parser.remained() > 0) {
        ret.push(parser.bytes(parser.peekSize()));
    }
    return ret;
}



class RLPParser {
    buf: Uint8Array
    offset: number
    limit: number

    constructor(buf: Uint8Array, offset: number, limit: number) {
        this.buf = buf;
        this.offset = offset;
        this.limit = limit;
    }

    prefixLength(): number {
        const prefix = this.buf[this.offset];
        if (prefix <= OFFSET_LONG_ITEM) {
            return 1;
        }
        if (prefix < OFFSET_SHORT_LIST) {
            return 1 + (prefix - OFFSET_LONG_ITEM);
        }
        if (prefix <= OFFSET_LONG_LIST) {
            return 1;
        }
        return 1 + (prefix - OFFSET_LONG_LIST);
    }

    remained(): number {
        return this.limit - this.offset;
    }

    skip(n: number) {
        this.offset += n;
    }

    peekSize(): number {
        const prefix = this.buf[this.offset];
        if (prefix < OFFSET_SHORT_ITEM) {
            return 1;
        }
        if (prefix <= OFFSET_LONG_ITEM) {
            return prefix - OFFSET_SHORT_ITEM + 1;
        }
        if (prefix < OFFSET_SHORT_LIST) {
            return byteArrayToInt(
                copyOfRange(this.buf, 1 + this.offset, 1 + this.offset + prefix - OFFSET_LONG_ITEM)
            ) + 1 + prefix - OFFSET_LONG_ITEM;
        }
        if (prefix <= OFFSET_LONG_LIST) {
            return prefix - OFFSET_SHORT_LIST + 1;
        }
        return byteArrayToInt(
            copyOfRange(this.buf, 1 + this.offset, this.offset + 1 + prefix - OFFSET_LONG_LIST)
        )
            + 1 + prefix - OFFSET_LONG_LIST;
    }

    u8(): number {
        const ret = this.buf[this.offset];
        this.offset++;
        return ret;
    }

    bytes(n: number): Uint8Array {
        assert(this.offset + n <= this.limit, 'read overflow');
        const ret = this.buf.slice(this.offset, this.offset + n);
        this.offset += n;
        return ret;
    }
}

export class RLPList {
    static EMPTY: RLPList = new RLPList([]);

    constructor(readonly elements: Uint8Array[]) {
    }

    static fromEncoded(encoded: Uint8Array | ArrayBuffer): RLPList {
        const els = decodeElements(encoded)
        return new RLPList(els)
    }


    list(index: number): RLPList {
        return RLPList.fromEncoded(this.raw(index))
    }

    length(): number {
        return this.elements.length;
    }

    raw(index: number): ArrayBuffer {
        return this.elements[index];
    }

    isNull(index: number): boolean {
        return this.elements[index].byteLength == 1 && this.elements[index][0] == 0x80;
    }

    number(idx: number): number {
        return byteArrayToInt(this.bytes(idx))
    }

    bool(idx: number): boolean {
        return this.number(idx) != 0
    }

    bytes(idx: number): Uint8Array {
        return <Uint8Array>decode(this.elements[idx])
    }
}
