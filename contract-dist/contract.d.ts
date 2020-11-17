import { ABI_DATA_TYPE, ABI_TYPE, AbiInput, Binary, Readable } from "./types";
import BN = require("../bn");
/**
 * 合约部署的 paylod
 */
export declare function abiToBinary(abi: ABI[]): any[];
/**
 * 计算合约地址
 */
export declare function getContractAddress(hash: Binary): string;
export declare function compileContract(ascPath?: string, src?: string, opts?: {
    debug?: boolean;
    optimize?: boolean;
}): Promise<Uint8Array>;
/**
 * 编译合约 ABI
 */
export declare function compileABI(_str: Binary): ABI[];
export declare class TypeDef {
    type: string;
    name?: string;
    constructor(type: string, name?: string);
    static from(o: any): TypeDef;
}
export declare class ABI {
    name: string;
    type: ABI_TYPE;
    inputs: TypeDef[];
    outputs: TypeDef[];
    constructor(name: string, type: ABI_TYPE, inputs?: TypeDef[], outputs?: TypeDef[]);
    static from(o: any): ABI;
    returnsObj(): boolean;
    inputsObj(): boolean;
    toObj(arr: AbiInput[], input: boolean): Record<string, AbiInput>;
    toArr(obj: Record<string, AbiInput>, input: boolean): AbiInput[];
}
export declare function normalizeParams(params?: AbiInput | AbiInput[] | Record<string, AbiInput>): AbiInput[] | Record<string, AbiInput>;
export declare class Contract {
    address: string;
    abi: ABI[];
    binary: Uint8Array;
    constructor(address?: Binary, abi?: ABI[], binary?: ArrayBuffer | Uint8Array);
    abiEncode(name: string, li?: AbiInput | AbiInput[] | Record<string, AbiInput>): [ABI_DATA_TYPE[], Array<string | Uint8Array | BN>, ABI_DATA_TYPE[]];
    abiDecode(name: string, buf?: Uint8Array[], type?: ABI_TYPE): Readable | Readable[] | Record<string, Readable>;
    /**
     * 合约部署的 paylod
     */
    abiToBinary(): any[];
    getABI(name: string, type: ABI_TYPE): ABI;
}
