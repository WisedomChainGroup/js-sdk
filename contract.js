(function () {
    const OFFSET_SHORT_ITEM = 0x80;
    const SIZE_THRESHOLD = 56;
    const OFFSET_LONG_ITEM = 0xb7;
    const OFFSET_SHORT_LIST = 0xc0;
    const OFFSET_LONG_LIST = 0xf7;
    const EMPTY_BYTES = new Uint8Array(new ArrayBuffer(0));
    const EMPTY_RLP_ARRAY = new Uint8Array([0xc0])
    const NULL_RLP = new Uint8Array([0x80])

    const ENVS = {
        NODE: 'NODE',
        BROWSER: 'BROWSER'
    }

    const env = this['window'] === this ? ENVS.BROWSER : ENVS.NODE
    const isBrowser = env === ENVS.BROWSER


    const BN = require('./bn.js')
    const _keccak256 = require('./sha3.js').keccak256
    const nacl = require('./nacl.min.js')
    const RMD160 = (new (require('./hashes.js').RMD160))
    RMD160.setUTF8(false)

    /**
     * 比较两个字节数组
     * @param {Uint8Array} a
     * @param {Uint8Array} b
     */
    function compareBytes(a, b) {
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

    // base58 编码
    const base58 = base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')

    // rmd 不支持对 Uint8Array 进行哈希值计算，需要把 Uint8Array 类型伪装成字符串
    class FakeString {
        constructor(u8) {
            this.u8 = u8
            this.length = u8.length
        }

        charCodeAt(i) {
            return this.u8[i]
        }
    }

    /**
     * rmd160 哈希值计算
     * @param {Uint8Array} o
     * @returns {Uint8Array}
     */
    function rmd160(o) {
        assert(isBytes(o), 'o is not byte array')
        return decodeHex(RMD160.hex(new FakeString(o)))
    }


    /**
     * base58 编码工具
     * @param {string} ALPHABET
     */
    function base(ALPHABET) {
        var ALPHABET_MAP = {}
        var BASE = ALPHABET.length
        var LEADER = ALPHABET.charAt(0)

        // pre-compute lookup table
        for (var z = 0; z < ALPHABET.length; z++) {
            var x = ALPHABET.charAt(z)

            if (ALPHABET_MAP[x] !== undefined) throw new TypeError(x + ' is ambiguous')
            ALPHABET_MAP[x] = z
        }

        /**
         *
         * @param {Uint8Array} source
         */
        function encode(source) {
            if (source.length === 0) return ''

            var digits = [0]
            for (var i = 0; i < source.length; ++i) {
                for (var j = 0, carry = source[i]; j < digits.length; ++j) {
                    carry += digits[j] << 8
                    digits[j] = carry % BASE
                    carry = (carry / BASE) | 0
                }

                while (carry > 0) {
                    digits.push(carry % BASE)
                    carry = (carry / BASE) | 0
                }
            }

            var string = ''

            // deal with leading zeros
            for (var k = 0; source[k] === 0 && k < source.length - 1; ++k) string += LEADER
            // convert digits to a string
            for (var q = digits.length - 1; q >= 0; --q) string += ALPHABET[digits[q]]

            return string
        }


        /**
         *
         * @param {string} string
         * @returns {Uint8Array}
         */
        function decodeUnsafe(string) {
            if (typeof string !== 'string') throw new TypeError('Expected String')
            if (string.length === 0) return new Uint8Array(0)

            var bytes = [0]
            for (var i = 0; i < string.length; i++) {
                var value = ALPHABET_MAP[string[i]]
                if (value === undefined)
                    throw new Error(`invalid char ${string[i]}`)

                for (var j = 0, carry = value; j < bytes.length; ++j) {
                    carry += bytes[j] * BASE
                    bytes[j] = carry & 0xff
                    carry >>= 8
                }

                while (carry > 0) {
                    bytes.push(carry & 0xff)
                    carry >>= 8
                }
            }

            // deal with leading zeros
            for (var k = 0; string[k] === LEADER && k < string.length - 1; ++k) {
                bytes.push(0)
            }

            return new Uint8Array(bytes.reverse())
        }

        function decode(string) {
            var buffer = decodeUnsafe(string)
            if (buffer) return buffer

            throw new Error('Non-base' + BASE + ' character')
        }

        return {
            encode: encode,
            decodeUnsafe: decodeUnsafe,
            decode: decode
        }
    }


    /**
     * 私钥转公钥
     * @param {Uint8Array | string | ArrayBuffer} privateKey
     * @returns {Uint8Array}
     */
    function privateKey2PublicKey(privateKey) {
        privateKey = decodeHex(privateKey)
        if (isBytes(privateKey))
            privateKey = toU8Arr(privateKey)
        if (privateKey.length === 64)
            privateKey = privateKey.slice(32)
        const pair = new nacl.sign.keyPair.fromSeed(privateKey)
        return pair.publicKey
    }

    /**
     * 公钥转公钥哈希
     * @param {Uint8Array | string} publicKey
     * @returns {Uint8Array}
     */
    function publicKey2Hash(publicKey) {
        publicKey = decodeHex(publicKey)
        publicKey = digest(publicKey)
        return rmd160(publicKey)
    }

    /**
     * 地址转公钥哈希
     */
    function address2PublicKeyHash(str) {
        assert(typeof str === 'string', 'address is string')
        let r5;
        if (str.indexOf("1") == 0) {
            r5 = base58.decode(str)
        } else {
            r5 = base58.decode(str.substr(2))
        }
        return r5.slice(1, r5.length - 4)
    }

    /**
     * 公钥哈希转地址
     * @param { Uint8Array } hash
     *
     */
    function publicKeyHash2Address(hash) {
        let r2 = concatBytes(new Uint8Array([0]), hash)
        let r3 = digest(digest(hash))
        let b4 = r3.slice(0, 4)
        let b5 = concatBytes(r2, b4)
        return base58.encode(b5)
    }

    /**
     * 32 字节私钥转成 64字节私钥
     * @param {string} sk
     */
    function extendPrivateKey(sk) {
        sk = decodeHex(sk)
        if (sk.length === 64)
            return sk
        return concatBytes(sk, privateKey2PublicKey(sk))
    }

    /**
     * 断言正确的地址
     * @param {string} address
     */
    function assertAddress(address) {
        if (!typeof address === 'string')
            throw new Error('invalid address not a string')

        if (!address.startsWith('1') && !address.startsWith('WX') && !address.startsWith('WR')) {
            throw new Error('address should starts with 1, WX or WR')
        }

        if (address.startsWith('WX') || address.startsWith('WR'))
            address = address.substr(2)

        let _r5 = base58.decode(address);

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
     * @param {string | Uint8Array | ArrayBuffer} 地址、公钥或者公钥哈希
     * @returns  {Uint8Array}
     */
    function normalizeAddress(addr) {
        if (typeof addr === 'string' && isHex(addr))
            addr = decodeHex(addr)
        if (isBytes(addr)) {
            addr = toU8Arr(addr)
            // 公要哈希 20 个字节
            if (addr.length === 20)
                return addr
            // 32 字节的是公钥 转成公钥哈希
            if (addr.length === 32)
                return publicKey2Hash(addr)
            throw new Error(`invalid size ${addr.length}`)
        }
        // 地址转公钥哈希
        assertAddress(addr)
        return address2PublicKeyHash(addr)
    }

    /**
     * 计算 keccak256哈希
     * @param {Uint8Array}
     * @returns {Uint8Array}
     */
    function digest(msg) {
        assert(isBytes(msg), 'digest failed msg is not bytes')
        const hasher = _keccak256.create()
        hasher.update(msg)
        return new Uint8Array(hasher.arrayBuffer())
    }

    // 事务的所有状态
    const TX_STATUS = {
        PENDING: 0,
        INCLUDED: 1,
        CONFIRMED: 2,
        DROPPED: 3
    }

    function copy(dst, src) {
        for (let key of Object.keys(src))
            dst[key] = src[key]
    }

    /**
     * 转成安全范围内的整数，如果不是安全范围内，用字符串表示
     * @param {string | number | ArrayBuffer | Uint8Array | BN }
     * @returns { string | number}
     */
    function toSafeInt(x) {
        if (typeof x === 'number')
            return x
        if (typeof x === 'string') {
            const hex = x.startsWith('0x')
            if (hex)
                x = x.substr(2, x.length - 2)
            x = new BN(x, hex ? 16 : 10)
        }
        if (x instanceof ArrayBuffer || x instanceof Uint8Array)
            x = new BN(x, 'be')

        if (x.cmp(MAX_SAFE_INTEGER) <= 0 && x.cmp(MIN_SAFE_INTEGER) >= 0)
            return x.toNumber()
        return x.toString()
    }


    const assert = this['assert'] ? this['assert'] : (truth, msg) => {
        if (!truth)
            throw new Error(msg || 'assert failed')
    }

    const MAX_U64 = new BN('ffffffffffffffff', 16);
    const MAX_U256 = new BN('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 16);
    const MAX_I64 = new BN('9223372036854775807', 10);
    const MIN_I64 = new BN('-9223372036854775808', 10);
    const MAX_SAFE_INTEGER = new BN(Number.MAX_SAFE_INTEGER);
    const MIN_SAFE_INTEGER = new BN(Number.MIN_SAFE_INTEGER);
    const ONE = new BN(1)

    /**
     * 截掉字节数组前面的 0
     * @param { Uint8Array | ArrayBuffer } data 字节数组
     */
    function trimLeadingZeros(data) {
        assert(isBytes(data), 'data is not bytes')
        data = toU8Arr(data)
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

    function hexToInt(x) {
        if (48 <= x && x <= 57) return x - 48;
        if (97 <= x && x <= 102) return x - 87;
        if (65 <= x && x <= 70) return x - 55;
        return 0;
    }

    /**
     * 解析十六进制字符串
     * decode hex string
     * @param {string | ArrayBuffer | Uint8Array} s
     * @returns {Uint8Array}
     */
    function decodeHex(s) {
        if (isBytes(s))
            return toU8Arr(s)
        if (s.startsWith('0x'))
            s = s.substr(2, s.length - 2)
        assert(s.length % 2 === 0, 'invalid char');
        const ret = new Uint8Array(s.length / 2);
        for (let i = 0; i < s.length / 2; i++) {
            const h = s.charCodeAt(i * 2);
            const l = s.charCodeAt(i * 2 + 1);
            ret[i] = (hexToInt(h) << 4) + hexToInt(l);
        }
        return ret;
    }

    /**
     * 判断是否是合法的十六进制字符串
     * @param {string} hex
     * @returns {boolean}
     */
    function isHex(hex) {
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
     * convert bytes like objects to hex string 十六进制编码
     * @param {string | ArrayBuffer | Uint8Array } s
     * @returns {string}
     */
    function bin2hex(s) {
        if (typeof s === 'string' && s.startsWith('0x')) {
            s = s.substr(2)
        }
        if (typeof s === 'string') {
            assert(isHex(s), `invalid hex string ${s}`)
        }
        if (isBytes(s))
            return encodeHex(s)
        return s
    }

    /**
     * convert digital like objects to digital string 转成十进制表示的字符串
     * @param {string | BN | number } s
     * @returns {string}
     */
    function asDigitalNumberText(s) {
        if (typeof s === 'string') {
            if (s.startsWith('0x'))
                s = new BN(s.substr(2), 16)
            else
                return s
        }
        return s.toString(10)
    }

    class TypeDef {
        /**
         *
         * @param {string} type
         * @param {string} name
         */
        constructor(type, name) {
            type = type && type.toLowerCase()
            assert(
                type === ABI_DATA_TYPE.STRING
                || type === ABI_DATA_TYPE.U64
                || type === ABI_DATA_TYPE.ADDRESS
                || type === ABI_DATA_TYPE.BYTES
                || type === ABI_DATA_TYPE.U256
                || type === ABI_DATA_TYPE.BOOL
                || type === ABI_DATA_TYPE.I64
                || type === ABI_DATA_TYPE.F64,
                `invalid abi type def name = ${name} type = ${type}`
            )
            this.type = type
            this.name = name
        }

        /**
         *
         * @param {Object} o
         * @return {TypeDef}
         */
        static from(o) {
            return new TypeDef(o.type, o.name)
        }
    }

    class ABI {
        /**
         *
         * @param {string} name
         * @param {string} type
         * @param {Array<TypeDef> } inputs
         * @param {Array<TypeDef>} outputs
         */
        constructor(name, type, inputs, outputs) {
            type = type && type.toLowerCase()
            assert(name, 'expect name of abi')
            assert(type === ABI_TYPE.FUNCTION || type === ABI_TYPE.EVENT, `invalid abi type ${type}`)
            assert(!inputs || Array.isArray(inputs), `invalid inputs ${inputs}`)
            assert(!outputs || Array.isArray(outputs), `invalid inputs ${outputs}`)

            this.name = name
            this.type = type
            this.inputs = (inputs || []).map(TypeDef.from)
            this.outputs = (outputs || []).map(TypeDef.from)
        }

        static from(o) {
            return new ABI(o.name, o.type, o.inputs, o.outputs)
        }

        returnsObj() {
            return this.outputs.every(v => v.name) && (
                (new Set(this.outputs.map(v => v.name))).size === this.outputs.length
            )
        }

        inputsObj() {
            return this.inputs.every(v => v.name) && (
                (new Set(this.inputs.map(v => v.name))).size === this.inputs.length
            )
        }

        toObj(arr, input) {
            const p = input ? this.inputs : this.outputs
            const o = {}
            for (let i = 0; i < p.length; i++) {
                o[p[i].name] = arr[i]
            }
            return o
        }

        toArr(obj, input) {
            const p = input ? this.inputs : this.outputs
            const arr = []
            for (let i = 0; i < p.length; i++) {
                arr.push(obj[p[i].name])
            }
            return arr
        }
    }

    function normalizeParams(params) {
        if (params === null || params === undefined)
            return []
        if (typeof params === 'string' || typeof params === 'boolean' || typeof params === 'number' || params instanceof ArrayBuffer || params instanceof Uint8Array || params instanceof BN)
            return [params]
        return params
    }

    /**
     * abi 解码
     * @param {Array<TypeDef>} outputs
     * @param {string | ArrayBuffer | Array<Uint8Array> | Uint8Array} buf
     */
    function abiDecode(outputs, buf) {
        if (!buf)
            buf = ''
        if (typeof buf === 'string')
            buf = decodeHex(buf)
        if (buf.length === 0)
            return []

        const arr = Array.isArray(buf) ? buf : RLP.decode(buf)

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
            let val
            switch (t) {
                case ABI_DATA_TYPE.BYTES:
                    val = encodeHex(arr[i])
                    break
                case ABI_DATA_TYPE.ADDRESS:
                    val = publicKeyHash2Address(arr[i])
                    break
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.U64: {
                    val = new BN(arr[i], 'be')
                    if (t === ABI_DATA_TYPE.U64)
                        assert(val.cmp(MAX_U64) <= 0, `${val.toString(10)} overflows max u64 ${MAX_U64.toString(10)}`)
                    if (t === ABI_DATA_TYPE.U256)
                        assert(val.cmp(MAX_U256) <= 0, `${val.toString(10)} overflows max u256 ${MAX_U256.toString(10)}`)
                    val = toSafeInt(val)
                    break
                }
                case ABI_DATA_TYPE.I64: {
                    const padded = padPrefix(arr[i], 0, 8)
                    const isneg = padded[0] & 0x80;
                    if (!isneg) {
                        val = new BN(arr[i], 'be')
                    } else {
                        val = new BN(inverse(padded), 'be')
                        val = val.add(ONE)
                        val = val.neg()
                    }
                    val = toSafeInt(val)
                    break
                }
                case ABI_DATA_TYPE.F64: {
                    val = bytesToF64(arr[i])
                    break
                }
                case ABI_DATA_TYPE.STRING: {
                    val = bin2str(arr[i])
                    break
                }
                case ABI_DATA_TYPE.BOOL: {
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

    /**
     * 事务
     */
    class Transaction {
        /**
         * constructor of transaction
         * @param {string | number | BN} [version]
         * @param {string | number | BN} [type]
         * @param {string | number | BN} [nonce]
         * @param {string | Uint8Array | ArrayBuffer} [from]
         * @param {string | number | BN} [gasPrice]
         * @param {string | number | BN} [amount]
         * @param {string | Uint8Array | ArrayBuffer } [payload]
         * @param {string | Uint8Array | ArrayBuffer} [to]
         * @param {string | Uint8Array | ArrayBuffer } [signature]
         * @param { Array<ABI> } [__abi] abi
         * @param { Array | Object } [__inputs] inputs
         */
        constructor(version, type, nonce, from, gasPrice, amount, payload, to, signature, __abi, __inputs) {
            this.version = asDigitalNumberText(version || 0)
            this.type = asDigitalNumberText(type || 0)
            this.nonce = asDigitalNumberText(nonce || 0)
            this.from = bin2hex(from || '')
            this.gasPrice = asDigitalNumberText(gasPrice || 0)
            this.amount = asDigitalNumberText(amount || 0)
            this.payload = bin2hex(payload || '')
            this.to = bin2hex(to || '')
            this.signature = bin2hex(signature || '')
            this.__abi = __abi
            this.__inputs = __inputs
        }

        static clone(o) {
            return new Transaction(o.version, o.type, o.nonce, o.from, o.gasPrice, o.amount, o.payload, o.to, o.signature)
        }

        /**
         * 计算事务哈希值
         * @returns { Uint8Array } 哈希值
         */
        getHash() {
            return digest(this.getRaw(false))
        }

        /**
         * 生成事务签名或者哈希值计算需要的原文
         * @param {boolean} nullSig
         * @returns {Uint8Array}
         */
        getRaw(nullSig) {
            let sig = nullSig ? new Uint8Array(64) : decodeHex(this.signature)
            const p = decodeHex(this.payload)
            return concatBytes(
                [
                    new Uint8Array([parseInt(this.version)]),
                    new Uint8Array([parseInt(this.type)]),
                    padPrefix((new BN(this.nonce)).toArrayLike(Uint8Array, 'be'), 0, 8),
                    decodeHex(this.from),
                    padPrefix((new BN(this.gasPrice)).toArrayLike(Uint8Array, 'be'), 0, 8),
                    padPrefix((new BN(this.amount)).toArrayLike(Uint8Array, 'be'), 0, 8),
                    sig,
                    decodeHex(this.to),
                    padPrefix((new BN(p.length)).toArrayLike(Uint8Array, 'be'), 0, 4),
                    p
                ]
            )
        }

        /**
         * rlp 编码结果
         * @returns { Uint8Array }
         */
        getEncoded() {
            const arr = this.__toArr()
            return RLP.encode(arr)
        }

        __toArr() {
            return [
                convert(this.version || 0, ABI_DATA_TYPE.U64),
                convert(this.type || 0, ABI_DATA_TYPE.U64),
                convert(this.nonce || '0', ABI_DATA_TYPE.U64),
                convert(this.from || EMPTY_BYTES, ABI_DATA_TYPE.BYTES),
                convert(this.gasPrice || '0', ABI_DATA_TYPE.U256),
                convert(this.amount || '0', ABI_DATA_TYPE.U256),
                convert(this.payload || EMPTY_BYTES, ABI_DATA_TYPE.BYTES),
                decodeHex(this.to),
                convert(this.signature || EMPTY_BYTES, ABI_DATA_TYPE.BYTES)
            ]
        }

        /**
         * 签名
         * @param {string | Uint8Array | ArrayBuffer } sk 私钥
         */
        sign(sk) {
            sk = decodeHex(sk)
            sk = extendPrivateKey(sk)
            this.signature = encodeHex(nacl.sign(this.getRaw(true), sk).slice(0, 64))
        }

        __setInputs(__inputs) {
            const cnv = (x) => {
                if (x instanceof ArrayBuffer || x instanceof Uint8Array)
                    return encodeHex(x)
                if (x instanceof BN)
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
                const a = c.getABI(this.getMethod(), ABI_TYPE.FUNCTION)
                if (a.inputsObj()) {
                    this.__inputs = a.toObj(this.__inputs, true)
                }
            }
        }

        getMethod() {
            const t = parseInt(this.type)
            return t === constants.WASM_DEPLOY ? 'init' : bin2str((RLP.decode(decodeHex(this.payload)))[1])
        }

        isDeployOrCall() {
            const t = parseInt(this.type)
            return t === constants.WASM_DEPLOY || t === constants.WASM_CALL
        }

        static fromRaw(x) {
            var args = []
            var offset = 0
            var shift = function (n) {
                offset = offset + n
                return offset
            }
            var u8 = decodeHex(x)
            // version
            args.push(u8[offset++])
            // type
            args.push(u8[offset++])
            // nonce
            args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'))
            // from
            args.push(u8.slice(offset, shift(32)))
            // gasprice
            args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'))
            // amount
            args.push(new BN(u8.slice(offset, shift(8)), 'hex', 'be'))
            // signature
            var sig = u8.slice(offset, shift(64))
            // to
            var to = u8.slice(offset, shift(20))
            // payload length
            var len = (new BN(u8.slice(offset, shift(4)), 'hex', 'be')).toNumber()
            // payload
            var p = u8.slice(offset, shift(len))
            args.push(p, to, sig);
            return new Transaction(
                args[0],
                args[1],
                args[2],
                args[3],
                args[4],
                args[5],
                p,
                to,
                sig
            )

        }
    }

    /**
     * 判断是否是二进制字节数组
     * @param s
     * @returns {boolean}
     */
    function isBytes(s) {
        return s instanceof Uint8Array || s instanceof ArrayBuffer
    }

    /**
     * convert uint8array or array buffer to uint8 array
     * @param {Uint8Array | ArrayBuffer} data
     * @returns {Uint8Array}
     */
    function toU8Arr(data) {
        assert(isBytes(data), `${data} is not uint8array or arraybuffer`)
        if (data instanceof ArrayBuffer)
            return new Uint8Array(data)
        return data
    }

    /**
     * 字节数组转 number
     * @param {Uint8Array | ArrayBuffer} bytes
     * @returns {number}
     */
    function byteArrayToInt(bytes) {
        bytes = toU8Arr(bytes)
        let ret = 0;
        for (let i = 0; i < bytes.length; i++) {
            const u = bytes[bytes.length - i - 1];
            ret += (u << (i * 8))
        }
        return ret;
    }

    /**
     * 十六进制字符串编码
     * @param { ArrayBuffer | Uint8Array } buf binary
     * @returns {string} encoded result
     */
    function encodeHex(buf) {
        buf = toU8Arr(buf)
        let out = "";
        for (let i = 0; i < buf.length; i++) {
            let n = buf[i].toString(16)
            if (n.length === 1)
                n = '0' + n
            out += n
        }
        return out;
    }

    /**
     * decode binary as utf8 string
     * @param { Uint8Array | ArrayBuffer } bin
     * @returns {string} decoded result
     */
    function bin2str(bin) {
        bin = toU8Arr(bin)
        if (isBrowser)
            return new TextDecoder().decode(bin)
        return Buffer.from(bin).toString('utf8')
    }

    /**
     * convert string to binary
     * @param { string } str
     * @returns {Uint8Array}
     */
    function str2bin(str) {
        if (isBrowser)
            return new TextEncoder().encode(str)
        return Buffer.from(str, 'utf8')
    }

    /**
     * pad prefix to size
     * @param { Uint8Array } arr
     * @param {number} prefix
     * @param {number} size
     */
    function padPrefix(arr, prefix, size) {
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
     * number 转字节数组
     * @param {number} u
     * @returns {Uint8Array}
     */
    function numberToByteArray(u) {
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


    function reverse(arr) {
        const ret = new Uint8Array(arr.length)
        for (let i = 0; i < arr.length; i++) {
            ret[i] = arr[arr.length - i - 1]
        }
        return ret
    }

    /**
     * 浮点数转字节数组
     * @param {Uint8Array} arr
     */
    function f64ToBytes(f) {
        let buf = new ArrayBuffer(8);
        let float = new Float64Array(buf);
        float[0] = f;
        buf = new Uint8Array(buf)
        return trimLeadingZeros(reverse(buf))
    }

    /**
     * 字节数组转浮点数
     * @param {Uint8Array} buf
     */
    function bytesToF64(buf) {
        return new Float64Array(padPrefix(reverse(buf), 0, 8).buffer)[0]
    }


    /**
     * 对字节数组取反
     * @param {Uint8Array} arr
     */
    function inverse(arr) {
        const ret = new Uint8Array(arr.length)
        for (let i = 0; i < ret.length; i++) {
            ret[i] = (~arr[i] & 0xff)
        }
        return ret
    }

    function isRLPList(encoded) {
        return encoded[0] >= OFFSET_SHORT_LIST;
    }


    /**
     * encode bytes to rlp
     * @param { ArrayBuffer | Uint8Array } bytes
     * @returns { Uint8Array }
     */
    function encodeBytes(bytes) {
        if (bytes instanceof ArrayBuffer)
            bytes = new Uint8Array(bytes)
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
    function encodeElements(elements) {
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

    /**
     *
     * @param {Array<Uint8Array> | Uint8Array}x
     * @param { Uint8Array } [y]
     * @returns {Uint8Array}
     */
    function concatBytes(x, y) {
        if (Array.isArray(x)) {
            assert(y === undefined, `concat bytes failed, y is not allowed here`)
            let ret = EMPTY_BYTES;
            for (let el of x)
                ret = concatBytes(ret, el)
            return ret
        }
        if (!y)
            return x
        x = toU8Arr(x)
        y = toU8Arr(y)
        const ret = new Uint8Array(x.length + y.length);
        for (let i = 0; i < x.length; i++) {
            ret[i] = x[i]
        }
        for (let i = 0; i < y.length; i++) {
            ret[x.length + i] = y[i]
        }
        return ret
    }

    function copyOfRange(bytes, from, to) {
        const ret = new Uint8Array(to - from);
        let j = 0;
        for (let i = from; i < to; i++) {
            ret[j] = bytes[i];
            j++;
        }
        return ret;
    }

    function estimateSize(encoded) {
        const parser = new RLPParser(encoded, 0, encoded.length);
        return parser.peekSize();
    }

    function validateSize(encoded) {
        assert(encoded.length === estimateSize(encoded), 'invalid rlp format');
    }


    class RLP {

        /**
         * rlp encode
         * @param {string} s
         * @return {Uint8Array}
         */
        static encodeString(s) {
            return encodeBytes(str2bin(s))
        }


        /**
         * rlp encode
         * @param {Uint8Array | ArrayBuffer} bytes
         * @return {Uint8Array}
         */
        static encodeBytes(bytes) {
            return encodeBytes(bytes);
        }

        /**
         *
         * @param { Uint8Array | string | Array | ArrayBuffer | number | BN | null | Transaction} o
         */
        static encode(o) {
            if (o && o.getEncoded) {
                return o.getEncoded()
            }
            if (o === null || o === undefined)
                return NULL_RLP
            if (o instanceof ArrayBuffer)
                o = new Uint8Array(o)
            if (typeof o === 'string')
                return RLP.encodeString(o)
            if (typeof o === 'number') {
                assert(o >= 0 && Number.isInteger(o), `${o} is not a valid non-negative integer`)
                return RLP.encodeBytes(numberToByteArray(o))
            }
            if (typeof o === 'boolean')
                return o ? new Uint8Array([0x01]) : NULL_RLP
            if (o instanceof BN) {
                return RLP.encodeBytes(trimLeadingZeros(o.toArrayLike(Uint8Array, 'be')))
            }
            if (o instanceof Uint8Array)
                return RLP.encodeBytes(o)
            if (Array.isArray(o)) {
                const elements = o.map(x => RLP.encode(x))
                return encodeElements(elements)
            }
        }


        /**
         * decode
         * @param { ArrayBuffer | Uint8Array } encoded encoded rlp bytes
         * @returns { Array | Uint8Array }
         */
        static decode(encoded) {
            if (encoded instanceof ArrayBuffer)
                encoded = new Uint8Array(encoded)
            validateSize(encoded);
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
                ret.push(RLP.decode(parser.bytes(parser.peekSize())));
            }
            return ret;
        }
    }

    class RLPParser {
        constructor(buf, offset, limit) {
            this.buf = buf;
            this.offset = offset;
            this.limit = limit;
        }

        prefixLength() {
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

        remained() {
            return this.limit - this.offset;
        }

        skip(n) {
            this.offset += n;
        }

        peekSize() {
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

        u8() {
            const ret = this.buf[this.offset];
            this.offset++;
            return ret;
        }

        bytes(n) {
            assert(this.offset + n <= this.limit, 'read overflow');
            const ret = this.buf.slice(this.offset, this.offset + n);
            this.offset += n;
            return ret;
        }
    }

    const ABI_DATA_TYPE = {
        BOOL: 'bool', // 0
        I64: 'i64',  // 1
        U64: 'u64', //  2 BN
        F64: 'f64',
        STRING: 'string', // 3 string
        BYTES: 'bytes', // 4
        ADDRESS: 'address', // 5
        U256: 'u256'// 6
    }

    const ABI_DATA_ENUM = {
        'bool': 0, // 0
        'i64': 1,  // 1
        'u64': 2, //  2 BN
        'f64': 3,
        'string': 4, // 3 string
        'bytes': 5, // 4
        'address': 6, // 5
        'u256': 7, // 6
    }

    const ABI_TYPE = {
        EVENT: 'event',
        FUNCTION: 'function'
    }

    /**
     *
     * @param {string | Uint8Array | number | BN | ArrayBuffer} o before abi encode
     * @param type encode target
     * @returns { Uint8Array | string | BN }
     */
    function convert(o, type) {
        if (o instanceof ArrayBuffer)
            o = toU8Arr(o)
        if (o instanceof Uint8Array) {
            switch (type) {
                case ABI_DATA_TYPE.BOOL:
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.I64:
                case ABI_DATA_TYPE.U64:
                case ABI_DATA_TYPE.F64: {
                    throw new Error('cannot convert uint8array to u64, u256 or bool')
                }
                case ABI_DATA_TYPE.STRING: {
                    throw new Error('cannot convert uint8array to string')
                }
                case ABI_DATA_TYPE.BYTES:
                    return o
                case ABI_DATA_TYPE.ADDRESS:
                    return normalizeAddress(o)
            }
            throw new Error("unexpected abi type " + type)
        }

        if (typeof o === 'string') {
            switch (type) {
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.U64: {
                    let ret;
                    if (o.substr(0, 2) === '0x') {
                        ret = new BN(o.substr(2, o.length - 2), 16)
                    } else {
                        ret = new BN(o, 10)
                    }
                    if (type === ABI_DATA_TYPE.U64)
                        assert(ret.cmp(MAX_U64) <= 0 && !ret.isNeg(), `${ret.toString(10)} overflows max u64 ${MAX_U64.toString(10)}`)
                    if (type === ABI_DATA_TYPE.U256)
                        assert(ret.cmp(MAX_U256) <= 0 && !ret.isNeg(), `${ret.toString(10)} overflows max u256 ${MAX_U256.toString(10)}`)
                    return ret
                }
                case ABI_DATA_TYPE.I64: {
                    if (o.substr(0, 2) === '0x') {
                        let ret = new BN(o.substr(2, o.length - 2), 16)
                        assert(ret.cmp(MAX_I64) <= 0, `${ret.toString(10)} overflows max i64 ${MAX_I64.toString(10)}`)
                        assert(ret.cmp(MIN_I64) >= 0, `${ret.toString(10)} overflows min i64 ${MIN_I64.toString(10)}`)
                        return ret
                    }
                    return convert(parseInt(o), ABI_DATA_TYPE.I64)
                }
                case ABI_DATA_TYPE.F64: {
                    let f = parseFloat(o)
                    return f64ToBytes(f)
                }
                case ABI_DATA_TYPE.STRING: {
                    return o
                }
                case ABI_DATA_TYPE.BOOL: {
                    let l = o.toLowerCase()
                    if ('true' === l)
                        return 1
                    if ('false' === l)
                        return 0
                    if (isNaN(o))
                        throw new Error(`cannot convert ${o} to bool`)
                    l = parseInt(o)
                    if (1 === l || 0 === l)
                        return l
                    throw new Error(`convert ${l} to bool failed, provide 1 or 0`)
                }
                case ABI_DATA_TYPE.BYTES:
                    return decodeHex(o)
                case ABI_DATA_TYPE.ADDRESS: {
                    return normalizeAddress(o)
                }
            }
            throw new Error("unexpected abi type " + type)
        }

        if (typeof o === 'number') {
            switch (type) {
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.U64: {
                    if (o < 0 || !Number.isInteger(o))
                        throw new Error('o is negative or not a integer')
                    return new BN(o)
                }
                case ABI_DATA_TYPE.STRING: {
                    return o.toString(10)
                }
                case ABI_DATA_TYPE.BOOL: {
                    if (1 === o || 0 === o)
                        return o
                    throw new Error(`convert ${o} to bool failed, provide 1 or 0`)
                }
                case ABI_DATA_TYPE.BYTES:
                case ABI_DATA_TYPE.ADDRESS: {
                    throw new Error("cannot convert number to address or bytes")
                }
                case ABI_DATA_TYPE.I64: {
                    if (!Number.isInteger(o))
                        throw new Error('o is negative or not a integer')
                    if (o >= 0)
                        return new BN(o)
                    return convert(new BN(o), ABI_DATA_TYPE.I64)
                }
                case ABI_DATA_TYPE.F64: {
                    return f64ToBytes(o)
                }
            }
            throw new Error("unexpected abi type " + type)
        }

        if (o instanceof BN) {
            switch (type) {
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.U64: {
                    if (o.isNeg())
                        throw new Error(`cannot convert negative ${o.toString()} to uint`)
                    return o;
                }
                case ABI_DATA_TYPE.STRING: {
                    return o.toString(10)
                }
                case ABI_DATA_TYPE.BYTES:
                case ABI_DATA_TYPE.ADDRESS: {
                    throw new Error("cannot convert big number to address or bytes")
                }
                case ABI_DATA_TYPE.BOOL: {
                    if (o.cmp(new BN(1)) === 0 || o.cmp(new BN(0)) === 0)
                        return o
                    throw new Error(`convert ${o} to bool failed, provide 1 or 0`)
                }
                case ABI_DATA_TYPE.I64: {
                    assert(o.cmp(MAX_I64) <= 0, `${o.toString(10)} overflows max i64 ${MAX_I64.toString(10)}`)
                    assert(o.cmp(MIN_I64) >= 0, `${o.toString(10)} overflows min i64 ${MIN_I64.toString(10)}`)
                    if (o.cmp(new BN(0)) >= 0)
                        return ret
                    let buf = o.neg().toArray(Uint8Array, 8)
                    buf = inverse(buf)
                    return new BN(buf, 'be').add(ONE)
                }
                case ABI_DATA_TYPE.F64: {
                    return f64ToBytes(o.toNumber())
                }
            }
            throw new Error("unexpected abi type " + type)
        }

        if (typeof o === 'boolean') {
            switch (type) {
                case ABI_DATA_TYPE.U256:
                case ABI_DATA_TYPE.I64:
                case ABI_DATA_TYPE.U64: {
                    return o ? 1 : 0;
                }
                case ABI_DATA_TYPE.STRING: {
                    return o.toString()
                }
                case ABI_DATA_TYPE.BYTES:
                case ABI_DATA_TYPE.ADDRESS: {
                    throw new Error("cannot convert boolean to address or bytes")
                }
                case ABI_DATA_TYPE.BOOL: {
                    return o ? 1 : 0
                }
                case ABI_DATA_TYPE.F64: {
                    return f64ToBytes(o ? 1 : 0)
                }
            }
            throw new Error("unexpected abi type " + type)
        }

        throw new Error("unexpected type " + o)
    }

    class Contract {
        /**
         *
         * @param {string} address 合约地址
         * @param { Array<ABI> } abi 合约的 abi
         * @param {Uint8Array} [binary] 合约字节码
         */
        constructor(address, abi, binary) {
            this.address = address
            this.abi = (abi || []).map(ABI.from)
            this.binary = binary
        }

        /**
         *
         * @param {string} name 调用方法名称
         * @param { Array | Object } li 参数列表
         * @returns { Array } rlp 编码后的参数
         */
        abiEncode(name, li) {
            const func = this.getABI(name, ABI_TYPE.FUNCTION)
            let retType = func.outputs && func.outputs[0] && func.outputs[0].type
            const retTypes = retType ? [ABI_DATA_ENUM[retType]] : []

            if (typeof li === 'string' || typeof li === 'number' || li instanceof BN || li instanceof ArrayBuffer || li instanceof Uint8Array || typeof li === 'boolean')
                return this.abiEncode([li])

            if (li === undefined || li === null)
                return [[], [], retTypes]


            if (Array.isArray(li)) {
                const arr = []
                const types = []
                if (li.length != func.inputs.length)
                    throw new Error(`abi encode failed for ${func.name}, expect ${func.inputs.length} parameters while ${li.length} found`)
                for (let i = 0; i < li.length; i++) {
                    arr[i] = convert(li[i], func.inputs[i].type)
                    types[i] = ABI_DATA_ENUM[func.inputs[i].type]
                }
                return [types, arr, retTypes]
            }

            const arr = []
            const types = []
            for (let i = 0; i < func.inputs.length; i++) {
                const input = func.inputs[i]
                types[i] = ABI_DATA_ENUM[func.inputs[i].type]
                if (!(input.name in li)) {
                    throw new Error(`key ${input.name} not found in parameters`)
                }
                arr[i] = convert(li[input.name], input.type)
            }
            return [types, arr, retTypes]
        }

        /**
         *
         * @param name {string} 方法名称
         * @param buf { Uint8Array | string | Array<Uin8Array> }
         * @returns { Array | Object } rlp 解码后的参数列表
         * @param {string} [type] 类型
         */
        abiDecode(name, buf, type) {
            type = type || ABI_TYPE.FUNCTION
            if (!buf)
                buf = ''
            if (typeof buf === 'string')
                buf = decodeHex(buf)
            if (buf.length === 0)
                return []

            const a = this.getABI(name, type)
            const ret = abiDecode(a.outputs, buf)
            if (type === ABI_TYPE.FUNCTION)
                return ret && ret[0]
            return ret
        }

        /**
         * 合约部署的 paylod
         */
        abiToBinary() {
            const ret = []
            for (let a of this.abi) {
                ret.push([a.name, a.type === ABI_TYPE.FUNCTION ? 0 : 1, a.inputs.map(x => ABI_DATA_ENUM[x.type]), a.outputs.map(x => ABI_DATA_ENUM[x.type])])
            }
            return ret
        }

        /**
         *
         * @param {string} name
         * @param {string} type
         * @returns {ABI}
         */
        getABI(name, type) {
            const funcs = this.abi.filter(x => x.type === type && x.name === name)
            assert(funcs.length === 1, `exact exists one and only one abi ${name}, while found ${funcs.length}`)
            return funcs[0]
        }
    }

    const WS_CODES = {
        NULL: 0,
        EVENT_EMIT: 1,
        EVENT_SUBSCRIBE: 2,
        TRANSACTION_EMIT: 3,
        TRANSACTION_SUBSCRIBE: 4,
        TRANSACTION_SEND: 5,
        ACCOUNT_QUERY: 6,
        CONTRACT_QUERY: 7
    }

    class RPC {

        /**
         *
         * @param {string} host  主机名
         * @param {string | number} port  端口号
         */
        constructor(host, port) {
            this.host = host || 'localhost'
            this.port = port || 80

            this.__callbacks = new Map() // id -> function
            this.__id2key = new Map()// id -> address:event
            this.__id2hash = new Map()  // id -> txhash
            this.__eventHandlers = new Map() // address:event -> [id]
            this.__txObservers = new Map() // hash -> [id]
            this.__cid = 0
            this.__rpcCallbacks = new Map() // nonce -> cb
            this.__nonce = 0
            this.timeout = 15
        }

        __tryConnect() {
            const WS = isBrowser ? WebSocket : require('ws')
            if (this.__ws && this.__ws.readyState === WS.OPEN) {
                return Promise.resolve(this)
            }

            if (this.__ws && this.__ws.readyState === WS.CONNECTING) {
                const fn = this.__ws.onopen || (() => {
                })
                const p = new Promise((rs, rj) => {
                    this.__ws.onopen = () => {
                        fn(this.__ws)
                        rs(this.__ws)
                    }
                })
                return p
            }
            this.__uuid = uuidv4()
            this.__ws = new WS(`ws://${this.host}:${this.port || 80}/websocket/${this.__uuid}`)
            this.__ws.onerror = console.error
            this.__ws.onmessage = (e) => {
                if (!isBrowser) {
                    this.__handleData(e.data)
                    return
                }
                const reader = new FileReader();

                reader.onload = () => {
                    var arrayBuffer = reader.result
                    this.__handleData(new Uint8Array(arrayBuffer))
                };
                reader.readAsArrayBuffer(e.data)
            }
            const p = new Promise((rs, rj) => {
                    this.__ws.onopen = rs
                }
            )
            return p
        }

        __handleData(data) {
            const decoded = RLP.decode(data)
            const nonce = byteArrayToInt(decoded[0])
            const code = byteArrayToInt(decoded[1])
            const body = decoded[2]

            switch (code) {
                case WS_CODES.TRANSACTION_EMIT: {
                    const h = encodeHex(body[0])
                    const s = byteArrayToInt(body[1])
                    let d = null
                    if (s === TX_STATUS.DROPPED)
                        d = bin2str(body[2])
                    if (s === TX_STATUS.INCLUDED) {
                        const arr = body[2]
                        d = {
                            blockHeight: toSafeInt(arr[0]),
                            blockHash: encodeHex(arr[1]),
                            gasUsed: toSafeInt(arr[2]),
                            result: arr[3],
                            events: arr[4]
                        }
                    }
                    const funcIds = this.__txObservers.get(h) || []
                    for (const funcId of funcIds) {
                        const func = this.__callbacks.get(funcId)
                        func(h, s, d)
                    }
                    return
                }
                case WS_CODES.EVENT_EMIT: {
                    const addr = encodeHex(body[0])
                    const event = bin2str(body[1])
                    const funcIds = this.__eventHandlers.get(`${addr}:${event}`) || []
                    for (const funcId of funcIds) {
                        const func = this.__callbacks.get(funcId)
                        func(addr, event, body[2])
                    }
                    return
                }
            }

            if (nonce) {
                const fn = this.__rpcCallbacks.get(nonce)
                if (fn)
                    fn(body)
                this.__rpcCallbacks.delete(nonce)
            }
        }

        /**
         * 监听合约事件
         * @param {Contract} contract 合约
         * @param {string} event 事件
         * @param {Function} func 合约事件回调 {name: event, data: data}
         * @returns {number} 监听器的 id
         */
        __listen(contract, event, func) {
            const addr = normalizeAddress(contract.address)
            const addrHex = encodeHex(addr)
            this.__wsRpc(WS_CODES.EVENT_SUBSCRIBE, addr)
            const id = ++this.__cid
            const key = `${addrHex}:${event}`
            this.__id2key.set(id, key)
            const fn = (_, event, parameters) => {
                const abiDecoded = contract.abiDecode(event, parameters, ABI_TYPE.EVENT)
                func(abiDecoded)
            }
            if (!this.__eventHandlers.has(key))
                this.__eventHandlers.set(key, new Set())

            this.__eventHandlers.get(key).add(id)
            this.__callbacks.set(id, fn)
            return id
        }

        listen(contract, event, func) {
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
        removeListener(id) {
            const key = this.__id2key.get(id)
            const h = this.__id2hash.get(id)
            this.__callbacks.delete(id)
            this.__id2key.delete(id)
            this.__id2hash.delete(id)
            if (key) {
                const set = this.__eventHandlers.get(key)
                set && set.delete(id)
                if (set && set.size === 0)
                    this.__eventHandlers.delete(key)
            }
            if (h) {
                const set = this.__txObservers.get(h)
                set && set.delete(id)
                if (set && set.size === 0)
                    this.__txObservers.delete(h)
            }
        }

        listenOnce(contract, event, func) {
            const id = this.__cid + 1
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
         * @param {string | Uint8Array | ArrayBuffer} hash
         * @param { Function } cb  (hash, status, msg)
         * @returns {number}
         */
        __observe(hash, cb) {
            const id = ++this.__cid
            if (isBytes(hash))
                hash = encodeHex(hash)

            hash = hash.toLowerCase()
            if (!this.__txObservers.has(hash))
                this.__txObservers.set(hash, new Set())
            this.__id2hash.set(id, hash)
            this.__txObservers.get(hash).add(id)

            const fn = (h, s, d) => {
                cb(h, s, d)
                switch (s) {
                    case TX_STATUS.DROPPED:
                    case TX_STATUS.CONFIRMED:
                        this.removeListener(id)
                        break
                }
            }
            this.__callbacks.set(id, fn)
            return id
        }


        /**
         * 查看合约方法
         * @param  { Contract } contract 合约
         * @param {string} method  查看的方法
         * @param { Object | Array } parameters  额外的参数，字节数组，参数列表
         * @returns {Promise<Object>}
         */
        viewContract(contract, method, parameters) {
            if (!contract instanceof Contract)
                throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

            parameters = normalizeParams(parameters)
            const addr = contract.address
            const params = contract.abiEncode(method, parameters)

            return this.__wsRpc(WS_CODES.CONTRACT_QUERY, [
                normalizeAddress(addr),
                method,
                params
            ]).then(r => contract.abiDecode(method, r))
        }

        /**
         * 通过 websocket 发送事务
         * @param tx {Transaction | Array<Transaction> }事务
         * @returns {Promise<Object>}
         */
        sendTransaction(tx) {
            return this.__wsRpc(WS_CODES.TRANSACTION_SEND, [Array.isArray(tx), tx])
        }

        /**
         *
         * @param { Transaction } tx
         * @param status
         * @param { number } timeout
         */
        observe(tx, status, timeout) {
            status = status === undefined ? TX_STATUS.CONFIRMED : status
            return new Promise((resolve, reject) => {
                let success = false

                if (timeout)
                    setTimeout(() => {
                        if (success) return
                        reject({reason: 'timeout'})
                    }, timeout)

                let ret = null
                let confirmed = false
                let included = false

                this.__observe(tx.getHash(), (h, s, d) => {
                    if (s === TX_STATUS.DROPPED) {
                        const e = {hash: h, reason: d}
                        reject(e)
                        return
                    }
                    if (s === TX_STATUS.CONFIRMED) {
                        if (status === TX_STATUS.INCLUDED)
                            return
                        confirmed = true
                        if (included) {
                            success = true
                            resolve(ret)
                            return
                        }
                    }
                    if (s === TX_STATUS.INCLUDED) {
                        included = true
                        ret = {
                            blockHeight: d.blockHeight,
                            blockHash: d.blockHash,
                            gasUsed: d.gasUsed,
                        }
                        if (d.result && d.result.length
                            && tx.__abi
                            && tx.isDeployOrCall()
                        ) {
                            const decoded = (new Contract('', tx.__abi)).abiDecode(tx.getMethod(), d.result)
                            ret.result = decoded
                        }

                        if (
                            d.events.length
                            && tx.__abi) {
                            const events = []
                            for (let e of d.events) {
                                const name = bin2str(e[0])
                                const decoded = (new Contract('', tx.__abi)).abiDecode(name, e[1], ABI_TYPE.EVENT)
                                events.push({name: name, data: decoded})
                            }
                            ret.events = events
                        }

                        ret.transactionHash = encodeHex(tx.getHash())
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

        __wsRpc(code, data) {
            this.__nonce++
            const n = this.__nonce
            let tm = null
            const ret = new Promise((rs, rj) => {
                tm = setTimeout(() => {
                    rj('websocket rpc timeout')
                    this.__rpcCallbacks.delete(n)
                }, this.timeout * 1000)
                this.__rpcCallbacks.set(n, (r) => {
                    if(tm)
                        clearTimeout(tm)
                    rs(r)
                })
            })
            this.__tryConnect()
                .then(() => {
                    const encoded = RLP.encode([n, code, data])
                    this.__ws.send(encoded)
                })
            return ret
        }

        /**
         * 发送事务的同时监听事务的状态
         * @param { Transaction | Array<Transaction> } tx
         * @returns { Promise<Transaction> }
         */
        sendAndObserve(tx, status, timeout) {
            let ret
            let p
            let sub
            if (Array.isArray(tx)) {
                p = []
                const arr = []
                sub = this.__wsRpc(WS_CODES.TRANSACTION_SUBSCRIBE, tx.map(t => decodeHex(t.getHash())))
                for (const t of tx) {
                    arr.push(this.observe(t, status, timeout))
                }
                p = Promise.all(p)
                ret = Promise.all(arr)
            } else {
                sub = this.__wsRpc(WS_CODES.TRANSACTION_SUBSCRIBE, decodeHex(tx.getHash()))
                ret = this.observe(tx, status, timeout)
            }
            return sub
                .then(() => this.sendTransaction(tx))
                .then(() => ret)
        }

        /**
         * 查看事务
         * @param hash 事务哈希值
         * @returns {Promise<Object>}
         */
        getTransaction(hash) {
            return getTransaction(this.host, this.port, hash)
        }


        /**
         * 获取 nonce
         * @param pkOrAddress {string | Uint8Array | ArrayBuffer } 公钥或者地址
         * @returns {Promise<string | number>}
         */
        getNonce(pkOrAddress) {
            pkOrAddress = normalizeAddress(pkOrAddress)
            return this.__wsRpc(WS_CODES.ACCOUNT_QUERY, pkOrAddress)
                .then(resp => {
                    const decoded = resp
                    return toSafeInt(new BN(decoded[0][2], 'be'))
                })
        }

        /**
         * 获取 账户余额
         * @param pkOrAddress {string | Uint8Array | ArrayBuffer } 公钥或者地址
         * @returns {Promise<string | number>}
         */
        getBalance(pkOrAddress) {
            pkOrAddress = normalizeAddress(pkOrAddress)
            return this.__wsRpc(WS_CODES.ACCOUNT_QUERY, pkOrAddress)
                .then(resp => {
                    const decoded = resp
                    return toSafeInt(new BN(decoded[0][3], 'be'))
                })
        }

        close() {
            if (this.__ws) {
                const __ws = this.__ws
                this.__ws = null
                __ws.close()
            }
        }
    }


    class TransactionBuilder {
        /**
         * @param {string | number | BN } version
         * @param {string | Uint8Array} sk  私钥
         * @param {string | number | BN } [ gasLimit ]
         * @param {number | undefined} [ gasPrice ]  油价，油价 * 油 = 手续费
         * @param { number | string | BN } [ nonce ] 起始 nonce
         */
        constructor(version, sk, gasLimit, gasPrice, nonce) {
            this.version = version
            this.sk = sk
            this.gasPrice = gasPrice || 0
            if (nonce) {
                nonce = typeof nonce === 'string' ? nonce : nonce.toString(10)
            }
            this.gasLimit = gasLimit || 0
            this.nonce = nonce || 0
        }

        increaseNonce() {
            this.nonce = convert(this.nonce, ABI_DATA_TYPE.U64)
            this.nonce = this.nonce.add(ONE)
        }

        /**
         * 构造部署合约的事务 （未签名）
         * @param { Contract } contract 合约对象
         * @param { Array | Object } [parameters] 合约的构造器参数
         * @param amount [number]
         * @returns { Transaction }
         */
        buildDeploy(contract, parameters, amount) {
            if (!contract instanceof Contract)
                throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

            assert(contract.binary && isBytes(contract.binary), 'contract binary is uint8 array')

            if (!contract.abi)
                throw new Error('missing contract abi')


            parameters = normalizeParams(parameters)
            const inputs = parameters

            const binary = contract.binary
            if (contract.abi.filter(x => x.name === 'init').length > 0)
                parameters = contract.abiEncode('init', parameters)
            else
                parameters = [[], [], []]

            const ret = this.buildCommon(constants.WASM_DEPLOY, amount, RLP.encode([this.gasLimit || 0, binary, parameters, contract.abiToBinary()]), new Uint8Array(20))
            ret.__abi = contract.abi
            ret.__setInputs(inputs)
            return ret
        }

        /**
         * 构造合约调用事务
         * @param { Contract} contract 合约
         * @param {string} method 调用合约的方法
         * @param { Array | Object } [parameters] 方法参数
         * @param amount [number] 金额
         * @returns { Transaction }
         */
        buildContractCall(contract, method, parameters, amount) {
            if (!contract instanceof Contract)
                throw new Error('create a instanceof Contract by new tool.Contract(addr, abi)')

            if (!contract.abi)
                throw new Error('missing contract abi')

            if (!contract.address)
                throw new Error('missing contract address')

            parameters = normalizeParams(parameters)
            const inputs = parameters


            const addr = normalizeAddress(contract.address)
            parameters = contract.abiEncode(method, parameters)

            const ret = this.buildCommon(constants.WASM_CALL, amount, RLP.encode([this.gasLimit || 0, method, parameters]), encodeHex(addr))
            ret.__abi = contract.abi
            ret.__setInputs(inputs)
            return ret
        }

        /**
         * 创建事务（未签名）
         * @param type {number | string | BN} 事务类型
         * @param amount {number | BN | string} 金额
         * @param payload {string | Uint8Array | ArrayBuffer}
         * @param to {string | Uint8Array | ArrayBuffer } 接收者的地址
         * @returns { Transaction } 构造好的事务
         */
        buildCommon(type, amount, payload, to) {
            const ret = new Transaction(
                this.version,
                type,
                0,
                privateKey2PublicKey(this.sk),
                this.gasPrice,
                amount || 0,
                payload || EMPTY_BYTES,
                to
            )

            if (this.nonce) {
                ret.nonce = asDigitalNumberText(this.nonce)
                this.increaseNonce()
                ret.sign(this.sk)
            }

            return ret
        }

    }

    const constants = {
        DEFAULT_TX_VERSION: 1,
        WASM_DEPLOY: 16,
        WASM_CALL: 17,
    }

    class MemoryOutputStream {
        buf

        constructor() {
            this.buf = new Uint8Array(0)
        }

        write(chunk) {
            if (typeof chunk === 'string')
                this.buf = concatBytes(this.buf, str2bin(chunk))
            else
                this.buf = concatBytes(this.buf, chunk)
        }
    }


    async function compileContract(ascPath, src, opts) {
        if (typeof ascPath === 'string' && typeof src === 'string') {
            const child_process = require('child_process')
            let cmd = ascPath + ' ' + src + ' -b ' // 执行的命令
            if (opts && opts.debug)
                cmd += ' --debug '
            if (opts && opts.optimize)
                cmd += ' --optimize '
            return new Promise((rs, rj) => {
                child_process.exec(
                    cmd,
                    {encoding: 'buffer'},
                    (err, stdout, stderr) => {
                        if (err) {
                            // err.code 是进程退出时的 exit code，非 0 都被认为错误
                            // err.signal 是结束进程时发送给它的信号值
                            rj(stderr.toString('ascii'))
                            return
                        }
                        rs(stdout)
                    }
                )
            })
        }
        const asc = require("assemblyscript/cli/asc")
        if (typeof src !== 'string') {
            src = ascPath
        }
        if (typeof src !== 'string')
            throw new Error('invalid source file ' + src)
        const arr = [
            src,
            "-b"
        ]
        const stdout = new MemoryOutputStream()
        const stderr = new MemoryOutputStream()

        if (opts && opts.debug)
            arr.push('--debug')
        if (opts && opts.optimize)
            arr.push('--optimize')

        await asc.ready
        return new Promise((rs, rj) => {
            asc.main(arr, {
                stdout: stdout,
                stderr: stderr
            }, function (err) {
                if (err) {
                    rj(bin2str(stderr.buf))
                    return
                }
                rs(stdout.buf)
            })
        })
    }

    function rpcPost(host, port, path, data) {
        if (!path.startsWith('/'))
            path = '/' + path
        data = typeof data === 'string' ? data : JSON.stringify(data)
        if (!isBrowser) {
            return new Promise((resolve, reject) => {
                const opt = {
                    host: host,
                    port: port,
                    path: path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': data.length
                    }
                }
                const http = require('http')
                const req = http.request(
                    opt, (res) => {
                        let data = ""

                        res.on("data", d => {
                            data += d
                        })
                        res.on("end", () => {
                            const d = JSON.parse(data)
                            if (d.code === 200) {
                                resolve(d.data)
                                return
                            }
                            reject(d.message)
                        })
                    })
                    .on('error', reject)

                req.write(data)
                req.end()
            })
        } else {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.onload = function () {
                    if (xhr.status !== 200) {
                        reject('server error')
                        return
                    }
                    const resp = JSON.parse(xhr.responseText);
                    if (resp.code === 200)
                        resolve(resp.data)
                    else {
                        reject(resp.message)
                    }
                }
                xhr.open('POST', `http://${host}:${port}${path}`);
                xhr.setRequestHeader('Content-Type', 'application/json')
                xhr.send(data)
            })
        }
    }


    /**
     * 计算合约地址
     * @param hash {string | Uint8Array} 事务的哈希值
     * @param nonce {string | number | BN} 事务的 nonce
     * @returns {string} 合约的地址
     */
    function getContractAddress(hash) {
        let buf = RLP.encode([decodeHex(hash), 0])
        buf = rmd160(buf)
        return publicKeyHash2Address(buf)
    }

    const tool = {
        privateKey2PublicKey: privateKey2PublicKey,
        publicKey2Hash: publicKey2Hash,
        bin2hex: bin2hex,
        encodeHex, encodeHex,
        rmd160: rmd160,
        address2PublicKeyHash: address2PublicKeyHash,
        assertAddress: assertAddress,
        TransactionBuilder: TransactionBuilder,
        RPC: RPC,
        compileContract: compileContract,
        compileABI: compileABI,
        getContractAddress: getContractAddress,
        Contract: Contract,
        TX_STATUS: TX_STATUS,
        publicKeyHash2Address: publicKeyHash2Address,
        Transaction: Transaction,
        RLP: RLP
    }

    if (!isBrowser)
        module.exports = tool
    else {
        window.contractTool = tool
    }

    /**
     *
     * @param { ArrayBuffer | Uint8Array | string } str
     */
    function compileABI(str) {
        if (isBytes(str))
            str = bin2str(str)
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
            return [{"type": ret}]
        }

        function getInputs(str, event) {
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
                const o = {
                    name: l,
                    type: TYPES[r]
                }
                if (!o.type)
                    throw new Error(`invalid type: ${r}`)
                ret.push(o)
            }
            return ret
        }

        const ret = []
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
            ret.push({
                type: 'function',
                name: r[1],
                inputs: getInputs(r[2]),
                outputs: getOutputs(r[3])
            })
        }


        for (let m of (str.match(eventRe) || [])) {
            eventRe.lastIndex = 0
            const r = eventRe.exec(m)
            ret.push({
                type: 'event',
                name: r[1],
                inputs: [],
                outputs: getInputs(r[2], true)
            })
        }

        if (!contains__idof)
            throw new Error('any contract must contains an __idof function')
        return ret
    }


    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }


})();

