const ksjson = {"kdf":"argon2id","address":"WX164ERUzhnriyJrgBtGB2pZtDAv9tdGRzUN","crypto":{"cipherparams":{"iv":"dd49858f033bb30c110c20bf056823fe"},"ciphertext":"fc3d0a34b6856cfc33f7f37bb90aeebccad2f2bc824599797f4540ee0adef159","cipher":"aes-256-ctr"},"mac":"53eb7ab76697e87808b0b15c499cc94e094bed7bd1d7e57cb476d07f61df59b7","kdfparams":{"memoryCost":20480,"parallelism":2,"salt":"726d613967776370333677316733377168733562716c30667031316169386633","timeCost":4},"version":"2","id":"FFF4522A-C15F-42D4-9D9F-4BE42D743AF7"}
const ks = new (require('../keystore'))

ks.DecryptSecretKeyfull(ksjson, '00000000')
    .then(console.log)