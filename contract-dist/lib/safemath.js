"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeMath = void 0;
var SafeMath = /** @class */ (function () {
    function SafeMath() {
    }
    SafeMath.add = function (a, b) {
        var c = a + b;
        assert(c >= a && c >= b, "SafeMath: addition overflow");
        return c;
    };
    SafeMath.sub = function (a, b) {
        assert(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    };
    SafeMath.mul = function (a, b) {
        if (a == 0) {
            return 0;
        }
        var c = a * b;
        assert(c / a == b, "SafeMath: multiplication overflow ");
        return c;
    };
    SafeMath.div = function (a, b) {
        assert(b > 0, "SafeMath: modulo by zero");
        return a / b;
    };
    SafeMath.mod = function (a, b) {
        assert(b != 0, "SafeMath: modulo by zero");
        return a % b;
    };
    return SafeMath;
}());
exports.SafeMath = SafeMath;
