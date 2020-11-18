import { MemoryView, VirtualMachine } from './vm';
import BN = require('../bn');
import * as rlp from './rlp';
export declare abstract class AbstractHost {
    instance: WebAssembly.Instance;
    view: MemoryView;
    world: VirtualMachine;
    utf8Decoder: TextDecoder;
    utf16Decoder: TextDecoder;
    nonce: number;
    deploy: boolean;
    memory: ArrayBuffer;
    constructor(world: VirtualMachine);
    init(env: {
        memory: WebAssembly.Memory;
    }): void;
    abstract execute(args: (number | bigint)[]): void | number | bigint;
    abstract name(): string;
}
export declare class Log extends AbstractHost {
    name(): string;
    execute(args: (number | bigint)[]): void;
}
export declare class Abort extends AbstractHost {
    execute(args: (number | bigint)[]): void;
    name(): string;
}
export declare class Util extends AbstractHost {
    execute(args: bigint[]): bigint;
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
    readonly: boolean;
}
export declare class HashHost extends AbstractHost {
    execute(args: bigint[]): bigint;
    name(): string;
}
export declare class EventHost extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(args: bigint[]): void;
    name(): string;
}
export declare class DBHost extends AbstractHost {
    ctx: CallContext;
    execute(args: bigint[]): bigint;
    name(): string;
    constructor(world: VirtualMachine, ctx: CallContext);
}
export declare class ContextHost extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(args: bigint[]): bigint;
    name(): string;
}
export declare class RLPHost extends AbstractHost {
    list: rlp.RLPList;
    elements: Uint8Array[];
    elementsEncoded: ArrayBuffer;
    execute(args: bigint[]): bigint;
    name(): string;
}
export declare class Reflect extends AbstractHost {
    execute(args: (number | bigint)[]): number | bigint | void;
    name(): string;
}
export declare class Transfer extends AbstractHost {
    ctx: CallContext;
    constructor(world: VirtualMachine, ctx: CallContext);
    execute(args: bigint[]): void;
    name(): string;
}
export declare class Uint256Host extends AbstractHost {
    execute(args: bigint[]): bigint;
    name(): string;
    getX(args: bigint[]): BN;
    getY(args: bigint[]): BN;
}
