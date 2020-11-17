import { normalizeAddress, bin2hex, digest, bin2str, convert } from "./utils"
import { ABI, getContractAddress, normalizeParams } from "./contract"
import { TransactionResult, Binary, AbiInput, Digital, ABI_DATA_TYPE} from "./types"
import { Abort, Log, Util } from './hosts'
import BN = require('../bn')

import * as rlp from './rlp'


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

    alloc(address: Binary, amount: Digital): void{
        this.balanceMap.set(bin2hex(normalizeAddress(address)), <BN> convert(amount, ABI_DATA_TYPE.u256))
    }

    // 模拟下一区块的生成
    nextBlock(): void{
        this.height ++ 
        this.parentHash = this.hash
        this.hash = digest(rlp.encode(this.height)).buffer
        this.now = Math.floor((new Date()).valueOf() / 1000)
    }

    // 合约调用
    async call(sender: Binary, method: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult>{
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

        // try to execute init function
        if (abi.filter(x => x.type === 'function' && x.name === 'init').length > 0) {
            let mem = new WebAssembly.Memory({ initial: 10, maximum: 1024 })

            const env = {
                memory: mem
            }

            const hosts = [new Log(this), new Abort(this), new Util(this)]

            hosts.forEach(h => {
                env[h.name()] = h.execute.bind(h)
            })

            let instance = (await WebAssembly.instantiateStreaming(fetch(wasmFile), {
                env: env
            })).instance

            hosts.forEach(h => {
                h.init(instance)
            })

            if(typeof instance.exports.init === 'function')
                instance.exports.init()
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