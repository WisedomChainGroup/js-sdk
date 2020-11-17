import { ABI } from "./contract";
import { TransactionResult, Binary, AbiInput, Digital, ABI_DATA_TYPE } from "./types";
import BN = require('../bn');
interface VMInstance extends WebAssembly.Instance {
    exports: {
        memory: WebAssembly.Memory;
        __alloc: (len: number | bigint, id: number | bigint) => number | bigint;
        __idof: (t: ABI_DATA_TYPE) => number | bigint;
        __retain: (p: number | bigint) => void;
        init?: Function;
    };
}
export declare class MemoryView {
    view: DataView;
    constructor(mem: WebAssembly.Memory);
    loadUTF8(offset: number | bigint, length: number | bigint): string;
    loadUTF16(offset: number | bigint): string;
    loadU32(offset: number | bigint): number;
    loadBuffer(offset: number | bigint): ArrayBuffer;
    loadN(offset: number | bigint, length: number | bigint): ArrayBuffer;
    put(offset: number | bigint, data: ArrayBuffer): void;
}
export declare function isZero(n: number | bigint): boolean;
/**
 * virtual machine for chrome debugging
 */
export declare class VirtualMachine {
    height: number;
    parentHash: ArrayBuffer;
    hash: ArrayBuffer;
    contractCode: Map<string, string>;
    abiCache: Map<string, ABI[]>;
    nonceMap: Map<string, number>;
    balanceMap: Map<string, BN>;
    now: number;
    storage: Map<string, Map<string, ArrayBuffer>>;
    constructor();
    normParams(abi: ABI, params: AbiInput[] | Record<string, AbiInput>): AbiInput[];
    putParams(instance: VMInstance, abi: ABI, params: AbiInput[] | Record<string, AbiInput>): void;
    malloc(instance: VMInstance, val: AbiInput, type: ABI_DATA_TYPE): number | bigint;
    alloc(address: Binary, amount: Digital): void;
    nextBlock(): void;
    call(sender: Binary, method: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult>;
    deploy(sender: Binary, wasmFile: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult>;
    fetchABI(wasmFile: string): Promise<ABI[]>;
}
export {};
