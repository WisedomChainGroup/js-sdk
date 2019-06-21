# mapping-sdk
## npm i keystore_wdc;
## const KeyStore = require('wdc-keystore');
## const ks = new KeyStore();
## async function add(){
## 	const keystore = await ks.Create("your password");
## }
## const pubkeyHash = ks.addressToPubkeyHash("your address")
## async function getpubkey(){
## 	const pubkey = await ks.keystoreToPubkey("your keystore","your password");
## }
## 
## async function getprikey(){
## 	const prikey = await ks.DecryptSecretKeyfull("your keystore","your password");
## }
## 
## const pubkey = ks.prikeyToPubkey("your prikey");
## 


