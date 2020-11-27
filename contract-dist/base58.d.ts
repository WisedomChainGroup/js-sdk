export declare class Base {
    ALPHABET_MAP: Record<string, number>;
    BASE: number;
    LEADER: string;
    ALPHABET: string;
    constructor(ALPHABET: string);
    encode(src: Uint8Array | ArrayBuffer): string;
    private decodeUnsafe;
    decode(str: string): Uint8Array;
}
export declare const Base58: Base;
