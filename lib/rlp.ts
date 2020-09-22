import { U256, Address, Context, ABI_DATA_TYPE } from '.'
import { Util } from './util';
const OFFSET_SHORT_LIST: u8 = 0xc0;

// @ts-ignore
@external("env", "_rlp")
// type, ptr0 ptr0Len dst, put ? 
declare function _rlp(type: u64, arg0: u64, arg1: u64, arg2: u64, arg3: u64): u64;

enum Type {
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

export class RLP {
    static emptyList(): ArrayBuffer {
        const ret = new Uint8Array(1);
        ret[0] = OFFSET_SHORT_LIST;
        return ret.buffer;
    }

    // supported types： u64 i64 f64 bool U256 string ArrayBuffer Address
    static encode<T>(t: T): ArrayBuffer {
        if (isFunction<T>()) {
            assert(false, 'rlp encode failed, invalid type ' + nameof<T>());
            return new ArrayBuffer(0);
        }

        if (isFloat<T>()) {
            return RLP.encodeU64(reinterpret<u64>(t));
        }

        if (isInteger<T>()) {
            return RLP.encodeU64(u64(t));
        }

        if (isString<T>()) {
            return RLP.encodeString(changetype<string>(t));
        }
        if (!isManaged<T>()) {
            const name = nameof<T>();
            const abi = RLPList.fromEncoded(Context.self().abi());
            for (let i: u32 = 0; i < abi.length(); i++) {
                const li = abi.getList(i);
                if (li.getItem(0).string() == name && li.getItem(1).u64() == 1) {
                    const outputs = li.getList(3);
                    const data = new Array<ArrayBuffer>();
                    let offset = 0;
                    let ptr = changetype<usize>(t)
                    for (let j: u32 = 0; j < outputs.length(); j++) {
                        switch (outputs.getItem(j).u32()) {
                            case ABI_DATA_TYPE.BOOL: {
                                assert(false, 'bool is not stable in unmanaged runtime');
                            }
                            case ABI_DATA_TYPE.F64:
                            case ABI_DATA_TYPE.I64:
                            case ABI_DATA_TYPE.U64: {
                                assert(false, 'native number is not stable in unmanaged runtime');
                                break;
                            }
                            case ABI_DATA_TYPE.BYTES: {
                                data.push(RLP.encodeBytes(load<ArrayBuffer>(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.STRING: {
                                data.push(RLP.encodeString(load<string>(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.U256: {
                                data.push(RLP.encodeU256(load<U256>(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.ADDRESS: {
                                data.push(RLP.encode<Address>(load<Address>(ptr + offset)));
                                offset += 4;
                                break;
                            }
                            default:
                                assert(false, ' invalid abi type ' + outputs.getItem(j).u32().toString());
                        }
                    }
                    const buf = RLP.encodeElements(data);
                    return buf;
                }
            }
            assert(false, 'rlp encode ' + name + ' failed, abi not found');
            return new ArrayBuffer(0);
        }

        switch (idof<T>()) {
            case idof<ArrayBuffer>():
                return RLP.encodeBytes(changetype<ArrayBuffer>(t));
            case idof<U256>():
                return RLP.encodeBytes(changetype<U256>(t).buf);
            case idof<Address>():
                return RLP.encodeBytes(changetype<Address>(t).buf)
        }

        assert(false, 'rlp encode failed, invalid type ' + nameof<T>());
        return new ArrayBuffer(0);
    }

    // supported types： u64 i64 f64 bool U256 string ArrayBuffer Address
    static decode<T>(buf: ArrayBuffer): T {
        if (isFunction<T>()) {
            assert(false, 'rlp encode failed, invalid type ' + nameof<T>());
            return changetype<T>(null);
        }

        if (isFloat<T>()) {
            return reinterpret<f64>(RLP.decodeU64(buf));
        }

        if (isBoolean<T>()) {
            return RLP.decodeU64(buf) != 0;
        }

        if (isInteger<T>()) {
            const ret = RLP.decodeU64(buf);

            if (sizeof<T>() == 8) {
                return ret;
            }
            if (sizeof<T>() == 4) {
                assert(ret <= u32.MAX_VALUE, 'invalid u32: overflow');
                return u32(ret);
            }
            if (sizeof<T>() == 2) {
                assert(ret <= u16.MAX_VALUE, 'invalid u32: overflow');
                return u16(ret);
            }
            if (sizeof<T>() == 1) {
                assert(ret <= u8.MAX_VALUE, 'invalid u32: overflow');
                return u8(ret);
            }
        }
        if (isString<T>()) {
            return changetype<T>(RLP.decodeString(buf));
        }

        if (!isManaged<T>()) {
            const name = nameof<T>();
            const p = __alloc(offsetof<T>(), 0);
            __retain(p);
            const abi = RLPList.fromEncoded(Context.self().abi());
            const rlp = RLPList.fromEncoded(buf);

            for (let i: u32 = 0; i < abi.length(); i++) {
                const li = abi.getList(i);
                if (li.getItem(0).string() == name && li.getItem(1).u64() == 1) {
                    const outputs = li.getList(3);
                    let offset = 0;
                    for (let j: u32 = 0; j < outputs.length(); j++) {
                        switch (outputs.getItem(j).u32()) {
                            case ABI_DATA_TYPE.BOOL: {
                                assert(false, 'bool is not stable in runtime, please convert to string');
                                break;
                            }
                            case ABI_DATA_TYPE.F64:
                            case ABI_DATA_TYPE.I64:
                            case ABI_DATA_TYPE.U64: {
                                assert(false, 'native number is not stable in unmanaged runtime, please convert to string');
                                break;
                            }
                            case ABI_DATA_TYPE.BYTES: {
                                store<ArrayBuffer>(p + offset, rlp.getItem(j).bytes());
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.STRING: {
                                store<String>(p + offset, rlp.getItem(j).string());
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.U256: {
                                store<U256>(p + offset, rlp.getItem(j).u256());
                                offset += 4;
                                break;
                            }
                            case ABI_DATA_TYPE.ADDRESS: {
                                store<Address>(p + offset, rlp.getItem(j).address());
                                offset += 4;
                                break;
                            }
                            default:
                                assert(false, ' invalid abi type ' + outputs.getItem(j).u32().toString());
                        }
                    }
                    return changetype<T>(p);
                }
            }
            assert(false, 'rlp decode failed, invalid type ' + nameof<T>());
            return changetype<T>(0);
        }

        switch (idof<T>()) {
            case idof<ArrayBuffer>():
                return changetype<T>(RLP.decodeBytes(buf));
            case idof<U256>():
                return changetype<T>(new U256(RLP.decodeBytes(buf)));
            case idof<Address>():
                return changetype<T>(new Address(RLP.decodeBytes(buf)));
        }
        assert(false, 'rlp encode failed, invalid type ' + nameof<T>());
        return changetype<T>(0);
    }

    // if the byte array was encoded from a list
    static isList(encoded: ArrayBuffer): bool {
        const arr = Uint8Array.wrap(encoded);
        return arr[0] >= OFFSET_SHORT_LIST;
    }

    static encodeU64(u: u64): ArrayBuffer {
        const len = _rlp(Type.ENCODE_U64, u, 0, 0, 0);
        const buf = new ArrayBuffer(u32(len));
        _rlp(Type.ENCODE_U64, u, 0, changetype<usize>(buf), 1);
        return buf;
    }

    static encodeU256(u: U256): ArrayBuffer {
        return encodeBytes(u.buf);
    }

    static decodeU64(u: ArrayBuffer): u64 {
        return RLPItem.fromEncoded(u).u64();
    }

    static decodeU256(u: ArrayBuffer): U256 {
        return RLPItem.fromEncoded(u).u256();
    }

    static decodeString(encoded: ArrayBuffer): string {
        return RLPItem.fromEncoded(encoded).string();
    }


    // encode a string
    static encodeString(s: string): ArrayBuffer {
        return encodeBytes(String.UTF8.encode(s));
    }

    // encode string list
    static encodeStringArray(s: Array<string>): ArrayBuffer {
        const elements: Array<ArrayBuffer> = new Array<ArrayBuffer>(s.length);
        for (let i = 0; i < elements.length; i++) {
            elements[i] = this.encodeString(s[i]);
        }
        return encodeElements(elements);
    }

    // encode a byte array
    static encodeBytes(bytes: ArrayBuffer): ArrayBuffer {
        return encodeBytes(bytes);
    }

    static encodeElements(elements: Array<ArrayBuffer>): ArrayBuffer {
        return encodeElements(elements);
    }

    static decodeBytes(data: ArrayBuffer): ArrayBuffer {
        const len = _rlp(Type.DECODE_BYTES, changetype<usize>(data), data.byteLength, 0, 0);
        const buf = new ArrayBuffer(u32(len));
        _rlp(Type.DECODE_BYTES, changetype<usize>(data), data.byteLength, changetype<usize>(buf), 1);
        return buf;
    }
}

export class RLPItem {
    // before encoded data
    private readonly data: ArrayBuffer;

    private constructor(data: ArrayBuffer) {
        this.data = data;
    }

    static fromEncoded(encoded: ArrayBuffer): RLPItem {
        const decoded = RLP.decodeBytes(encoded);
        return new RLPItem(decoded);
    }

    u8(): u8 {
        assert(this.u64() <= u8.MAX_VALUE, 'integer overflow');
        return u8(this.u64());
    }

    u16(): u16 {
        assert(this.u64() <= u16.MAX_VALUE, 'integer overflow');
        return u16(this.u64());
    }

    u32(): u32 {
        assert(this.u64() <= u32.MAX_VALUE, 'integer overflow');
        return u32(this.u64());
    }

    u64(): u64 {
        assert(this.data.byteLength <= 8, 'invalid u64: overflow');
        return Util.bytesToU64(this.data);
    }

    u256(): U256 {
        return new U256(this.bytes());
    }

    bytes(): ArrayBuffer {
        return this.data
    }

    string(): string {
        return String.UTF8.decode(this.data);
    }

    isNull(): bool {
        return this.data.byteLength == 0;
    }

    address(): Address {
        return new Address(this.bytes());
    }
}

export class RLPList {
    static EMPTY: RLPList = new RLPList([], RLP.emptyList());

    private constructor(readonly elements: Array<ArrayBuffer>, readonly encoded: ArrayBuffer) {
    }

    static fromEncoded(encoded: ArrayBuffer): RLPList {
        _rlp(Type.RLP_LIST_SET, changetype<usize>(encoded), encoded.byteLength, 0, 0);
        const len = u32(_rlp(Type.RLP_LIST_LEN, 0, 0, 0, 0));
        const elements = new Array<ArrayBuffer>(len);
        for (let i: u32 = 0; i < len; i++) {
            const bufLen = _rlp(Type.RLP_LIST_GET, i, 0, 0, 0);
            const buf = new ArrayBuffer(u32(bufLen));
            _rlp(Type.RLP_LIST_GET, i, 0, changetype<usize>(buf), 1);
            elements[i] = buf;
        }
        _rlp(Type.RLP_LIST_CLEAR, 0, 0, 0, 0);
        return new RLPList(elements, encoded);
    }

    getItem(index: u32): RLPItem {
        return RLPItem.fromEncoded(this.getRaw(index));
    }

    getList(index: u32): RLPList {
        return RLPList.fromEncoded(this.getRaw(index))
    }

    length(): u32 {
        return this.elements.length;
    }

    getRaw(index: u32): ArrayBuffer {
        return this.elements[index];
    }

    isNull(index: u32): bool {
        return this.elements[index].byteLength == 1 && Uint8Array.wrap(this.elements[index])[0] == 0x80;
    }
}


function encodeBytes(bytes: ArrayBuffer): ArrayBuffer {
    const len = _rlp(Type.ENCODE_BYTES, changetype<usize>(bytes), bytes.byteLength, 0, 0);
    const buf = new ArrayBuffer(u32(len));
    _rlp(Type.ENCODE_BYTES, changetype<usize>(bytes), bytes.byteLength, changetype<usize>(buf), 1);
    return buf;
}


function encodeElements(elements: Array<ArrayBuffer>): ArrayBuffer {
    if (elements.length == 0)
        return RLP.emptyList();
    for (let i = 0; i < elements.length; i++) {
        const buf = elements[i];
        _rlp(Type.RLP_LIST_PUSH, changetype<usize>(buf), buf.byteLength, 0, 0);
    }
    const len = _rlp(Type.RLP_LIST_BUILD, 0, 0, 0, 0);
    const buf = new ArrayBuffer(u32(len));
    _rlp(Type.RLP_LIST_BUILD, 0, 0, changetype<usize>(buf), 1);
    return buf;
}
