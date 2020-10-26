/**
 * base58 编码工具
 * @param {string} ALPHABET
 */
import Dict = NodeJS.Dict;
import { hex2bin } from "./utils";

export class Base {
    ALPHABET_MAP: Dict<number>
    BASE: number
    LEADER: string
    ALPHABET: string
    constructor(ALPHABET: string) {
        this.ALPHABET_MAP = {}
        this.BASE = ALPHABET.length
        this.LEADER = ALPHABET.charAt(0)

        // pre-compute lookup table
        for (let z = 0; z < ALPHABET.length; z++) {
            const x = ALPHABET.charAt(z)

            if (this.ALPHABET_MAP[x] !== undefined) throw new TypeError(x + ' is ambiguous')
            this.ALPHABET_MAP[x] = z
        }
        this.ALPHABET = ALPHABET
    }


    encode(src: Uint8Array | ArrayBuffer): string {
        let source = hex2bin(src)
        if (source.length === 0) return ''

        const digits = [0]
        for (let i = 0; i < source.length; ++i) {
            let carry = source[i]
            for (let j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8
                digits[j] = carry % this.BASE
                carry = (carry / this.BASE) | 0
            }

            while (carry > 0) {
                digits.push(carry % this.BASE)
                carry = (carry / this.BASE) | 0
            }
        }

        let string = ''

        // deal with leading zeros
        for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) string += this.LEADER
        // convert digits to a string
        for (let q = digits.length - 1; q >= 0; --q) string += this.ALPHABET[digits[q]]

        return string
    }


    private decodeUnsafe(str: string): Uint8Array {
        if (typeof str !== 'string') throw new TypeError('Expected String')
        if (str.length === 0) return new Uint8Array(0)
        const bytes = [0]
        for (let i = 0; i < str.length; i++) {
            const value = this.ALPHABET_MAP[str[i]]
            if (value === undefined)
                throw new Error(`invalid char ${str[i]}`)

            let carry = value
            for (let j = 0; j < bytes.length; ++j) {
                carry += bytes[j] * this.BASE
                bytes[j] = carry & 0xff
                carry >>= 8
            }

            while (carry > 0) {
                bytes.push(carry & 0xff)
                carry >>= 8
            }
        }

        // deal with leading zeros
        for (let k = 0; str[k] === this.LEADER && k < str.length - 1; ++k) {
            bytes.push(0)
        }

        return new Uint8Array(bytes.reverse())
    }

    decode(str: string): Uint8Array {
        const buffer = this.decodeUnsafe(str)
        if (buffer) return buffer
        throw new Error('Non-base' + this.BASE + ' character')
    }
}

export const Base58 = new Base('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')