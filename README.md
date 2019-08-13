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
     const keystore = await ks.Create("your keystore","your password","your newpassword");
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

#### 公钥哈希转地址（）
```
const address = ks.pubkeyHashToaddress("your pubkeyHash")
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





