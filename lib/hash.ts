enum Algorithm{
    SM3, KECCAK256
}

// @ts-ignore
@external("env", "_hash")
declare function _hash(type: u64, ptr: u64, ptr_len: u64, dst: u64, put: u64): u64;

export class Hash {
    private static hash(data: ArrayBuffer, alg: Algorithm): Uint8Array{
        const len = _hash(alg, changetype<usize>(data), data.byteLength, 0, 0);
        let res = new ArrayBuffer(i32(len));
        _hash(alg, changetype<usize>(data), data.byteLength, changetype<usize>(res), 1);
        return Uint8Array.wrap(res);
    }

    static keccak256(data: Uint8Array): Uint8Array{
        return Hash.hash(data, Algorithm.KECCAK256);
    }

    static sm3(data: Uint8Array): Uint8Array{
        return Hash.hash(data, Algorithm.SM3);
    }
}