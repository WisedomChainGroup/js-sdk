import { VirtualMachine } from './vm';
import BN = require('../bn');
import * as rlp from './rlp';
export declare abstract class AbstractHost {
    instance: WebAssembly.Instance;
    view: DataView;
    world: VirtualMachine;
    utf8Decoder: TextDecoder;
    utf16Decoder: TextDecoder;
    nonce: number;
    deploy: boolean;
    constructor(world: VirtualMachine);
    init(instance: WebAssembly.Instance): void;
    get memory(): ArrayBuffer;
    abstract execute(...args: (number | bigint)[]): void | number | bigint;
    abstract name(): string;
    loadUTF8(offset: number | bigint, length: number | bigint): string;
    loadUTF16(offset: number | bigint): string;
    loadU32(offset: number | bigint): number;
    loadBuffer(offset: number | bigint): ArrayBuffer;
    loadN(offset: number | bigint, length: number | bigint): ArrayBuffer;
    put(offset: number | bigint, data: ArrayBuffer): void;
}
export declare class Log extends AbstractHost {
    name(): string;
    execute(...args: (number | bigint)[]): void;
}
export declare class Abort extends AbstractHost {
    execute(...args: (number | bigint)[]): void;
    name(): string;
}
export declare class Util extends AbstractHost {
    execute(...args: bigint[]): bigint;
    name(): string;
}
export interface CallContext {
    type: number;
    sender: ArrayBuffer;
    to: ArrayBuffer;
    amount: BN;
    nonce: number;
    origin: ArrayBuffer;
    txHash: ArrayBuffer;
    contractAddress: ArrayBuffer;
}
export declare class HashHost extends AbstractHost {
    execute(...args: bigint[]): bigint;
    name(): string;
}
export declare class EventHost extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(...args: bigint[]): void;
    name(): string;
}
export declare class DBHost extends AbstractHost {
    ctx: CallContext;
    execute(...args: bigint[]): bigint;
    name(): string;
    constructor(world: VirtualMachine, ctx: CallContext);
}
export declare class ContextHost extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(...args: bigint[]): bigint;
    name(): string;
}
export declare class RLPHost extends AbstractHost {
    list: rlp.RLPList;
    elements: Uint8Array[];
    elementsEncoded: ArrayBuffer;
    execute(...args: bigint[]): bigint;
    name(): string;
}
export declare class Reflect extends AbstractHost {
    execute(...args: (number | bigint)[]): number | bigint | void;
    name(): string;
}
export declare class Transfer extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(...args: bigint[]): void;
    name(): string;
}
export declare class Uint256Host extends AbstractHost {
    execute(...args: bigint[]): bigint;
    name(): string;
    getX(args: bigint[]): BN;
    getY(args: bigint[]): BN;
}
