
import contractTool = require('./contract')

export default class KeyStore{
    /**
     * 生成 keystore
     * @param pwd 密码
     */
    Create (pwd: string) : Promise<Object>;

    /**
     * 读取keystore中的私钥
     * @param addr keystore 路径
     * @param pwd 密码
     */
    DecryptSecretKey(addr: string, pwd: string): Promise<any>;
}

