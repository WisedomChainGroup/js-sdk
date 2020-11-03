/// <reference types="node" />
import { ABI_DATA_TYPE, ABI_TYPE, AbiInput, Binary, Readable } from "./types";
import BN = require("../bn");
import Dict = NodeJS.Dict;
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
    toObj(arr: AbiInput[], input: boolean): Dict<AbiInput>;
    toArr(obj: Dict<AbiInput>, input: boolean): AbiInput[];
}
export declare function normalizeParams(params?: AbiInput | AbiInput[] | Dict<AbiInput>): AbiInput[] | Dict<AbiInput>;
export declare class Contract {
    address: string;
    abi: ABI[];
    binary: Uint8Array;
    constructor(address?: Binary, abi?: ABI[], binary?: ArrayBuffer | Uint8Array);
    abiEncode(name: string, li?: AbiInput | AbiInput[] | Dict<AbiInput>): [ABI_DATA_TYPE[], Array<string | Uint8Array | BN>, ABI_DATA_TYPE[]];
    abiDecode(name: string, buf?: Uint8Array[], type?: ABI_TYPE): Readable | Readable[] | Dict<Readable>;
    /**
     * 合约部署的 paylod
     */
    abiToBinary(): any[];
    getABI(name: string, type: ABI_TYPE): ABI;
}
