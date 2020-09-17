# js-sdk

## 一、本地方法 
##### sdk所有方法异常返回5000
```
npm i keystore_wdc;
const KeyStore = require('keystore_wdc');
const ks = new KeyStore();
```
#### 生成keystore
```
async function create(){
     const keystore = await ks.Create("your password");
}
```
* 返回keystore，密码格式不正确返回-1。

#### 修改keystore密码
```
async function modifypassword(){
     const keystore = await ks.modifyPassword("your keystore","your password","your newpassword");
}
```
* 返回keystore，密码格式不正确返回-1。 


#### 校验地址合法性
```
const lawful = ks.verifyAddress("your address");
```
返回值:
*  0  合法
* -1  地址格式不正确
* -2  错误地址

#### 地址转公钥哈希
```
const pubkeyHash = ks.addressToPubkeyHash("your address")
```
* 返回公钥哈希

#### 公钥哈希转地址
```
const address = ks.pubkeyHashToaddress("your pubkeyHash",type)
type:  '1' WX前缀的普通地址
       '2' WR前缀的合约地址
```
* 返回地址

#### 私钥转公钥
```
 const pubkey = ks.prikeyToPubkey("your prikey");
```
* 返回公钥

#### 通过keystore获取公钥
```
 async function getpubkey(){
 	const pubkey = await ks.keystoreToPubkey("your keystore","your password");
 }
``` 
* 返回公钥

#### 通过keystore获取私钥
```
 async function getprikey(){
 	const prikey = await ks.DecryptSecretKeyfull("your keystore","your password");
 }
```
* 返回私钥

#### 构造转账实务
```
const transfer = ks.ClientToTransferAccount(fromPubkey,toPubkeyHash,amount,prikeyStr,nonce);

fromPubkey：发起转转账者公钥
toPubkeyHash：接收者公钥哈希
amount：转账金额(必须是字符串！)
prikey:私钥
nonce：nonce(通过节点获取)
```
* 返回：
*   'txHash'：事务哈希
*   'transaction': 整个事务
   
#### 更新keystore版本
```
 async function updateKeystoreVersion1to2(){
 	const keystore = await ks.updateKeystoreVersion1to2("your keystore","your password");
 }
```
* 返回keystore

## 二、节点RPC接口

#### 连接节点，ip+端口+调用方法+参数
#### Content-Type: application/json;charset=UTF-8
#### 返回格式
##### {"message":"","data":[],"statusCode":int}
* message：描述
* data   ：数据
* statusCode：      
```   
{
    2000 正确
    2100 已确认
    2200 未确认
    5000 错误
    6000 格式错误
    7000 校验错误
    8000 异常
}
```
1.0 获取Nonce
```
   方法：sendNonce(POST)     
	参数：pubkeyhash(String)  
	返回：
	{"message":"","data":[],"statusCode":int}
	data:Nonce(Long)
```

1.1 获取余额
```
   方法：sendBalance(POST)   
	参数：pubkeyhash(十六进制字符串) 	
 	返回:
 	{"message":"","data":[],"statusCode":int}
	data:balance(Long)
```

1.2 广播事务
```
   方法： sendTransaction(POST)	
	参数：traninfo(String)
	返回：
 	{"message":"","data":[],"statusCode":int}
```
        
1.3 查询当前区块高度
```
   方法：height(GET)
    返回：
	{"message":"","data":0,"statusCode":int}
	data:height(Long)
```
		
1.4 根据事务哈希获得所在区块哈希以及高度
```
   方法：blockHash(GET)
	参数：txHash(String)
	返回：
	{
    	data :定义如下;
        statusCode(int):int
	    message(String):""
    }
    data:
   {
        "blockHash":区块哈希(十六进制字符串), 
        "height":区块高度(Long)
   }
```

1.5 根据事务哈希获得区块确认状态(GET)
```
   方法：transactionConfirmed
	参数：txHash(String)
	返回： 
   {"message":"","data":[],"statusCode":int}
   statusCode: status(int)
```

1.6 根据区块高度获取事务列表
```
   方法: getTransactionHeight(POST) 
   参数: int height 区块高度
   返回格式:{"message":"SUCCESS","data":[],"statusCode":1}
   data格式:
	String block_hash; 区块哈希16进制字符串
	long height; 区块高度
	int version; 版本号
	String tx_hash; 事务哈希16进制字符串
	int type;  事务类型
	long nonce;nonce
	String from;  发起者公钥16进制字符串
	long gas_price; 事务手续费单价
	long amount; 金额
	String payload; payload数据
	String signature; 签名16进制字符串
	String to;  接受者公钥哈希16进制字符串
```

1.7 通过区块哈希获取事务列表
```
   方法：getTransactionBlcok(POST)
   参数 String blockhash 区块哈希16进制字符串
   返回格式:{"message":"SUCCESS","data":[],"statusCode":1}
   data格式:
	String block_hash; 区块哈希16进制字符串
	long height; 区块高度
	int version; 版本号
	String tx_hash; 事务哈希16进制字符串
	int type;  事务类型
	long nonce;nonce
	String from;  发起者公钥16进制字符串
	long gas_price; 事务手续费单价
	long amount; 金额
	String payload; payload数据
	String signature; 签名16进制字符串
	String to;  接受者公钥哈希16进制字符串
```

1.8 通过事务哈希获取事务
```
    方法：transaction\(事务哈希) (GET)
    返回:{"message":"SUCCESS","data":[],"statusCode":1}
    data格式:
    {
      "transactionHash": "e75d61e1b872f67cccc37c4a5b354d21dd90a20f04a41a8536b9b6a1b30ccf41", // 事务哈希
      "version": 1, // 事务版本 默认为 0
      "type": 0,  // 事务类型 0 是 coinbase 1 是 转账
      "nonce": 5916, // nonce 值，用于防止重放攻击
      "from": "0000000000000000000000000000000000000000000000000000000000000000", // 发送者的公钥， 用于验证签名
      "gasPrice": 0, // gasPrice 用于计算手续费
      "amount": 2000000000, // 交易数量，单位是 brain
      "payload": null, // payload 用于数据存证，一般填null
      "to": "08f74cb61f41f692011a5e66e3c038969eb0ec75", // 接收者的地址
      "signature": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", // 签名
      "blockHash": "e2ccac56f58adb3f2f77edd96645931fac93dd058e7da21421d95f2ac9cc44ac", // 事务所在区块的哈希
      "fee": 0,  // 手续费
      "blockHeight": 13026 // 事务所在区块高度
}
```
1.9 获取节点版本信息
```
Function:version
GET/HTTP/1.1/Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Request URL: http://00.000.0.000:19585/version
Parameter:
Demo:
    GET http://00.000.0.000:19585/version
Response Body:
    {"message":"","data":[],"statusCode":int}
    data:版本信息
```



## 智能合约

### 编译、部署智能合约

1. 编译智能合约需要node环境，并且确保安装了正确版本的 asc，如果没有安装，在你的项目的根目录的 pacakge.json 的 devDependencies 添加
 ```"assemblyscript": "^0.14.10"``` ，并且执行 npm install

2. 在你的项目根目录下新建一个文件命名为 coin.ts

```ts
/**
 * erc 20 example in assembly script
 */

import { Util, U256, Globals, ABI_DATA_TYPE, ___idof } from 'node_modules/keystore_wdc/lib'
import { Store } from 'node_modules/keystore_wdc/lib'
import { Context, Address } from 'node_modules/keystore_wdc/lib'

const _balance = Store.from<Address, U256>('balance');
const _freeze = Store.from<Address, U256>('freeze');

export function init(tokenName: string, symbol: string, totalSupply: U256, decimals: u64, owner: Address): Address {
    // tokenName || symbol || totalSupply || decimals || owner
    Globals.set<string>('tokenName', tokenName);
    Globals.set<string>('symbol', symbol);
    Globals.set<U256>('totalSupply', totalSupply);
    Globals.set<u64>('decimals', decimals);
    Globals.set<Address>('owner', owner);
    _balance.set(owner, totalSupply);
    return Context.self();
}

// display balance
export function balanceOf(addr: Address): U256 {
    return _balance.getOrDefault(addr, U256.ZERO);
}

export function freezeOf(addr: Address): U256 {
    return _freeze.getOrDefault(addr, U256.ZERO);
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

/* Send coins */
export function transfer(to: Address, amount: U256): void {
    const msg = Context.msg();
    assert(amount > U256.ZERO, 'amount is not positive');
    let b = balanceOf(msg.sender)
    assert(b >= amount, 'balance is not enough');
    _balance.set(to, balanceOf(to) + amount);
    _balance.set(msg.sender, balanceOf(msg.sender) - amount);
    Context.emit<Transfer>(new Transfer(msg.sender, to, amount));
}

// 冻结
export function freeze(amount: U256): void {
    const msg = Context.msg();
    assert(balanceOf(msg.sender) >= amount, 'balance is not enough');
    _balance.set(msg.sender, balanceOf(msg.sender) - amount);
    _freeze.set(msg.sender, freezeOf(msg.sender) + amount);
    Context.emit<Freeze>(new Freeze(msg.sender, amount));
}

// 解冻
export function unfreeze(amount: U256): void {
    const msg = Context.msg();
    assert(freezeOf(msg.sender) >= amount, 'freeze is not enough');
    _freeze.set(msg.sender, freezeOf(msg.sender) - amount);
    _balance.set(msg.sender, balanceOf(msg.sender) + amount);
    Context.emit<Unfreeze>(new Unfreeze(msg.sender, amount));
}

/* Allow another contract to spend some tokens in your behalf */
export function approve(to: Address, amount: U256): void {
    const msg = Context.msg();
    assert(amount > U256.ZERO, 'amount is not positive');
    _setAllowanceOf(msg.sender, to, amount);
    Context.emit<Approve>(new Approve(msg.sender, to, amount));
}

export function allowanceOf(from: Address, sender: Address): U256 {
    const db = getAllowanceDB(from);
    return db.getOrDefault(sender, U256.ZERO);
}

/* A contract attempts to get the coins */
export function transferFrom(from: Address, to: Address, amount: U256): void {
    const msg = Context.msg();
    assert(amount > U256.ZERO, 'amount is not positive');
    const allowance = allowanceOf(from, msg.sender);
    const balance = balanceOf(from);
    assert(balance >= amount, 'balance is not enough');
    assert(allowance >= amount, 'allowance is not enough');
    _setAllowanceOf(from, msg.sender, allowanceOf(from, msg.sender) - amount);
    _balance.set(from, balanceOf(from) - amount);
    _balance.set(to, balanceOf(to) + amount);
    Context.emit<Transfer>(new Transfer(from, to, amount));
}

// 许可金
function getAllowanceDB(addr: Address): Store<Address, U256> {
    const prefix = Util.concatBytes(Util.str2bin('allowance'), addr.buf);
    return new Store<Address, U256>(prefix);
}


function _setAllowanceOf(from: Address, msgSender: Address, amount: U256): void {
    const db = getAllowanceDB(from);
    db.set(msgSender, amount);
}

// 所有合约的主文件必须声明此函数
export function __idof(type: ABI_DATA_TYPE): u32 {
    return ___idof(type);
}

@unmanaged
class Approve {
    constructor(
        readonly from: Address,
        readonly sender: Address,
        readonly amount: U256) {
    }
}

@unmanaged class Transfer {
    constructor(readonly from: Address, readonly to: Address, readonly value: U256) { }
}

@unmanaged class Freeze {
    constructor(readonly from: Address, readonly value: U256) { }
}

@unmanaged class Unfreeze {
    constructor(readonly from: Address, readonly value: U256) { }
}
```

2. 在你的项目根目录下新建一个 deploy.js文件，编写部署脚本

```js

const sk = '****' // 填写你的私钥
const addr = '****' // 填写你的地址
const tool = (require('keystore_wdc')).contractTool() // 

const contract = new tool.Contract()

// 用于构造合约事务
const builder = new tool.TransactionBuilder(/* 事务默认版本号 */1, sk, /*gas限制，填写0不限制gas*/0, /*gas单价*/ 200000)
// 这里是 asc 的路径，
const ascPath = 'node_modules/.bin/asc';

// 用于调用节点 rpc
const rpc = new tool.RPC('localhost', 19585)

async function deploy(){
   const contract = new tool.Contract()
   // 编译合约得到字节码
   contract.binary = await tool.compileContract(ascPath, 'coin.ts')
   // 编译得到 abi
   contract.abi = tool.compileABI(fs.readFileSync('coin.ts'))
   // 写入 abi，便于以后使用
   fs.writeFileSync('coin.abi.json', JSON.stringify(contract.abi))

   // 获取 nonce，填入 builder，这样 builder 生成的事务都是签名过的事务
   builder.nonce = (await rpc.getNonce(addr)) + 1
   // 生成合约部署的事务
   let tx = builder.buildDeploy(contract, {
      tokenName: 'doge',
      symbol: 'DOGE',
      totalSupply: '90000000000000000',
      decimals: 8,
      owner: addr
   }, 0)
   // 也可以用 tx.sign(sk) 手动进行签名

   // 部署的合约地址可以根据事务哈希值计算得到
   console.log(tool.getContractAddress(tx.getHash()))

   // 发送事务并等待事务打包进入区块
   console.dir(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED), {depth: null})
   // 也可以直接发送，不等待事务打包 rpc.sendTransaction(tx)
}
```

3. 合约部署后，可以查看合约中的方法

```js
const contractAddr = '****' // 这里填合约部署后生成的地址
const abi = require('./coin.abi.json') // 部署合约时生成的 abi 
const tool = (require('keystore_wdc')).contractTool() 
const sk = '****' // 填写你的私钥
const yourAddress = '****' // 填写你的地址

// 用于构造合约事务
const builder = new tool.TransactionBuilder(/* 事务默认版本号 */1, sk, /*gas限制，填写0不限制gas*/0, /*gas单价*/ 200000)

// 用于调用节点 rpc
const rpc = new tool.RPC('localhost', 19585)

async function viewBalance(){
   const contract = new tool.Contract(contractAddr, abi)
   // 构造合约转账事务
   let tx = builder.buildContractCall(contract, 'transfer', ['14zBnDtf8SqHjzVGYUupBtwnWWXx8Uqg3u', 100000000])
   // 设置 nonce
   tx.nonce = (await rpc.getNonce(yourAddress)) + 1 // 这里的 nonce 可以从节点获取 
   tx.sign(sk)
   console.dir(await rpc.sendAndObserve(tx, tool.TX_STATUS.INCLUDED), {depth: null})
}
```

4. 合约部署后，也可以调用合约中的方法构造事务


```js
const contractAddr = '****' // 这里填合约部署后生成的地址
const abi = require('./coin.abi.json') // 部署合约时生成的 abi 
const tool = (require('keystore_wdc')).contractTool() 
// 用于调用节点 rpc

async function viewBalance(){
   const contract = new tool.Contract(contractAddr, abi)
   let tx = 
}
```
