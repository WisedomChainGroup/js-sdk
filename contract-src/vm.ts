import { normalizeAddress, bin2hex, digest, bin2str, convert, dig2BN, address2PublicKeyHash, hex2bin, encodeBE, encodeUint32, toSafeInt, bytesToF64 } from "./utils"
import { ABI, getContractAddress, normalizeParams } from "./contract"
import { TransactionResult, Binary, AbiInput, Digital, ABI_DATA_TYPE, ZERO, Readable } from "./types"
import { Abort, CallContext, ContextHost, DBHost, EventHost, HashHost, Log, RLPHost, Util, Reflect, Transfer, Uint256Host, AbstractHost } from './hosts'
import BN = require('../bn')

import * as rlp from './rlp'

const utf16Decoder = new TextDecoder('utf-16')
const utf8Decoder = new TextDecoder()

/**
 * 虚拟机实例
 */
interface VMInstance extends WebAssembly.Instance {
    exports: {
        memory: WebAssembly.Memory
        __alloc: (len: number | bigint, id: number | bigint) => number | bigint
        __idof: (t: ABI_DATA_TYPE) => number | bigint
        __retain: (p: number | bigint) => void
        init?: Function
    }
}

/**
 * 对字符串进行 utf16 编码，用于向 WebAssembly 内存中导入
 * @param str 
 */
function strEncodeUTF16(str: string): ArrayBuffer {
    var buf = new ArrayBuffer(str.length * 2);
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf
}

export class MemoryView {
    view: DataView

    constructor(mem: WebAssembly.Memory) {
        this.view = new DataView(mem.buffer)
    }



    loadUTF8(offset: number | bigint, length: number | bigint): string {
        return utf8Decoder.decode(this.loadN(offset, length))
    }

    loadUTF16(offset: number | bigint): string {
        return utf16Decoder.decode(this.loadBuffer(Number(offset)))
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

export function isZero(n: number | bigint): boolean {
    return n === 0 || n === BigInt(0)
}

/**
 * virtual machine for chrome debugging 
 */
export class VirtualMachine {
    // current block height
    height = 0

    // parent block hash
    parentHash: ArrayBuffer

    // current block hash
    hash: ArrayBuffer = (new Uint8Array(32)).buffer

    // contract address -> url
    contractCode: Map<string, string> = new Map()

    // cache for abi
    abiCache: Map<string, ABI[]> = new Map()

    // record nonce
    nonceMap: Map<string, number> = new Map()

    balanceMap: Map<string, BN> = new Map()

    // unix epoch seconds
    now: number

    storage: Map<string, Map<string, ArrayBuffer>> = new Map()

    constructor() {
        if (typeof WebAssembly !== 'object')
            throw new Error('webassembly not available here')

        this.nextBlock()
    }


    normParams(abi: ABI, params?: AbiInput | AbiInput[] | Record<string, AbiInput>): AbiInput[] {
        let p = normalizeParams(params)
        if (Array.isArray(p))
            return p
        const ret = []
        abi.inputs.forEach(i => {
            ret.push(params[i.name])
        })
        return ret
    }

    putParams(instance: VMInstance, abi: ABI, params: AbiInput[] | Record<string, AbiInput>): void {
        let arr: AbiInput[]

        if (Array.isArray(params)) {
            arr = params
        } else {
            arr = []
            abi.inputs.forEach(x => arr.push(params[x.name]))
        }

        for (let i = 0; i < abi.inputs.length; i++) {
            let t = ABI_DATA_TYPE[abi.inputs[i].type]
            let id = instance.exports.__idof(t)
        }
    }

    malloc(instance: VMInstance, val: AbiInput, type: ABI_DATA_TYPE): number | bigint {
        let view = new MemoryView(<WebAssembly.Memory>instance.exports.memory)
        let data: ArrayBuffer
        let id = Number(instance.exports.__idof(type))
        let offset: number | bigint
        switch (type) {
            case ABI_DATA_TYPE.f64:
            case ABI_DATA_TYPE.bool:
            case ABI_DATA_TYPE.i64:
            case ABI_DATA_TYPE.u64: {
                let converted = convert(val, type)
                if(type === ABI_DATA_TYPE.f64){
                    return bytesToF64(<Uint8Array> converted)
                }
                let l = <BN>(converted instanceof Uint8Array ? new BN(converted, 10, 'be') : converted)
                return BigInt(l.toString(10))
            }
            case ABI_DATA_TYPE.string: {
                let converted = <string>convert(val, type)
                data = strEncodeUTF16(converted)
                offset = instance.exports.__alloc(data.byteLength, id)
                break
            }
            case ABI_DATA_TYPE.bytes: {
                data = (<Uint8Array>convert(val, ABI_DATA_TYPE.bytes)).buffer
                offset = instance.exports.__alloc(data.byteLength, id)
                break
            }
            case ABI_DATA_TYPE.u256: {
                let converted = <BN>convert(val, type)
                let buf = encodeBE(converted).buffer
                let ptr = this.malloc(instance, buf, ABI_DATA_TYPE.bytes)
                data = encodeUint32(ptr)
                offset = instance.exports.__alloc(4, id)
                break
            }
            case ABI_DATA_TYPE.address: {
                let buf = (<Uint8Array>convert(val, ABI_DATA_TYPE.address)).buffer
                offset = instance.exports.__alloc(4, id)
                let ptr = this.malloc(instance, buf, ABI_DATA_TYPE.bytes)
                data = encodeUint32(ptr)
                break
            }
        }

        view.put(offset, data)
        instance.exports.__retain(offset)
        return offset
    }

    alloc(address: Binary, amount: Digital): void {
        this.balanceMap.set(bin2hex(normalizeAddress(address)), <BN>convert(amount, ABI_DATA_TYPE.u256))
    }

    // 模拟下一区块的生成
    nextBlock(): void {
        this.height++
        this.parentHash = this.hash
        this.hash = digest(rlp.encode(this.height)).buffer
        this.now = Math.floor((new Date()).valueOf() / 1000)
    }

    addBalance(addr: Binary, amount?: Digital) {
        let hex = bin2hex(normalizeAddress(addr))
        let balance = this.balanceMap.get(hex) || ZERO
        balance = balance.add(dig2BN(amount || ZERO))
        this.balanceMap.set(hex, balance)
    }

    subBalance(addr: Binary, amount?: Digital) {
        let hex = bin2hex(normalizeAddress(addr))
        let balance = this.balanceMap.get(hex) || ZERO
        let a = dig2BN(amount || ZERO)
        if (balance.cmp(a) < 0)
            throw new Error(`the balance of ${hex} is not enough`)
        balance = balance.sub(a)
        this.balanceMap.set(hex, balance)
    }

    increaseNonce(sender: Binary): number {
        let senderHex = bin2hex(normalizeAddress(sender))
        const n = (this.nonceMap.get(senderHex) || 0) + 1
        this.nonceMap.set(senderHex, n)
        return n
    }

    call(sender: Binary, addr: Binary, method: string, params?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<Readable> {
        let origin = normalizeAddress(sender).buffer
        const n = this.increaseNonce(sender)
        return this.callInternal(method, {
            type: null,
            sender: origin,
            to: normalizeAddress(addr).buffer,
            amount: dig2BN(amount || ZERO),
            nonce: n,
            origin: origin,
            txHash: digest(rlp.encode([normalizeAddress(sender), n])).buffer,
            contractAddress: normalizeAddress(addr).buffer,
            readonly: false
        }, params)
    }

    private async callInternal(method: string, ctx?: CallContext, params?: AbiInput | AbiInput[] | Record<string, AbiInput>): Promise<Readable> {
        // 1. substract amount
        this.subBalance(ctx.sender, ctx.amount)
        this.addBalance(ctx.contractAddress, ctx.amount)
        ctx.type = method === 'init' ? 16 : 17
        const file = this.contractCode.get(bin2hex(ctx.contractAddress))
        const abi = await this.fetchABI(file)

        let mem = new WebAssembly.Memory({ initial: 10, maximum: 65535 })
        const env = {
            memory: mem,
        }

        const hosts: AbstractHost[] = [
            new Log(this), new Abort(this), new Util(this),
            new HashHost(this), new EventHost(this, ctx), new DBHost(this, ctx),
            new ContextHost(this, ctx), new RLPHost(this), new Reflect(this),
            new Transfer(this, ctx), new Uint256Host(this)
        ]

        hosts.forEach(h => {
            h.init(env)
            env[h.name()] = (...args: (number | bigint)[]) => {
                return h.execute(args)
            }
        })

        let instance = <VMInstance>(await WebAssembly.instantiateStreaming(fetch(file), {
            env: env
        })).instance

        if (typeof instance.exports[method] !== 'function') {
            throw new Error(`call internal failed: ${method} not found`)
        }

        const a = abi.filter(x => x.type === 'function' && x.name === method)[0]
        const arr = this.normParams(a, params)
        const args = []
        for (let i = 0; i < a.inputs.length; i++) {
            args.push(this.malloc(instance, arr[i], ABI_DATA_TYPE[a.inputs[i].type]))
        }
        let ret = instance.exports[method].apply(window, args)
        if (a.outputs && a.outputs.length)
            return this.extractRet(instance, ret, ABI_DATA_TYPE[a.outputs[0].type])

    }

    extractRet(ins: VMInstance, offset: number | bigint, type: ABI_DATA_TYPE): Readable {
        let ret = this.extractRetInternal(ins, offset, type)
        if (ret instanceof ArrayBuffer)
            return bin2hex(ret)
        return ret
    }

    extractRetInternal(ins: VMInstance, offset: number | bigint, type: ABI_DATA_TYPE): boolean | number | string | ArrayBuffer {
        let view = new MemoryView(ins.exports.memory)
        switch (type) {
            case ABI_DATA_TYPE.bool:
                return Number(type) !== 0
            case ABI_DATA_TYPE.i64:
                return toSafeInt(offset)
            case ABI_DATA_TYPE.u64:{
                if(offset < 0){
                    let buf = new ArrayBuffer(8)
                    new DataView(buf).setBigInt64(0, BigInt(offset))
                    return toSafeInt(buf)
                }
                return toSafeInt(offset)
            }
            case ABI_DATA_TYPE.f64: {
                return <number>offset
            }
            case ABI_DATA_TYPE.string: {
                return utf16Decoder.decode(<ArrayBuffer>this.extractRetInternal(ins, offset, ABI_DATA_TYPE.bytes))
            }
            case ABI_DATA_TYPE.bytes: {
                let len = view.loadU32(Number(offset) - 4)
                return view.loadN(offset, len)
            }
            case ABI_DATA_TYPE.address:
            case ABI_DATA_TYPE.u256: {
                let ptr = view.loadU32(offset)
                return this.extractRetInternal(ins, ptr, ABI_DATA_TYPE.bytes)
            }
        }
    }

    async view(): Promise<Readable> {
        return null
    }

    // 合约部署
    async deploy(sender: Binary, wasmFile: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<Readable> {
        let senderAddress = normalizeAddress(sender)
        // 用 keccak256(rlp([sender, nonce  ])) 模拟事务哈希值 计算地址
        const n = this.increaseNonce(sender)
        const txHash = digest(rlp.encode([normalizeAddress(sender), n]))
        const contractAddress = normalizeAddress(getContractAddress(txHash))
        const contractAddressHex = bin2hex(contractAddress)

        const abi = await this.fetchABI(wasmFile)
        this.abiCache.set(contractAddressHex, abi)
        this.contractCode.set(contractAddressHex, wasmFile)

        const a = abi.filter(x => x.type === 'function' && x.name === 'init')[0]
        // try to execute init function
        if (a) {
            return this.callInternal('init', {
                type: null,
                sender: senderAddress,
                to: new Uint8Array(20).buffer,
                amount: dig2BN(amount || ZERO),
                nonce: n,
                origin: senderAddress,
                txHash: txHash.buffer,
                contractAddress: contractAddress.buffer,
                readonly: false
            }, parameters)
        }
        this.nextBlock()
        return null
    }

    // 根据文件名规范获取 abi
    async fetchABI(wasmFile: string): Promise<ABI[]> {
        let f = wasmFile.replace(/^(.*)\.wasm$/, '$1.abi.json')
        if (this.abiCache.has(f))
            return this.abiCache.get(f)
        const resp = await fetch(f)
        const buf = await resp.arrayBuffer()
        return JSON.parse(bin2str(buf))
    }
}