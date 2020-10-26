import {
    ABI_DATA_ENUM,
    AbiInput,
    Binary, Digital,
    MAX_I64,
    MAX_SAFE_INTEGER,
    MAX_U256,
    MAX_U64,
    MIN_I64,
    MIN_SAFE_INTEGER,
    ONE,
    ZERO
} from "./types";
import nacl = require('../nacl.min.js')
const RMD160 = (new (require('../hashes.js').RMD160))
const _keccak256 = require('./sha3.js').keccak256
import { Base58 } from "./base58"
import BN = require('../bn')

RMD160.setUTF8(false)

const EMPTY_BYTES = new Uint8Array(0)

export function isBin(r?: any): boolean {
    return r && (r instanceof Uint8Array || r instanceof ArrayBuffer)
}

/**
 * 计算 keccak256哈希
 */
export function digest(_msg: Binary): Uint8Array {
    let msg = hex2bin(_msg)
    const hasher = _keccak256.create()
    hasher.update(msg)
    return new Uint8Array(hasher.arrayBuffer())
}


/**
 * rmd160 哈希值计算
 */
export function rmd160(bin: Uint8Array | ArrayBuffer): Uint8Array {
    let o = hex2bin(bin)
    return hex2bin(RMD160.hex(new FakeString(o)))
}

// rmd 不支持对 Uint8Array 进行哈希值计算，需要把 Uint8Array 类型伪装成字符串
class FakeString {
    u8: Uint8Array
    length: number
    constructor(u8: Uint8Array | ArrayBuffer) {
        this.u8 = hex2bin(u8)
        this.length = this.u8.length
    }

    charCodeAt(i: number): number {
        return this.u8[i]
    }
}

export function assert(truth: any, err: string) {
    if (!truth)
        throw new Error(err)
}


/**
 * 解析十六进制字符串
 * decode hex string
 */
export function hex2bin(s: string | ArrayBuffer | Uint8Array): Uint8Array {
    if (s instanceof ArrayBuffer)
        return new Uint8Array(s)
    if (s instanceof Uint8Array)
        return s
    if (s.startsWith('0x'))
        s = s.substr(2, s.length - 2)
    assert(s.length % 2 === 0, 'invalid char');
    const ret = new Uint8Array(s.length / 2);
    for (let i = 0; i < s.length / 2; i++) {
        const h = s.charCodeAt(i * 2);
        const l = s.charCodeAt(i * 2 + 1);
        ret[i] = (hexToInt(h) << 4) + hexToInt(l);
    }
    return ret
}


function hexToInt(x: number): number {
    if (48 <= x && x <= 57) return x - 48
    if (97 <= x && x <= 102) return x - 87
    if (65 <= x && x <= 70) return x - 55
    return 0
}

export function dig2str(s: Digital): string {
    if (typeof s === 'string') {
        if (s.startsWith('0x'))
            s = new BN(s.substr(2), 16)
        else
            return s
    }
    return s.toString(10)
}

/**
 * 比较两个字节数组
 */
export function compareBytes(_a: Uint8Array | ArrayBuffer, _b: Uint8Array | ArrayBuffer): number {
    let a = hex2bin(_a)
    let b = hex2bin(_b)
    if (a.length > b.length)
        return 1
    if (b.length > a.length)
        return -1
    for (let i = 0; i < a.length; i++) {
        const ai = a[i]
        const bi = b[i]
        if (ai > bi)
            return 1
        if (bi > ai)
            return -1
    }
    return 0
}


/**
 * 私钥转公钥
 */
export function privateKey2PublicKey(_privateKey: Binary): Uint8Array {
    let privateKey = hex2bin(_privateKey)
    if (privateKey.length === 64)
        privateKey = privateKey.slice(32)
    const pair = nacl.sign.keyPair.fromSeed(privateKey)
    return pair.publicKey
}

/**
 * 公钥转公钥哈希
 */
export function publicKey2Hash(_publicKey: Binary): Uint8Array {
    let publicKey = hex2bin(_publicKey)
    publicKey = digest(publicKey)
    return rmd160(publicKey)
}

/**
 * 地址转公钥哈希
 */
export function address2PublicKeyHash(str: string): Uint8Array {
    assert(typeof str === 'string', 'address is string')
    let r5
    if (str.indexOf("1") === 0) {
        r5 = Base58.decode(str)
    } else {
        r5 = Base58.decode(str.substr(2))
    }
    return r5.slice(1, r5.length - 4)
}

/**
 * 公钥哈希转地址
 */
export function publicKeyHash2Address(_hash: Uint8Array | ArrayBuffer): string {
    let hash = hex2bin(_hash)
    let r2 = concatBytes(new Uint8Array([0]), hash)
    let r3 = digest(digest(hash))
    let b4 = r3.slice(0, 4)
    let b5 = concatBytes(r2, b4)
    return Base58.encode(b5)
}

/**
 * 32 字节私钥转成 64字节私钥
 */
export function extendPrivateKey(_sk: Binary): Uint8Array {
    let sk = hex2bin(_sk)
    if (sk.length === 64)
        return sk
    return concatBytes(sk, privateKey2PublicKey(sk))
}

export function concatArray(arr: Array<Uint8Array | ArrayBuffer>): Uint8Array {
    let ret = new Uint8Array(0)
    arr.forEach(
        a => {
            ret = concatBytes(ret, a)
        }
    )
    return ret
}


export function concatBytes(_x: Uint8Array | ArrayBuffer, _y: Uint8Array | ArrayBuffer): Uint8Array {
    let x = hex2bin(_x)
    let y = hex2bin(_y)
    const ret = new Uint8Array(x.length + y.length);
    for (let i = 0; i < x.length; i++) {
        ret[i] = x[i]
    }
    for (let i = 0; i < y.length; i++) {
        ret[x.length + i] = y[i]
    }
    return ret
}

/**
 * 断言正确的地址
 * @param {string} address
 */
export function assertAddress(address: string): void {
    if (typeof address !== 'string')
        throw new Error('invalid address not a string')

    if (!address.startsWith('1') && !address.startsWith('WX') && !address.startsWith('WR')) {
        throw new Error('address should starts with 1, WX or WR')
    }

    if (address.startsWith('WX') || address.startsWith('WR'))
        address = address.substr(2)

    let _r5 = Base58.decode(address);

    let a = address2PublicKeyHash(address)
    let c = digest(a)
    let r3 = digest(c);
    let b4 = r3.slice(0, 4)
    let _b4 = _r5.slice(21, 25)
    if (compareBytes(b4, _b4) != 0) {
        throw new Error('invalid address ' + address)
    }
}

/**
 * 公钥、地址、或者公钥哈希 转成公钥哈希
 * @returns  {Uint8Array}
 */
export function normalizeAddress(_addr: Binary): Uint8Array {
    let addr: Uint8Array
    if ((typeof _addr === 'string' && isHex(_addr)) || _addr instanceof Uint8Array || _addr instanceof ArrayBuffer) {
        addr = hex2bin(_addr)
        if (addr.length === 20)
            return addr
        if (addr.length === 32)
            return publicKey2Hash(addr)
        throw new Error(`invalid size ${addr.length}`)
    }
    // 地址转公钥哈希
    assertAddress(_addr)
    return address2PublicKeyHash(_addr)
}


/**
 * 判断是否是合法的十六进制字符串
 * @param {string} hex
 * @returns {boolean}
 */
function isHex(hex: string): boolean {
    if (typeof hex === 'string' && hex.startsWith('0x'))
        hex = hex.substr(2)
    if (hex.length % 2 !== 0)
        return false
    hex = hex.toLowerCase()
    for (let i = 0; i < hex.length; i++) {
        const code = hex.charCodeAt(i)
        if ((code >= 48 && code <= 57) || (code >= 97 && code <= 102)) {
        } else {
            return false
        }
    }
    return true
}

/**
 * 字符串 utf8 编码
 * @param str 字符串
 */
export function str2bin(str: string): Uint8Array {
    if (typeof Buffer === 'function')
        return Buffer.from(str, 'utf-8')
    if (typeof TextEncoder === 'function')
        return new TextEncoder().encode(str)
    throw new Error('encode string to utf8 failed')
}

export function trimLeadingZeros(data: Uint8Array): Uint8Array {
    let k = -1;
    for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0) {
            k = i;
            break;
        }
    }
    if (k === -1)
        return new Uint8Array(0)
    return data.slice(k, data.length)
}


function reverse(_arr: Uint8Array | ArrayBuffer): Uint8Array {
    let arr = hex2bin(_arr)
    const ret = new Uint8Array(arr.length)
    for (let i = 0; i < arr.length; i++) {
        ret[i] = arr[arr.length - i - 1]
    }
    return ret
}


/**
 * 浮点数转字节数组
 */
export function f64ToBytes(f: number): Uint8Array {
    let _buf = new ArrayBuffer(8);
    let float = new Float64Array(_buf);
    float[0] = f;
    let buf = new Uint8Array(_buf)
    return trimLeadingZeros(reverse(buf))
}

/**
 * pad prefix to size
 */
export function padPrefix(arr: Uint8Array, prefix: number, size: number): Uint8Array {
    if (arr.length >= size)
        return arr
    const ret = new Uint8Array(size)
    for (let i = 0; i < ret.length; i++) {
        ret[i + size - arr.length] = arr[i]
    }
    if (prefix === 0)
        return ret
    for (let i = 0; i < size - arr.length; i++)
        ret[i] = prefix
}

/**
 * 字节数组转浮点数
 * @param {Uint8Array} buf
 */
export function bytesToF64(buf: Uint8Array | ArrayBuffer): number {
    return new Float64Array(padPrefix(reverse(buf), 0, 8).buffer)[0]
}

export function convert(o: AbiInput, type: ABI_DATA_ENUM): string | Uint8Array | BN {
    if (o instanceof Uint8Array || o instanceof ArrayBuffer) {
        switch (type) {
            case ABI_DATA_ENUM.bool:
            case ABI_DATA_ENUM.u256:
            case ABI_DATA_ENUM.i64:
            case ABI_DATA_ENUM.u64:
            case ABI_DATA_ENUM.f64: {
                throw new Error('cannot convert uint8array to u64, u256 or bool')
            }
            case ABI_DATA_ENUM.string: {
                throw new Error('cannot convert uint8array to string')
            }
            case ABI_DATA_ENUM.bytes:
                return hex2bin(o)
            case ABI_DATA_ENUM.address:
                return normalizeAddress(o)
        }
        throw new Error("unexpected abi type " + type)
    }

    if (typeof o === 'string') {
        switch (type) {
            case ABI_DATA_ENUM.u256:
            case ABI_DATA_ENUM.u64: {
                let ret: BN
                if (o.substr(0, 2) === '0x') {
                    ret = new BN(o.substr(2, o.length - 2), 16)
                } else {
                    ret = new BN(o, 10)
                }
                if (type === ABI_DATA_ENUM.u64)
                    assert(ret.cmp(MAX_U64) <= 0 && !ret.isNeg(), `${ret.toString(10)} overflows max u64 ${MAX_U64.toString(10)}`)
                if (type === ABI_DATA_ENUM.u256)
                    assert(ret.cmp(MAX_U256) <= 0 && !ret.isNeg(), `${ret.toString(10)} overflows max u256 ${MAX_U256.toString(10)}`)
                return ret
            }
            case ABI_DATA_ENUM.i64: {
                if (o.substr(0, 2) === '0x') {
                    let ret = new BN(o.substr(2, o.length - 2), 16)
                    assert(ret.cmp(MAX_I64) <= 0, `${ret.toString(10)} overflows max i64 ${MAX_I64.toString(10)}`)
                    assert(ret.cmp(MIN_I64) >= 0, `${ret.toString(10)} overflows min i64 ${MIN_I64.toString(10)}`)
                    return ret
                }
                return convert(parseInt(o), ABI_DATA_ENUM.i64)
            }
            case ABI_DATA_ENUM.f64: {
                let f = parseFloat(o)
                return f64ToBytes(f)
            }
            case ABI_DATA_ENUM.string: {
                return o
            }
            case ABI_DATA_ENUM.bool: {
                let l = o.toLowerCase()
                if ('true' === l)
                    return ONE
                if ('false' === l)
                    return ZERO
                // @ts-ignore
                if (isNaN(o))
                    throw new Error(`cannot convert ${o} to bool`)
                let ln = parseInt(o)
                if (1 === ln || 0 === ln)
                    return l
                throw new Error(`convert ${l} to bool failed, provide 1 or 0`)
            }
            case ABI_DATA_ENUM.bytes:
                return hex2bin(o)
            case ABI_DATA_ENUM.address: {
                return normalizeAddress(o)
            }
        }
        throw new Error("unexpected abi type " + type)
    }

    if (typeof o === 'number') {
        switch (type) {
            case ABI_DATA_ENUM.u256:
            case ABI_DATA_ENUM.u64: {
                if (o < 0 || !Number.isInteger(o))
                    throw new Error('o is negative or not a integer')
                return new BN(o)
            }
            case ABI_DATA_ENUM.string: {
                return o.toString(10)
            }
            case ABI_DATA_ENUM.bool: {
                if (1 === o || 0 === o)
                    return 1 === o ? ONE : ZERO
                throw new Error(`convert ${o} to bool failed, provide 1 or 0`)
            }
            case ABI_DATA_ENUM.bytes:
            case ABI_DATA_ENUM.address: {
                throw new Error("cannot convert number to address or bytes")
            }
            case ABI_DATA_ENUM.i64: {
                if (!Number.isInteger(o))
                    throw new Error('o is negative or not a integer')
                if (o >= 0)
                    return new BN(o)
                return convert(new BN(o), ABI_DATA_ENUM.i64)
            }
            case ABI_DATA_ENUM.f64: {
                return f64ToBytes(o)
            }
        }
        throw new Error("unexpected abi type " + type)
    }

    if (o instanceof BN) {
        switch (type) {
            case ABI_DATA_ENUM.u256:
            case ABI_DATA_ENUM.u64: {
                if (o.isNeg())
                    throw new Error(`cannot convert negative ${o.toString()} to uint`)
                return o;
            }
            case ABI_DATA_ENUM.string: {
                return o.toString(10)
            }
            case ABI_DATA_ENUM.bytes:
            case ABI_DATA_ENUM.address: {
                throw new Error("cannot convert big number to address or bytes")
            }
            case ABI_DATA_ENUM.bool: {
                if (o.cmp(new BN(1)) === 0 || o.cmp(new BN(0)) === 0)
                    return o
                throw new Error(`convert ${o} to bool failed, provide 1 or 0`)
            }
            case ABI_DATA_ENUM.i64: {
                assert(o.cmp(MAX_I64) <= 0, `${o.toString(10)} overflows max i64 ${MAX_I64.toString(10)}`)
                assert(o.cmp(MIN_I64) >= 0, `${o.toString(10)} overflows min i64 ${MIN_I64.toString(10)}`)
                if (o.cmp(new BN(0)) >= 0)
                    return o
                let buf = o.neg().toArrayLike(Uint8Array, 'be', 8)
                buf = inverse(buf)
                return new BN(buf).add(ONE)
            }
            case ABI_DATA_ENUM.f64: {
                return f64ToBytes(o.toNumber())
            }
        }
        throw new Error("unexpected abi type " + type)
    }

    if (typeof o === 'boolean') {
        switch (type) {
            case ABI_DATA_ENUM.u256:
            case ABI_DATA_ENUM.i64:
            case ABI_DATA_ENUM.u64: {
                return o ? ONE : ZERO;
            }
            case ABI_DATA_ENUM.string: {
                return o.toString()
            }
            case ABI_DATA_ENUM.bytes:
            case ABI_DATA_ENUM.address: {
                throw new Error("cannot convert boolean to address or bytes")
            }
            case ABI_DATA_ENUM.bool: {
                return o ? ONE : ZERO
            }
            case ABI_DATA_ENUM.f64: {
                return f64ToBytes(o ? 1 : 0)
            }
        }
        throw new Error("unexpected abi type " + type)
    }

    throw new Error("unexpected type " + o)
}

/**
 * 对字节数组取反
 */
export function inverse(arr: Uint8Array): Uint8Array {
    const ret = new Uint8Array(arr.length)
    for (let i = 0; i < ret.length; i++) {
        ret[i] = (~arr[i] & 0xff)
    }
    return ret
}

export function toSafeInt(x: string | number | BN | ArrayBuffer | Uint8Array): string | number {
    let bn: BN
    if (typeof x === 'number')
        return x
    if (typeof x === 'string') {
        const hex = x.startsWith('0x')
        x = hex ? x.substr(2, x.length - 2) : x
        bn = new BN(x, hex ? 16 : 10)
    }
    if (x instanceof ArrayBuffer || x instanceof Uint8Array) {
        let arr = x instanceof ArrayBuffer ? new Uint8Array(x) : x
        bn = new BN(arr)
    }
    if (x instanceof BN)
        bn = x
    if (bn.cmp(MAX_SAFE_INTEGER) <= 0 && bn.cmp(MIN_SAFE_INTEGER) >= 0)
        return bn.toNumber()
    return x.toString(10)
}

/**
 * decode binary as utf8 string
 */
export function bin2str(_bin: Binary): string {
    if (typeof _bin === 'string')
        return _bin
    let bin = hex2bin(_bin)
    if (typeof TextDecoder === 'function')
        return new TextDecoder().decode(bin)
    if (typeof Buffer === 'function')
        return Buffer.from(bin).toString('utf8')
    throw new Error('bin2str failed')
}

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function bin2hex(s: Binary): string {
    if (typeof s === 'string' && s.startsWith('0x')) {
        s = s.substr(2)
        assert(isHex(s), 'hex string')
        return s
    }
    if (
        !(s instanceof ArrayBuffer) &&
        !(s instanceof Uint8Array) &&
        !Array.isArray(s)
    )
        throw new Error("input " + s + " is not ArrayBuffer Uint8Array or Buffer and other array-like ")
    if (!(s instanceof Uint8Array))
        s = new Uint8Array(s)
    // input maybe Buffer or Uint8Array
    if (typeof Buffer === 'function')
        return Buffer.from(s).toString('hex')
    return Array.prototype.map.call(s, x => ('00' + x.toString(16)).slice(-2)).join('');
}