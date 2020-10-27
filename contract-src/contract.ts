import {
    ABI_DATA_ENUM,
    ABI_DATA_TYPE,
    ABI_DATA_TYPE_TABLE,
    ABI_TYPE,
    AbiInput,
    Binary, MAX_U256,
    MAX_U64, ONE,
    Readable
} from "./types"
import Dict = NodeJS.Dict
import child_process = require('child_process')
import {
    assert,
    bin2str,
    bytesToF64,
    convert,
    hex2bin,
    inverse,
    padPrefix,
    publicKeyHash2Address,
    toSafeInt,
    rmd160, normalizeAddress
} from "./utils"
import BN = require("../bn")
import { bin2hex } from "./utils"
import rlp = require('./rlp')

/**
 * 计算合约地址
 */
export function getContractAddress(hash: Binary): string {
    let buf = rlp.encode([hex2bin(hash), 0])
    buf = rmd160(buf)
    return publicKeyHash2Address(buf)
}

export function compileContract(ascPath: string, src: string, opts?: { debug?: boolean, optimize?: boolean }): Promise<Uint8Array> {
    let cmd = ascPath + ' ' + src + ' -b ' // 执行的命令
    if (opts && opts.debug)
        cmd += ' --debug '
    if (opts && opts.optimize)
        cmd += ' --optimize '
    return new Promise((resolve, reject) => {
        child_process.exec(
            cmd,
            { encoding: 'buffer' },
            (err, stdout, stderr) => {
                if (err) {
                    // err.code 是进程退出时的 exit code，非 0 都被认为错误
                    // err.signal 是结束进程时发送给它的信号值
                    reject(stderr.toString('ascii'))
                }
                resolve(stdout)
            }
        )
    })
}

/**
 * 编译合约 ABI
 */
export function compileABI(_str: Binary): ABI[] {
    let str = bin2str(_str)
    const TYPES = {
        u64: 'u64',
        i64: 'i64',
        f64: 'f64',
        bool: 'bool',
        string: 'string',
        ArrayBuffer: 'bytes',
        Address: 'address',
        U256: 'u256',
        String: 'string',
        boolean: 'bool'
    }

    function getOutputs(str) {
        if (str === 'void')
            return []
        const ret = TYPES[str]
        if (!ret)
            throw new Error(`invalid type: ${str}`)
        return [new TypeDef(ret)]
    }

    function getInputs(str: string, event?: boolean): TypeDef[] {
        const ret = []
        for (let p of str.split(',')) {
            if (!p)
                continue
            const lr = p.split(':')
            let l = lr[0].trim()
            if (event) {
                if (!l.startsWith('readonly'))
                    throw new Error(`event constructor field ${l} should starts with readonly`)
                l = l.split(' ')[1]
            }
            const r = lr[1].trim()
            const o = new TypeDef(
                TYPES[r],
                l
            )
            if (!o.type)
                throw new Error(`invalid type: ${r}`)
            ret.push(o)
        }
        return ret
    }

    const ret: ABI[] = []
    let funRe = /export[\s\n\t]+function[\s\n\t]+([a-zA-Z_][a-zA-Z0-9_]*)[\s\n\t]*\(([a-z\n\s\tA-Z0-9_,:]*)\)[\s\n\t]*:[\s\n\t]*([a-zA-Z_][a-zA-Z0-9_]*)[\s\n\t]*{/g
    let eventRe = /@unmanaged[\s\n\t]+class[\s\n\t]+([a-zA-Z_][a-zA-Z0-9]*)[\s\n\t]*\{[\s\n\t]*constructor[\s\n\t]*\(([a-z\n\s\tA-Z0-9_,:]*)\)/g
    let contains__idof = false
    for (let m of (str.match(funRe) || [])) {
        funRe.lastIndex = 0
        const r = funRe.exec(m)
        if (r[1] === '__idof') {
            contains__idof = true
            continue
        }
        ret.push(new ABI(
            r[1],
            'function',
            getInputs(r[2]),
            getOutputs(r[3])
        ))
    }


    for (let m of (str.match(eventRe) || [])) {
        eventRe.lastIndex = 0
        const r = eventRe.exec(m)
        ret.push(new ABI(
            r[1],
            'event',
            [],
            getInputs(r[2], true)
        ))
    }

    if (!contains__idof)
        throw new Error('any contract must contains an __idof function')
    return ret
}


export class TypeDef {
    type: ABI_DATA_TYPE
    name?: string
    constructor(type: string, name?: string) {
        type = type && type.toLocaleLowerCase()
        assert(ABI_DATA_TYPE_TABLE.indexOf(<ABI_DATA_TYPE>type) >= 0, `invalid abi type def name = ${name} type = ${type}`)
        this.type = <ABI_DATA_TYPE>type
        this.name = name
    }

    static from(o): TypeDef {
        return new TypeDef(o.type, o.name)
    }
}

export class ABI {
    name: string
    type: ABI_TYPE
    inputs: TypeDef[]
    outputs: TypeDef[]

    constructor(name: string, type: ABI_TYPE, inputs?: TypeDef[], outputs?: TypeDef[]) {
        assert(name, 'expect name of abi')
        assert(type === 'function' || type === 'event', `invalid abi type ${type}`)
        assert(!inputs || Array.isArray(inputs), `invalid inputs ${inputs}`)
        assert(!outputs || Array.isArray(outputs), `invalid inputs ${outputs}`)

        this.name = name
        this.type = type
        this.inputs = (inputs || []).map(TypeDef.from)
        this.outputs = (outputs || []).map(TypeDef.from)
    }

    static from(o: any) {
        return new ABI(o.name, o.type, o.inputs, o.outputs)
    }

    // able to return object instead of array
    returnsObj(): boolean {
        return this.outputs.every(v => v.name) && (
            (new Set(this.outputs.map(v => v.name))).size === this.outputs.length
        )
    }


    // able to input object instead of array
    inputsObj(): boolean {
        return this.inputs.every(v => v.name) && (
            (new Set(this.inputs.map(v => v.name))).size === this.inputs.length
        )
    }

    toObj(arr: AbiInput[], input: boolean): Dict<AbiInput> {
        const p = input ? this.inputs : this.outputs
        const o = {}
        for (let i = 0; i < p.length; i++) {
            o[p[i].name] = arr[i]
        }
        return o
    }

    toArr(obj: Dict<AbiInput>, input: boolean): AbiInput[] {
        const p = input ? this.inputs : this.outputs
        const arr = []
        for (let i = 0; i < p.length; i++) {
            arr.push(obj[p[i].name])
        }
        return arr
    }
}

export function normalizeParams(params?: AbiInput | AbiInput[] | Dict<AbiInput>): AbiInput[] | Dict<AbiInput> {
    if (params === null || params === undefined)
        return []
    if (typeof params === 'string' || typeof params === 'boolean' || typeof params === 'number' || params instanceof ArrayBuffer || params instanceof Uint8Array || params instanceof BN)
        return [params]
    return params
}


function abiDecode(outputs: TypeDef[], buf?: Uint8Array[]): Readable[] | Dict<Readable> {
    buf = buf || []
    const len = buf.length
    if (len === 0)
        return []

    const arr = buf
    const returnObject =
        outputs.every(v => v.name) && (
            (new Set(outputs.map(v => v.name))).size === outputs.length
        )

    if (arr.length != outputs.length)
        throw new Error(`abi decode failed , expect ${outputs.length} returns while ${arr.length} found`)

    const ret = returnObject ? {} : []
    for (let i = 0; i < arr.length; i++) {
        const t = outputs[i].type
        const name = outputs[i].name
        let val: Readable
        switch (t) {
            case 'bytes': {
                val = bin2hex(arr[i])
                break
            }
            case 'address': {
                val = publicKeyHash2Address(arr[i])
                break
            }
            case 'u256':
            case 'u64': {
                const n = new BN(arr[i])
                if (t === 'u64')
                    assert(n.cmp(MAX_U64) <= 0, `${n.toString(10)} overflows max u64 ${MAX_U64.toString(10)}`)
                if (t === 'u256')
                    assert(n.cmp(MAX_U256) <= 0, `${n.toString(10)} overflows max u256 ${MAX_U256.toString(10)}`)
                val = toSafeInt(n)
                break
            }
            case 'i64': {
                let n
                const padded = padPrefix(arr[i], 0, 8)
                const isneg = padded[0] & 0x80
                if (!isneg) {
                    n = new BN(arr[i])
                } else {
                    n = new BN(inverse(padded))
                    n = n.add(ONE)
                    n = n.neg()
                }
                val = toSafeInt(n)
                break
            }
            case 'f64': {
                val = bytesToF64(arr[i])
                break
            }
            case 'string': {
                val = bin2str(arr[i])
                break
            }
            case 'bool': {
                val = arr[i].length > 0
                break
            }
        }
        if (returnObject)
            ret[name] = val
        else
            ret[i] = val
    }
    return ret
}


export class Contract {
    address: string
    abi: ABI[]
    binary: Uint8Array
    constructor(address?: Binary, abi?: ABI[], binary?: ArrayBuffer | Uint8Array) {
        if (address)
            this.address = bin2hex(normalizeAddress(address))
        this.abi = (abi || []).map(ABI.from)
        if (binary)
            this.binary = hex2bin(binary)
    }

    abiEncode(name: string, li?: AbiInput | AbiInput[] | Dict<AbiInput>): [ABI_DATA_ENUM[], Array<string | Uint8Array | BN>, ABI_DATA_ENUM[]] {
        const func = this.getABI(name, 'function')
        let retType = func.outputs && func.outputs[0] && func.outputs[0].type
        const retTypes = retType ? [ABI_DATA_TYPE_TABLE.indexOf(retType)] : []

        if (typeof li === 'string' || typeof li === 'number' || li instanceof BN || li instanceof ArrayBuffer || li instanceof Uint8Array || typeof li === 'boolean')
            return this.abiEncode(name, [li])

        if (li === undefined || li === null)
            return [[], [], retTypes]


        if (Array.isArray(li)) {
            const arr = []
            const types = []
            if (li.length != func.inputs.length)
                throw new Error(`abi encode failed for ${func.name}, expect ${func.inputs.length} parameters while ${li.length} found`)
            for (let i = 0; i < li.length; i++) {
                arr[i] = convert(li[i], ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type))
                types[i] = ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type)
            }
            return [types, arr, retTypes]
        }

        const arr: Array<string | Uint8Array | BN> = []
        const types: ABI_DATA_ENUM[] = []
        for (let i = 0; i < func.inputs.length; i++) {
            const input = func.inputs[i]
            types[i] = ABI_DATA_TYPE_TABLE.indexOf(func.inputs[i].type)
            if (!(input.name in li)) {
                throw new Error(`key ${input.name} not found in parameters`)
            }
            arr[i] = convert(li[input.name], ABI_DATA_TYPE_TABLE.indexOf(input.type))
        }
        return [types, arr, retTypes]
    }


    abiDecode(name: string, buf?: Uint8Array[], type?: ABI_TYPE): Readable | Readable[] | Dict<Readable> {
        type = type || 'function'
        buf = buf || []
        if (buf.length === 0)
            return []

        const a = this.getABI(name, type)
        const ret = abiDecode(a.outputs, buf)
        if (type === 'function')
            return ret && ret[0]
        return ret
    }


    /**
     * 合约部署的 paylod
     */
    abiToBinary(): any[] {
        const ret = []
        for (let a of this.abi) {
            ret.push([a.name, a.type === 'function' ? 0 : 1, a.inputs.map(x => ABI_DATA_ENUM[x.type]), a.outputs.map(x => ABI_DATA_ENUM[x.type])])
        }
        return ret
    }

    getABI(name: string, type: ABI_TYPE): ABI {
        const funcs = this.abi.filter(x => x.type === type && x.name === name)
        assert(funcs.length === 1, `exact exists one and only one abi ${name}, while found ${funcs.length}`)
        return funcs[0]
    }
}
