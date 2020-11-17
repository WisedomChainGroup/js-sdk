import { normalizeAddress, bin2hex, digest, bin2str, convert, dig2BN, address2PublicKeyHash, hex2bin, encodeBE, encodeUint32 } from "./utils"
import { ABI, getContractAddress, normalizeParams } from "./contract"
import { TransactionResult, Binary, AbiInput, Digital, ABI_DATA_TYPE, ZERO } from "./types"
import { Abort, CallContext, ContextHost, DBHost, EventHost, HashHost, Log, RLPHost, Util, Reflect, Transfer, Uint256Host, AbstractHost } from './hosts'
import BN = require('../bn')

import * as rlp from './rlp'
import { ThrowStatement } from "assemblyscript"

const utf16Decoder = new TextDecoder('utf-16')
const utf8Decoder = new TextDecoder()

interface VMInstance extends WebAssembly.Instance{
    exports: {
        memory: WebAssembly.Memory
        __alloc: (len: number | bigint, id: number | bigint) => number | bigint
        __idof: (t: ABI_DATA_TYPE) => number | bigint
        __retain: (p: number | bigint) => void
        init?: Function
    }
}

function strEncodeUTF16(str: string): ArrayBuffer{
    var buf = new ArrayBuffer(str.length*2);
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
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


    normParams(abi: ABI, params: AbiInput[] | Record<string, AbiInput>): AbiInput[]{
        let p = normalizeParams(params)
        if(Array.isArray(p))
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
        let view = new MemoryView(<WebAssembly.Memory> instance.exports.memory)
        let data: ArrayBuffer
        let id = Number(instance.exports.__idof(type))
        let offset: number | bigint
        switch (type) {
            case ABI_DATA_TYPE.bool:
            case ABI_DATA_TYPE.f64:
            case ABI_DATA_TYPE.i64:
            case ABI_DATA_TYPE.u64: {
                let converted = convert(val, type)
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
                data = (<Uint8Array> convert(val, ABI_DATA_TYPE.bytes)).buffer
                offset = instance.exports.__alloc(data.byteLength, id)
                break
            }
            case ABI_DATA_TYPE.u256: {
                let converted = <BN> convert(val, type)
                let buf = encodeBE(converted).buffer
                let ptr = this.malloc(instance, buf, ABI_DATA_TYPE.bytes)
                data = encodeUint32(ptr)
                offset = instance.exports.__alloc(4, id)
                break
            }
            case ABI_DATA_TYPE.address: {
                let buf = (<Uint8Array> convert(val, ABI_DATA_TYPE.address)).buffer
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

    // 合约调用
    async call(sender: Binary, method: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult> {
        return null
    }

    // 合约部署
    async deploy(sender: Binary, wasmFile: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult> {
        parameters = normalizeParams(parameters)
        let senderAddress = bin2hex(normalizeAddress(sender))
        const n = (this.nonceMap.get(senderAddress) || 0) + 1
        // 用 keccak256(rlp([sender, nonce  ])) 模拟事务哈希值 计算地址
        const txHash = digest(rlp.encode([normalizeAddress(sender), n]))
        const contractAddress = getContractAddress(txHash)
        const abi = await this.fetchABI(wasmFile)

        const a = abi.filter(x => x.type === 'function' && x.name === 'init')[0]
        // try to execute init function
        if (a) {

            const ctx: CallContext = {
                type: 16,
                sender: normalizeAddress(sender).buffer,
                to: new Uint8Array(20).buffer,
                amount: dig2BN(amount || ZERO),
                nonce: n,
                origin: normalizeAddress(sender).buffer,
                txHash: txHash.buffer,
                contractAddress: address2PublicKeyHash(contractAddress).buffer
            }

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

            let instance = <VMInstance> (await WebAssembly.instantiateStreaming(fetch(wasmFile), {
                env: env
            })).instance

            if (typeof instance.exports.init === 'function') {
                const arr = this.normParams(a, parameters)
                const args = []
                for(let i = 0; i < a.inputs.length; i++){
                    args.push(this.malloc(instance, arr[i], ABI_DATA_TYPE[a.inputs[i].type]))
                }
                instance.exports.init.apply(this, args)
            }
        }

        this.abiCache.set(contractAddress, abi)
        this.contractCode.set(contractAddress, wasmFile)
        this.nonceMap.set(senderAddress, n)
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