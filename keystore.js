"use strict";

const AccountHandle = require('./account-handle');
const aesjs = require('./aes-js');
const keccak256 = require('./sha3').keccak256;
const argon2b = require('argon2-browser');

const fs = require('fs');
const crypto = require('crypto');
const uuidV4 = require('uuid/v4');
const path = __dirname + "/../../../keystore/main";
const testpath = __dirname + "/../../../keystore/test";
const bs58 = require('./base58');
const Decimal = require('./decimal.js');
const nacl = require('./nacl.min.js');
const BN = require('bn.js');
var Uint64BE = require("./int64-buffer").Uint64BE;
var uint32 = require('uint32');
const Transaction = require('./transaction');

class KeyStore {
    constructor() {
    }

    async argon2(s1, salt){
        return Buffer.from((await argon2b.hash({
            pass: s1,
            time: 4,
            mem: 20480,
            hashLen: 32,
            parallelism: 2,
            type: argon2b.ArgonType.Argon2id,
            salt: salt
        })).hashHex, 'hex')
    }

    setArgon2(fn){
        this.argon2 = fn
    }

    async Create (pwd) {
        try {
            if(pwd.length>20 || pwd.length<8){
                return -1;
            }
            let keyStore = {};
            const account = new AccountHandle().createAccount();
            //地址
            keyStore.address = account.addr;
            keyStore.crypto = {};
            //使用的加密算法，默认为aes-256-ctr
            keyStore.crypto.cipher = "aes-256-ctr";
            //keyStore.crypto.ciphertext = "";
            keyStore.crypto.cipherparams = {};
            //算法所需的参数，随机生成
            keyStore.crypto.cipherparams.iv = crypto.randomBytes(16).toString('hex');  // must be 128 bit, random 

            //const aesCtr = new aesjs.ModeOfOperation.ctr(key_256, new aesjs.Counter(5));
            //var encryptedBytes = aesCtr.encrypt(textBytes);
            //密钥加密方法
            keyStore.kdf = "Argon2id";
            //Argon2id的参数，分别是散列计算的迭代次数，必须使用的存储器的大小以及可以并行计算散列的CPU数量
            keyStore.kdfparams = {};
            keyStore.kdfparams.timeCost = 4;
            keyStore.kdfparams.memoryCost = 20480;
            keyStore.kdfparams.parallelism = 2;
            //Argon2id哈希计算使用的盐值，随机生成32
            keyStore.kdfparams.salt = crypto.randomBytes(32).toString('hex'); // random
            //keystore格式的版本号，默认为1  2019.12.19日更新keystore版本2
            keyStore.version = "2";
            //私钥加密
            // const salt = Buffer.from(keyStore.kdfparams.salt, 'hex');
            const salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
            // const p1 = Buffer.from(pwd, 'ascii').toString('hex');
            const p1 = Buffer.from(pwd, 'ascii');
            let totalLength = salt.length+p1.length;
            const s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
            // const s1 = keyStore.kdfparams.salt + p1;
            const derivedKey = Buffer.from(await this.argon2(s1, salt));

            const vi = Buffer.from(keyStore.crypto.cipherparams.iv, 'hex');
            const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(vi));
            let _prikey = this.Bytes2Str(account.secretKey).substring(0,64);
            let prikey = Buffer.from(_prikey,'hex');
            const encryptedBytes = aesCtr.encrypt(prikey);
            //加密过的私钥
            keyStore.crypto.ciphertext = aesjs.utils.hex.fromBytes(encryptedBytes);

            //用来比较解密密钥与口令的
            const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
            const dc_buf = Buffer.from(dc, 'hex');
            keyStore.mac = keccak256(dc_buf);
            //这是UUID，可以直接通过程序计算得到
            keyStore.id = uuidV4();
            return keyStore;
        } catch (error) {
            return 5000;   
        }
    }

    async Import (pwd,privateKey) {
        try {
            if(pwd.length>20 || pwd.length<8){
                return -1;
            }
            let keyStore = {};
            //地址
            keyStore.address = this.pubkeyHashToaddress(this.pubkeyToPubkeyHash(this.prikeyToPubkey(privateKey)),1);
            keyStore.crypto = {};
            //使用的加密算法，默认为aes-256-ctr
            keyStore.crypto.cipher = "aes-256-ctr";
            //keyStore.crypto.ciphertext = "";
            keyStore.crypto.cipherparams = {};
            //算法所需的参数，随机生成
            keyStore.crypto.cipherparams.iv = crypto.randomBytes(16).toString('hex');  // must be 128 bit, random

            //const aesCtr = new aesjs.ModeOfOperation.ctr(key_256, new aesjs.Counter(5));
            //var encryptedBytes = aesCtr.encrypt(textBytes);
            //密钥加密方法
            keyStore.kdf = "Argon2id";
            //Argon2id的参数，分别是散列计算的迭代次数，必须使用的存储器的大小以及可以并行计算散列的CPU数量
            keyStore.kdfparams = {};
            keyStore.kdfparams.timeCost = 4;
            keyStore.kdfparams.memoryCost = 20480;
            keyStore.kdfparams.parallelism = 2;
            //Argon2id哈希计算使用的盐值，随机生成32
            keyStore.kdfparams.salt = crypto.randomBytes(32).toString('hex'); // random
            //keystore格式的版本号，默认为1  2019.12.19日更新keystore版本2
            keyStore.version = "2";
            //私钥加密
            // const salt = Buffer.from(keyStore.kdfparams.salt, 'hex');
            const salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
            // const p1 = Buffer.from(pwd, 'ascii').toString('hex');
            const p1 = Buffer.from(pwd, 'ascii');
            let totalLength = salt.length+p1.length;
            const s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
            // const s1 = keyStore.kdfparams.salt + p1;
            const derivedKey = Buffer.from(await this.argon2(s1, salt))

            const vi = Buffer.from(keyStore.crypto.cipherparams.iv, 'hex');
            const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(vi));
            let prikey = Buffer.from(privateKey,'hex');
            const encryptedBytes = aesCtr.encrypt(prikey);
            //加密过的私钥
            keyStore.crypto.ciphertext = aesjs.utils.hex.fromBytes(encryptedBytes);

            //用来比较解密密钥与口令的
            const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
            const dc_buf = Buffer.from(dc, 'hex');
            keyStore.mac = keccak256(dc_buf);
            //这是UUID，可以直接通过程序计算得到
            keyStore.id = uuidV4();
            return keyStore;
        } catch (error) {
            return 5000;
        }
    }

    EncryptSecretKey() {

    }

    //keystore路径和密码获取私钥
    async DecryptSecretKey(addr, pwd) {
        const keyStore = this.Read(addr);
        if(keyStore == null) return null;
        let salt;
        let p1;
        let totalLength;
        let s1;
        if(keyStore.version == 2){
            salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
            p1 = Buffer.from(pwd, 'ascii');
            totalLength = salt.length+p1.length;
            s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
        }else{
            salt = Buffer.from(keyStore.kdfparams.salt, 'hex');
            p1 = Buffer.from(pwd, 'ascii').toString('hex');
            s1 = keyStore.kdfparams.salt + p1;
        }
        
        const derivedKey = Buffer.from(await this.argon2(s1, salt));
        const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
        const dc_buf = Buffer.from(dc, 'hex');
        const mac = keccak256(dc_buf);

        if(mac != keyStore.mac) return null;

        //私钥解密
        const vi = Buffer.from(keyStore.crypto.cipherparams.iv, 'hex');
        const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(vi));
        var encryptedBytes = aesjs.utils.hex.toBytes(keyStore.crypto.ciphertext);
        var decryptedBytes = aesCtr.decrypt(encryptedBytes);
        return decryptedBytes;
    }

    Save (keystore,net) {
        
        let newpath;
        if(net == "main"){
            newpath = path;
        }else{
            newpath = testpath;
        }
        if(!fs.existsSync(newpath)) fs.mkdirSync(newpath);
        let time=new Date().getTime();
        const filePath = newpath + "/" + keystore.address+"@"+time;
        const content = JSON.stringify(keystore, null, 4);
        fs.writeFile(filePath, content, {flag: 'w'}, function (err) {
            if(err) {
                console.error(err);
            } else {
                console.log('keystore create success');
            }
         });
    }

    Read (fileName) {
        const filePath = path + "/" + fileName;
        if(fs.existsSync(filePath) == false) return null;
        const result = JSON.parse(fs.readFileSync( filePath));
        return result;
    }

    Readfull (filefullName){
        if(fs.existsSync(filefullName) == false) return null;
        const result = JSON.parse(fs.readFileSync( filefullName));
        return result;
    }

    async DecryptSecretKeyfull(keyStore, pwd) {
        try{
            if(keyStore == null) return 5000;
            let salt;
            let p1;
            let totalLength;
            let s1;
            if(keyStore.version == 2){
                salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
                p1 = Buffer.from(pwd, 'ascii');
                totalLength = salt.length+p1.length;
                s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
            }else{
                salt = Buffer.from(keyStore.kdfparams.salt, 'hex');
                p1 = Buffer.from(pwd, 'ascii').toString('hex');
                s1 = keyStore.kdfparams.salt + p1;
            }
  
            const derivedKey = Buffer.from(await this.argon2(s1, salt));

            const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
            const dc_buf = Buffer.from(dc, 'hex');
            const mac = keccak256(dc_buf);

            if(mac != keyStore.mac) return 5000;

            //私钥解密
            const vi = Buffer.from(keyStore.crypto.cipherparams.iv, 'hex');
            const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(vi));
            var encryptedBytes = aesjs.utils.hex.toBytes(keyStore.crypto.ciphertext);
            var decryptedBytes=[];
            decryptedBytes = aesCtr.decrypt(encryptedBytes);
            var str="";
            var hexString = "0123456789ABCDEF";
            for(var i=0; i<decryptedBytes.length; i++)
                {
                    var tmp = decryptedBytes[i].toString(16);
                    if(tmp.length == 1)
                    {
                        tmp = "0" + tmp;
                    }
                    str += tmp;
                }
            return str;
        }catch (error) {
            return 5000;   
        }
    }

    async verifySecretKey(keyStore, pwd) {
        if(keyStore == null) return null;
        let salt;
        let p1;
        let totalLength;
        let s1;
        if(keyStore.version == 2){
            salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
            p1 = Buffer.from(pwd, 'ascii');
            totalLength = salt.length+p1.length;
            s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
        }else{
            salt = Buffer.from(keyStore.kdfparams.salt, 'hex');
            p1 = Buffer.from(pwd, 'ascii').toString('hex');
            s1 = keyStore.kdfparams.salt + p1;
        }

        const derivedKey = Buffer.from(await this.argon2(s1, salt));

        const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
        const dc_buf = Buffer.from(dc, 'hex');
        const mac = keccak256(dc_buf);

        if(mac != keyStore.mac){
            return null;
        }else{
            return 1;
        }
    }

    buf2hex(buffer) { // buffer is an ArrayBuffer
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
      }

      Hex2Array(hex) {
        // let ret = new Array();
        // for(let i=0; i<hex.length; i+=2) {
        //     ret.push(parseInt(hex.substr(i,2), 16));
        // }
        // return ret;
        return Buffer.from(hex, 'hex');
    }

    addressToPubkeyHash(address){
        try{
            let _r5;
            if(address.indexOf("1") == 0){
                _r5 = new bs58().decode(address);
            }else{
                _r5 = new bs58().decode(address.substr(2));
            }
            let r5 = this.buf2hex(_r5);
            let r2 = r5.substring(0,r5.length-8);
            let r1 = r2.substring(2,r2.length)
            return r1;
        }catch (error) {
            return 5000;   
        }
    }

    pubkeyToPubkeyHash(pubkey){
        try{
            let pub256 = keccak256(Buffer.from(pubkey,'hex'));
            let bufPub256 = Buffer.from(pub256, 'hex');
            let r1 = crypto.createHash('ripemd160').update(bufPub256).digest('hex');
            return r1;
        }catch (error) {
            return 5000;   
        }
    }

    pubkeyHashToaddress(pubkeyHash,type){
        try{
            let r1 = Buffer.from(pubkeyHash,'hex');
            let r2 = "00"+pubkeyHash;
            let a  = Buffer.from(r1, 'hex');
            let b = keccak256(a);
            let c =Buffer.from(b, 'hex');
            let r3 = keccak256(c);
            let b4 = r3.substring(0,8);
            let r5 = r2+b4;
            let r6 = new bs58().encode(this.Hex2Array(r5));
            if(type == 1){
                return "WX"+r6;
            }else if(type == 2){
                return  "WR"+r6; 
            }
            return 5000;
        } catch (error) {
            
            return 5000;   
        }
    }

    verifyAddress(address){
        try{
            if(address==""||address==null){
                return -1;
            }
            if(address.indexOf("1") == 0 || address.indexOf("WX") == 0 || address.indexOf("WR") == 0){
                let _r5;
                if( address.indexOf("WX") == 0 || address.indexOf("WR") == 0){
                    _r5 = new bs58().decode(address.substr(2));
                }else{
		    _r5 = new bs58().decode(address);		
		}
                let a = Buffer.from(this.addressToPubkeyHash(address),'hex');
                let b = keccak256(a)
                let c =Buffer.from(b, 'hex');
                let r3 = keccak256(c);
                let b4 = r3.substring(0,8);
                let _b4 = this.Bytes2Str(_r5).substring(42,50);
                if(b4 == _b4){
                    return 0;
                }else{
                    return -2;
                }
            }else{
                return -1;
            }
        } catch (error) {
            return 5000;   
        }
    }

    prikeyToPubkey(prikey){
        try{
            const keyPair = new AccountHandle().createKeyPairBySecretKey(this.Hex2Array(prikey));
            return this.buf2hex(keyPair.publicKey);
        } catch (error) {
            return 5000;   
        }
    }
    async updateKeystoreVersion1to2(ks,pwd){
       let result =  await this.modifyPassword(ks,pwd,pwd);
       return result;
    }
    async modifyPassword(ks,pwd,newpwd){
        try{
            if(newpwd.length>20 || newpwd.length<8){
                return -1;
            }
            let _prikey = await this.DecryptSecretKeyfull(ks, pwd);
            if(_prikey.length == 128){
                _prikey = _prikey.substring(0,64)
            }
            let keyStore = {};
            //地址
            keyStore.address =new AccountHandle().pubKeyToaddress(Buffer.from(this.prikeyToPubkey(_prikey), 'hex'),"WX");
            keyStore.crypto = {};
            //使用的加密算法，默认为aes-256-ctr
            keyStore.crypto.cipher = "aes-256-ctr";
            //keyStore.crypto.ciphertext = "";
            keyStore.crypto.cipherparams = {};
            //算法所需的参数，随机生成
            keyStore.crypto.cipherparams.iv = crypto.randomBytes(16).toString('hex');  // must be 128 bit, random 

            //const aesCtr = new aesjs.ModeOfOperation.ctr(key_256, new aesjs.Counter(5));
            //var encryptedBytes = aesCtr.encrypt(textBytes);
            //密钥加密方法
            keyStore.kdf = "Argon2id";
            //Argon2id的参数，分别是散列计算的迭代次数，必须使用的存储器的大小以及可以并行计算散列的CPU数量
            keyStore.kdfparams = {};
            keyStore.kdfparams.timeCost = 4;
            keyStore.kdfparams.memoryCost = 20480;
            keyStore.kdfparams.parallelism = 2;
            //Argon2id哈希计算使用的盐值，随机生成32
            keyStore.kdfparams.salt = crypto.randomBytes(32).toString('hex'); // random
            //keystore格式的版本号，默认为1
            keyStore.version = "2";
            //私钥加密
            const salt = Buffer.from(keyStore.kdfparams.salt, 'ascii');
   
            const p1 = Buffer.from(newpwd, 'ascii');
            let totalLength = salt.length+p1.length;
            const s1 = Buffer.concat([salt, p1], totalLength).toString('ascii');
            const derivedKey = Buffer.from(await this.argon2(s1, salt));

            const vi = Buffer.from(keyStore.crypto.cipherparams.iv, 'hex');
            const aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey, new aesjs.Counter(vi));
            let prikey = Buffer.from(_prikey,'hex');
            const encryptedBytes = aesCtr.encrypt(prikey);
            //加密过的私钥
            keyStore.crypto.ciphertext = aesjs.utils.hex.fromBytes(encryptedBytes);

            //用来比较解密密钥与口令的
            const dc = derivedKey.toString('hex') + keyStore.crypto.ciphertext;
            const dc_buf = Buffer.from(dc, 'hex');
            keyStore.mac = keccak256(dc_buf);
            //这是UUID，可以直接通过程序计算得到
            keyStore.id = uuidV4();
            return keyStore;
        }catch(error){
            return 5000;
        }
    }

    async keystoreToPubkey(keyStore,pwd){
        try{
            return this.prikeyToPubkey(await this.DecryptSecretKeyfull(keyStore, pwd));
        } catch (error) {
            return 5000;   
        }

    }

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

    //Ripemd160哈希
    Ripemd160(pubkey){
        return new Transaction().Ripemd160(pubkey);
    }

    //转账
    ClientToTransferAccount(fromPubkeyStr,toPubkeyHashStr,amount,prikeyStr,nonce){
        return new Transaction().ClientToTransferAccount(fromPubkeyStr,toPubkeyHashStr,amount,prikeyStr,nonce);
    }

    AnalysisTransaction(msg){
        return new Transaction().AnalysisTransaction(msg);
    }

    Sign(msg,prikey){
        return new Transaction().Sign(msg,prikey+this.prikeyToPubkey(prikey));
    }
    // //存证
    // ClientToTransferProve(fromPubkeyStr,nonce,payloadbyte,prikeyStr){
    //     return new Transaction().ClientToTransferProve(fromPubkeyStr,nonce,payloadbyte,prikeyStr);
    // }
    // //投票
    // ClientToTransferVote(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr){
    //     return new Transaction().ClientToTransferVote(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr);
    // }
    // //撤回投票
    // ClientToTransferVoteWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr,txid){
    //     return new Transaction().ClientToTransferVoteWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr,txid);
    // }
    // //抵押
    // ClientToTransferMortgage(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr){
    //     return new Transaction().ClientToTransferMortgage(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr);
    // }
    // //撤回抵押
    // ClientToTransferMortgageWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr,txid){
    //    return new Transaction().ClientToTransferMortgageWithdraw(fromPubkeyStr,toPubkeyHashStr,amount,nonce,prikeyStr,txid);
    // }
    // //资产定义
    // CreateSignToDeployforRuleAsset(fromPubkeyStr,nonce,prikeyStr,code,offering,owner,allowincrease,info){
    //     return new Transaction().CreateSignToDeployforRuleAsset(fromPubkeyStr,nonce,prikeyStr,code,offering,owner,allowincrease,info);
    // };
    // //更换所有者公钥哈希
    // CreateSignToDeployforAssetChangeowner(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,newOwnerPubkeyhash){
    //     return new Transaction().CreateSignToDeployforAssetChangeowner(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,newOwnerPubkeyhash);
    // }
    // //资产转发
    // CreateSignToDeployforRuleTransfer(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_from,payload_to,payload_amount){
    //     return new Transaction().CreateSignToDeployforRuleTransfer(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_from,payload_to,payload_amount);
    // }
    // //增发
    // CreateSignToDeployforRuleAssetIncreased(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_amount){
    //     return new Transaction().CreateSignToDeployforRuleAssetIncreased(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_amount);
    // }
    // //部署哈希时间锁定
    // CreateHashTimeBlockForDeploy(fromPubkeyStr,nonce,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr){
    //     return new Transaction().CreateHashTimeBlockForDeploy(fromPubkeyStr,nonce,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr);
    // }
    // //哈希时间锁定转发资产
    // CreateHashTimeBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_value,payload_hashresult,payload_timestamp){
    //     return new Transaction().CreateHashTimeBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_value,payload_hashresult,payload_timestamp);
    // }
    // //哈希时间锁定获得锁定资产
    // CreateHashTimeBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_transferhash,origintext){
    //     return new Transaction().CreateHashTimeBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_transferhash,origintext);
    // }
    // //部署哈希高度锁定
    // CreateHashHeightBlockForDeploy(fromPubkeyStr,nonce,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr){
    //     return new Transaction().CreateHashHeightBlockForDeploy(fromPubkeyStr,nonce,prikeyStr,payload_assetHexStr,payload_pubkeyHashHexStr);
    // }
    // //哈希高度锁定转发资产
    // CreateHashHeightBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_value,payload_hashresult,payload_height){
    //     return new Transaction().CreateHashHeightBlockTransferForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_value,payload_hashresult,payload_height);
    // }
    // //哈希高度锁定获得锁定资产
    // CreateHashHeightBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_transferhash,origintext){
    //     return new Transaction().CreateHashHeightBlockGetForDeploy(fromPubkeyStr,toPubkeyHashStr,nonce,prikeyStr,payload_transferhash,origintext);
    // }
    // //部署多签(签发者构建)
    // CreateMultipleForRuleFirst(fromPubkeyStr,nonceNum,prikeyStr,payload_asset160hash,payload_m,payload_n,payload_pubkeyHashasBytesArray){
    //     return new Transaction().CreateMultipleForRuleFirst(fromPubkeyStr,nonceNum,prikeyStr,payload_asset160hash,payload_m,payload_n,payload_pubkeyHashasBytesArray);
    // }
    // //部署多签(其他人签名)
    // CreateMultipleToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray){
    //     return new Transaction().CreateMultipleToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray);
    // }
    // //多签部署组装事务（用于广播）
    // CreateMultipleForRuleSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr){
    //     return new Transaction().CreateMultipleForRuleSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr);
    // }
    // //多签转账（签发者构建）
    // CreateMultisignatureForTransferFirst(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_origin,payload_dest,payload_fromBytesArray,payload_to,payload_value,payload_pubkeyHashasBytesArray){
    //     return new Transaction().CreateMultisignatureForTransferFirst(fromPubkeyStr,toPubkeyHashStr,nonceNum,prikeyStr,payload_origin,payload_dest,payload_fromBytesArray,payload_to,payload_value,payload_pubkeyHashasBytesArray);
    // }
    // //多签转账(其他人签名)
    // CreateMultisignatureToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray){
    //     return new Transaction().CreateMultisignatureToDeployforRuleOther(signTransaction,rawTransaction,transaction_pubkey,fromPubkeyStr,prikeyStr,signTransactionArray,fromArray);
    // }
    // //多签转账组装事务（用于广播）
    // CreateMultisignatureForTransferSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr){
    //     return new Transaction().CreateMultisignatureForTransferSplice(rawTransaction,fromArray,signTransactionArray,prikeyStr);
    // }
    //定额条件比例支付部署
    
    //定额条件比例支付转入

    //定额条件比例支付转出
    Check() {
    }
}

module.exports = KeyStore;
