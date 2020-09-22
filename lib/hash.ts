enum Algorithm{
    KECCAK256
}

// @ts-ignore
@external("env", "_hash")
declare function _hash(type: u64, ptr: u64, ptr_len: u64, dst: u64, put: u64): u64;

export class Hash {
    private static hash(data: ArrayBuffer, alg: Algorithm): ArrayBuffer{
        const len = _hash(alg, changetype<usize>(data), data.byteLength, 0, 0);
        let res = new ArrayBuffer(i32(len));
        _hash(alg, changetype<usize>(data), data.byteLength, changetype<usize>(res), 1);
        return res;
    }

    static keccak256(data: ArrayBuffer): ArrayBuffer{
        return Hash.hash(data, Algorithm.KECCAK256);
    }
}