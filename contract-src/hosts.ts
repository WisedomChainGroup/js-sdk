import { isZero, VirtualMachine } from './vm'
import { concatBytes, dig2str, digest, padPrefix, trimLeadingZeros } from "./utils"
import { bin2hex, bin2str, hex2bin, str2bin } from './utils'
import BN = require('../bn')
import { ZERO } from './types'
import { abiToBinary, Contract } from './contract'
import * as rlp from './rlp'


export abstract class AbstractHost {
    instance: WebAssembly.Instance = null
    view: DataView
    world: VirtualMachine
    utf8Decoder: TextDecoder
    utf16Decoder: TextDecoder
    nonce: number
    deploy: boolean

    constructor(world: VirtualMachine) {
        this.world = world
        this.utf8Decoder = new TextDecoder('utf-8')
        this.utf16Decoder = new TextDecoder('utf-16')
    }

    init(instance: WebAssembly.Instance): void {
        this.instance = instance
        this.view = new DataView(this.memory)
    }

    get memory(): ArrayBuffer {
        const mem = <WebAssembly.Memory>this.instance.exports.memory
        return mem.buffer
    }

    abstract execute(...args: (number | bigint)[]): void | number | bigint

    abstract name(): string

    loadUTF8(offset: number | bigint, length: number | bigint): string {
        return this.utf8Decoder.decode(this.loadN(offset, length))
    }

    loadUTF16(offset: number | bigint): string {
        return this.utf16Decoder.decode(this.loadBuffer(Number(offset)))
    }

    loadU32(offset: number | bigint) {
        return this.view.getUint32(Number(offset), true)
    }


    loadBuffer(offset: number | bigint) {
        let len = this.loadU32(Number(offset) - 4)
        return this.loadN(offset, len)
    }

    loadN(offset: number | bigint, length: number | bigint): ArrayBuffer {
        return this.view.buffer.slice(Number(offset), Number(offset) + Number(length))
    }

    put(offset: number | bigint, data: ArrayBuffer): void {
        new Uint8Array(this.view.buffer).set(new Uint8Array(data), Number(offset))
    }
}

export class Log extends AbstractHost {
    name(): string {
        return '_log'
    }

    execute(...args: (number | bigint)[]): void {
        console.log(this.loadUTF8(args[0], args[1]))
    }
}

export class Abort extends AbstractHost {
    execute(...args: (number | bigint)[]): void {
        let msg = isZero(args[0]) ? '' : this.loadUTF16(args[0])
        let file = isZero(args[1]) ? '' : this.loadUTF16(args[1])
        throw new Error(`${file} ${msg} error at line ${args[2]} column ${args[3]}`)
    }
    name(): string {
        return 'abort'
    }
}


enum UtilType {
    CONCAT_BYTES,
    DECODE_HEX,
    ENCODE_HEX,
    BYTES_TO_U64,
    U64_TO_BYTES
}

export class Util extends AbstractHost {


    execute(...args: bigint[]): bigint {
        let t = Number(args[0])
        let put = !isZero(args[6])
        let data: ArrayBuffer = null
        let ret = BigInt(0)

        switch (t) {
            case UtilType.CONCAT_BYTES: {
                let a = this.loadN(args[1], args[2])
                let b = this.loadN(args[3], args[4])
                data = concatBytes(new Uint8Array(a), new Uint8Array(b)).buffer
                ret = BigInt(data.byteLength)
                break
            }
            case UtilType.DECODE_HEX: {
                let a = this.loadN(args[1], args[2])
                let str = bin2str(a)
                data = hex2bin(str).buffer
                ret = BigInt(data.byteLength)
                break
            }
            case UtilType.ENCODE_HEX: {
                let a = this.loadN(args[1], args[2])
                let str = bin2hex(a)
                data = str2bin(str)
                ret = BigInt(data.byteLength)
                break
            }
            case UtilType.BYTES_TO_U64: {
                let a = new Uint8Array(this.loadN(args[1], args[2]))
                let b = padPrefix(a, 0, 8)
                ret = new DataView(b).getBigUint64(0, false)
                break
            }
            case UtilType.U64_TO_BYTES: {
                let u = args[1]
                let d = new DataView(new Uint8Array(8))
                d.setBigUint64(0, u, false)
                break
            }
        }
        if (put) {
            this.put(args[5], data)
        }
        return ret
    }
    name(): string {
        return '_util'
    }

}

enum ContextType {
    HEADER_PARENT_HASH,
    HEADER_CREATED_AT,
    HEADER_HEIGHT,
    TX_TYPE,
    TX_CREATED_AT,
    TX_NONCE,
    TX_ORIGIN,
    TX_GAS_PRICE,
    TX_AMOUNT,
    TX_TO,
    TX_SIGNATURE,
    TX_HASH,
    CONTRACT_ADDRESS,
    CONTRACT_NONCE,
    ACCOUNT_NONCE,
    ACCOUNT_BALANCE,
    MSG_SENDER,
    MSG_AMOUNT,
    CONTRACT_CODE,
    CONTRACT_ABI
}

export interface CallContext {
    type: number
    sender: ArrayBuffer
    to: ArrayBuffer
    amount: BN
    nonce: number
    origin: ArrayBuffer
    txHash: ArrayBuffer
    contractAddress: ArrayBuffer
}

enum DBType {
    SET, GET, REMOVE, HAS, NEXT, CURRENT_KEY, CURRENT_VALUE, HAS_NEXT, RESET
}

enum Algorithm {
    KECCAK256
}

export class HashHost extends AbstractHost {
    execute(...args: bigint[]): bigint {
        let bin = this.loadN(args[1], args[2])
        let t = Number(args[0])
        let ret: ArrayBuffer
        switch (t) {
            case Algorithm.KECCAK256: {
                ret = digest(bin).buffer
                break
            }
            default:
                throw new Error(`hash host: invalid type ${t}`)
        }

        if (!isZero(args[4]))
            this.put(args[3], ret)
        return BigInt(ret.byteLength)
    }
    name(): string {
        return '_hash'
    }

}

export class EventHost extends AbstractHost {
    ctx: CallContext

    constructor(world: VirtualMachine, ctx: CallContext) {
        super(world)
        this.ctx = ctx
    }

    execute(...args: bigint[]): void {
        const name = this.loadUTF8(args[0], args[1])
        let abi = this.world.abiCache.get(bin2hex(this.ctx.contractAddress))
        const c = new Contract('', abi)
        let fields = <Uint8Array[]>rlp.decode(this.loadN(args[2], args[3]))
        let o = c.abiDecode(name, fields, 'event')
        console.log(`Event emit, name = ${name}`)
        console.log(o)

    }
    name(): string {
        return '_event'
    }

}

export class DBHost extends AbstractHost {
    ctx: CallContext
    execute(...args: bigint[]): bigint {
        let t = Number(args[0])
        switch (t) {
            case DBType.SET: {
                let addr = bin2hex(this.ctx.contractAddress)
                let k = this.loadN(args[1], args[2])
                let val = this.loadN(args[3], args[4])
                let m = this.world.storage.get(addr) || new Map<string, ArrayBuffer>()
                m.set(bin2hex(k), val)
                this.world.storage.set(addr, m)
                break
            }
            case DBType.GET: {
                let addr = bin2hex(this.ctx.contractAddress)
                let k = bin2hex(this.loadN(args[1], args[2]))
                let m = this.world.storage.get(addr) || new Map<string, ArrayBuffer>()
                if (!m.has(k))
                    throw new Error(`key ${k} not found in db`)
                let val = m.get(k)
                if (!isZero(args[4]))
                    this.put(args[3], val)
                return BigInt(val.byteLength)
            }
            case DBType.HAS: {
                let addr = bin2hex(this.ctx.contractAddress)
                let k = bin2hex(this.loadN(args[1], args[2]))
                let m = this.world.storage.get(addr) || new Map<string, ArrayBuffer>()
                return m.has(k) ? BigInt(1) : BigInt(0)
            }
            case DBType.NEXT:
            case DBType.CURRENT_KEY:
            case DBType.HAS_NEXT:
            case DBType.CURRENT_VALUE:
            case DBType.RESET: {
                throw new Error('not implemented yet')
            }
        }
    }

    name(): string {
        return '_db'
    }


    constructor(world: VirtualMachine, ctx: CallContext) {
        super(world)
        this.ctx = ctx
    }


}

export class ContextHost extends AbstractHost {
    ctx: CallContext

    constructor(world: VirtualMachine, ctx: CallContext) {
        super(world)
        this.ctx = ctx
    }

    execute(...args: bigint[]): bigint {
        let type = Number(args[0])
        let ret = BigInt(0)
        let put = !isZero(args[2])
        let data: ArrayBuffer = null
        let offset = args[1]

        switch (type) {
            case ContextType.HEADER_PARENT_HASH: {
                data = this.world.parentHash
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.HEADER_CREATED_AT: {
                put = false
                ret = BigInt(this.world.now)
                break
            }
            case ContextType.HEADER_HEIGHT: {
                put = false
                ret = BigInt(this.world.height)
                break
            }
            case ContextType.TX_TYPE: {
                put = false
                ret = BigInt(this.ctx.type)
                break
            }
            case ContextType.TX_CREATED_AT: {
                put = false
                break
            }
            case ContextType.TX_ORIGIN: {
                data = this.ctx.origin
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.TX_GAS_PRICE: {
                break
            }
            case ContextType.TX_AMOUNT: {
                data = trimLeadingZeros(this.ctx.amount.toArrayLike(Uint8Array, 'be'))
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.TX_TO: {
                data = this.ctx.to
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.TX_SIGNATURE: {
                data = (new Uint8Array(32)).buffer
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.TX_HASH: {
                data = this.ctx.txHash
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.CONTRACT_ADDRESS: {
                data = this.ctx.contractAddress
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.CONTRACT_NONCE: {
                put = false
                ret = BigInt(this.world.nonceMap.get(bin2hex(this.ctx.contractAddress)) || 0)
                break
            }
            case ContextType.ACCOUNT_NONCE: {
                put = false
                let addr = bin2hex(this.loadN(args[1], args[2]))
                ret = BigInt(this.world.nonceMap.get(bin2hex(addr)) || 0)
                break
            }
            case ContextType.ACCOUNT_BALANCE: {
                let addr = bin2hex(this.loadN(args[1], args[2]))
                let b = this.world.balanceMap.get(bin2hex(addr)) || ZERO
                data = trimLeadingZeros(b.toArrayLike(Uint8Array, 'be'))
                offset = args[3]
                put = !isZero(args[4])
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.MSG_SENDER: {
                data = this.ctx.sender
                ret = BigInt(data.byteLength)
                break
            }
            case ContextType.CONTRACT_CODE: {
                let addr = bin2hex(this.loadN(args[1], args[2]))
                let code = this.world.contractCode.get(addr)
                data = str2bin(code)
                put = !isZero(args[4])
                offset = args[3]
                break
            }
            case ContextType.CONTRACT_ABI: {
                let abi = this.world.abiCache.get(bin2hex(this.ctx.contractAddress))
                data = rlp.encode(abiToBinary(abi))
                ret = BigInt(data.byteLength)
                put = !isZero(args[4])
                offset = args[3]
                break
            }
        }

        if (put)
            this.put(offset, data)
        return ret
    }
    name(): string {
        return '_context'
    }
}

enum RLPType {
    ENCODE_U64,
    ENCODE_BYTES,
    DECODE_BYTES,
    RLP_LIST_SET, // add rlp list to global env
    RLP_LIST_CLEAR, // clear rlp list
    RLP_LIST_LEN,
    RLP_LIST_GET,
    RLP_LIST_PUSH,
    RLP_LIST_BUILD // build
}


export class RLPHost extends AbstractHost{
    list: rlp.RLPList
    elements: Uint8Array[]
    elementsEncoded: ArrayBuffer

    execute(...args: bigint[]): bigint {
        const t = Number(args[0])
        let ret = BigInt(0)
        let put = !isZero(args[4])
        let data: ArrayBuffer

        switch (t){
            case RLPType.ENCODE_U64: {
                data = rlp.encode(args[1]).buffer
                ret = BigInt(data.byteLength)
                break
            }
            case RLPType.ENCODE_BYTES: {
                let before = this.loadN(args[1], args[2])
                data = rlp.encode(before).buffer
                ret = BigInt(data.byteLength)
                break
            }
            case RLPType.DECODE_BYTES: {
                let encoded = this.loadN(args[1], args[2])
                let decoded = rlp.decode(encoded)
                if(!(decoded instanceof Uint8Array))
                    throw new Error('rlp decode failed, not a rlp item')
                data = (<Uint8Array> decoded).buffer   
                ret = BigInt(data.byteLength)
                break
            }
            case RLPType.RLP_LIST_SET: {
                put = false;
                this.list = rlp.RLPList.fromEncoded(this.loadN(args[1], args[2]))
                break
            }
            case RLPType.RLP_LIST_CLEAR: {
                put = false;
                this.list = null;
                break
            }
            case RLPType.RLP_LIST_LEN: {
                put = false;
                ret = BigInt(this.list.length())
            }
            case RLPType.RLP_LIST_GET: {
                data = this.list.raw(Number(args[1]))
                ret = BigInt(data.byteLength)
                break
            }
            case RLPType.RLP_LIST_PUSH: {
                put = false;
                if (!this.elements)
                    this.elements = []
                this.elementsEncoded = null;
                let bytes = this.loadN(args[1], args[2])
                this.elements.push(new Uint8Array(bytes))
                break
            }
            case RLPType.RLP_LIST_BUILD: {
                if (!this.elementsEncoded)
                    this.elementsEncoded = rlp.encodeElements(this.elements).buffer
                data = this.elementsEncoded;
                ret = BigInt(data.byteLength)
                if (!isZero(args[4])) {
                    this.elementsEncoded = null;
                    this.elements = null;
                }
                break;
            }
            default: {
                throw new Error(`rlp: unknown type: ${t}`)
            }
        }
        if (put)
            this.put(args[3], data)
        return ret
    }

    name(): string {
        return "";
    }

}

export class Reflect extends AbstractHost{
    execute(...args: (number | bigint)[]): number | bigint | void {
        throw new Error('Method not implemented.')
    }
    name(): string {
        return '_reflect'
    }
}

export class Transfer extends AbstractHost{
    ctx: CallContext


    constructor(world: VirtualMachine, ctx: CallContext) {
        super(world)
        this.ctx = ctx
    }
        
    execute(...args: (number | bigint)[]): number | bigint | void {
        throw new Error('Method not implemented.')
    }
    name(): string {
        throw new Error('Method not implemented.')
    }
    
}