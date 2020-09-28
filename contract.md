# Wisdom Chain 智能合约编写指引

[TOC]



## AssemblyScript 简介


[AssemblyScript](https://www.assemblyscript.org/) 是 TypeScript 的一个变种，和 TypeScript 不同，AssemblyScript 使用严格类型。Wisdom Chain 的智能合约基于的是 WebAssembly 字节码实现的虚拟机，AssemblyScript 可以编译为 WebAssembly 字节码。

## 基础数据类型

### javascript 的类型与智能合约基础数据类型的映射：

| javascript 类型 |  智能合约中数据类型 | 描述              |
| ------------------- | ---------------- | ----------------- |
| ```number, string```           | ```i64```        | 64 bit 有符号整数，支持十进制和0x开头的十六进制 |
| ```number, string```           | ```u64```        | 64 bit 无符号整数，支持十进制和0x开头的十六进制 |
| ```number, string```           | ```f64```        | 双精度浮点数      |
| ```string```            | ```Address```        | 地址  |
| ```number, string```            | ```U256```        | 256 bit 无符号整数，支持十进制和0x开头的十六进制  |
| ```string, Uint8Array, ArrayBuffer```            | ```ArrayBuffer```        | 二进制字节数组 |
| ```boolean```           | ```bool```        | 布尔类型 |
| ```string``` | ```string``` | 字符串 |


### 数组

数组是一个数值的序列，数组的 api 和 javascript 非常相似，但是 assembly script 的数组必须带有泛型而且不能有 null 值，且访问前必须初始化


```typescript
var arr = new Array<string>(10)
// arr[0]; // would error 😢
for (let i = 0; i < arr.length; ++i) {
  arr[i] = ""
}
arr[0]; // now it works 😊
```

### 映射

映射会被持久化存储，映射的 key, value 必须是 基础类型或者 用 @unmanaged  标记的结构体类型，且不能嵌套，例如在 erc 20 智能合约中可以用 Store 存储每个用户的余额

```typescript
const _balance = Store.from<Address, U256>('balance');
```

Store.get, Store.set, Store.remove, Store.has 都可以用于查询

### 内部对象

1. 地址

- 合约向地址转账

```typescript
const addr: Address;
addr.transfer(100); // 单位是 brain
```

- 合约调用合约

```typescript
const p = Parameters();
p.push<u64>(0); // 构造方法参数
addr.call('方法名', p.build(), 0); // 
```

- 查看地址的余额

```typescript
addr.balance();
```

- 查看合约地址的字节码，常用于合约内部署合约

```typescript
addr.code();
```

- 查看合约的 abi，常用于合约内部署合约

```typescript
addr.abi();
```

2. 区块头


```typescript
const header = Context.header();
header.parentHash; // 父区块的哈希值
header.createdAt; // 区块的时间戳，是 unix 纪元到现在的秒数
header.height; // 区块的高度
```

3. Msg 

```typescript
const msg = Context.msg();
msg.sender; // 当前的调用者
msg.amount; // 当前调用者支付的 brain 数量
```

4. Transaction 事务

```typescript
const tx = Context.transaction();
tx.nonce; // 事务的 nonce
tx.origin; // 事务构造者
tx.gasPrice; // 事务的 gas 单价
tx.amount; // 事务的 amount
tx.to; // 事务的 to
tx.signature; // 事务的签名
tx.hash; // 事务的哈希值
```

5. 哈希值计算

```typescript
Hash.keccak256; // 计算 keccak256 哈希值
```

### 断言

如果断言失败，合约调用会终止

```typescript
const truth = false;
assert(truth, 'assert failed');
```

### 手续费

智能合约调用和部署的 gas 单价为 200000 brain。
对于智能合约部署和调用的事务 ，gas = (事务 payload 长度 + 虚拟机执行的步数) / 1024

### 合约地址计算

合约地址可以通过部署合约事务的哈希值计算得到，计算方式是对事务的哈希进行 rmd160 得到20字节的哈希值，在对20个字节的哈希值进行 base58 编码


### 类型声明

AssemblyScript编译器必须在编译时知道每个表达式的类型。这意味着变量和参数在声明时必须同时声明其类型。如果没有声明类型，编译器将报错。

合法的函数：

```typescript
function sayHello(): void{
    log("hello world");
}
```

语法不正确的函数：


```typescript
function sayHello(): { // 缺少类型声明 sayHello(): void
    log("hello world");
}
```

### 空值

许多编程语言具有一个特殊的 ```null``` 类型表示空值，例如 javascript 和 java 的 ```null```, go 语言和 python 的 ```nil```。事实上 ```null``` 类型的引入给程序带来了许多不可预知性，空值检查的遗漏会给智能合约带来安全隐患，因此 WisdomChain 智能合约的编写没有引入 ```null``` 类型。


## 模块化

一个 AssemblyScript 智能合约项目可能由多个文件组成，文件与文件之间可以存在互相引用的关系，互相使用对方导出的内容。。AssemblyScript 项目编译成 wasm 字节码时，需要指定一个入口文件，只有这个入口文件中被导出的函数才可以在将来被调用到。

### 函数导出


```typescript
export function add(a: i32, b: i32): i32 {
  return a + b
}
```


### 全局变量导出

```typescript
export const foo = 1
export var bar = 2
```


### 类导出

```typescript
export class Bar {
    a: i32 = 1
    getA(): i32 { return this.a }
}
```

### 导入

若建立以下多文件项目，指定 ```index.ts``` 为编译时的入口文件

```sh
indext.ts
foo.ts
```

在 foo.ts 文件中包含了以下内容：

```typescript
export function add(a: i32, b: i32): i32{
    return a + b;
}
```


在 index.ts 中导入 ```add``` 函数：


```typescript
import {add} from './foo.ts'

function addOne(a: i32): i32{
    return add(a, 1);
}
```

## 智能合约开发

###  下载 sdk 

```sh
mkdir contract-dev
cd contract-dev
npm init
npm install keystore_wdc --save-dev
npm install ws --save-dev
```

### 编译和部署合约

1. 编写合约源代码

然后新建一个 sample.ts 文件

```sh
touch sample.ts
```

复制以下内容到 sample.ts 中

```typescript

import {Globals, ___idof, ABI_DATA_TYPE} from './node_modules/keystore_wdc/lib'

// 构造器函数，合约部署时会被调用一次
export function init(name: string): void{
    // 初始化全局变量 name
    setName(name);
}

export function getName(): string{
    return Globals.get<string>('name');
}

export function setName(name: string): void{
    Globals.set<string>('name', name);
}

 
// 所有合约的主文件必须声明此函数
export function __idof(type: ABI_DATA_TYPE): u32 {
    return ___idof(type);
}
```

2. 编译合约

```js
const tool = require('keystore_wdc/contract')

// asc 所在的路径
const ascPath = 'node_modules/.bin/asc'

// 编译合约得到字节码，写入 abi 文件，并且返回
async function compile(){
    // 构造合约对象
    const contract = new tool.Contract()
    // 编译合约生成字节码
    const binary = (await tool.compileContract(ascPath, 'sample.ts'))
    // 编译生成 abi
    const abi = tool.compileABI(fs.readFileSync('sample.ts'));  
    // 写入 abi 文件
    fs.writeFileSync('sample.abi.json', JSON.stringify(abi))
    // 返回结果
    contract.binary = binary
    contract.abi = abi
    return contract
}
```

3. 构造并发送事务

```js
const ks = new (require('keystore_wdc'))
// 你的私钥
const sk = '****'
// 把私钥转成地址
const addr = ks.pubkeyHashToaddress(ks.pubkeyToPubkeyHash(ks.prikeyToPubkey(sk)))
// 合约事务构造器
const builder = new tool.TransactionBuilder(/* 事务默认版本号 */1, sk, /*gas限制，填写0不限制gas*/0, /*gas单价*/ 200000)
// rpc 对象
const rpc = new tool.RPC('localhost', 19585)

async function sendTx(){
    const c = await compile()
    const tx = builder.buildDeploy(c, ['contract-name'], 0)
    // 填入事务 nonce，建议 nonce 本地管理
    tx.nonce = (await rpc.getNonce(addr)) + 1
    // 对事务进行签名
    tx.sign(sk)
    // 预先打印合约的地址
    console.log(tool.getContractAddress(tx.getHash()))
    // 发送事务并等待事务打包进入区块
    console.log(await (rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED)))
}
```


### 查询合约状态

```js
const tool = require('keystore_wdc/contract')
// 部署合约时打印的合约地址
const contractAddress = '**'
// 部署合约时编译好的 abi 文件
const abi = require('./sample.abi.json')
const rpc = new tool.RPC('localhost', 19585)

async function getName(){
    // 1. 创建合约对象
    const contract = new tool.Contract()
    contract.address = contractAddress
    contract.abi = abi

    // 2. 查看合约 显示的是 contract-name
    console.log(await rpc.viewContract(contract, 'getName'))
}
```

### 通过事务修改合约状态

```js
// 你的私钥
const sk = '****'
const addr = ks.pubkeyHashToaddress(ks.pubkeyToPubkeyHash(ks.prikeyToPubkey(sk)))
const tool = require('keystore_wdc/contract')

// 用于 node 文件读取

const builder = new tool.TransactionBuilder(/* 事务默认版本号 */1, sk, /*gas限制，填写0不限制gas*/0, /*gas单价*/ 200000)
const rpc = new tool.RPC('localhost', 19585)

async function update(){

    // 1. 构造合约对象
    const contract = new tool.Contract()
    // 读取编译好的 abi 
    const abi = require('./sample.abi.json');
    contract.abi = abi
    // 部署合约时打印的合约地址 
    contract.address = '****'

    // 生成合约调用事务
    let tx = builder.buildContractCall(contract, 'setName', {name: 'name2'})
    tx.nonce = (await rpc.getNonce(addr)) + 1
 
    // 3. 发送事务
    console.dir(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED), {depth: null})
}
```


### 合约代码结构

1. 函数声明

一份智能合约代码可以由一个或者多个源代码文件组成，但只有最终编译的文件是合约的主文件，只有主文件中被声明为 export 的函数才可以被外部触发

```typescript
import {log} from './node_modules/keystore_wdc/lib';
export function init(): void{ 
  log('hello world');
}

export function invoke(): void{ 
  log('invoke');
}

function execute(): void{
  log('execute');
}
```

在这份合约中，invoke 函数可以通过构造事务或者通过rpc触发，而 execute 则不能被触发。

2. init 函数

建议合约主文件都要包含一个名为 init 的函数，而且这个函数一旦要被导出，这个 init 函数中的代码会在合约被部署时调用。

``` typescript
import {log} from './node_modules/keystore_wdc/lib';
export function init(): void{
  log('hello world');
}
```

3. __idof 函数

合约主文件必须包含一个 __idof 函数，而且内容必须和如下代码一样，此函数是合约与应用数据交换的接口

```typescript
// 所有合约的主文件必须声明此函数
export function __idof(type: ABI_DATA_TYPE): u32 {
    return ___idof(type);
}
```

### 状态存储

1. 临时存储

和 solidity 不同，Wisdom Chain 合约代码不通过声明全局变量的方式实现持久化存储，例如在以下代码中：

``` typescript
let c: u64;

export function init(): void{
  c = 0;
}

export function inc(): void{
  c++;
}
```

在这份合约中，c 被声明为全局变量，而且在外部可以通过构造事务触发 inc 函数实现 c 的自增，看似只要每次调用 inc 函数 c 都会加一。实际上在这里 c 存储的位置是 wasm 引擎的内存，而 wasm 引擎的内存不会被持久化到区块链中去，c本质上是一个临时存储。因此 inc 函数无论触发了多少次，c 的数值依然都是 0。

2. 永久存储

WisdomChain 智能合约提供了实现永久存储的全局变量对象 ```Globals```，和 Key-Value 类型的存储对象 ```Store```

3. Globals 类基本操作

```typescript
import { Globals } from './lib'

export function init(): void{
  // 保存一个字符串键值对 （增、改）
  Globals.set<string>('key', 'value');

  // 删除一个字符串全局变量
  Globals.remove('key');

  // 判断全局变量 key 是否存在 （查）
  const exists = Globals.has('key');

  if(!exists){
    Globals.set<string>('key', 'value');
  } 

  // 打印 value 的值 （查）
  // 因为 Assemblyscript 没有 null 类型，如果 exists 为 false 的情况下调用 Globals.get 会异常
  log(Globals.get<string>('key')); 
}
```

### 触发

触发合约中的方法有两种方式，一种是通过 rpc 触发，另一种是通过事务触发。

1. rpc 触发

通过 rpc 触发的限制在于，触发的方法对合约状态存储必须是只读的，而且无法获得区块链的内置对象，例如当前的事务、父区块的哈希值，在以下合约中：

```typescript
import { Globals } from './lib'

const valI = 'i';

// 把 i 设置为 0
export function init(): void{
  set(0);
}

// 把 i 自增，并且保存
export function inc(): void{
    set(get() + 1);
}

// 读取 i 的值
export function get(): u64{
    return Globals.has(valI) ? Globals.get<u64>(valI) : 0;
}

function set(i: u64): u64{
    return Globals.set<u64>(valI, i);
}
```

在这份合约中，```inc``` 函数对合约状态作了修改，因为无法通过 rpc 触发 ```inc``` 函数，而 ```get``` 函数没有对合约状态作修改，属于只读函数，所以可以用 rpc 触发 ```get``` 函数。


rpc 触发代码：

```js
const tool = require('keystore_wdc/contract')
const rpc = new tool.RPC('localhost', 19585)

async function main(){
    const contract = new tool.Contract()
    // 读取编译好的 abi 
    const abi = require('./***.abi.json');
    contract.abi = abi
    // 合约地址
    contract.address = '****'
    console.log(await (rpc.viewContract(contract, 'get')))
}

main()
```

2. 事务触发

通过事务触发可以对合约状态作写入、删改等操作，也可以在触发的函数中获取到区块链的上下文对象。


例如要通过事务触发以上合约中的 ```inc``` 函数可以执行 nodejs 代码：

```js
// 你的私钥
const sk = '****'
const addr = ks.pubkeyHashToaddress(ks.pubkeyToPubkeyHash(ks.prikeyToPubkey(sk)))
const tool = require('keystore_wdc/contract')

// 用于 node 文件读取

const builder = new tool.TransactionBuilder(/* 事务默认版本号 */1, sk, /*gas限制，填写0不限制gas*/0, /*gas单价*/ 200000)
const rpc = new tool.RPC('localhost', 19585)

async function update(){

    // 1. 构造合约对象
    const contract = new tool.Contract()
    // 读取编译好的 abi 
    const abi = require('./***.abi.json');
    contract.abi = abi
    // 部署合约时打印的合约地址 
    contract.address = '****'

    // 生成合约调用事务
    let tx = builder.buildContractCall(contract, 'inc')
    tx.nonce = (await rpc.getNonce(addr)) + 1
 
    // 3. 发送事务
    console.dir(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED), {depth: null})
}
```

## 智能合约样例

### ERC 20 模版

以下为 ERC 20 为例，讲述智能合约编写的技巧。

- ERC 20 合约有几个基本的常量 tokenName, symbol, decimals, totalSupply, owner 这些可以通过构造器注入全局变量实现

```typescript
export function init(tokenName: string, symbol: string, totalSupply: U256, decimals: u64, owner: Address): Address {
    // tokenName || symbol || totalSupply || decimals || owner
    Globals.set<string>('tokenName', tokenName);
    Globals.set<string>('symbol', symbol);
    Globals.set<U256>('totalSupply', totalSupply);
    Globals.set<u64>('decimals', decimals);
    Globals.set<Address>('owner', owner);
    _balance.set(owner, totalSupply);
    // 返回合约自身的地址
    return Context.self();
}

export function tokenName(): string {
    return Globals.get<string>('tokenName');
}

export function symbol(): string {
    return Globals.get<string>('symbol');
}

export function decimals(): u64 {
    return Globals.get<u64>('decimals');
}

export function totalSupply(): U256 {
    return Globals.get<U256>('totalSupply');
}

export function owner(): Address {
    return Globals.get<Address>('owner');
}

```

- ERC 20 最主要的三个状态存储有：

    1. balance，记录了每个地址对应可用余额，是 address -> u256 的映射
    2. freeze，记录了每个地址对应的冻结金额，是 address -> u256 的映射
    3. allowance，这个比较复杂，是一个 address -> address -> u256 的映射，记录的是每个地址允许另一个地址转账的金额。例如 allowance 中有一条记录是 A -> B -> 200，那么 B 就可以从 A 账户转移 200 到任意账户地址

    balance 和 freeze 的实现比较简单，通过内置对象 ```Store``` 可以实现：

    ```typescript
    const _balance = Store.from<Address, U256>('balance'); // 创建临时变量 _balance 用于操作持久化存储
    const _freeze = Store.from<Address, U256>('freeze'); // 创建临时变量 _freeze 用于操作持久化存储
    ```

    allowance 的实现较为复杂，我们可以通过在 Store 前面加前缀的方式实现

    ```typescript
    // 构造 Store
    function getAllowanceDB(addr: Address): Store<Address, U256> {
        // 以 'allowance' + address 作为前缀 实现 Store
        const prefix = Util.concatBytes(Util.str2bin('allowance'), addr.buf);
        return new Store<Address, U256>(prefix);
    }
    ```    

- 有了状态存储就有了相应的状态读取和改变函数：

    1. 读取余额
    ```typescript
    // display balance
    export function balanceOf(addr: Address): U256 {
        return _balance.getOrDefault(addr, U256.ZERO);
    }    
    ```

    2. 转账
    ```typescript
    export function transfer(to: Address, amount: U256): void {
        // 这里的 msg 对象类似 solidity，包含了合约的当前调用者
        const msg = Context.msg();
        assert(amount > U256.ZERO, 'amount is not positive');
        let b = balanceOf(msg.sender)
        // 断言余额足够
        assert(b >= amount, 'balance is not enough');
        // + 操作符对整数溢出是默认安全的
        _balance.set(to, balanceOf(to) + amount);
        _balance.set(msg.sender, balanceOf(msg.sender) - amount);
    }
    ```

    3. 冻结
    ```typescript
    export function freeze(amount: U256): void {
        const msg = Context.msg();
        assert(balanceOf(msg.sender) >= amount, 'balance is not enough');
        _balance.set(msg.sender, balanceOf(msg.sender) - amount);
        _freeze.set(msg.sender, freezeOf(msg.sender) + amount);
    }    
    ```


    4. 解冻
    ```typescript
    export function unfreeze(amount: U256): void {
        const msg = Context.msg();
        assert(freezeOf(msg.sender) >= amount, 'freeze is not enough');
        _freeze.set(msg.sender, freezeOf(msg.sender) - amount);
        _balance.set(msg.sender, balanceOf(msg.sender) + amount);
    }
    ```

    5. 同意他人使用一部分自己的余额
    ```typescript
    export function approve(to: Address, amount: U256): void {
        const msg = Context.msg();
        assert(amount > U256.ZERO, 'amount is not positive');
        const db = getAllowanceDB(msg.sender);
        db.set(to, amount);
    }    
    ```

    6. 查看他人同意自己使用的数额
    ```typescript
    export function allowanceOf(from: Address, sender: Address): U256 {
        const db = getAllowanceDB(from);
        return db.getOrDefault(sender, U256.ZERO);
    }
    ```

    7. 从他人账户中转账
    ```typescript
    export function transferFrom(from: Address, to: Address, amount: U256): void {
        const msg = Context.msg();
        assert(amount > U256.ZERO, 'amount is not positive');
        const allowance = allowanceOf(from, msg.sender);
        const balance = balanceOf(from);
        assert(balance >= amount, 'balance is not enough');
        assert(allowance >= amount, 'allowance is not enough');

        const db = getAllowanceDB(from);
        db.set(msg.sender, allowanceOf(from, msg.sender) - amount);

        _balance.set(from, balanceOf(from) - amount);
        _balance.set(to, balanceOf(to) + amount);
    }    
    ```


- 发布事件

    1. 事件是一个特殊的 ```class```，这个类的所有字段都是只读的，仅有一个构造器方法，例如转账事件可以表示如下：

    ```typescript
    @unmanaged class Transfer{
        constructor(readonly from: Address, readonly to: Address, readonly amount: U256)
    }
    ```

    事件类的字段的类型只能是 Address, U256, string 或 ArrayBuffer，不可以是 bool, i64, u64 或者 f64

    2. 合约中发布事件

    通过 ```Context.emit<T>``` 函数可以向合约外发布事件，例如：

    ```typescript
    Context.emit<Transfer>(new Transfer(a, b, c));
    ```

    3. 合约外订阅事件

    sdk 提供了合约外订阅事件的方法

    ```js
    const c = new tool.Contract(addr, abi) // 这里假设合约地址和 abi 都是已知的
    const rpc = new tool.RPC('localhost', 19585)
    rpc.listen(c, 'Transfer', console.log) // 当收到 Transfer 事件时打印事件
    ```


- 合约间调用

    在合约 A 中想调用合约 B 的函数，那么首先要在部署合约 A 之间部署合约 B，获得合约 B 的地址，现在假设合约 B 的代码如下

    ```typescript
    export function init(): void{

    }

    export function id(x: u64): u64{
        return x;
    }

    // 所有合约的主文件必须声明此函数
    export function __idof(type: ABI_DATA_TYPE): u32 {
        return ___idof(type);
    }    
    ```

    假设合约B已经成功部署，地址为 addressB，现在编写合约 A 的代码

    ```typescript
    export function init(addr: Address): void{
        Globals.set<Address>('addr', addr);
    }

    export function getId(x: u64): u64{
        const addr = Globals.get<Address>('addr');
        // 构造参数
        const bd = new ParametersBuilder();
        // 合约 B 的 id 函数只有一个参数，类型是 u64
        bd.push<u64>(26);
        return addr.call<u64>('id', bd.build(), 0);
    }
    ```

    这样在部署合约 A 时把 合约 B 的地址通过构造器进行设置，以后调用合约 A 的 ```getId``` 方法时，合约 A 会去调用合约 B 的 ```id``` 方法。

- 合约内部署合约

    在合约 A 中想部署合约 B，首先要部署一份 B 的合约作为代码样板，假设合约 B 的代码如下

    ```typescript
    export function init(name: string): void{
        Globals.set<string>('name', name);
    }
    ```    

    假设合约B已经成功部署，地址为 addressB，现在编写合约 A 的代码

    ```typescript
    export function init(template: Address): void{
        Globals.set<Address>('template', template);
    }    

    export function deploy(name: string): Address{
        const template = Globals.get<Address>('template');
        // 构造参数
        const bd = new ParametersBuilder();
        // 合约 B 的构造器参数只有一个，类型是 string
        bd.push<string>(name);
        return Context.create(template.code(), template.abi(), bd.build(), 0);
    }
    ```

    这样在部署合约 A 时把 合约 B 的地址通过构造器进行设置，以后调用合约 A 的 ```delpoy``` 方法时，传入合约B的构造器参数，就可以通过调用合约的方式部署合约了。

































