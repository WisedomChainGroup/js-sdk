interface KeyStoreJSON{
    address: string
    crypto: {
        cipher: string
        cipherparams: {
            iv: string
        },
        ciphertext: string
    }
    kdf: string
    kdfparams: {
        timeCost: number
        memoryCost: number
        parallelism: number
        salt: string
    }    
    version: string
    mac: string
    id: string
}

export default class KeyStore{
    setArgon2(fn: (pwd: Uint8Array, salt: Uint8Array) => Promise<Uint8Array>): void;
    /**
     * 生成 keystore
     * @param pwd 密码
     */
    Create (pwd: string) : Promise<KeyStoreJSON>;

    /**
     * 读取keystore中的私钥
     * @param addr keystore 路径
     * @param pwd 密码
     */
    DecryptSecretKey(addr: string, pwd: string): Promise<any>;

    /**
     *
     * @param keyStore
     * @param pwd
     */
    DecryptSecretKeyfull(keyStore: KeyStoreJSON, pwd: string): Promise<string>;
}

