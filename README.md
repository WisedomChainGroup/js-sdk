# mapping-sdk
## npm i keystore_wdc;
## const KeyStore = require('wdc-keystore');
## const ks = new KeyStore();
## //add
## async function add(){
## 	const keystore = await ks.Create("your password");
## }
## //address to PubkeyHash
## const pubkeyHash = ks.addressToPubkeyHash("your address")
##
## //prikey to Pubkey
## const pubkey = ks.prikeyToPubkey("your prikey");
## 
## //keysote to pubkey
## async function getpubkey(){
## 	const pubkey = await ks.keystoreToPubkey("your keystore","your password");
## }
## 
## //keystore to prikey
## async function getprikey(){
## 	const prikey = await ks.DecryptSecretKeyfull("your keystore","your password");
## }
## 



