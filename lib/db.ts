
import { Util, RLP } from '.'

enum Type {
    SET, GET, REMOVE, HAS, NEXT, CURRENT_KEY, CURRENT_VALUE, HAS_NEXT, RESET
}

// @ts-ignore
@external("env", "_db")
declare function _db(type: u64, arg1: u64, arg2: u64, arg3: u64, arg4: u64): u64;

export class Entry {
    constructor(readonly key: ArrayBuffer, readonly value: ArrayBuffer) {
    }
}

export class Store<K, V>{
    static from<U, R>(str: string): Store<U, R>{
        return new Store(Util.str2bin(str));
    }
    constructor(readonly prefix: ArrayBuffer) {
    }

    private _key(key: K): ArrayBuffer{
        return Util.concatBytes(this.prefix, RLP.encode<K>(key));
    }

    set(key: K, value: V): void {
        DB.set(this._key(key), RLP.encode<V>(value));
    }

    remove(key: K): void {
        DB.remove(this._key(key));
    }

    has(key: K): bool {
        return DB.has(this._key(key));
    }

    getOrDefault(key: K, def: V): V {
        return this.has(key) ? this.get(key) : def;
    }

    get(key: K): V {
        return RLP.decode<V>(DB.get(this._key(key)));
    }
}

export class Globals{
    static set<V>(str: string, value: V): void {
        DB.set(Util.str2bin(str), RLP.encode<V>(value));
    }

    static get<V>(str: string): V {
        return RLP.decode<V>(DB.get(Util.str2bin(str)));
    }

    static getOrDefault<V>(str: string, value: V): V {
        return DB.has(Util.str2bin(str)) ? RLP.decode<V>(DB.get(Util.str2bin(str))) : value;
    }

    static has(str: string): bool {
        return DB.has(Util.str2bin(str));
    }
}

export class DB {

    static set(key: ArrayBuffer, value: ArrayBuffer): void {
        _db(
            Type.SET,
            changetype<usize>(key), key.byteLength,
            changetype<usize>(value), value.byteLength,
        );
    }

    static remove(key: ArrayBuffer): void {
        _db(
            Type.REMOVE,
            changetype<usize>(key), key.byteLength,
            0, 0,
        );
    }


    static has(key: ArrayBuffer): bool {
        return _db(Type.HAS, changetype<usize>(key), key.byteLength, 0, 0) != 0;
    }

    static get(key: ArrayBuffer): ArrayBuffer {
        const len = _db(Type.GET, changetype<usize>(key), key.byteLength, 0, 0);
        const buf = new ArrayBuffer(i32(len));
        _db(Type.GET, changetype<usize>(key), key.byteLength, changetype<usize>(buf), 1);
        return buf;
    }


}

export class DBIterator {
    static next(): Entry {
        _db(Type.NEXT, 0, 0, 0, 0);
        const keyBuf = new ArrayBuffer(i32(_db(Type.CURRENT_KEY, 0, 0, 0, 0)));
        _db(Type.CURRENT_KEY, changetype<usize>(keyBuf), 1, 0, 0);

        const valueBuf = new ArrayBuffer(i32(_db(Type.CURRENT_VALUE, 0, 0, 0, 0)));
        _db(Type.CURRENT_KEY, changetype<usize>(valueBuf), 1, 0, 0);
        return new Entry(keyBuf, valueBuf);
    }

    static hasNext(): bool {
        return _db(Type.HAS_NEXT, 0, 0, 0, 0) != 0;
    }

    static reset(): void {
        _db(Type.RESET, 0, 0, 0, 0);
    }
}