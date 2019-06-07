const Keystore = require('./keystore');
const keystore = new KeyStore();
let passwd = "1111111";
let net = "1";
//创建keystore
async function add(){
const savefile = await keystore.Create(passwd,net);
}

