import { RLPList, RLP } from "./rlp";
import { Util, U256 } from "./util";

/**
 * host function interface 
 * @param type 
 */
export function ___idof(type: ABI_DATA_TYPE): u32 {
    switch (type) {
        case ABI_DATA_TYPE.STRING:
            return idof<string>();
        case ABI_DATA_TYPE.BYTES:
            return idof<ArrayBuffer>();
        case ABI_DATA_TYPE.ADDRESS:
            return idof<Address>();
        case ABI_DATA_TYPE.U256:
            return idof<U256>();
    }
    return 0;
}

function __getAbiOf<T>(): ABI_DATA_TYPE {
    if (isBoolean<T>()) {
        return ABI_DATA_TYPE.BOOL;
    }
    if (isInteger<T>()) {
        if (isSigned<T>()) {
            return ABI_DATA_TYPE.I64;
        } else {
            return ABI_DATA_TYPE.U64;
        }
    }
    if (isFloat<T>())
        return ABI_DATA_TYPE.F64;
    if (isString<T>())
        return ABI_DATA_TYPE.STRING;

    if (idof<T>() == idof<Address>())
        return ABI_DATA_TYPE.ADDRESS;

    if (idof<T>() == idof<U256>())
        return ABI_DATA_TYPE.U256;

    assert(false, 'unexpected type ' + nameof<T>());
    return ABI_DATA_TYPE.BOOL;
}

export enum ABI_DATA_TYPE {
    BOOL, // 0
    I64,  // 1
    U64, //  2 BN
    F64,
    STRING, // 3 string
    BYTES, // 4
    ADDRESS, // 5
    U256, // 6
}

// @ts-ignore
@external("env", "_context")
// type, dst, put ?
declare function _context(type: u64, arg0: u64, arg1: u64, arg2: u64, arg3: u64): u64;

// @ts-ignore
@external("env", "_reflect")
// type, address, method, parameters, dst
// type, binary, parameters, 0, 0, amount , dst
declare function _reflect(type: u64, ptr0: u64, ptr0Len: u64, ptr1: u64, ptr1Len: u64, ptr2: u64, ptr2Len: u64, amount_ptr: u64, amount_len: u64, dst: u64): u64;

// @ts-ignore
@external("env", "_transfer")
// type, address, amount
declare function _transfer(type: u64, ptr0: u64, ptr1Len: u64, amount_ptr: u64, amount_len: u64): void;


// @ts-ignore
@external("env", "_event")
//result z
declare function _event(
    arg0: u64,
    arg1: u64, arg2: u64,
    arg3: u64
): void;

function getBytes(type: u32): ArrayBuffer {
    const len = u32(_context(type, 0, 0, 0, 0));
    const buf = new ArrayBuffer(u32(len));
    _context(type, changetype<usize>(buf), 1, 0, 0);
    return buf;
}

function getU64(type: u32): u64 {
    return _context(type, 0, 0, 0, 0);
}

enum ReflectType {
    CALL_WITHOUT_PUT, // call without put into memory
    CALL_WITH_PUT, // call and put into memory
    CREATE
}

export class Address {

    @operator(">")
    static __op_gt(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) > 0;
    }

    @operator(">=")
    static __op_gte(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) >= 0;
    }

    @operator("<")
    static __op_lt(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) < 0;
    }

    @operator("<=")
    static __op_lte(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) <= 0;
    }

    @operator("==")
    static __op_eq(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) == 0;
    }

    @operator("!=")
    static __op_ne(left: Address, right: Address): bool {
        return Util.compareBytes(left.buf, right.buf) != 0;
    }


    constructor(readonly buf: ArrayBuffer) {
    }

    transfer(amount: U256): void {
        const ptr = changetype<usize>(this.buf);
        _transfer(0, ptr, this.buf.byteLength, changetype<usize>(amount.buf), amount.buf.byteLength);
    }

    call<T>(method: string, parameters: Parameters, amount: U256): T {
        let abiType: ArrayBuffer = isVoid<T>() ? RLP.emptyList() : RLP.encodeU64(__getAbiOf<T>());
        abiType = isVoid<T>() ? abiType : RLP.encodeElements([abiType]);
        const arr: Array<ArrayBuffer> = [RLP.encodeElements(parameters.types), RLP.encodeElements(parameters.li), abiType];
        const buf = RLP.encodeElements(arr);
        const ptr0 = changetype<usize>(this.buf);
        const ptr0len = this.buf.byteLength;
        const str = String.UTF8.encode(method);
        const ptr1 = changetype<usize>(str);
        const ptr1len = str.byteLength;
        const ptr2 = changetype<usize>(buf);
        const ptr2len = buf.byteLength;
        const len = _reflect(ReflectType.CALL_WITHOUT_PUT, ptr0, ptr0len, ptr1, ptr1len, ptr2, ptr2len, changetype<usize>(amount.buf), amount.buf.byteLength, 0);
        const ret = new ArrayBuffer(u32(len));
        _reflect(ReflectType.CALL_WITH_PUT, ptr0, ptr0len, ptr1, ptr1len, ptr2, ptr2len, changetype<usize>(amount.buf), amount.buf.byteLength, changetype<usize>(ret));
        if (!isVoid<T>()) {
            return RLP.decode<T>(RLPList.fromEncoded(ret).getRaw(0));
        }
    }

    balance(): U256 {
        const len = _context(ContextType.ACCOUNT_BALANCE, changetype<usize>(this.buf), this.buf.byteLength, 0, 0);
        const ret = new ArrayBuffer(u32(len));
        _context(ContextType.ACCOUNT_BALANCE, changetype<usize>(this.buf), this.buf.byteLength, changetype<usize>(ret), 1);
        return new U256(ret);
    }

    nonce(): u64 {
        const ptr = changetype<usize>(this.buf);
        return _context(ContextType.ACCOUNT_NONCE, ptr, this.buf.byteLength, 0, 0);
    }

    // get contract code
    code(): ArrayBuffer {
        const ptr = changetype<usize>(this.buf);
        const len = _context(ContextType.CONTRACT_CODE, ptr, this.buf.byteLength, 0, 0);
        const ret = new ArrayBuffer(u32(len));
        _context(ContextType.CONTRACT_CODE, ptr, this.buf.byteLength, changetype<usize>(ret), 1);
        return ret;
    }

    // get contract abi
    abi(): ArrayBuffer {
        const ptr = changetype<usize>(this.buf);
        const len = _context(ContextType.CONTRACT_ABI, ptr, this.buf.byteLength, 0, 0);
        const ret = new ArrayBuffer(u32(len));
        _context(ContextType.CONTRACT_ABI, ptr, this.buf.byteLength, changetype<usize>(ret), 1);
        return ret;
    }

    toString(): string {
        return Util.encodeHex(this.buf);
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
    CONTRACT_CREATED_BY,
    ACCOUNT_NONCE,
    ACCOUNT_BALANCE,
    MSG_SENDER,
    MSG_AMOUNT,
    CONTRACT_CODE,
    CONTRACT_ABI
}

export enum TransactionType {
    // coinbase transaction has code 0
    COIN_BASE,
    // the amount is transferred from sender to recipient
    // if type is transfer, payload is null
    // and fee is a constant
    TRANSFER,
    // if type is contract deploy, payload is wasm binary module
    // fee = gasPrice * gasUsage
    CONTRACT_DEPLOY,
    // if type is contract call, payload = gasLimit(little endian, 8 bytes) +
    // method name length (an unsigned byte) +
    // method name(ascii string, [_a-zA-Z][_a-zA-Z0-9]*) +
    // custom parameters, could be load by Parameters.load() in contract
    // fee = gasPrice * gasUsage
    // e.g.

    CONTRACT_CALL
}

export class ParametersBuilder {
    private readonly types: Array<ArrayBuffer>;
    private readonly elements: Array<ArrayBuffer>;

    constructor() {
        this.elements = new Array<ArrayBuffer>();
        this.types = new Array<ArrayBuffer>();

    }

    push<T>(data: T): void {
        this.types.push(RLP.encodeU64(__getAbiOf<T>()));
        this.elements.push(RLP.encode<T>(data));
    }

    build(): Parameters {
        const ar = RLP.encodeElements(this.elements);
        return new Parameters(this.types, this.elements);
    }
}

export class Parameters {
    static EMPTY: Parameters = new Parameters([], []);

    constructor(
        readonly types: Array<ArrayBuffer>,
        readonly li: Array<ArrayBuffer>
    ) { }
}

export class Header {
    constructor(
        readonly parentHash: ArrayBuffer,
        readonly createdAt: u64,
        readonly height: u64
    ) { }
}

export class Msg {
    constructor(
        readonly sender: Address,
        readonly amount: U256,
    ) { }
}

export class Transaction {
    constructor(
        readonly type: u32,
        readonly createdAt: u64,
        readonly nonce: u64,
        readonly origin: Address,
        readonly gasPrice: U256,
        readonly amount: U256,
        readonly to: Address,
        readonly signature: ArrayBuffer,
        readonly hash: ArrayBuffer
    ) {
    }
}

export class Contract {
    constructor(
        readonly address: Address,
        readonly nonce: u64,
        readonly createdBy: Address
    ) {
    }
}

export class Context {
    /**
     * get address of current contract
     */
    static self(): Address {
        return new Address(getBytes(ContextType.CONTRACT_ADDRESS));
    }

    static emit<T>(t: T): void {

        const name = nameof<T>();
        const nameBuf = Util.str2bin(name);
        if (isManaged<T>())
            assert(false, 'class ' + name + ' should be annotated with @unmanaged')
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
                        case ABI_DATA_TYPE.BOOL:{
                            data.push(RLP.encodeU64(load<u8>(ptr + offset)));
                            offset += 8;
                            break;
                        }
                        case ABI_DATA_TYPE.F64:
                        case ABI_DATA_TYPE.I64:
                        case ABI_DATA_TYPE.U64:{
                            data.push(RLP.encodeU64(load<u64>(ptr + offset)));
                            offset += 8;
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
                _event(changetype<usize>(nameBuf), nameBuf.byteLength, changetype<usize>(buf), buf.byteLength);
                return
            }
        }
        assert(false, 'emit event ' + name + ' failed, abi not found');
    }



    static header(): Header {
        return new Header(
            getBytes(ContextType.HEADER_PARENT_HASH),
            getU64(ContextType.HEADER_CREATED_AT),
            getU64(ContextType.HEADER_HEIGHT)
        );
    }

    static msg(): Msg {
        return new Msg(
            new Address(getBytes(ContextType.MSG_SENDER)),
            new U256(getBytes(ContextType.MSG_AMOUNT))
        );
    }

    static transaction(): Transaction {
        return new Transaction(
            u8(getU64(ContextType.TX_TYPE)),
            getU64(ContextType.TX_CREATED_AT),
            getU64(ContextType.TX_NONCE),
            new Address(getBytes(ContextType.TX_ORIGIN)),
            new U256(getBytes(ContextType.TX_GAS_PRICE)),
            new U256(getBytes(ContextType.TX_AMOUNT)),
            new Address(getBytes(ContextType.TX_TO)),
            getBytes(ContextType.TX_SIGNATURE),
            getBytes(ContextType.TX_HASH),
        );
    }

    static contract(): Contract {
        return new Contract(
            new Address(getBytes(ContextType.CONTRACT_ADDRESS)),
            getU64(ContextType.CONTRACT_NONCE),
            new Address(getBytes(ContextType.CONTRACT_CREATED_BY))
        );
    }

    static create(code: ArrayBuffer, abi: ArrayBuffer, parameters: Parameters, amount: U256): Address {
        const ptr0 = changetype<usize>(code);
        const ptr0len = code.byteLength;
        const arr: Array<ArrayBuffer> = [RLP.encodeElements(parameters.types), RLP.encodeElements(parameters.li), RLP.emptyList()];
        const buf = RLP.encodeElements(arr);
        const ptr1 = changetype<usize>(buf);
        const ptr1len = buf.byteLength;

        const ret = new ArrayBuffer(20);
        _reflect(ReflectType.CREATE, ptr0, ptr0len, ptr1, ptr1len, changetype<usize>(abi), abi.byteLength, changetype<usize>(amount.buf), amount.buf.byteLength, changetype<usize>(ret));
        return new Address(ret);
    }
}
