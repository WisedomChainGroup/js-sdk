import { ABI } from "./contract";
import { TransactionResult, Binary, AbiInput, Digital } from "./types";
import BN = require('../bn');
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
    alloc(address: Binary, amount: Digital): void;
    nextBlock(): void;
    call(sender: Binary, method: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult>;
    deploy(sender: Binary, wasmFile: string, parameters?: AbiInput | AbiInput[] | Record<string, AbiInput>, amount?: Digital): Promise<TransactionResult>;
    fetchABI(wasmFile: string): Promise<ABI[]>;
}
