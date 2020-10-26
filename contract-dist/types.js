"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZERO = exports.ONE = exports.MIN_SAFE_INTEGER = exports.MAX_SAFE_INTEGER = exports.MIN_I64 = exports.MAX_I64 = exports.MAX_U256 = exports.MAX_U64 = exports.ABI_DATA_ENUM = exports.TX_STATUS = exports.constants = exports.WS_CODES = exports.ABI_DATA_TYPE_TABLE = void 0;
var BN = require("../bn");
exports.ABI_DATA_TYPE_TABLE = ['bool', 'i64', 'u64', 'f64', 'string', 'bytes', 'address', 'u256'];
var WS_CODES;
(function (WS_CODES) {
    WS_CODES[WS_CODES["NULL"] = 0] = "NULL";
    WS_CODES[WS_CODES["EVENT_EMIT"] = 1] = "EVENT_EMIT";
    WS_CODES[WS_CODES["EVENT_SUBSCRIBE"] = 2] = "EVENT_SUBSCRIBE";
    WS_CODES[WS_CODES["TRANSACTION_EMIT"] = 3] = "TRANSACTION_EMIT";
    WS_CODES[WS_CODES["TRANSACTION_SUBSCRIBE"] = 4] = "TRANSACTION_SUBSCRIBE";
    WS_CODES[WS_CODES["TRANSACTION_SEND"] = 5] = "TRANSACTION_SEND";
    WS_CODES[WS_CODES["ACCOUNT_QUERY"] = 6] = "ACCOUNT_QUERY";
    WS_CODES[WS_CODES["CONTRACT_QUERY"] = 7] = "CONTRACT_QUERY";
})(WS_CODES = exports.WS_CODES || (exports.WS_CODES = {}));
exports.constants = {
    DEFAULT_TX_VERSION: 1,
    WASM_DEPLOY: 16,
    WASM_CALL: 17,
};
var TX_STATUS;
(function (TX_STATUS) {
    TX_STATUS[TX_STATUS["PENDING"] = 0] = "PENDING";
    TX_STATUS[TX_STATUS["INCLUDED"] = 1] = "INCLUDED";
    TX_STATUS[TX_STATUS["CONFIRMED"] = 2] = "CONFIRMED";
    TX_STATUS[TX_STATUS["DROPPED"] = 3] = "DROPPED";
})(TX_STATUS = exports.TX_STATUS || (exports.TX_STATUS = {}));
var ABI_DATA_ENUM;
(function (ABI_DATA_ENUM) {
    ABI_DATA_ENUM[ABI_DATA_ENUM["bool"] = 0] = "bool";
    ABI_DATA_ENUM[ABI_DATA_ENUM["i64"] = 1] = "i64";
    ABI_DATA_ENUM[ABI_DATA_ENUM["u64"] = 2] = "u64";
    ABI_DATA_ENUM[ABI_DATA_ENUM["f64"] = 3] = "f64";
    ABI_DATA_ENUM[ABI_DATA_ENUM["string"] = 4] = "string";
    ABI_DATA_ENUM[ABI_DATA_ENUM["bytes"] = 5] = "bytes";
    ABI_DATA_ENUM[ABI_DATA_ENUM["address"] = 6] = "address";
    ABI_DATA_ENUM[ABI_DATA_ENUM["u256"] = 7] = "u256";
})(ABI_DATA_ENUM = exports.ABI_DATA_ENUM || (exports.ABI_DATA_ENUM = {}));
exports.MAX_U64 = new BN('ffffffffffffffff', 16);
exports.MAX_U256 = new BN('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 16);
exports.MAX_I64 = new BN('9223372036854775807', 10);
exports.MIN_I64 = new BN('-9223372036854775808', 10);
exports.MAX_SAFE_INTEGER = new BN(Number.MAX_SAFE_INTEGER);
exports.MIN_SAFE_INTEGER = new BN(Number.MIN_SAFE_INTEGER);
exports.ONE = new BN(1);
exports.ZERO = new BN(0);
