const Keystore = require('./keystore');
const ks = new Keystore();
let passwd = "1111111";
let net = "1";
//创建keystore
 async function add(){
 	const keystore = await ks.Create("your password");
	console.log(keystore);
 }
add();
