export class SafeMath {
    static add(a: u64, b: u64): u64 {
        const c = a + b
        assert(c >= a && c >= b, "SafeMath: addition overflow");
        return c;
    }

    static sub(a: u64, b: u64): u64 {
        assert(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    static mul(a: u64, b: u64): u64 {
        if (a == 0) {
            return 0;
        }

        const c = a * b;
        assert(c / a == b, "SafeMath: multiplication overflow ");
        return c;
    }

    static div(a: u64, b: u64): u64 {
        assert(b > 0, "SafeMath: modulo by zero");
        return a / b;
    }

    static mod(a: u64, b: u64): u64 {
        assert(b != 0, "SafeMath: modulo by zero");
        return a % b;
    }
}
