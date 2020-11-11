import { AbiInput, Binary, Readable, RLPElement, TransactionResult, TX_STATUS, WS_CODES, Event } from "./types"
import { assert, bin2str, hex2bin, normalizeAddress, toSafeInt, uuidv4 } from "./utils"
import { byteArrayToInt } from "./rlp"
import { bin2hex } from "./utils"
import { Contract, normalizeParams } from "./contract"
import { Transaction } from "./tx"
import rlp = require('./rlp')
import BN = require("../bn")
import Dict = NodeJS.Dict

export interface Resp {
    code: WS_CODES
    nonce: number
    body: RLPElement | RLPElement[]
}

interface EventResp extends Resp {
    addr: string
    name: string
    fields: Uint8Array[]
}

interface TransactionResp extends Resp {
    hash: string
    status: TX_STATUS
    reason?: string
    blockHeight?: number | string
    blockHash?: string
    gasUsed?: string | number
    events?: [Uint8Array, Uint8Array[]][]
    result?: Uint8Array[]
}


export class RPC {
    host: string
    port: string

    private callbacks: Map<number, (resp: TransactionResp | EventResp) => void>
    private id2key: Map<number, string>
    private id2hash: Map<number, string>
    private eventHandlers: Map<string, Set<number>>
    private txObservers: Map<string, Set<number>>
    private cid: number
    private rpcCallbacks: Map<number, (resp: Resp) => void>
    private nonce: number
    private ws: WebSocket
    private uuid: string

    /**
     *
     * @param host  主机名
     * @param port  端口号
     */
    constructor(host?: string, port?: string | number) {
        this.host = host || 'localhost'
        this.port = (port || 80).toString()

        this.callbacks = new Map() // id -> function
        this.id2key = new Map()// id -> address:event
        this.id2hash = new Map()  // id -> txhash
        this.eventHandlers = new Map() // address:event -> [id]
        this.txObservers = new Map() // hash -> [id]
        this.cid = 0
        this.rpcCallbacks = new Map() // nonce -> cb
        this.nonce = 0
    }

    private tryConnect(): Promise<void> {
        let WS: new (url: string) => WebSocket

        if (typeof WebSocket === 'function')
            WS = WebSocket
        else
            WS = require('ws')

        if (this.ws && this.ws.readyState === this.ws.OPEN) {
            return Promise.resolve()
        }

        if (this.ws) {
            const fn = this.ws.onopen || ((e) => { })
            const _rj = this.ws.onerror || ((e) => { })
            const p = new Promise((rs, rj) => {
                this.ws.onopen = (e) => {
                    fn.call(this.ws, e)
                    rs()
                }
                this.ws.onerror = (e) => {
                    _rj.call(this.ws, e)
                    rj(e)
                }
            })
            return <Promise<void>>p
        }

        this.uuid = uuidv4()
        this.ws = new WS(`ws://${this.host}:${this.port || 80}/websocket/${this.uuid}`)
        this.ws.onerror = console.error
        this.ws.onmessage = (e) => {
            if (typeof WebSocket !== 'function') {
                this.handleData(e.data)
                return
            }
            const reader = new FileReader()

            reader.onload = () => {
                const arrayBuffer = reader.result
                this.handleData(new Uint8Array(<ArrayBuffer>arrayBuffer))
            }
            reader.readAsArrayBuffer(e.data)
        }
        const p = new Promise(
            (rs, rj) => {
                this.ws.onopen = rs
                this.ws.onerror = rj
            }
        )
        return <Promise<void>>p
    }

    private parse(data: Uint8Array): Resp {
        const decoded = <RLPElement[]>rlp.decode(data)
        const nonce = byteArrayToInt(<Uint8Array>decoded[0])
        const code = byteArrayToInt(<Uint8Array>decoded[1])
        const body = decoded[2]

        let r: Resp = {
            code: code,
            nonce: nonce,
            body: body
        }

        switch (code) {
            case WS_CODES.TRANSACTION_EMIT: {
                const h = bin2hex(<Uint8Array>body[0])
                const s = byteArrayToInt(<Uint8Array>body[1])
                let ret: TransactionResp = <TransactionResp>r
                ret.hash = h
                ret.status = s
                if (s === TX_STATUS.DROPPED) {
                    ret.reason = bin2str(<Uint8Array>body[2])
                }
                if (s === TX_STATUS.INCLUDED) {
                    const arr = body[2]
                    ret.blockHeight = toSafeInt(arr[0])
                    ret.blockHash = bin2hex(arr[1])
                    ret.gasUsed = toSafeInt(arr[2])
                    ret.result = arr[3]
                    ret.events = arr[4]
                }
                return ret
            }
            case WS_CODES.EVENT_EMIT: {
                let ret: EventResp = <EventResp>r
                ret.addr = bin2hex(<Uint8Array>body[0])
                ret.name = bin2str(<Uint8Array>body[1])
                ret.fields = <Uint8Array[]> (<RLPElement[]>body)[2]
                return ret
            }
        }

        return r
    }

    private handleData(data): void {
        const r = this.parse(data)

        switch (r.code) {
            case WS_CODES.TRANSACTION_EMIT: {
                const t = <TransactionResp>r
                const funcIds = this.txObservers.get(t.hash) || []
                funcIds.forEach(id => {
                    const func = this.callbacks.get(id)
                    func(t)
                })
                return
            }
            case WS_CODES.EVENT_EMIT: {
                const e = <EventResp>r
                const funcIds = this.eventHandlers.get(`${e.addr}:${e.name}`) || []
                funcIds.forEach(id => {
                    const func = this.callbacks.get(id)
                    func(e)
                })
                return
            }
        }

        if (r.nonce) {
            const fn = this.rpcCallbacks.get(r.nonce)
            if (fn)
                fn(r)
            this.rpcCallbacks.delete(r.nonce)
        }
    }

    /**
     * 监听合约事件
     */
    private __listen(contract: Contract, event: string, func: (e: Dict<Readable>) => void) {
        const addr = normalizeAddress(contract.address)
        const addrHex = bin2hex(addr)
        this.wsRpc(WS_CODES.EVENT_SUBSCRIBE, addr)
        const id = ++this.cid
        const key = `${addrHex}:${event}`
        this.id2key.set(id, key)

        const fn: (e: EventResp) => void = (e) => {
            const abiDecoded = contract.abiDecode(event, <Uint8Array[]>e.fields, 'event')
            func(<Dict<Readable>>abiDecoded)
        }

        if (!this.eventHandlers.has(key))
            this.eventHandlers.set(key, new Set())

        this.eventHandlers.get(key).add(id)
        this.callbacks.set(id, fn)
        return id
    }

    listen(contract: Contract, event: string, func?: (e: Dict<Readable>) => void): Promise<Dict<Readable>> {
        if (func === undefined) {
            return new Promise((rs, rj) => {
                this.__listen(contract, event, rs)
            })
        }
        assert(typeof func === 'function', 'callback should be function')
        this.__listen(contract, event, func)
    }

    /**
     * 移除监听器
     * @param {number} id 监听器的 id
     */
    removeListener(id: number): void {
        const key = this.id2key.get(id)
        const h = this.id2hash.get(id)
        this.callbacks.delete(id)
        this.id2key.delete(id)
        this.id2hash.delete(id)
        if (key) {
            const set = this.eventHandlers.get(key)
            set && set.delete(id)
            if (set && set.size === 0)
                this.eventHandlers.delete(key)
        }
        if (h) {
            const set = this.txObservers.get(h)
            set && set.delete(id)
            if (set && set.size === 0)
                this.txObservers.delete(h)
        }
    }

    listenOnce(contract: Contract, event: string, func?: (e: Dict<Readable>) => void): Promise<Dict<Readable>> {
        const id = this.cid + 1
        if (func === undefined)
            return this.listen(contract, event).then((r) => {
                this.removeListener(id)
                return r
            })
        return this.listen(contract, event, (p) => {
            func(p)
            this.removeListener(id)
        })
    }

    /**
     * 添加事务观察者，如果事务最终被确认或者异常终止，观察者会被移除
     */
    private __observe(_hash: Binary, cb: (r: TransactionResp) => void) {
        let hash = bin2hex(_hash)
        const id = ++this.cid

        hash = hash.toLowerCase()
        if (!this.txObservers.has(hash))
            this.txObservers.set(hash, new Set())
        this.id2hash.set(id, hash)
        this.txObservers.get(hash).add(id)

        const fn: (r: TransactionResp) => void = (r) => {
            cb(r)
            switch (r.status) {
                case TX_STATUS.DROPPED:
                case TX_STATUS.CONFIRMED:
                    this.removeListener(id)
                    break
            }
        }
        this.callbacks.set(id, fn)
        return id
    }


    /**
     * 查看合约方法
     */
    viewContract(contract: Contract, method: string, parameters?: AbiInput | AbiInput[] | Dict<AbiInput>): Promise<Readable> {
        if (!(contract instanceof Contract))
            throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

        let normalized = normalizeParams(parameters)
        const addr = contract.address
        const params = contract.abiEncode(method, normalized)

        return this.wsRpc(WS_CODES.CONTRACT_QUERY, [
            normalizeAddress(addr),
            method,
            params
        ]).then(r => <Readable>contract.abiDecode(method, <Uint8Array[]> rlp.decode(r.body as Uint8Array)))
    }

    /**
     * 通过 websocket 发送事务
     * @param tx 事务
     */
    sendTransaction(tx: Transaction | Transaction[]): Promise<void> {
        return this.wsRpc(WS_CODES.TRANSACTION_SEND, [Array.isArray(tx), tx])
            .then(() => Promise.resolve())
    }


    observe(tx: Transaction, status: TX_STATUS, timeout?: number): Promise<TransactionResult> {
        status = status === undefined ? TX_STATUS.CONFIRMED : status
        return new Promise((resolve, reject) => {
            let success = false

            if (timeout)
                setTimeout(() => {
                    if (success) return
                    reject({ reason: 'timeout' })
                }, timeout)

            let ret: TransactionResult = <TransactionResult>{}
            let confirmed = false
            let included = false

            this.__observe(tx.getHash(), (resp: TransactionResp) => {
                if(resp.status === TX_STATUS.PENDING && status === TX_STATUS.PENDING)
                    resolve()
                if (resp.status === TX_STATUS.DROPPED) {
                    const e = { hash: resp.hash, reason: resp.reason }
                    reject(e)
                    return
                }
                if (resp.status === TX_STATUS.CONFIRMED) {
                    if (status === TX_STATUS.INCLUDED)
                        return
                    confirmed = true
                    if (included) {
                        success = true
                        resolve(ret)
                        return
                    }
                }
                if (resp.status === TX_STATUS.INCLUDED) {
                    included = true
                    ret.blockHeight = resp.blockHeight
                    ret.blockHash = resp.blockHash
                    ret.gasUsed = resp.gasUsed

                    if (resp.result && resp.result.length
                        && tx.__abi
                        && tx.isDeployOrCall()
                    ) {
                        const decoded = (new Contract('', tx.__abi)).abiDecode(tx.getMethod(), resp.result)
                        ret.result = <Readable>decoded
                    }

                    if (
                        resp.events &&
                        resp.events.length
                        && tx.__abi) {
                        const events: Event[] = []
                        for (let e of resp.events) {
                            const name = bin2str(e[0])
                            const decoded = (new Contract('', tx.__abi)).abiDecode(name, e[1], 'event')
                            events.push({ name: name, data: <Dict<Readable>>decoded })
                        }
                        ret.events = events
                    }

                    ret.transactionHash = bin2hex(tx.getHash())
                    ret.fee = toSafeInt((new BN(tx.gasPrice).mul(new BN(ret.gasUsed))))

                    if (tx.isDeployOrCall()) {
                        ret.method = tx.getMethod()
                        ret.inputs = tx.__inputs
                    }

                    if (status === TX_STATUS.INCLUDED) {
                        success = true
                        resolve(ret)
                        return
                    }

                    if (confirmed) {
                        success = true
                        resolve(ret)
                    }
                }
            })
        })
    }

    private wsRpc(code: WS_CODES, data: any): Promise<Resp> {
        this.nonce++
        const n = this.nonce
        const ret = new Promise((rs, rj) => {
            this.rpcCallbacks.set(n, rs)
        })
        this.tryConnect()
            .then(() => {
                const encoded = rlp.encode([n, code, data])
                this.ws.send(encoded)
            })
        return <Promise<Resp>>ret
    }

    /**
     * 发送事务的同时监听事务的状态
     */
    sendAndObserve(tx: Transaction | Transaction[], status: TX_STATUS.INCLUDED | TX_STATUS.CONFIRMED, timeout?: number): Promise<TransactionResult | TransactionResult[]> {
        let ret: Promise<TransactionResult | TransactionResult[]>
        let sub: Promise<Resp>
        if (Array.isArray(tx)) {
            const arr: Promise<TransactionResult>[] = []
            sub = this.wsRpc(WS_CODES.TRANSACTION_SUBSCRIBE, tx.map(t => hex2bin(t.getHash())))
            for (const t of tx) {
                arr.push(this.observe(t, status, timeout))
            }
            ret = Promise.all(arr)
        } else {
            sub = this.wsRpc(WS_CODES.TRANSACTION_SUBSCRIBE, hex2bin(tx.getHash()))
            ret = this.observe(tx, status, timeout)
        }
        return sub
            .then(() => this.sendTransaction(tx))
            .then(() => ret)
    }

    /**
     * 获取 nonce
     */
    getNonce(_pkOrAddress: Binary): Promise<number | string> {
        let pkOrAddress = normalizeAddress(_pkOrAddress)
        return this.wsRpc(WS_CODES.ACCOUNT_QUERY, pkOrAddress)
            .then(resp => {
                return toSafeInt(new BN(resp.body[0][2]))
            })
    }

    /**
     * 获取 账户余额
     */
    getBalance(_pkOrAddress: Binary): Promise<number | string> {
        let pkOrAddress = normalizeAddress(_pkOrAddress)
        return this.wsRpc(WS_CODES.ACCOUNT_QUERY, pkOrAddress)
            .then(resp => {
                return toSafeInt(new BN(resp.body[0][3]))
            })
    }

    close() {
        if (this.ws) {
            const ws = this.ws
            this.ws = null
            ws.close()
        }
    }
}
