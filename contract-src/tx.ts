/**
 * 事务
 */
import { AbiInput, ABI_DATA_TYPE, Binary, constants, Digital, Readable } from "./types"
import { bin2str, concatArray, convert, dig2str, digest, extendPrivateKey, hex2bin, padPrefix, toSafeInt } from "./utils"
import { bin2hex } from "./utils"
import BN = require("../bn")
import rlp = require('./rlp')
import nacl = require('../nacl.min.js')
import { Encoder } from "./rlp"
import { ABI, Contract } from "./contract"

export class Transaction implements Encoder {
    version: string
    type: string
    nonce: string
    from: string
    gasPrice: string
    amount: string
    payload: string
    to: string
    signature: string
    __abi?: ABI[]
    __inputs?: Readable[] | Record<string, Readable>

    /**
     * constructor of transaction
     */
    constructor(version?: Digital, type?: Digital, nonce?: Digital, from?: Binary, gasPrice?: Digital, amount?: Digital, payload?: Binary, to?: Binary, signature?: Binary, __abi?: any, __inputs?: any) {
        this.version = dig2str(version || 0)
        this.type = dig2str(type || 0)
        this.nonce = dig2str(nonce || 0)
        this.from = bin2hex(from || '')
        this.gasPrice = dig2str(gasPrice || 0)
        this.amount = dig2str(amount || 0)
        this.payload = bin2hex(payload || '')
        this.to = bin2hex(to || '')
        this.signature = bin2hex(signature || '')
        this.__abi = __abi
        this.__inputs = __inputs
    }

    static clone(o: any): Transaction {
        return new Transaction(o.version, o.type, o.nonce, o.from, o.gasPrice, o.amount, o.payload, o.to, o.signature)
    }

    /**
     * 
     * @param x 解析16进制字符串的事务
     */
    static fromRaw(x: Binary): Transaction {
        const args = []
        let offset = 0
        const shift = (n: number) => {
            offset = offset + n
            return offset
        }
        const u8 = hex2bin(x)
        // version
        args.push(u8[offset++])
        // type
        args.push(u8[offset++])
        // nonce
        args.push(
            new BN(u8.slice(offset, shift(8)), 'hex', 'be')
        )
        // from
        args.push(u8.slice(offset, shift(32)))
        // gasprice
        args.push(
            new BN(u8.slice(offset, shift(8)), 'hex', 'be')
        )
        // amount
        args.push(
            new BN(u8.slice(offset, shift(8)), 'hex', 'be')
        )
        // signature
        const sig = u8.slice(offset, shift(64))
        
        // to
        const to = u8.slice(offset, shift(20))
        
        // payload length
        const len = (new BN(u8.slice(offset, shift(4)), 'hex', 'be')).toNumber()
        // payload
        const p = u8.slice(offset, shift(len))
        args.push(p, to, sig)
        return new Transaction(...args)
    }

    /**
     * 计算事务哈希值
     */
    getHash(): Uint8Array {
        return digest(this.getRaw(false))
    }

    /**
     * 生成事务签名或者哈希值计算需要的原文
     * 如果需要签名的话 getRaw 填写 true
     */
    getRaw(nullSig: boolean): Uint8Array {
        let sig = nullSig ? new Uint8Array(64) : hex2bin(this.signature)
        const p = hex2bin(this.payload)
        return concatArray(
            [
                new Uint8Array([parseInt(this.version)]),
                new Uint8Array([parseInt(this.type)]),
                padPrefix((new BN(this.nonce)).toArrayLike(Uint8Array, 'be'), 0, 8),
                hex2bin(this.from),
                padPrefix((new BN(this.gasPrice)).toArrayLike(Uint8Array, 'be'), 0, 8),
                padPrefix((new BN(this.amount)).toArrayLike(Uint8Array, 'be'), 0, 8),
                sig,
                hex2bin(this.to),
                padPrefix((new BN(p.length)).toArrayLike(Uint8Array, 'be'), 0, 4),
                p
            ]
        )
    }

    /**
     * rlp 编码结果
     */
    getEncoded(): Uint8Array {
        const arr = this.__toArr()
        return rlp.encode(arr)
    }

    __toArr(): Array<string | Uint8Array | BN> {
        return [
            convert(this.version || 0, ABI_DATA_TYPE.u64),
            convert(this.type || 0, ABI_DATA_TYPE.u64),
            convert(this.nonce || '0', ABI_DATA_TYPE.u64),
            convert(this.from || '', ABI_DATA_TYPE.bytes),
            convert(this.gasPrice || '0', ABI_DATA_TYPE.u256),
            convert(this.amount || '0', ABI_DATA_TYPE.u256),
            convert(this.payload || '', ABI_DATA_TYPE.bytes),
            hex2bin(this.to),
            convert(this.signature || '', ABI_DATA_TYPE.bytes)
        ]
    }

    /**
     * 签名
     */
    sign(_sk: Binary): void {
        let sk = hex2bin(_sk)
        sk = extendPrivateKey(sk)
        this.signature = bin2hex(nacl.sign(this.getRaw(true), sk).slice(0, 64))
    }

    __setInputs(__inputs: AbiInput[] | Record<string, AbiInput>): void {
        const cnv: (x: AbiInput) => Readable = (x) => {
            if (x instanceof ArrayBuffer || x instanceof Uint8Array)
                return bin2hex(x)
            if (x instanceof BN || typeof x === 'bigint')
                return toSafeInt(x)
            return x
        }
        if (Array.isArray(__inputs)) {
            this.__inputs = __inputs.map(cnv)
        } else {
            this.__inputs = {}
            for (let k of Object.keys(__inputs)) {
                this.__inputs[k] = cnv(__inputs[k])
            }
        }
        if (Array.isArray(this.__inputs)) {
            const c = new Contract('', this.__abi)
            const a = c.getABI(this.getMethod(), 'function')
            if (a.inputsObj()) {
                this.__inputs = <Record<string, Readable>>a.toObj(this.__inputs, true)
            }
        }
    }

    getMethod(): string {
        const t = parseInt(this.type)
        return t === constants.WASM_DEPLOY ? 'init' : bin2str(<Uint8Array>(rlp.decode(hex2bin(this.payload)))[1])
    }

    isDeployOrCall(): boolean {
        const t = parseInt(this.type)
        return t === constants.WASM_DEPLOY || t === constants.WASM_CALL
    }
}