const keccak256 = require('./sha3').keccak256;
const sha3256 = require('./sha3').sha3_256;
const nacl = require('./nacl.min.js');
const Uint64BE = require("./int64-buffer").Uint64BE;
const uint32 = require('uint32');
const RLP = require('rlp')
const assert = require('assert')
const crypto = require('crypto');
const ripemd160 = crypto.createHash('ripemd160');

class Transaction
{

    Bytes2Str(arr){
        var str = "";
        for(var i=0; i<arr.length; i++){
            var tmp = arr[i].toString(16);
                if(tmp.length == 1){
                    tmp = "0" + tmp;
                }
            str += tmp;
        }
        return str;
    }

    mul(amount){
        var arr =amount.toString().split(".");
        let newAmount=0;
        if(arr.length>1){
            if(arr[1].length>8){
                return -1;	
             }
        let len = arr[1].length;
        let decimal = arr[1];
        for(var i=0;i<(8-len);i++){
            decimal=decimal+"0";
        }
            newAmount =arr[0]+decimal;
        }else{
            newAmount = amount+"00000000";
        }
        return newAmount;
     }

    encodeUint32(value){
        const buf = Buffer.alloc(4);
        buf[0] = ((value & 0x00000000FF000000) >>> 24);	
        buf[1] = ((value & 0x0000000000FF0000) >>> 16);
        buf[2] = ((value & 0x000000000000FF00) >>> 8);
        buf[3] = (value &  0x00000000000000FF);
        return buf;
    }

    numberToString(arg) {
        if (typeof arg === 'string') {
          if (!arg.match(/^-?[0-9.]+$/)) {
            throw new Error(`while converting number to string, invalid number value '${arg}', should be a number matching (^-?[0-9.]+).`);
          }
          return arg;
        } else if (typeof arg === 'number') {
          return -1;
        } else if (typeof arg === 'object' && arg.toString && (arg.toTwos || arg.dividedToIntegerBy)) {
          if (arg.toPrecision) {
            return String(arg.toPrecision());
          } else { // eslint-disable-line
            return arg.toString(10);
          }
        }
        return -1;
      }
    //转账
    ClientToTransferAccount(fromPubkeyStr,toPubkeyHashStr,amount,prikeyStr,nonceNum){
        try{
	        let isNum = this.numberToString(amount);
            if(isNum == -1){
                return 5000;
            }
            //版本号
            let version="01";
            //类型：WDC转账
            let type="01";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "4";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位
            let mul = this.mul(amount);
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash=toPubkeyHashStr;
            //长度
            let allPayload= "00000000";
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;   
        }
    }

    //存证
    ClientToTransferProve(fromPubkeyStr,nonceNum,payloadbyte,prikeyStr){
        try {
            //版本号
            let version="01";
            //类型：存证
            let type="03";
            //Nonce 无符号64位
            let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            let mul = this.mul("0");
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            const buffertoPubkeyHash=Buffer.alloc(20);
            let toPubkeyHash=this.Bytes2Str(buffertoPubkeyHash);
            //长度
            let payloadLen = uint32.toHex(payloadbyte.length);
            let payload = this.Bytes2Str(payloadbyte);
            let allPayload = payloadLen + payload;            
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.error(error);
            return 5000;
        }
    }

    //投票
    ClientToTransferVote(fromPubkeyStr,toPubkeyHashStr,amount,nonceNum,prikeyStr){
        try {
            let isNum = this.numberToString(amount);
            if(isNum == -1){
                return 5000;
            }
            //版本号
            let version="01";
            //类型：投票
            let type="02";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "10";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位
            let mul = this.mul(amount);
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash=toPubkeyHashStr;
            //长度
            let allPayload= "00000000";
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            return 5000;
        }
    }

    //撤回投票
    ClientToTransferVoteWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonceNum,prikeyStr,txid){
        try {
            let isNum = this.numberToString(amount);
            if(isNum == -1){
                return 5000;
            }
            //版本号
            let version="01";
            //类型：撤回投票
            let type="0d";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "10";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位
            let mul = this.mul(amount);
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash=toPubkeyHashStr;
            //长度
            let payloadLen = uint32.toHex(Buffer.from(txid, 'hex').length);
            let payload = txid;
            let allPayload = payloadLen + payload;

            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            
        }
    }

    //抵押
    ClientToTransferMortgage(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr){
        try {
            let isNum = this.numberToString(amount);
            if(isNum == -1){
                return 5000;
            }
            //版本号
            let version="01";
            //类型：抵押
            let type="0e";
            //Nonce 无符号64位
	        let _nonece=new Uint64BE((Number(nonce)+1).toString(),10).toString(16);
            let nonece = '0000000000000000'.substr(_nonece.length) + _nonece;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "10";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位
            let mul = this.mul(amount);
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash=toPubkeyHashStr;
            //长度
            let allPayload= "00000000";
            let RawTransaction=Buffer.from(version+type+nonece+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonece+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonece+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            return 5000;
        }
    }

    //撤回抵押
    ClientToTransferMortgageWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonceNum,prikeyStr,txid){
        try {
            let isNum = this.numberToString(amount);
            if(isNum == -1){
                return 5000;
            }
            //版本号
            let version="01";
            //类型：撤回投票
            let type="0f";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "10";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位
            let mul = this.mul(amount);
            if(mul < 0){
                return 5000;
            }
	        let _Amount=new Uint64BE(mul,10).toString(16);
            let Amount = '0000000000000000'.substr(_Amount.length) + _Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash=toPubkeyHashStr;
            //长度
            let payloadLen = uint32.toHex(Buffer.from(txid, 'hex').length);
            let payload = txid;
            let allPayload = payloadLen + payload;

            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //资产定义
    CreateSignToDeployforRuleAsset(fromPubkeyStr,nonceNum,prikeyStr,code,offering,owner,allowincrease,info){
        try {
            //版本号
            let version="01";
            //类型：部署事务
            let type="07";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=this.Bytes2Str(Buffer.alloc(20));
            //payload
            let offeringBrian = this.mul(offering);
            if(offeringBrian < 0){
                return 5000;
            }
            let totalamountBrian = offeringBrian;  
            //payload
            const Asset = [code,offeringBrian*1,totalamountBrian*1,Buffer.from(fromPubkeyStr,'hex'),Buffer.from(owner,'hex'),allowincrease*1,info];
            const AssetEncoded = RLP.encode(Asset);
            let payloadLen = uint32.toHex(AssetEncoded.length+1);
            let payload = "00"+AssetEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //更换所有者
    CreateSignToDeployforAssetChangeowner(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,newOwnerPubkeyhash){
        try {
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //payload
            const AssetChangeowner = [Buffer.from(newOwnerPubkeyhash,'hex')];
            const AssetChangeownerEncoded = RLP.encode(AssetChangeowner);
            let payloadLen = uint32.toHex(AssetChangeownerEncoded.length+1);
            let payload = "00"+AssetChangeownerEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //转发资产
    CreateSignToDeployforRuleTransfer(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_from,payload_to,payload_amount){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //转账金额
            let mul = this.mul(payload_amount);
            if(mul < 0){
                return 5000;
            }
            //payload
            const AssetTransfer = [Buffer.from(payload_from,'hex'),Buffer.from(payload_to,'hex'),mul*1];
            const AssetTransferEncoded = RLP.encode(AssetTransfer);
            let payloadLen = uint32.toHex(AssetTransferEncoded.length+1);
            let payload = "01"+AssetTransferEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //增发
    CreateSignToDeployforRuleAssetIncreased(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_amount){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
             //增发金额
             let mul = this.mul(payload_amount);
             if(mul < 0){
                 return 5000;
             }
            //payload
            const AssetIncreased = [mul*1];
            const AssetIncreasedEncoded = RLP.encode(AssetIncreased);
            let payloadLen = uint32.toHex(AssetIncreasedEncoded.length+1);
            let payload = "02"+AssetIncreasedEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //部署哈希时间锁定
    CreateHashTimeBlockForDeploy(fromPubkeyStr,nonceNum,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：部署事务
            let type="07";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=this.Bytes2Str(Buffer.alloc(20));
            //payload
            const Hashtimeblock = [Buffer.from(payload_assetHexStr,'hex'),Buffer.from(payload_pubkeyHashHexStr,'hex')];
            const HashtimeblockEncoded = RLP.encode(Hashtimeblock);
            let payloadLen = uint32.toHex(HashtimeblockEncoded.length+1);
            let payload = "02"+HashtimeblockEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //哈希时间锁定转发资产
    CreateHashTimeBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_value,payload_hashresult,payload_timestamp){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //转发金额
            let mul = this.mul(payload_value);
            if(mul < 0){
                return 5000;
            }
            //payload
            const HashtimeblockTransfer = [mul*1,Buffer.from(sha3256(Buffer.from(payload_hashresult.replace(/ /g, ''),'utf8')),'hex'),payload_timestamp*1];
            const HashtimeblockTransferEncoded = RLP.encode(HashtimeblockTransfer);
            let payloadLen = uint32.toHex(HashtimeblockTransferEncoded.length+1);
            let payload = "04"+HashtimeblockTransferEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //哈希时间锁定获得锁定资产
    CreateHashTimeBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_transferhash,origintext){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //payload
            const HashtimeblockGet = [Buffer.from(payload_transferhash,'hex'),origintext.replace(/ /g, '')];
            const HashtimeblockGetEncoded = RLP.encode(HashtimeblockGet);
            let payloadLen = uint32.toHex(HashtimeblockGetEncoded.length+1);
            let payload = "05"+HashtimeblockGetEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //部署哈希高度锁定
    CreateHashHeightBlockForDeploy(fromPubkeyStr,nonceNum,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：部署事务
            let type="07";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=this.Bytes2Str(Buffer.alloc(20));
            //payload
            const Heightblock = [Buffer.from(payload_assetHexStr,'hex'),Buffer.from(payload_pubkeyHashHexStr,'hex')];
            const HeightblockEncoded = RLP.encode(Heightblock);
            let payloadLen = uint32.toHex(HeightblockEncoded.length+1);
            let payload = "03"+HeightblockEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //哈希高度锁定转发资产
    CreateHashHeightBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_value,payload_hashresult,payload_height){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //转发金额
            let mul = this.mul(payload_value);
            if(mul < 0){
                return 5000;
            }
            //payload
            const HashheightblockTransfer = [mul*1,Buffer.from(sha3256(Buffer.from(payload_hashresult.replace(/ /g, ''),'utf8')),'hex'),payload_height*1];
            const HashheightblockTransferEncoded = RLP.encode(HashheightblockTransfer);
            let payloadLen = uint32.toHex(HashheightblockTransferEncoded.length+1);
            let payload = "06"+HashheightblockTransferEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }    

    //哈希高度锁定获得锁定资产
    CreateHashHeightBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_transferhash,origintext){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希
            let toPubkeyHash = toPubkeyHashStr;
            //payload
            const HashtimeblockGet = [Buffer.from(payload_transferhash,'hex'),origintext.replace(/ /g, '')];
            const HashtimeblockGetEncoded = RLP.encode(HashtimeblockGet);
            let payloadLen = uint32.toHex(HashtimeblockGetEncoded.length+1);
            let payload = "07"+HashtimeblockGetEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //部署多签(签发者构建)
    CreateMultipleForRuleFirst(fromPubkeyStr,nonceNum,prikeyStr,payload_asset160hash,payload_m,payload_n,payload_pubkeyHashasBytesArray){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：部署事务
            let type="07";
	        //Nonce 无符号64位
	        let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyHash = fromPubkeyStr;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=this.Bytes2Str(Buffer.alloc(20));
            //payload
            const MultisignRule = [Buffer.from(payload_asset160hash,'hex'),payload_m*1,payload_n*1,new Array(),new Array(),payload_pubkeyHashasBytesArray];
            const MultisignRuleEncoded = RLP.encode(MultisignRule);
            let payloadLen = uint32.toHex(MultisignRuleEncoded.length+1);
            let payload = "01"+MultisignRuleEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyHash+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;

            
            let signTransactionArray = new Array();
            signTransactionArray.push(Buffer.from(sigHex,'hex'));
            let fromArray = new Array();
            fromArray.push(Buffer.from(fromPubkeyStr,'hex'));
            return {
                'fromPubkeyStr': fromPubkeyStr,
                'signTransaction': sigHex,
                'rawTransaction':version+type+nonce+fromPubkeyHash+gasPrice+Amount+signull+toPubkeyHash+allPayload,
                'signTransactionArray': signTransactionArray,
                'fromArray':fromArray
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //部署多签(其他人签名)
    CreateMultipleToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray){
        try {
            //校验签名
            let isSign = nacl.sign.detached.verify(Buffer.from(rawTransaction,'hex'),Buffer.from(signTransaction,'hex'),Buffer.from(transaction_pubkey,'hex'));
            if(!isSign){
                return 5100;
            }
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(Buffer.from(rawTransaction,'hex'),secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            signTransactionArray.push(Buffer.from(sigHex,'hex'));
            fromArray.push(Buffer.from(fromPubkeyStr,'hex'))
            return {
                'fromPubkeyStr': fromPubkeyStr,
                'signTransaction': sigHex,
                'rawTransaction': rawTransaction,
                'signTransactionArray':signTransactionArray,
                'fromArray':fromArray
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //多签部署组装事务（用于广播）
    CreateMultipleForRuleSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr){
        try{
            let transaction = this.AnalysisTransaction(rawTransaction);
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version = transaction.version;
            //类型：部署事务
            let type = transaction.type;
            //Nonce 无符号64位
            let nonce = transaction.nonce;
            //签发者公钥哈希 20字节
            let fromPubkey = transaction.fromPubkeyHash;
            //gas单价  
            let gasPrice = transaction.gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = transaction.Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=this.Bytes2Str(Buffer.alloc(20));
            //payload
            const MultisignRule = [transaction.payload_decoded[0],transaction.payload_decoded[1],transaction.payload_decoded[2],fromArray,signTransactionArray,transaction.payload_decoded[5]];
            const MultisignRuleEncoded = RLP.encode(MultisignRule);
            let payloadLen = uint32.toHex(MultisignRuleEncoded.length+1);
            let payload = "01"+MultisignRuleEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkey+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkey, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkey+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkey+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //多签转账（签发者构建）
    CreateMultisignatureForTransferFirst(fromPubkey,toPubkeyHashStr,nonceNum,prikeyStr,payload_origin,payload_dest,payload_to,payload_value,payload_pubkeyHashasBytesArray){
        try {
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version="01";
            //类型：调用事务
            let type="08";
            //Nonce 无符号64位
            let _nonce=new Uint64BE((Number(nonceNum)+1).toString(),10).toString(16);
            let nonce = '0000000000000000'.substr(_nonce.length) + _nonce;
            //签发者公钥哈希 20字节
            let fromPubkeyStr = fromPubkey;
            //gas单价  
            let price = "2";
            let _gasPrice=new Uint64BE(price,10).toString(16);
            let gasPrice = '0000000000000000'.substr(_gasPrice.length) + _gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = this.Bytes2Str(Buffer.alloc(8));
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash = toPubkeyHashStr;
            let mul = this.mul(payload_value);
            if(mul < 0){
                return 5000;
            }
            //payload
            
            const MultTransfer = [payload_origin*1,payload_dest*1,new Array(),new Array(),Buffer.from(payload_to,'hex'),mul*1,payload_pubkeyHashasBytesArray];
            const MultTransferEncoded = RLP.encode(MultTransfer);
            let payloadLen = uint32.toHex(MultTransferEncoded.length+1);
            let payload = "03"+MultTransferEncoded.toString('hex');
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkeyStr+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkeyStr+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkeyStr+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let signTransactionArray = new Array();
            signTransactionArray.push(Buffer.from(sigHex,'hex'));
            let fromArray = new Array();
            fromArray.push(Buffer.from(fromPubkeyStr,'hex'));
            return {
                'fromPubkeyStr': fromPubkeyStr,
                'signTransaction': sigHex,
                'rawTransaction':version+type+nonce+fromPubkeyStr+gasPrice+Amount+signull+toPubkeyHash+allPayload,
                'signTransactionArray':signTransactionArray,
                'fromArray':fromArray
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //多签转账(其他人签名)
    CreateMultisignatureToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray){
        try {
            //校验签名
            let isSign = nacl.sign.detached.verify(Buffer.from(rawTransaction,'hex'),Buffer.from(signTransaction,'hex'),Buffer.from(transaction_pubkey,'hex'));
            if(!isSign){
                return 5100;
            }
            let secretKey = Buffer.from(prikeyStr+fromPubkeyStr, 'hex');
            let sigall = nacl.sign(Buffer.from(rawTransaction,'hex'),secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            signTransactionArray.push(Buffer.from(sigHex,'hex'));
            fromArray.push(Buffer.from(fromPubkeyStr,'hex'))
            return {
                'fromPubkeyStr': fromPubkeyStr,
                'signTransaction': sigHex,
                'rawTransaction': rawTransaction,
                'signTransactionArray':signTransactionArray,
                'fromArray':fromArray
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }

    //多签转账组装事务（用于广播）
    CreateMultisignatureForTransferSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr){
        try {
            let transaction = this.AnalysisTransaction(rawTransaction);
            prikeyStr = this.DismantlingPrivateByLength(prikeyStr);
            //版本号
            let version = transaction.version;
            //类型：部署事务
            let type = transaction.type;
            //Nonce 无符号64位
            let nonce = transaction.nonce;
            //签发者公钥哈希 20字节
            let fromPubkey = transaction.fromPubkeyHash;
            //gas单价  
            let gasPrice = transaction.gasPrice;
            //转账金额 无符号64位 0填充
            let Amount = transaction.Amount;
            //为签名留白
            const buffersignull = Buffer.alloc(64);
            let signull = this.Bytes2Str(buffersignull);
            //接收者公钥哈希 0填充
            let toPubkeyHash=transaction.toPubkeyHash;
            //payload
            const MultisignRule = [transaction.payload_decoded[0],transaction.payload_decoded[1],fromArray,signTransactionArray,transaction.payload_decoded[4],transaction.payload_decoded[5],transaction.payload_decoded[6]];
            const MultisignRuleEncoded = RLP.encode(MultisignRule);
            let payloadLen = uint32.toHex(MultisignRuleEncoded.length+1);
            let payload = "03"+MultisignRuleEncoded.toString('hex')
            let allPayload = payloadLen + payload;
            let RawTransaction=Buffer.from(version+type+nonce+fromPubkey+gasPrice+Amount+signull+toPubkeyHash+allPayload, 'hex');
            //签名数据
            let secretKey = Buffer.from(prikeyStr+fromPubkey, 'hex');
            let sigall = nacl.sign(RawTransaction,secretKey);
            let sigHex = this.Bytes2Str(sigall).substring(0,128);
            let _tra = version+type+nonce+fromPubkey+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            let tra = Buffer.from(_tra,'hex');
            let transha = keccak256(tra);
            let signRawBasicTransaction = version+transha+type+nonce+fromPubkey+gasPrice+Amount+sigHex+toPubkeyHash+allPayload;
            return {
                'txHash': transha,
                'transaction': signRawBasicTransaction
            }
        } catch (error) {
            console.log(error);
            return 5000;
        }
    }



    //通过长度拆封私钥
    DismantlingPrivateByLength(prikey){
        if(prikey.length == 128){
            return prikey.substring(0,64);
        }
        return prikey;
    }

    //解析事务
    AnalysisTransaction(transaction){
        //版本号
        let version = transaction.substr(0,2);
        //事务哈希
        let hash = transaction.substr(2,64);
        //类型
        let type=transaction.substr(66,2);
        //Nonce 无符号64位
        let nonce = transaction.substr(68,16);
        //签发者公钥 20字节
        let fromPubkeyHash = transaction.substr(84,64);
        //gas单价  
        let gasPrice = transaction.substr(148,16);
        //转账金额 无符号64位
        let Amount = transaction.substr(164,16);
        //签名
        let signull = transaction.substr(180,128);
        //接收者公钥哈希
        let toPubkeyHash = transaction.substr(308,40);
        // //payloadlen
        // let payloadlen = transaction.substr(348,8);
        // let payload_decoded = "";
        // if(payloadlen*1 != 0){
        //     //payload 类型
        //     let payload_type = transaction.substr(292,2);
        //     let payload_RLP = transaction.substr(294,transaction.length-250);
        //     payload_decoded = RLP.decode(Buffer.from(payload_RLP,'hex'));
        // }
        return {
            'version':version,
            'hash':hash,
            'type':type,
            'nonce':nonce,
            'fromPubkeyHash':fromPubkeyHash,
            'gasPrice':gasPrice,
            'Amount':Amount,
            'signull':signull,
            'toPubkeyHash':toPubkeyHash
        }
    }

    //160哈希
    Ripemd160(pubkey){
        return crypto.createHash('ripemd160').update(Buffer.from(pubkey,'hex')).digest('hex');
    }

    Sign(msg,prikey){
        let secretKey = Buffer.from(prikey, 'hex');
        let RawTransaction=Buffer.from(msg, 'hex');
        let sigall = nacl.sign(RawTransaction,secretKey);
        let sigHex = this.Bytes2Str(sigall).substring(0,128);
        return sigHex;
    }
}
module.exports = Transaction;
