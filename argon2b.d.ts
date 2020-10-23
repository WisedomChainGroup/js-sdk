declare const argon2b: (pwd: Uint8Array | string, salt: Uint8Array) => Promise<Uint8Array>

export = argon2b