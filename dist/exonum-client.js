(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){
var bigInt = (function (undefined) {
    "use strict";

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        LOG_MAX_INT = Math.log(MAX_INT);

    function Integer(v, radix) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 ? parseValue(v) : parseBase(v, radix);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var value, n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value, isSmall;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a,b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };

    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var value, n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
            if (isPrecise(a.value * this.value)) {
                return new SmallInteger(a.value * this.value);
            }
            return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
            if (a.value === 0) return Integer[0];
            if (a.value === 1) return this;
            if (a.value === -1) return this.negate();
            return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    function square(a) {
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            for (var j = 0; j < l; j++) {
                a_j = a[j];
                product = a_i * a_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
              quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    SmallInteger.prototype.divmod = BigInteger.prototype.divmod;

    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        var value = n.value;
        if (value === 0) return false;
        if (value === 1) return true;
        if (value === 2) return this.isEven();
        return this.mod(n).equals(Integer[0]);
    };
    SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(25)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    BigInteger.prototype.isPrime = function () {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs(),
            nPrev = n.prev();
        var a = [2, 3, 5, 7, 11, 13, 17, 19],
            b = nPrev,
            d, t, i, x;
        while (b.isEven()) b = b.divide(2);
        for (i = 0; i < a.length; i++) {
            x = bigInt(a[i]).modPow(b, n);
            if (x.equals(Integer[1]) || x.equals(nPrev)) continue;
            for (t = true, d = b; t && d.lesser(nPrev) ; d = d.multiply(2)) {
                x = x.square().mod(n);
                if (x.equals(nPrev)) t = false;
            }
            if (t) return false;
        }
        return true;
    };
    SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined) return isPrime;
        var n = this.abs();
        var t = iterations === undefined ? 5 : iterations;
        // use the Fermat primality test
        for (var i = 0; i < t; i++) {
            var a = bigInt.randBetween(2, n.minus(2));
            if (!a.modPow(n.prev(), n).isUnit()) return false; // definitely composite
        }
        return true; // large chance of being prime
    };
    SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.equals(bigInt.zero)) {
        	q = r.divide(newR);
          lastT = t;
          lastR = r;
          t = newT;
          r = newR;
          newT = lastT.subtract(q.multiply(newT));
          newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.equals(1)) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
        	t = t.add(n);
        }
        return t;
    }
    SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };

    var powersOfTwo = [1];
    while (powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return ((typeof n === "number" || typeof n === "string") && +Math.abs(n) <= BASE) ||
            (n instanceof BigInteger && n.value.length <= 1);
    }

    BigInteger.prototype.shiftLeft = function (n) {
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        n = +n;
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (n) {
        var remQuo;
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        n = +n;
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero()) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xBits = [], yBits = [];
        var xStop = false, yStop = false;
        while (!xStop || !yStop) {
            if (xRem.isZero()) { // virtual sign extension for simulating two's complement
                xStop = true;
                xBits.push(xSign ? 1 : 0);
            }
            else if (xSign) xBits.push(xRem.isEven() ? 1 : 0); // two's complement for negative numbers
            else xBits.push(xRem.isEven() ? 0 : 1);

            if (yRem.isZero()) {
                yStop = true;
                yBits.push(ySign ? 1 : 0);
            }
            else if (ySign) yBits.push(yRem.isEven() ? 1 : 0);
            else yBits.push(yRem.isEven() ? 0 : 1);

            xRem = xRem.over(2);
            yRem = yRem.over(2);
        }
        var result = [];
        for (var i = 0; i < xBits.length; i++) result.push(fn(xBits[i], yBits[i]));
        var sum = bigInt(result.pop()).negate().times(bigInt(2).pow(result.length));
        while (result.length) {
            sum = sum.add(bigInt(result.pop()).times(bigInt(2).pow(result.length)));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value, x = typeof v === "number" ? v | LOBMASK_I : v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a,b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = Math.min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low);
        if (range.isSmall) return low.add(Math.round(Math.random() * range));
        var length = range.value.length - 1;
        var result = [], restricted = true;
        for (var i = length; i >= 0; i--) {
            var top = restricted ? range.value[i] : BASE;
            var digit = truncate(Math.random() * top);
            result.unshift(digit);
            if (digit < top) restricted = false;
        }
        result = arrayToSmall(result);
        return low.add(typeof result === "number" ? new SmallInteger(result) : new BigInteger(result, false));
    }
    var parseBase = function (text, base) {
        var val = Integer[0], pow = Integer[1],
            length = text.length;
        if (2 <= base && base <= 36) {
            if (length <= LOG_MAX_INT / Math.log(base)) {
                return new SmallInteger(parseInt(text, base));
            }
        }
        base = parseValue(base);
        var digits = [];
        var i;
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i].toLowerCase(),
                charCode = c.charCodeAt(0);
            if (48 <= charCode && charCode <= 57) digits.push(parseValue(c));
            else if (97 <= charCode && charCode <= 122) digits.push(parseValue(c.charCodeAt(0) - 87));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">");
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        digits.reverse();
        for (i = 0; i < digits.length; i++) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    };

    function stringify(digit) {
        var v = digit.value;
        if (typeof v === "number") v = [v];
        if (v.length === 1 && v[0] <= 35) {
            return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(v[0]);
        }
        return "<" + v + ">";
    }
    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return "0";
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return "0";
            if (n.isNegative()) return new Array(1 - n).join("10");
            return "1" + new Array(+n).join("01");
        }
        var minusSign = "";
        if (n.isNegative() && base.isPositive()) {
            minusSign = "-";
            n = n.abs();
        }
        if (base.equals(1)) {
            if (n.isZero()) return "0";
            return minusSign + new Array(+n + 1).join(1);
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(stringify(digit));
        }
        out.push(stringify(left));
        return minusSign + out.reverse().join("");
    }

    BigInteger.prototype.toString = function (radix) {
        if (radix === undefined) radix = 10;
        if (radix !== 10) return toBase(this, radix);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };
    SmallInteger.prototype.toString = function (radix) {
        if (radix === undefined) radix = 10;
        if (radix != 10) return toBase(this, radix);
        return String(this.value);
    };

    BigInteger.prototype.valueOf = function () {
        return +this.toString();
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;

    function parseStringValue(v) {
            if (isPrecise(+v)) {
                var x = +v;
                if (x === truncate(x))
                    return new SmallInteger(x);
                throw "Invalid integer: " + v;
            }
            var sign = v[0] === "-";
            if (sign) v = v.slice(1);
            var split = v.split(/e/i);
            if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
            if (split.length === 2) {
                var exp = split[1];
                if (exp[0] === "+") exp = exp.slice(1);
                exp = +exp;
                if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
                var text = split[0];
                var decimalPlace = text.indexOf(".");
                if (decimalPlace >= 0) {
                    exp -= text.length - decimalPlace - 1;
                    text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
                }
                if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
                text += (new Array(exp + 1)).join("0");
                v = text;
            }
            var isValid = /^([0-9][0-9]*)$/.test(v);
            if (!isValid) throw new Error("Invalid integer: " + v);
            var r = [], max = v.length, l = LOG_BASE, min = max - l;
            while (max > 0) {
                r.push(+v.slice(min, max));
                min -= l;
                if (min < 0) min = 0;
                max -= l;
            }
            trim(r);
            return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = new SmallInteger(i);
        if (i > 0) Integer[-i] = new SmallInteger(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger; };
    Integer.randBetween = randBetween;
    return Integer;
})();

// Node.js check
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}

},{}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3}],5:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"base64-js":1,"ieee754":6,"isarray":8}],6:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],9:[function(require,module,exports){
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

'use strict';
/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],10:[function(require,module,exports){
(function (Buffer){
// prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = new Buffer(blockSize)
  this._finalSize = finalSize
  this._blockSize = blockSize
  this._len = 0
  this._s = 0
}

Hash.prototype.update = function (data, enc) {
  if (typeof data === 'string') {
    enc = enc || 'utf8'
    data = new Buffer(data, enc)
  }

  var l = this._len += data.length
  var s = this._s || 0
  var f = 0
  var buffer = this._block

  while (s < l) {
    var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
    var ch = (t - f)

    for (var i = 0; i < ch; i++) {
      buffer[(s % this._blockSize) + i] = data[i + f]
    }

    s += ch
    f += ch

    if ((s % this._blockSize) === 0) {
      this._update(buffer)
    }
  }
  this._s = s

  return this
}

Hash.prototype.digest = function (enc) {
  // Suppose the length of the message M, in bits, is l
  var l = this._len * 8

  // Append the bit 1 to the end of the message
  this._block[this._len % this._blockSize] = 0x80

  // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
  this._block.fill(0, this._len % this._blockSize + 1)

  if (l % (this._blockSize * 8) >= this._finalSize * 8) {
    this._update(this._block)
    this._block.fill(0)
  }

  // to this append the block which is equal to the number l written in binary
  // TODO: handle case where l is > Math.pow(2, 29)
  this._block.writeInt32BE(l, this._blockSize - 4)

  var hash = this._update(this._block) || this._hash()

  return enc ? hash.toString(enc) : hash
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

module.exports = Hash

}).call(this,require("buffer").Buffer)

},{"buffer":5}],11:[function(require,module,exports){
var exports = module.exports = function SHA (algorithm) {
  algorithm = algorithm.toLowerCase()

  var Algorithm = exports[algorithm]
  if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)')

  return new Algorithm()
}

exports.sha = require('./sha')
exports.sha1 = require('./sha1')
exports.sha224 = require('./sha224')
exports.sha256 = require('./sha256')
exports.sha384 = require('./sha384')
exports.sha512 = require('./sha512')

},{"./sha":12,"./sha1":13,"./sha224":14,"./sha256":15,"./sha384":16,"./sha512":17}],12:[function(require,module,exports){
(function (Buffer){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
 * in FIPS PUB 180-1
 * This source code is derived from sha1.js of the same repository.
 * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
 * operation was added.
 */

var inherits = require('inherits')
var Hash = require('./hash')

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha, Hash)

Sha.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha.prototype._hash = function () {
  var H = new Buffer(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha

}).call(this,require("buffer").Buffer)

},{"./hash":10,"buffer":5,"inherits":7}],13:[function(require,module,exports){
(function (Buffer){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var inherits = require('inherits')
var Hash = require('./hash')

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha1 () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha1, Hash)

Sha1.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl1 (num) {
  return (num << 1) | (num >>> 31)
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha1.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16])

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha1.prototype._hash = function () {
  var H = new Buffer(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha1

}).call(this,require("buffer").Buffer)

},{"./hash":10,"buffer":5,"inherits":7}],14:[function(require,module,exports){
(function (Buffer){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Sha256 = require('./sha256')
var Hash = require('./hash')

var W = new Array(64)

function Sha224 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha224, Sha256)

Sha224.prototype.init = function () {
  this._a = 0xc1059ed8
  this._b = 0x367cd507
  this._c = 0x3070dd17
  this._d = 0xf70e5939
  this._e = 0xffc00b31
  this._f = 0x68581511
  this._g = 0x64f98fa7
  this._h = 0xbefa4fa4

  return this
}

Sha224.prototype._hash = function () {
  var H = new Buffer(28)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)

  return H
}

module.exports = Sha224

}).call(this,require("buffer").Buffer)

},{"./hash":10,"./sha256":15,"buffer":5,"inherits":7}],15:[function(require,module,exports){
(function (Buffer){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Hash = require('./hash')

var K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]

var W = new Array(64)

function Sha256 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha256, Hash)

Sha256.prototype.init = function () {
  this._a = 0x6a09e667
  this._b = 0xbb67ae85
  this._c = 0x3c6ef372
  this._d = 0xa54ff53a
  this._e = 0x510e527f
  this._f = 0x9b05688c
  this._g = 0x1f83d9ab
  this._h = 0x5be0cd19

  return this
}

function ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
}

function sigma1 (x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
}

function gamma0 (x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
}

function gamma1 (x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
}

Sha256.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0
  var f = this._f | 0
  var g = this._g | 0
  var h = this._h | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0

  for (var j = 0; j < 64; ++j) {
    var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0
    var T2 = (sigma0(a) + maj(a, b, c)) | 0

    h = g
    g = f
    f = e
    e = (d + T1) | 0
    d = c
    c = b
    b = a
    a = (T1 + T2) | 0
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
  this._f = (f + this._f) | 0
  this._g = (g + this._g) | 0
  this._h = (h + this._h) | 0
}

Sha256.prototype._hash = function () {
  var H = new Buffer(32)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)
  H.writeInt32BE(this._h, 28)

  return H
}

module.exports = Sha256

}).call(this,require("buffer").Buffer)

},{"./hash":10,"buffer":5,"inherits":7}],16:[function(require,module,exports){
(function (Buffer){
var inherits = require('inherits')
var SHA512 = require('./sha512')
var Hash = require('./hash')

var W = new Array(160)

function Sha384 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha384, SHA512)

Sha384.prototype.init = function () {
  this._ah = 0xcbbb9d5d
  this._bh = 0x629a292a
  this._ch = 0x9159015a
  this._dh = 0x152fecd8
  this._eh = 0x67332667
  this._fh = 0x8eb44a87
  this._gh = 0xdb0c2e0d
  this._hh = 0x47b5481d

  this._al = 0xc1059ed8
  this._bl = 0x367cd507
  this._cl = 0x3070dd17
  this._dl = 0xf70e5939
  this._el = 0xffc00b31
  this._fl = 0x68581511
  this._gl = 0x64f98fa7
  this._hl = 0xbefa4fa4

  return this
}

Sha384.prototype._hash = function () {
  var H = new Buffer(48)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)

  return H
}

module.exports = Sha384

}).call(this,require("buffer").Buffer)

},{"./hash":10,"./sha512":17,"buffer":5,"inherits":7}],17:[function(require,module,exports){
(function (Buffer){
var inherits = require('inherits')
var Hash = require('./hash')

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
]

var W = new Array(160)

function Sha512 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha512, Hash)

Sha512.prototype.init = function () {
  this._ah = 0x6a09e667
  this._bh = 0xbb67ae85
  this._ch = 0x3c6ef372
  this._dh = 0xa54ff53a
  this._eh = 0x510e527f
  this._fh = 0x9b05688c
  this._gh = 0x1f83d9ab
  this._hh = 0x5be0cd19

  this._al = 0xf3bcc908
  this._bl = 0x84caa73b
  this._cl = 0xfe94f82b
  this._dl = 0x5f1d36f1
  this._el = 0xade682d1
  this._fl = 0x2b3e6c1f
  this._gl = 0xfb41bd6b
  this._hl = 0x137e2179

  return this
}

function Ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x, xl) {
  return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25)
}

function sigma1 (x, xl) {
  return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23)
}

function Gamma0 (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7)
}

function Gamma0l (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25)
}

function Gamma1 (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6)
}

function Gamma1l (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26)
}

function getCarry (a, b) {
  return (a >>> 0) < (b >>> 0) ? 1 : 0
}

Sha512.prototype._update = function (M) {
  var W = this._w

  var ah = this._ah | 0
  var bh = this._bh | 0
  var ch = this._ch | 0
  var dh = this._dh | 0
  var eh = this._eh | 0
  var fh = this._fh | 0
  var gh = this._gh | 0
  var hh = this._hh | 0

  var al = this._al | 0
  var bl = this._bl | 0
  var cl = this._cl | 0
  var dl = this._dl | 0
  var el = this._el | 0
  var fl = this._fl | 0
  var gl = this._gl | 0
  var hl = this._hl | 0

  for (var i = 0; i < 32; i += 2) {
    W[i] = M.readInt32BE(i * 4)
    W[i + 1] = M.readInt32BE(i * 4 + 4)
  }
  for (; i < 160; i += 2) {
    var xh = W[i - 15 * 2]
    var xl = W[i - 15 * 2 + 1]
    var gamma0 = Gamma0(xh, xl)
    var gamma0l = Gamma0l(xl, xh)

    xh = W[i - 2 * 2]
    xl = W[i - 2 * 2 + 1]
    var gamma1 = Gamma1(xh, xl)
    var gamma1l = Gamma1l(xl, xh)

    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
    var Wi7h = W[i - 7 * 2]
    var Wi7l = W[i - 7 * 2 + 1]

    var Wi16h = W[i - 16 * 2]
    var Wi16l = W[i - 16 * 2 + 1]

    var Wil = (gamma0l + Wi7l) | 0
    var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0
    Wil = (Wil + gamma1l) | 0
    Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0
    Wil = (Wil + Wi16l) | 0
    Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0

    W[i] = Wih
    W[i + 1] = Wil
  }

  for (var j = 0; j < 160; j += 2) {
    Wih = W[j]
    Wil = W[j + 1]

    var majh = maj(ah, bh, ch)
    var majl = maj(al, bl, cl)

    var sigma0h = sigma0(ah, al)
    var sigma0l = sigma0(al, ah)
    var sigma1h = sigma1(eh, el)
    var sigma1l = sigma1(el, eh)

    // t1 = h + sigma1 + ch + K[j] + W[j]
    var Kih = K[j]
    var Kil = K[j + 1]

    var chh = Ch(eh, fh, gh)
    var chl = Ch(el, fl, gl)

    var t1l = (hl + sigma1l) | 0
    var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0
    t1l = (t1l + chl) | 0
    t1h = (t1h + chh + getCarry(t1l, chl)) | 0
    t1l = (t1l + Kil) | 0
    t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0
    t1l = (t1l + Wil) | 0
    t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0

    // t2 = sigma0 + maj
    var t2l = (sigma0l + majl) | 0
    var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0

    hh = gh
    hl = gl
    gh = fh
    gl = fl
    fh = eh
    fl = el
    el = (dl + t1l) | 0
    eh = (dh + t1h + getCarry(el, dl)) | 0
    dh = ch
    dl = cl
    ch = bh
    cl = bl
    bh = ah
    bl = al
    al = (t1l + t2l) | 0
    ah = (t1h + t2h + getCarry(al, t1l)) | 0
  }

  this._al = (this._al + al) | 0
  this._bl = (this._bl + bl) | 0
  this._cl = (this._cl + cl) | 0
  this._dl = (this._dl + dl) | 0
  this._el = (this._el + el) | 0
  this._fl = (this._fl + fl) | 0
  this._gl = (this._gl + gl) | 0
  this._hl = (this._hl + hl) | 0

  this._ah = (this._ah + ah + getCarry(this._al, al)) | 0
  this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0
  this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0
  this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0
  this._eh = (this._eh + eh + getCarry(this._el, el)) | 0
  this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0
  this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0
  this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0
}

Sha512.prototype._hash = function () {
  var H = new Buffer(64)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)
  writeInt64BE(this._gh, this._gl, 48)
  writeInt64BE(this._hh, this._hl, 56)

  return H
}

module.exports = Sha512

}).call(this,require("buffer").Buffer)

},{"./hash":10,"buffer":5,"inherits":7}],18:[function(require,module,exports){
(function(nacl) {
'use strict';

// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/

var gf = function(init) {
  var i, r = new Float64Array(16);
  if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
  return r;
};

//  Pluggable, initialized in high-level API below.
var randombytes = function(/* x, n */) { throw new Error('no PRNG'); };

var _0 = new Uint8Array(16);
var _9 = new Uint8Array(32); _9[0] = 9;

var gf0 = gf(),
    gf1 = gf([1]),
    _121665 = gf([0xdb41, 1]),
    D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
    D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
    X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
    Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
    I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

function ts64(x, i, h, l) {
  x[i]   = (h >> 24) & 0xff;
  x[i+1] = (h >> 16) & 0xff;
  x[i+2] = (h >>  8) & 0xff;
  x[i+3] = h & 0xff;
  x[i+4] = (l >> 24)  & 0xff;
  x[i+5] = (l >> 16)  & 0xff;
  x[i+6] = (l >>  8)  & 0xff;
  x[i+7] = l & 0xff;
}

function vn(x, xi, y, yi, n) {
  var i,d = 0;
  for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
  return (1 & ((d - 1) >>> 8)) - 1;
}

function crypto_verify_16(x, xi, y, yi) {
  return vn(x,xi,y,yi,16);
}

function crypto_verify_32(x, xi, y, yi) {
  return vn(x,xi,y,yi,32);
}

function core_salsa20(o, p, k, c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }
   x0 =  x0 +  j0 | 0;
   x1 =  x1 +  j1 | 0;
   x2 =  x2 +  j2 | 0;
   x3 =  x3 +  j3 | 0;
   x4 =  x4 +  j4 | 0;
   x5 =  x5 +  j5 | 0;
   x6 =  x6 +  j6 | 0;
   x7 =  x7 +  j7 | 0;
   x8 =  x8 +  j8 | 0;
   x9 =  x9 +  j9 | 0;
  x10 = x10 + j10 | 0;
  x11 = x11 + j11 | 0;
  x12 = x12 + j12 | 0;
  x13 = x13 + j13 | 0;
  x14 = x14 + j14 | 0;
  x15 = x15 + j15 | 0;

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x1 >>>  0 & 0xff;
  o[ 5] = x1 >>>  8 & 0xff;
  o[ 6] = x1 >>> 16 & 0xff;
  o[ 7] = x1 >>> 24 & 0xff;

  o[ 8] = x2 >>>  0 & 0xff;
  o[ 9] = x2 >>>  8 & 0xff;
  o[10] = x2 >>> 16 & 0xff;
  o[11] = x2 >>> 24 & 0xff;

  o[12] = x3 >>>  0 & 0xff;
  o[13] = x3 >>>  8 & 0xff;
  o[14] = x3 >>> 16 & 0xff;
  o[15] = x3 >>> 24 & 0xff;

  o[16] = x4 >>>  0 & 0xff;
  o[17] = x4 >>>  8 & 0xff;
  o[18] = x4 >>> 16 & 0xff;
  o[19] = x4 >>> 24 & 0xff;

  o[20] = x5 >>>  0 & 0xff;
  o[21] = x5 >>>  8 & 0xff;
  o[22] = x5 >>> 16 & 0xff;
  o[23] = x5 >>> 24 & 0xff;

  o[24] = x6 >>>  0 & 0xff;
  o[25] = x6 >>>  8 & 0xff;
  o[26] = x6 >>> 16 & 0xff;
  o[27] = x6 >>> 24 & 0xff;

  o[28] = x7 >>>  0 & 0xff;
  o[29] = x7 >>>  8 & 0xff;
  o[30] = x7 >>> 16 & 0xff;
  o[31] = x7 >>> 24 & 0xff;

  o[32] = x8 >>>  0 & 0xff;
  o[33] = x8 >>>  8 & 0xff;
  o[34] = x8 >>> 16 & 0xff;
  o[35] = x8 >>> 24 & 0xff;

  o[36] = x9 >>>  0 & 0xff;
  o[37] = x9 >>>  8 & 0xff;
  o[38] = x9 >>> 16 & 0xff;
  o[39] = x9 >>> 24 & 0xff;

  o[40] = x10 >>>  0 & 0xff;
  o[41] = x10 >>>  8 & 0xff;
  o[42] = x10 >>> 16 & 0xff;
  o[43] = x10 >>> 24 & 0xff;

  o[44] = x11 >>>  0 & 0xff;
  o[45] = x11 >>>  8 & 0xff;
  o[46] = x11 >>> 16 & 0xff;
  o[47] = x11 >>> 24 & 0xff;

  o[48] = x12 >>>  0 & 0xff;
  o[49] = x12 >>>  8 & 0xff;
  o[50] = x12 >>> 16 & 0xff;
  o[51] = x12 >>> 24 & 0xff;

  o[52] = x13 >>>  0 & 0xff;
  o[53] = x13 >>>  8 & 0xff;
  o[54] = x13 >>> 16 & 0xff;
  o[55] = x13 >>> 24 & 0xff;

  o[56] = x14 >>>  0 & 0xff;
  o[57] = x14 >>>  8 & 0xff;
  o[58] = x14 >>> 16 & 0xff;
  o[59] = x14 >>> 24 & 0xff;

  o[60] = x15 >>>  0 & 0xff;
  o[61] = x15 >>>  8 & 0xff;
  o[62] = x15 >>> 16 & 0xff;
  o[63] = x15 >>> 24 & 0xff;
}

function core_hsalsa20(o,p,k,c) {
  var j0  = c[ 0] & 0xff | (c[ 1] & 0xff)<<8 | (c[ 2] & 0xff)<<16 | (c[ 3] & 0xff)<<24,
      j1  = k[ 0] & 0xff | (k[ 1] & 0xff)<<8 | (k[ 2] & 0xff)<<16 | (k[ 3] & 0xff)<<24,
      j2  = k[ 4] & 0xff | (k[ 5] & 0xff)<<8 | (k[ 6] & 0xff)<<16 | (k[ 7] & 0xff)<<24,
      j3  = k[ 8] & 0xff | (k[ 9] & 0xff)<<8 | (k[10] & 0xff)<<16 | (k[11] & 0xff)<<24,
      j4  = k[12] & 0xff | (k[13] & 0xff)<<8 | (k[14] & 0xff)<<16 | (k[15] & 0xff)<<24,
      j5  = c[ 4] & 0xff | (c[ 5] & 0xff)<<8 | (c[ 6] & 0xff)<<16 | (c[ 7] & 0xff)<<24,
      j6  = p[ 0] & 0xff | (p[ 1] & 0xff)<<8 | (p[ 2] & 0xff)<<16 | (p[ 3] & 0xff)<<24,
      j7  = p[ 4] & 0xff | (p[ 5] & 0xff)<<8 | (p[ 6] & 0xff)<<16 | (p[ 7] & 0xff)<<24,
      j8  = p[ 8] & 0xff | (p[ 9] & 0xff)<<8 | (p[10] & 0xff)<<16 | (p[11] & 0xff)<<24,
      j9  = p[12] & 0xff | (p[13] & 0xff)<<8 | (p[14] & 0xff)<<16 | (p[15] & 0xff)<<24,
      j10 = c[ 8] & 0xff | (c[ 9] & 0xff)<<8 | (c[10] & 0xff)<<16 | (c[11] & 0xff)<<24,
      j11 = k[16] & 0xff | (k[17] & 0xff)<<8 | (k[18] & 0xff)<<16 | (k[19] & 0xff)<<24,
      j12 = k[20] & 0xff | (k[21] & 0xff)<<8 | (k[22] & 0xff)<<16 | (k[23] & 0xff)<<24,
      j13 = k[24] & 0xff | (k[25] & 0xff)<<8 | (k[26] & 0xff)<<16 | (k[27] & 0xff)<<24,
      j14 = k[28] & 0xff | (k[29] & 0xff)<<8 | (k[30] & 0xff)<<16 | (k[31] & 0xff)<<24,
      j15 = c[12] & 0xff | (c[13] & 0xff)<<8 | (c[14] & 0xff)<<16 | (c[15] & 0xff)<<24;

  var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
      x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
      x15 = j15, u;

  for (var i = 0; i < 20; i += 2) {
    u = x0 + x12 | 0;
    x4 ^= u<<7 | u>>>(32-7);
    u = x4 + x0 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x4 | 0;
    x12 ^= u<<13 | u>>>(32-13);
    u = x12 + x8 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x1 | 0;
    x9 ^= u<<7 | u>>>(32-7);
    u = x9 + x5 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x9 | 0;
    x1 ^= u<<13 | u>>>(32-13);
    u = x1 + x13 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x6 | 0;
    x14 ^= u<<7 | u>>>(32-7);
    u = x14 + x10 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x14 | 0;
    x6 ^= u<<13 | u>>>(32-13);
    u = x6 + x2 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x11 | 0;
    x3 ^= u<<7 | u>>>(32-7);
    u = x3 + x15 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x3 | 0;
    x11 ^= u<<13 | u>>>(32-13);
    u = x11 + x7 | 0;
    x15 ^= u<<18 | u>>>(32-18);

    u = x0 + x3 | 0;
    x1 ^= u<<7 | u>>>(32-7);
    u = x1 + x0 | 0;
    x2 ^= u<<9 | u>>>(32-9);
    u = x2 + x1 | 0;
    x3 ^= u<<13 | u>>>(32-13);
    u = x3 + x2 | 0;
    x0 ^= u<<18 | u>>>(32-18);

    u = x5 + x4 | 0;
    x6 ^= u<<7 | u>>>(32-7);
    u = x6 + x5 | 0;
    x7 ^= u<<9 | u>>>(32-9);
    u = x7 + x6 | 0;
    x4 ^= u<<13 | u>>>(32-13);
    u = x4 + x7 | 0;
    x5 ^= u<<18 | u>>>(32-18);

    u = x10 + x9 | 0;
    x11 ^= u<<7 | u>>>(32-7);
    u = x11 + x10 | 0;
    x8 ^= u<<9 | u>>>(32-9);
    u = x8 + x11 | 0;
    x9 ^= u<<13 | u>>>(32-13);
    u = x9 + x8 | 0;
    x10 ^= u<<18 | u>>>(32-18);

    u = x15 + x14 | 0;
    x12 ^= u<<7 | u>>>(32-7);
    u = x12 + x15 | 0;
    x13 ^= u<<9 | u>>>(32-9);
    u = x13 + x12 | 0;
    x14 ^= u<<13 | u>>>(32-13);
    u = x14 + x13 | 0;
    x15 ^= u<<18 | u>>>(32-18);
  }

  o[ 0] = x0 >>>  0 & 0xff;
  o[ 1] = x0 >>>  8 & 0xff;
  o[ 2] = x0 >>> 16 & 0xff;
  o[ 3] = x0 >>> 24 & 0xff;

  o[ 4] = x5 >>>  0 & 0xff;
  o[ 5] = x5 >>>  8 & 0xff;
  o[ 6] = x5 >>> 16 & 0xff;
  o[ 7] = x5 >>> 24 & 0xff;

  o[ 8] = x10 >>>  0 & 0xff;
  o[ 9] = x10 >>>  8 & 0xff;
  o[10] = x10 >>> 16 & 0xff;
  o[11] = x10 >>> 24 & 0xff;

  o[12] = x15 >>>  0 & 0xff;
  o[13] = x15 >>>  8 & 0xff;
  o[14] = x15 >>> 16 & 0xff;
  o[15] = x15 >>> 24 & 0xff;

  o[16] = x6 >>>  0 & 0xff;
  o[17] = x6 >>>  8 & 0xff;
  o[18] = x6 >>> 16 & 0xff;
  o[19] = x6 >>> 24 & 0xff;

  o[20] = x7 >>>  0 & 0xff;
  o[21] = x7 >>>  8 & 0xff;
  o[22] = x7 >>> 16 & 0xff;
  o[23] = x7 >>> 24 & 0xff;

  o[24] = x8 >>>  0 & 0xff;
  o[25] = x8 >>>  8 & 0xff;
  o[26] = x8 >>> 16 & 0xff;
  o[27] = x8 >>> 24 & 0xff;

  o[28] = x9 >>>  0 & 0xff;
  o[29] = x9 >>>  8 & 0xff;
  o[30] = x9 >>> 16 & 0xff;
  o[31] = x9 >>> 24 & 0xff;
}

function crypto_core_salsa20(out,inp,k,c) {
  core_salsa20(out,inp,k,c);
}

function crypto_core_hsalsa20(out,inp,k,c) {
  core_hsalsa20(out,inp,k,c);
}

var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
            // "expand 32-byte k"

function crypto_stream_salsa20_xor(c,cpos,m,mpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = m[mpos+i] ^ x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
    mpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = m[mpos+i] ^ x[i];
  }
  return 0;
}

function crypto_stream_salsa20(c,cpos,b,n,k) {
  var z = new Uint8Array(16), x = new Uint8Array(64);
  var u, i;
  for (i = 0; i < 16; i++) z[i] = 0;
  for (i = 0; i < 8; i++) z[i] = n[i];
  while (b >= 64) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < 64; i++) c[cpos+i] = x[i];
    u = 1;
    for (i = 8; i < 16; i++) {
      u = u + (z[i] & 0xff) | 0;
      z[i] = u & 0xff;
      u >>>= 8;
    }
    b -= 64;
    cpos += 64;
  }
  if (b > 0) {
    crypto_core_salsa20(x,z,k,sigma);
    for (i = 0; i < b; i++) c[cpos+i] = x[i];
  }
  return 0;
}

function crypto_stream(c,cpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20(c,cpos,d,sn,s);
}

function crypto_stream_xor(c,cpos,m,mpos,d,n,k) {
  var s = new Uint8Array(32);
  crypto_core_hsalsa20(s,n,k,sigma);
  var sn = new Uint8Array(8);
  for (var i = 0; i < 8; i++) sn[i] = n[i+16];
  return crypto_stream_salsa20_xor(c,cpos,m,mpos,d,sn,s);
}

/*
* Port of Andrew Moon's Poly1305-donna-16. Public domain.
* https://github.com/floodyberry/poly1305-donna
*/

var poly1305 = function(key) {
  this.buffer = new Uint8Array(16);
  this.r = new Uint16Array(10);
  this.h = new Uint16Array(10);
  this.pad = new Uint16Array(8);
  this.leftover = 0;
  this.fin = 0;

  var t0, t1, t2, t3, t4, t5, t6, t7;

  t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
  t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
  t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
  t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
  t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
  this.r[5] = ((t4 >>>  1)) & 0x1ffe;
  t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
  t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
  t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
  this.r[9] = ((t7 >>>  5)) & 0x007f;

  this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
  this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
  this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
  this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
  this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
  this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
  this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
  this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
};

poly1305.prototype.blocks = function(m, mpos, bytes) {
  var hibit = this.fin ? 0 : (1 << 11);
  var t0, t1, t2, t3, t4, t5, t6, t7, c;
  var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

  var h0 = this.h[0],
      h1 = this.h[1],
      h2 = this.h[2],
      h3 = this.h[3],
      h4 = this.h[4],
      h5 = this.h[5],
      h6 = this.h[6],
      h7 = this.h[7],
      h8 = this.h[8],
      h9 = this.h[9];

  var r0 = this.r[0],
      r1 = this.r[1],
      r2 = this.r[2],
      r3 = this.r[3],
      r4 = this.r[4],
      r5 = this.r[5],
      r6 = this.r[6],
      r7 = this.r[7],
      r8 = this.r[8],
      r9 = this.r[9];

  while (bytes >= 16) {
    t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
    t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
    t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
    t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
    t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
    h5 += ((t4 >>>  1)) & 0x1fff;
    t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
    t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
    t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
    h9 += ((t7 >>> 5)) | hibit;

    c = 0;

    d0 = c;
    d0 += h0 * r0;
    d0 += h1 * (5 * r9);
    d0 += h2 * (5 * r8);
    d0 += h3 * (5 * r7);
    d0 += h4 * (5 * r6);
    c = (d0 >>> 13); d0 &= 0x1fff;
    d0 += h5 * (5 * r5);
    d0 += h6 * (5 * r4);
    d0 += h7 * (5 * r3);
    d0 += h8 * (5 * r2);
    d0 += h9 * (5 * r1);
    c += (d0 >>> 13); d0 &= 0x1fff;

    d1 = c;
    d1 += h0 * r1;
    d1 += h1 * r0;
    d1 += h2 * (5 * r9);
    d1 += h3 * (5 * r8);
    d1 += h4 * (5 * r7);
    c = (d1 >>> 13); d1 &= 0x1fff;
    d1 += h5 * (5 * r6);
    d1 += h6 * (5 * r5);
    d1 += h7 * (5 * r4);
    d1 += h8 * (5 * r3);
    d1 += h9 * (5 * r2);
    c += (d1 >>> 13); d1 &= 0x1fff;

    d2 = c;
    d2 += h0 * r2;
    d2 += h1 * r1;
    d2 += h2 * r0;
    d2 += h3 * (5 * r9);
    d2 += h4 * (5 * r8);
    c = (d2 >>> 13); d2 &= 0x1fff;
    d2 += h5 * (5 * r7);
    d2 += h6 * (5 * r6);
    d2 += h7 * (5 * r5);
    d2 += h8 * (5 * r4);
    d2 += h9 * (5 * r3);
    c += (d2 >>> 13); d2 &= 0x1fff;

    d3 = c;
    d3 += h0 * r3;
    d3 += h1 * r2;
    d3 += h2 * r1;
    d3 += h3 * r0;
    d3 += h4 * (5 * r9);
    c = (d3 >>> 13); d3 &= 0x1fff;
    d3 += h5 * (5 * r8);
    d3 += h6 * (5 * r7);
    d3 += h7 * (5 * r6);
    d3 += h8 * (5 * r5);
    d3 += h9 * (5 * r4);
    c += (d3 >>> 13); d3 &= 0x1fff;

    d4 = c;
    d4 += h0 * r4;
    d4 += h1 * r3;
    d4 += h2 * r2;
    d4 += h3 * r1;
    d4 += h4 * r0;
    c = (d4 >>> 13); d4 &= 0x1fff;
    d4 += h5 * (5 * r9);
    d4 += h6 * (5 * r8);
    d4 += h7 * (5 * r7);
    d4 += h8 * (5 * r6);
    d4 += h9 * (5 * r5);
    c += (d4 >>> 13); d4 &= 0x1fff;

    d5 = c;
    d5 += h0 * r5;
    d5 += h1 * r4;
    d5 += h2 * r3;
    d5 += h3 * r2;
    d5 += h4 * r1;
    c = (d5 >>> 13); d5 &= 0x1fff;
    d5 += h5 * r0;
    d5 += h6 * (5 * r9);
    d5 += h7 * (5 * r8);
    d5 += h8 * (5 * r7);
    d5 += h9 * (5 * r6);
    c += (d5 >>> 13); d5 &= 0x1fff;

    d6 = c;
    d6 += h0 * r6;
    d6 += h1 * r5;
    d6 += h2 * r4;
    d6 += h3 * r3;
    d6 += h4 * r2;
    c = (d6 >>> 13); d6 &= 0x1fff;
    d6 += h5 * r1;
    d6 += h6 * r0;
    d6 += h7 * (5 * r9);
    d6 += h8 * (5 * r8);
    d6 += h9 * (5 * r7);
    c += (d6 >>> 13); d6 &= 0x1fff;

    d7 = c;
    d7 += h0 * r7;
    d7 += h1 * r6;
    d7 += h2 * r5;
    d7 += h3 * r4;
    d7 += h4 * r3;
    c = (d7 >>> 13); d7 &= 0x1fff;
    d7 += h5 * r2;
    d7 += h6 * r1;
    d7 += h7 * r0;
    d7 += h8 * (5 * r9);
    d7 += h9 * (5 * r8);
    c += (d7 >>> 13); d7 &= 0x1fff;

    d8 = c;
    d8 += h0 * r8;
    d8 += h1 * r7;
    d8 += h2 * r6;
    d8 += h3 * r5;
    d8 += h4 * r4;
    c = (d8 >>> 13); d8 &= 0x1fff;
    d8 += h5 * r3;
    d8 += h6 * r2;
    d8 += h7 * r1;
    d8 += h8 * r0;
    d8 += h9 * (5 * r9);
    c += (d8 >>> 13); d8 &= 0x1fff;

    d9 = c;
    d9 += h0 * r9;
    d9 += h1 * r8;
    d9 += h2 * r7;
    d9 += h3 * r6;
    d9 += h4 * r5;
    c = (d9 >>> 13); d9 &= 0x1fff;
    d9 += h5 * r4;
    d9 += h6 * r3;
    d9 += h7 * r2;
    d9 += h8 * r1;
    d9 += h9 * r0;
    c += (d9 >>> 13); d9 &= 0x1fff;

    c = (((c << 2) + c)) | 0;
    c = (c + d0) | 0;
    d0 = c & 0x1fff;
    c = (c >>> 13);
    d1 += c;

    h0 = d0;
    h1 = d1;
    h2 = d2;
    h3 = d3;
    h4 = d4;
    h5 = d5;
    h6 = d6;
    h7 = d7;
    h8 = d8;
    h9 = d9;

    mpos += 16;
    bytes -= 16;
  }
  this.h[0] = h0;
  this.h[1] = h1;
  this.h[2] = h2;
  this.h[3] = h3;
  this.h[4] = h4;
  this.h[5] = h5;
  this.h[6] = h6;
  this.h[7] = h7;
  this.h[8] = h8;
  this.h[9] = h9;
};

poly1305.prototype.finish = function(mac, macpos) {
  var g = new Uint16Array(10);
  var c, mask, f, i;

  if (this.leftover) {
    i = this.leftover;
    this.buffer[i++] = 1;
    for (; i < 16; i++) this.buffer[i] = 0;
    this.fin = 1;
    this.blocks(this.buffer, 0, 16);
  }

  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  for (i = 2; i < 10; i++) {
    this.h[i] += c;
    c = this.h[i] >>> 13;
    this.h[i] &= 0x1fff;
  }
  this.h[0] += (c * 5);
  c = this.h[0] >>> 13;
  this.h[0] &= 0x1fff;
  this.h[1] += c;
  c = this.h[1] >>> 13;
  this.h[1] &= 0x1fff;
  this.h[2] += c;

  g[0] = this.h[0] + 5;
  c = g[0] >>> 13;
  g[0] &= 0x1fff;
  for (i = 1; i < 10; i++) {
    g[i] = this.h[i] + c;
    c = g[i] >>> 13;
    g[i] &= 0x1fff;
  }
  g[9] -= (1 << 13);

  mask = (c ^ 1) - 1;
  for (i = 0; i < 10; i++) g[i] &= mask;
  mask = ~mask;
  for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

  this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
  this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
  this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
  this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
  this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
  this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
  this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
  this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

  f = this.h[0] + this.pad[0];
  this.h[0] = f & 0xffff;
  for (i = 1; i < 8; i++) {
    f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
    this.h[i] = f & 0xffff;
  }

  mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
  mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
  mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
  mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
  mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
  mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
  mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
  mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
  mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
  mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
  mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
  mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
  mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
  mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
  mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
  mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
};

poly1305.prototype.update = function(m, mpos, bytes) {
  var i, want;

  if (this.leftover) {
    want = (16 - this.leftover);
    if (want > bytes)
      want = bytes;
    for (i = 0; i < want; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    bytes -= want;
    mpos += want;
    this.leftover += want;
    if (this.leftover < 16)
      return;
    this.blocks(this.buffer, 0, 16);
    this.leftover = 0;
  }

  if (bytes >= 16) {
    want = bytes - (bytes % 16);
    this.blocks(m, mpos, want);
    mpos += want;
    bytes -= want;
  }

  if (bytes) {
    for (i = 0; i < bytes; i++)
      this.buffer[this.leftover + i] = m[mpos+i];
    this.leftover += bytes;
  }
};

function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
  var s = new poly1305(k);
  s.update(m, mpos, n);
  s.finish(out, outpos);
  return 0;
}

function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
  var x = new Uint8Array(16);
  crypto_onetimeauth(x,0,m,mpos,n,k);
  return crypto_verify_16(h,hpos,x,0);
}

function crypto_secretbox(c,m,d,n,k) {
  var i;
  if (d < 32) return -1;
  crypto_stream_xor(c,0,m,0,d,n,k);
  crypto_onetimeauth(c, 16, c, 32, d - 32, c);
  for (i = 0; i < 16; i++) c[i] = 0;
  return 0;
}

function crypto_secretbox_open(m,c,d,n,k) {
  var i;
  var x = new Uint8Array(32);
  if (d < 32) return -1;
  crypto_stream(x,0,32,n,k);
  if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
  crypto_stream_xor(m,0,c,0,d,n,k);
  for (i = 0; i < 32; i++) m[i] = 0;
  return 0;
}

function set25519(r, a) {
  var i;
  for (i = 0; i < 16; i++) r[i] = a[i]|0;
}

function car25519(o) {
  var i, v, c = 1;
  for (i = 0; i < 16; i++) {
    v = o[i] + c + 65535;
    c = Math.floor(v / 65536);
    o[i] = v - c * 65536;
  }
  o[0] += c-1 + 37 * (c-1);
}

function sel25519(p, q, b) {
  var t, c = ~(b-1);
  for (var i = 0; i < 16; i++) {
    t = c & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function pack25519(o, n) {
  var i, j, b;
  var m = gf(), t = gf();
  for (i = 0; i < 16; i++) t[i] = n[i];
  car25519(t);
  car25519(t);
  car25519(t);
  for (j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
      m[i-1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
    b = (m[15]>>16) & 1;
    m[14] &= 0xffff;
    sel25519(t, m, 1-b);
  }
  for (i = 0; i < 16; i++) {
    o[2*i] = t[i] & 0xff;
    o[2*i+1] = t[i]>>8;
  }
}

function neq25519(a, b) {
  var c = new Uint8Array(32), d = new Uint8Array(32);
  pack25519(c, a);
  pack25519(d, b);
  return crypto_verify_32(c, 0, d, 0);
}

function par25519(a) {
  var d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function unpack25519(o, n) {
  var i;
  for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
  o[15] &= 0x7fff;
}

function A(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function Z(o, a, b) {
  for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function M(o, a, b) {
  var v, c,
     t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
     t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
    t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
    t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
    b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3],
    b4 = b[4],
    b5 = b[5],
    b6 = b[6],
    b7 = b[7],
    b8 = b[8],
    b9 = b[9],
    b10 = b[10],
    b11 = b[11],
    b12 = b[12],
    b13 = b[13],
    b14 = b[14],
    b15 = b[15];

  v = a[0];
  t0 += v * b0;
  t1 += v * b1;
  t2 += v * b2;
  t3 += v * b3;
  t4 += v * b4;
  t5 += v * b5;
  t6 += v * b6;
  t7 += v * b7;
  t8 += v * b8;
  t9 += v * b9;
  t10 += v * b10;
  t11 += v * b11;
  t12 += v * b12;
  t13 += v * b13;
  t14 += v * b14;
  t15 += v * b15;
  v = a[1];
  t1 += v * b0;
  t2 += v * b1;
  t3 += v * b2;
  t4 += v * b3;
  t5 += v * b4;
  t6 += v * b5;
  t7 += v * b6;
  t8 += v * b7;
  t9 += v * b8;
  t10 += v * b9;
  t11 += v * b10;
  t12 += v * b11;
  t13 += v * b12;
  t14 += v * b13;
  t15 += v * b14;
  t16 += v * b15;
  v = a[2];
  t2 += v * b0;
  t3 += v * b1;
  t4 += v * b2;
  t5 += v * b3;
  t6 += v * b4;
  t7 += v * b5;
  t8 += v * b6;
  t9 += v * b7;
  t10 += v * b8;
  t11 += v * b9;
  t12 += v * b10;
  t13 += v * b11;
  t14 += v * b12;
  t15 += v * b13;
  t16 += v * b14;
  t17 += v * b15;
  v = a[3];
  t3 += v * b0;
  t4 += v * b1;
  t5 += v * b2;
  t6 += v * b3;
  t7 += v * b4;
  t8 += v * b5;
  t9 += v * b6;
  t10 += v * b7;
  t11 += v * b8;
  t12 += v * b9;
  t13 += v * b10;
  t14 += v * b11;
  t15 += v * b12;
  t16 += v * b13;
  t17 += v * b14;
  t18 += v * b15;
  v = a[4];
  t4 += v * b0;
  t5 += v * b1;
  t6 += v * b2;
  t7 += v * b3;
  t8 += v * b4;
  t9 += v * b5;
  t10 += v * b6;
  t11 += v * b7;
  t12 += v * b8;
  t13 += v * b9;
  t14 += v * b10;
  t15 += v * b11;
  t16 += v * b12;
  t17 += v * b13;
  t18 += v * b14;
  t19 += v * b15;
  v = a[5];
  t5 += v * b0;
  t6 += v * b1;
  t7 += v * b2;
  t8 += v * b3;
  t9 += v * b4;
  t10 += v * b5;
  t11 += v * b6;
  t12 += v * b7;
  t13 += v * b8;
  t14 += v * b9;
  t15 += v * b10;
  t16 += v * b11;
  t17 += v * b12;
  t18 += v * b13;
  t19 += v * b14;
  t20 += v * b15;
  v = a[6];
  t6 += v * b0;
  t7 += v * b1;
  t8 += v * b2;
  t9 += v * b3;
  t10 += v * b4;
  t11 += v * b5;
  t12 += v * b6;
  t13 += v * b7;
  t14 += v * b8;
  t15 += v * b9;
  t16 += v * b10;
  t17 += v * b11;
  t18 += v * b12;
  t19 += v * b13;
  t20 += v * b14;
  t21 += v * b15;
  v = a[7];
  t7 += v * b0;
  t8 += v * b1;
  t9 += v * b2;
  t10 += v * b3;
  t11 += v * b4;
  t12 += v * b5;
  t13 += v * b6;
  t14 += v * b7;
  t15 += v * b8;
  t16 += v * b9;
  t17 += v * b10;
  t18 += v * b11;
  t19 += v * b12;
  t20 += v * b13;
  t21 += v * b14;
  t22 += v * b15;
  v = a[8];
  t8 += v * b0;
  t9 += v * b1;
  t10 += v * b2;
  t11 += v * b3;
  t12 += v * b4;
  t13 += v * b5;
  t14 += v * b6;
  t15 += v * b7;
  t16 += v * b8;
  t17 += v * b9;
  t18 += v * b10;
  t19 += v * b11;
  t20 += v * b12;
  t21 += v * b13;
  t22 += v * b14;
  t23 += v * b15;
  v = a[9];
  t9 += v * b0;
  t10 += v * b1;
  t11 += v * b2;
  t12 += v * b3;
  t13 += v * b4;
  t14 += v * b5;
  t15 += v * b6;
  t16 += v * b7;
  t17 += v * b8;
  t18 += v * b9;
  t19 += v * b10;
  t20 += v * b11;
  t21 += v * b12;
  t22 += v * b13;
  t23 += v * b14;
  t24 += v * b15;
  v = a[10];
  t10 += v * b0;
  t11 += v * b1;
  t12 += v * b2;
  t13 += v * b3;
  t14 += v * b4;
  t15 += v * b5;
  t16 += v * b6;
  t17 += v * b7;
  t18 += v * b8;
  t19 += v * b9;
  t20 += v * b10;
  t21 += v * b11;
  t22 += v * b12;
  t23 += v * b13;
  t24 += v * b14;
  t25 += v * b15;
  v = a[11];
  t11 += v * b0;
  t12 += v * b1;
  t13 += v * b2;
  t14 += v * b3;
  t15 += v * b4;
  t16 += v * b5;
  t17 += v * b6;
  t18 += v * b7;
  t19 += v * b8;
  t20 += v * b9;
  t21 += v * b10;
  t22 += v * b11;
  t23 += v * b12;
  t24 += v * b13;
  t25 += v * b14;
  t26 += v * b15;
  v = a[12];
  t12 += v * b0;
  t13 += v * b1;
  t14 += v * b2;
  t15 += v * b3;
  t16 += v * b4;
  t17 += v * b5;
  t18 += v * b6;
  t19 += v * b7;
  t20 += v * b8;
  t21 += v * b9;
  t22 += v * b10;
  t23 += v * b11;
  t24 += v * b12;
  t25 += v * b13;
  t26 += v * b14;
  t27 += v * b15;
  v = a[13];
  t13 += v * b0;
  t14 += v * b1;
  t15 += v * b2;
  t16 += v * b3;
  t17 += v * b4;
  t18 += v * b5;
  t19 += v * b6;
  t20 += v * b7;
  t21 += v * b8;
  t22 += v * b9;
  t23 += v * b10;
  t24 += v * b11;
  t25 += v * b12;
  t26 += v * b13;
  t27 += v * b14;
  t28 += v * b15;
  v = a[14];
  t14 += v * b0;
  t15 += v * b1;
  t16 += v * b2;
  t17 += v * b3;
  t18 += v * b4;
  t19 += v * b5;
  t20 += v * b6;
  t21 += v * b7;
  t22 += v * b8;
  t23 += v * b9;
  t24 += v * b10;
  t25 += v * b11;
  t26 += v * b12;
  t27 += v * b13;
  t28 += v * b14;
  t29 += v * b15;
  v = a[15];
  t15 += v * b0;
  t16 += v * b1;
  t17 += v * b2;
  t18 += v * b3;
  t19 += v * b4;
  t20 += v * b5;
  t21 += v * b6;
  t22 += v * b7;
  t23 += v * b8;
  t24 += v * b9;
  t25 += v * b10;
  t26 += v * b11;
  t27 += v * b12;
  t28 += v * b13;
  t29 += v * b14;
  t30 += v * b15;

  t0  += 38 * t16;
  t1  += 38 * t17;
  t2  += 38 * t18;
  t3  += 38 * t19;
  t4  += 38 * t20;
  t5  += 38 * t21;
  t6  += 38 * t22;
  t7  += 38 * t23;
  t8  += 38 * t24;
  t9  += 38 * t25;
  t10 += 38 * t26;
  t11 += 38 * t27;
  t12 += 38 * t28;
  t13 += 38 * t29;
  t14 += 38 * t30;
  // t15 left as is

  // first car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  // second car
  c = 1;
  v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
  v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
  v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
  v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
  v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
  v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
  v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
  v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
  v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
  v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
  v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
  v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
  v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
  v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
  v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
  v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
  t0 += c-1 + 37 * (c-1);

  o[ 0] = t0;
  o[ 1] = t1;
  o[ 2] = t2;
  o[ 3] = t3;
  o[ 4] = t4;
  o[ 5] = t5;
  o[ 6] = t6;
  o[ 7] = t7;
  o[ 8] = t8;
  o[ 9] = t9;
  o[10] = t10;
  o[11] = t11;
  o[12] = t12;
  o[13] = t13;
  o[14] = t14;
  o[15] = t15;
}

function S(o, a) {
  M(o, a, a);
}

function inv25519(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 253; a >= 0; a--) {
    S(c, c);
    if(a !== 2 && a !== 4) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function pow2523(o, i) {
  var c = gf();
  var a;
  for (a = 0; a < 16; a++) c[a] = i[a];
  for (a = 250; a >= 0; a--) {
      S(c, c);
      if(a !== 1) M(c, c, i);
  }
  for (a = 0; a < 16; a++) o[a] = c[a];
}

function crypto_scalarmult(q, n, p) {
  var z = new Uint8Array(32);
  var x = new Float64Array(80), r, i;
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf();
  for (i = 0; i < 31; i++) z[i] = n[i];
  z[31]=(n[31]&127)|64;
  z[0]&=248;
  unpack25519(x,p);
  for (i = 0; i < 16; i++) {
    b[i]=x[i];
    d[i]=a[i]=c[i]=0;
  }
  a[0]=d[0]=1;
  for (i=254; i>=0; --i) {
    r=(z[i>>>3]>>>(i&7))&1;
    sel25519(a,b,r);
    sel25519(c,d,r);
    A(e,a,c);
    Z(a,a,c);
    A(c,b,d);
    Z(b,b,d);
    S(d,e);
    S(f,a);
    M(a,c,a);
    M(c,b,e);
    A(e,a,c);
    Z(a,a,c);
    S(b,a);
    Z(c,d,f);
    M(a,c,_121665);
    A(a,a,d);
    M(c,c,a);
    M(a,d,f);
    M(d,b,x);
    S(b,e);
    sel25519(a,b,r);
    sel25519(c,d,r);
  }
  for (i = 0; i < 16; i++) {
    x[i+16]=a[i];
    x[i+32]=c[i];
    x[i+48]=b[i];
    x[i+64]=d[i];
  }
  var x32 = x.subarray(32);
  var x16 = x.subarray(16);
  inv25519(x32,x32);
  M(x16,x16,x32);
  pack25519(q,x16);
  return 0;
}

function crypto_scalarmult_base(q, n) {
  return crypto_scalarmult(q, n, _9);
}

function crypto_box_keypair(y, x) {
  randombytes(x, 32);
  return crypto_scalarmult_base(y, x);
}

function crypto_box_beforenm(k, y, x) {
  var s = new Uint8Array(32);
  crypto_scalarmult(s, x, y);
  return crypto_core_hsalsa20(k, _0, s, sigma);
}

var crypto_box_afternm = crypto_secretbox;
var crypto_box_open_afternm = crypto_secretbox_open;

function crypto_box(c, m, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_afternm(c, m, d, n, k);
}

function crypto_box_open(m, c, d, n, y, x) {
  var k = new Uint8Array(32);
  crypto_box_beforenm(k, y, x);
  return crypto_box_open_afternm(m, c, d, n, k);
}

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function crypto_hashblocks_hl(hh, hl, m, n) {
  var wh = new Int32Array(16), wl = new Int32Array(16),
      bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
      bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
      th, tl, i, j, h, l, a, b, c, d;

  var ah0 = hh[0],
      ah1 = hh[1],
      ah2 = hh[2],
      ah3 = hh[3],
      ah4 = hh[4],
      ah5 = hh[5],
      ah6 = hh[6],
      ah7 = hh[7],

      al0 = hl[0],
      al1 = hl[1],
      al2 = hl[2],
      al3 = hl[3],
      al4 = hl[4],
      al5 = hl[5],
      al6 = hl[6],
      al7 = hl[7];

  var pos = 0;
  while (n >= 128) {
    for (i = 0; i < 16; i++) {
      j = 8 * i + pos;
      wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
      wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
    }
    for (i = 0; i < 80; i++) {
      bh0 = ah0;
      bh1 = ah1;
      bh2 = ah2;
      bh3 = ah3;
      bh4 = ah4;
      bh5 = ah5;
      bh6 = ah6;
      bh7 = ah7;

      bl0 = al0;
      bl1 = al1;
      bl2 = al2;
      bl3 = al3;
      bl4 = al4;
      bl5 = al5;
      bl6 = al6;
      bl7 = al7;

      // add
      h = ah7;
      l = al7;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma1
      h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
      l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Ch
      h = (ah4 & ah5) ^ (~ah4 & ah6);
      l = (al4 & al5) ^ (~al4 & al6);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // K
      h = K[i*2];
      l = K[i*2+1];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // w
      h = wh[i%16];
      l = wl[i%16];

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      th = c & 0xffff | d << 16;
      tl = a & 0xffff | b << 16;

      // add
      h = th;
      l = tl;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      // Sigma0
      h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
      l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      // Maj
      h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
      l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh7 = (c & 0xffff) | (d << 16);
      bl7 = (a & 0xffff) | (b << 16);

      // add
      h = bh3;
      l = bl3;

      a = l & 0xffff; b = l >>> 16;
      c = h & 0xffff; d = h >>> 16;

      h = th;
      l = tl;

      a += l & 0xffff; b += l >>> 16;
      c += h & 0xffff; d += h >>> 16;

      b += a >>> 16;
      c += b >>> 16;
      d += c >>> 16;

      bh3 = (c & 0xffff) | (d << 16);
      bl3 = (a & 0xffff) | (b << 16);

      ah1 = bh0;
      ah2 = bh1;
      ah3 = bh2;
      ah4 = bh3;
      ah5 = bh4;
      ah6 = bh5;
      ah7 = bh6;
      ah0 = bh7;

      al1 = bl0;
      al2 = bl1;
      al3 = bl2;
      al4 = bl3;
      al5 = bl4;
      al6 = bl5;
      al7 = bl6;
      al0 = bl7;

      if (i%16 === 15) {
        for (j = 0; j < 16; j++) {
          // add
          h = wh[j];
          l = wl[j];

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = wh[(j+9)%16];
          l = wl[(j+9)%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma0
          th = wh[(j+1)%16];
          tl = wl[(j+1)%16];
          h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
          l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // sigma1
          th = wh[(j+14)%16];
          tl = wl[(j+14)%16];
          h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
          l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          wh[j] = (c & 0xffff) | (d << 16);
          wl[j] = (a & 0xffff) | (b << 16);
        }
      }
    }

    // add
    h = ah0;
    l = al0;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[0];
    l = hl[0];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[0] = ah0 = (c & 0xffff) | (d << 16);
    hl[0] = al0 = (a & 0xffff) | (b << 16);

    h = ah1;
    l = al1;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[1];
    l = hl[1];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[1] = ah1 = (c & 0xffff) | (d << 16);
    hl[1] = al1 = (a & 0xffff) | (b << 16);

    h = ah2;
    l = al2;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[2];
    l = hl[2];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[2] = ah2 = (c & 0xffff) | (d << 16);
    hl[2] = al2 = (a & 0xffff) | (b << 16);

    h = ah3;
    l = al3;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[3];
    l = hl[3];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[3] = ah3 = (c & 0xffff) | (d << 16);
    hl[3] = al3 = (a & 0xffff) | (b << 16);

    h = ah4;
    l = al4;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[4];
    l = hl[4];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[4] = ah4 = (c & 0xffff) | (d << 16);
    hl[4] = al4 = (a & 0xffff) | (b << 16);

    h = ah5;
    l = al5;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[5];
    l = hl[5];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[5] = ah5 = (c & 0xffff) | (d << 16);
    hl[5] = al5 = (a & 0xffff) | (b << 16);

    h = ah6;
    l = al6;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[6];
    l = hl[6];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[6] = ah6 = (c & 0xffff) | (d << 16);
    hl[6] = al6 = (a & 0xffff) | (b << 16);

    h = ah7;
    l = al7;

    a = l & 0xffff; b = l >>> 16;
    c = h & 0xffff; d = h >>> 16;

    h = hh[7];
    l = hl[7];

    a += l & 0xffff; b += l >>> 16;
    c += h & 0xffff; d += h >>> 16;

    b += a >>> 16;
    c += b >>> 16;
    d += c >>> 16;

    hh[7] = ah7 = (c & 0xffff) | (d << 16);
    hl[7] = al7 = (a & 0xffff) | (b << 16);

    pos += 128;
    n -= 128;
  }

  return n;
}

function crypto_hash(out, m, n) {
  var hh = new Int32Array(8),
      hl = new Int32Array(8),
      x = new Uint8Array(256),
      i, b = n;

  hh[0] = 0x6a09e667;
  hh[1] = 0xbb67ae85;
  hh[2] = 0x3c6ef372;
  hh[3] = 0xa54ff53a;
  hh[4] = 0x510e527f;
  hh[5] = 0x9b05688c;
  hh[6] = 0x1f83d9ab;
  hh[7] = 0x5be0cd19;

  hl[0] = 0xf3bcc908;
  hl[1] = 0x84caa73b;
  hl[2] = 0xfe94f82b;
  hl[3] = 0x5f1d36f1;
  hl[4] = 0xade682d1;
  hl[5] = 0x2b3e6c1f;
  hl[6] = 0xfb41bd6b;
  hl[7] = 0x137e2179;

  crypto_hashblocks_hl(hh, hl, m, n);
  n %= 128;

  for (i = 0; i < n; i++) x[i] = m[b-n+i];
  x[n] = 128;

  n = 256-128*(n<112?1:0);
  x[n-9] = 0;
  ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
  crypto_hashblocks_hl(hh, hl, x, n);

  for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

  return 0;
}

function add(p, q) {
  var a = gf(), b = gf(), c = gf(),
      d = gf(), e = gf(), f = gf(),
      g = gf(), h = gf(), t = gf();

  Z(a, p[1], p[0]);
  Z(t, q[1], q[0]);
  M(a, a, t);
  A(b, p[0], p[1]);
  A(t, q[0], q[1]);
  M(b, b, t);
  M(c, p[3], q[3]);
  M(c, c, D2);
  M(d, p[2], q[2]);
  A(d, d, d);
  Z(e, b, a);
  Z(f, d, c);
  A(g, d, c);
  A(h, b, a);

  M(p[0], e, f);
  M(p[1], h, g);
  M(p[2], g, f);
  M(p[3], e, h);
}

function cswap(p, q, b) {
  var i;
  for (i = 0; i < 4; i++) {
    sel25519(p[i], q[i], b);
  }
}

function pack(r, p) {
  var tx = gf(), ty = gf(), zi = gf();
  inv25519(zi, p[2]);
  M(tx, p[0], zi);
  M(ty, p[1], zi);
  pack25519(r, ty);
  r[31] ^= par25519(tx) << 7;
}

function scalarmult(p, q, s) {
  var b, i;
  set25519(p[0], gf0);
  set25519(p[1], gf1);
  set25519(p[2], gf1);
  set25519(p[3], gf0);
  for (i = 255; i >= 0; --i) {
    b = (s[(i/8)|0] >> (i&7)) & 1;
    cswap(p, q, b);
    add(q, p);
    add(p, p);
    cswap(p, q, b);
  }
}

function scalarbase(p, s) {
  var q = [gf(), gf(), gf(), gf()];
  set25519(q[0], X);
  set25519(q[1], Y);
  set25519(q[2], gf1);
  M(q[3], X, Y);
  scalarmult(p, q, s);
}

function crypto_sign_keypair(pk, sk, seeded) {
  var d = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()];
  var i;

  if (!seeded) randombytes(sk, 32);
  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  scalarbase(p, d);
  pack(pk, p);

  for (i = 0; i < 32; i++) sk[i+32] = pk[i];
  return 0;
}

var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

function modL(r, x) {
  var carry, i, j, k;
  for (i = 63; i >= 32; --i) {
    carry = 0;
    for (j = i - 32, k = i - 12; j < k; ++j) {
      x[j] += carry - 16 * x[i] * L[j - (i - 32)];
      carry = (x[j] + 128) >> 8;
      x[j] -= carry * 256;
    }
    x[j] += carry;
    x[i] = 0;
  }
  carry = 0;
  for (j = 0; j < 32; j++) {
    x[j] += carry - (x[31] >> 4) * L[j];
    carry = x[j] >> 8;
    x[j] &= 255;
  }
  for (j = 0; j < 32; j++) x[j] -= carry * L[j];
  for (i = 0; i < 32; i++) {
    x[i+1] += x[i] >> 8;
    r[i] = x[i] & 255;
  }
}

function reduce(r) {
  var x = new Float64Array(64), i;
  for (i = 0; i < 64; i++) x[i] = r[i];
  for (i = 0; i < 64; i++) r[i] = 0;
  modL(r, x);
}

// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
  var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
  var i, j, x = new Float64Array(64);
  var p = [gf(), gf(), gf(), gf()];

  crypto_hash(d, sk, 32);
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;

  var smlen = n + 64;
  for (i = 0; i < n; i++) sm[64 + i] = m[i];
  for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

  crypto_hash(r, sm.subarray(32), n+32);
  reduce(r);
  scalarbase(p, r);
  pack(sm, p);

  for (i = 32; i < 64; i++) sm[i] = sk[i];
  crypto_hash(h, sm, n + 64);
  reduce(h);

  for (i = 0; i < 64; i++) x[i] = 0;
  for (i = 0; i < 32; i++) x[i] = r[i];
  for (i = 0; i < 32; i++) {
    for (j = 0; j < 32; j++) {
      x[i+j] += h[i] * d[j];
    }
  }

  modL(sm.subarray(32), x);
  return smlen;
}

function unpackneg(r, p) {
  var t = gf(), chk = gf(), num = gf(),
      den = gf(), den2 = gf(), den4 = gf(),
      den6 = gf();

  set25519(r[2], gf1);
  unpack25519(r[1], p);
  S(num, r[1]);
  M(den, num, D);
  Z(num, num, r[2]);
  A(den, r[2], den);

  S(den2, den);
  S(den4, den2);
  M(den6, den4, den2);
  M(t, den6, num);
  M(t, t, den);

  pow2523(t, t);
  M(t, t, num);
  M(t, t, den);
  M(t, t, den);
  M(r[0], t, den);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) M(r[0], r[0], I);

  S(chk, r[0]);
  M(chk, chk, den);
  if (neq25519(chk, num)) return -1;

  if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

  M(r[3], r[0], r[1]);
  return 0;
}

function crypto_sign_open(m, sm, n, pk) {
  var i, mlen;
  var t = new Uint8Array(32), h = new Uint8Array(64);
  var p = [gf(), gf(), gf(), gf()],
      q = [gf(), gf(), gf(), gf()];

  mlen = -1;
  if (n < 64) return -1;

  if (unpackneg(q, pk)) return -1;

  for (i = 0; i < n; i++) m[i] = sm[i];
  for (i = 0; i < 32; i++) m[i+32] = pk[i];
  crypto_hash(h, m, n);
  reduce(h);
  scalarmult(p, q, h);

  scalarbase(q, sm.subarray(32));
  add(p, q);
  pack(t, p);

  n -= 64;
  if (crypto_verify_32(sm, 0, t, 0)) {
    for (i = 0; i < n; i++) m[i] = 0;
    return -1;
  }

  for (i = 0; i < n; i++) m[i] = sm[i + 64];
  mlen = n;
  return mlen;
}

var crypto_secretbox_KEYBYTES = 32,
    crypto_secretbox_NONCEBYTES = 24,
    crypto_secretbox_ZEROBYTES = 32,
    crypto_secretbox_BOXZEROBYTES = 16,
    crypto_scalarmult_BYTES = 32,
    crypto_scalarmult_SCALARBYTES = 32,
    crypto_box_PUBLICKEYBYTES = 32,
    crypto_box_SECRETKEYBYTES = 32,
    crypto_box_BEFORENMBYTES = 32,
    crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES,
    crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES,
    crypto_sign_BYTES = 64,
    crypto_sign_PUBLICKEYBYTES = 32,
    crypto_sign_SECRETKEYBYTES = 64,
    crypto_sign_SEEDBYTES = 32,
    crypto_hash_BYTES = 64;

nacl.lowlevel = {
  crypto_core_hsalsa20: crypto_core_hsalsa20,
  crypto_stream_xor: crypto_stream_xor,
  crypto_stream: crypto_stream,
  crypto_stream_salsa20_xor: crypto_stream_salsa20_xor,
  crypto_stream_salsa20: crypto_stream_salsa20,
  crypto_onetimeauth: crypto_onetimeauth,
  crypto_onetimeauth_verify: crypto_onetimeauth_verify,
  crypto_verify_16: crypto_verify_16,
  crypto_verify_32: crypto_verify_32,
  crypto_secretbox: crypto_secretbox,
  crypto_secretbox_open: crypto_secretbox_open,
  crypto_scalarmult: crypto_scalarmult,
  crypto_scalarmult_base: crypto_scalarmult_base,
  crypto_box_beforenm: crypto_box_beforenm,
  crypto_box_afternm: crypto_box_afternm,
  crypto_box: crypto_box,
  crypto_box_open: crypto_box_open,
  crypto_box_keypair: crypto_box_keypair,
  crypto_hash: crypto_hash,
  crypto_sign: crypto_sign,
  crypto_sign_keypair: crypto_sign_keypair,
  crypto_sign_open: crypto_sign_open,

  crypto_secretbox_KEYBYTES: crypto_secretbox_KEYBYTES,
  crypto_secretbox_NONCEBYTES: crypto_secretbox_NONCEBYTES,
  crypto_secretbox_ZEROBYTES: crypto_secretbox_ZEROBYTES,
  crypto_secretbox_BOXZEROBYTES: crypto_secretbox_BOXZEROBYTES,
  crypto_scalarmult_BYTES: crypto_scalarmult_BYTES,
  crypto_scalarmult_SCALARBYTES: crypto_scalarmult_SCALARBYTES,
  crypto_box_PUBLICKEYBYTES: crypto_box_PUBLICKEYBYTES,
  crypto_box_SECRETKEYBYTES: crypto_box_SECRETKEYBYTES,
  crypto_box_BEFORENMBYTES: crypto_box_BEFORENMBYTES,
  crypto_box_NONCEBYTES: crypto_box_NONCEBYTES,
  crypto_box_ZEROBYTES: crypto_box_ZEROBYTES,
  crypto_box_BOXZEROBYTES: crypto_box_BOXZEROBYTES,
  crypto_sign_BYTES: crypto_sign_BYTES,
  crypto_sign_PUBLICKEYBYTES: crypto_sign_PUBLICKEYBYTES,
  crypto_sign_SECRETKEYBYTES: crypto_sign_SECRETKEYBYTES,
  crypto_sign_SEEDBYTES: crypto_sign_SEEDBYTES,
  crypto_hash_BYTES: crypto_hash_BYTES
};

/* High-level API */

function checkLengths(k, n) {
  if (k.length !== crypto_secretbox_KEYBYTES) throw new Error('bad key size');
  if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error('bad nonce size');
}

function checkBoxLengths(pk, sk) {
  if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error('bad public key size');
  if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error('bad secret key size');
}

function checkArrayTypes() {
  var t, i;
  for (i = 0; i < arguments.length; i++) {
     if ((t = Object.prototype.toString.call(arguments[i])) !== '[object Uint8Array]')
       throw new TypeError('unexpected type ' + t + ', use Uint8Array');
  }
}

function cleanup(arr) {
  for (var i = 0; i < arr.length; i++) arr[i] = 0;
}

// TODO: Completely remove this in v0.15.
if (!nacl.util) {
  nacl.util = {};
  nacl.util.decodeUTF8 = nacl.util.encodeUTF8 = nacl.util.encodeBase64 = nacl.util.decodeBase64 = function() {
    throw new Error('nacl.util moved into separate package: https://github.com/dchest/tweetnacl-util-js');
  };
}

nacl.randomBytes = function(n) {
  var b = new Uint8Array(n);
  randombytes(b, n);
  return b;
};

nacl.secretbox = function(msg, nonce, key) {
  checkArrayTypes(msg, nonce, key);
  checkLengths(key, nonce);
  var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
  var c = new Uint8Array(m.length);
  for (var i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
  crypto_secretbox(c, m, m.length, nonce, key);
  return c.subarray(crypto_secretbox_BOXZEROBYTES);
};

nacl.secretbox.open = function(box, nonce, key) {
  checkArrayTypes(box, nonce, key);
  checkLengths(key, nonce);
  var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
  var m = new Uint8Array(c.length);
  for (var i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
  if (c.length < 32) return false;
  if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return false;
  return m.subarray(crypto_secretbox_ZEROBYTES);
};

nacl.secretbox.keyLength = crypto_secretbox_KEYBYTES;
nacl.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
nacl.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;

nacl.scalarMult = function(n, p) {
  checkArrayTypes(n, p);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  if (p.length !== crypto_scalarmult_BYTES) throw new Error('bad p size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult(q, n, p);
  return q;
};

nacl.scalarMult.base = function(n) {
  checkArrayTypes(n);
  if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error('bad n size');
  var q = new Uint8Array(crypto_scalarmult_BYTES);
  crypto_scalarmult_base(q, n);
  return q;
};

nacl.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
nacl.scalarMult.groupElementLength = crypto_scalarmult_BYTES;

nacl.box = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox(msg, nonce, k);
};

nacl.box.before = function(publicKey, secretKey) {
  checkArrayTypes(publicKey, secretKey);
  checkBoxLengths(publicKey, secretKey);
  var k = new Uint8Array(crypto_box_BEFORENMBYTES);
  crypto_box_beforenm(k, publicKey, secretKey);
  return k;
};

nacl.box.after = nacl.secretbox;

nacl.box.open = function(msg, nonce, publicKey, secretKey) {
  var k = nacl.box.before(publicKey, secretKey);
  return nacl.secretbox.open(msg, nonce, k);
};

nacl.box.open.after = nacl.secretbox.open;

nacl.box.keyPair = function() {
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
  crypto_box_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.box.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_box_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
  crypto_scalarmult_base(pk, secretKey);
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
nacl.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
nacl.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
nacl.box.nonceLength = crypto_box_NONCEBYTES;
nacl.box.overheadLength = nacl.secretbox.overheadLength;

nacl.sign = function(msg, secretKey) {
  checkArrayTypes(msg, secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var signedMsg = new Uint8Array(crypto_sign_BYTES+msg.length);
  crypto_sign(signedMsg, msg, msg.length, secretKey);
  return signedMsg;
};

nacl.sign.open = function(signedMsg, publicKey) {
  if (arguments.length !== 2)
    throw new Error('nacl.sign.open accepts 2 arguments; did you mean to use nacl.sign.detached.verify?');
  checkArrayTypes(signedMsg, publicKey);
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var tmp = new Uint8Array(signedMsg.length);
  var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
  if (mlen < 0) return null;
  var m = new Uint8Array(mlen);
  for (var i = 0; i < m.length; i++) m[i] = tmp[i];
  return m;
};

nacl.sign.detached = function(msg, secretKey) {
  var signedMsg = nacl.sign(msg, secretKey);
  var sig = new Uint8Array(crypto_sign_BYTES);
  for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
  return sig;
};

nacl.sign.detached.verify = function(msg, sig, publicKey) {
  checkArrayTypes(msg, sig, publicKey);
  if (sig.length !== crypto_sign_BYTES)
    throw new Error('bad signature size');
  if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
    throw new Error('bad public key size');
  var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
  var m = new Uint8Array(crypto_sign_BYTES + msg.length);
  var i;
  for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
  for (i = 0; i < msg.length; i++) sm[i+crypto_sign_BYTES] = msg[i];
  return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};

nacl.sign.keyPair = function() {
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  crypto_sign_keypair(pk, sk);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.keyPair.fromSecretKey = function(secretKey) {
  checkArrayTypes(secretKey);
  if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
    throw new Error('bad secret key size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32+i];
  return {publicKey: pk, secretKey: new Uint8Array(secretKey)};
};

nacl.sign.keyPair.fromSeed = function(seed) {
  checkArrayTypes(seed);
  if (seed.length !== crypto_sign_SEEDBYTES)
    throw new Error('bad seed size');
  var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
  var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
  for (var i = 0; i < 32; i++) sk[i] = seed[i];
  crypto_sign_keypair(pk, sk, true);
  return {publicKey: pk, secretKey: sk};
};

nacl.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
nacl.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
nacl.sign.seedLength = crypto_sign_SEEDBYTES;
nacl.sign.signatureLength = crypto_sign_BYTES;

nacl.hash = function(msg) {
  checkArrayTypes(msg);
  var h = new Uint8Array(crypto_hash_BYTES);
  crypto_hash(h, msg, msg.length);
  return h;
};

nacl.hash.hashLength = crypto_hash_BYTES;

nacl.verify = function(x, y) {
  checkArrayTypes(x, y);
  // Zero length arguments are considered not equal.
  if (x.length === 0 || y.length === 0) return false;
  if (x.length !== y.length) return false;
  return (vn(x, 0, y, 0, x.length) === 0) ? true : false;
};

nacl.setPRNG = function(fn) {
  randombytes = fn;
};

(function() {
  // Initialize PRNG if environment provides CSPRNG.
  // If not, methods calling randombytes will throw.
  var crypto = typeof self !== 'undefined' ? (self.crypto || self.msCrypto) : null;
  if (crypto && crypto.getRandomValues) {
    // Browsers.
    var QUOTA = 65536;
    nacl.setPRNG(function(x, n) {
      var i, v = new Uint8Array(n);
      for (i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
      }
      for (i = 0; i < n; i++) x[i] = v[i];
      cleanup(v);
    });
  } else if (typeof require !== 'undefined') {
    // Node.js.
    crypto = require('crypto');
    if (crypto && crypto.randomBytes) {
      nacl.setPRNG(function(x, n) {
        var i, v = crypto.randomBytes(n);
        for (i = 0; i < n; i++) x[i] = v[i];
        cleanup(v);
      });
    }
  }
})();

})(typeof module !== 'undefined' && module.exports ? module.exports : (self.nacl = self.nacl || {}));

},{"crypto":3}],19:[function(require,module,exports){
var Exonum = require('./index.js');

window.Exonum = window.Exonum || Exonum;

},{"./index.js":21}],20:[function(require,module,exports){
module.exports={
    "validators": [
        {
            "publicKey": "eb7e3ad55f97e5d5693fe0e69f4c26bd1173077dbffb5fff5b69f213f71bee3f"
        },
        {
            "publicKey": "3d17702a3f260ccf0d171279ceee74dc7309049e11bfd13d839f66f867f2d504"
        },
        {
            "publicKey": "612bc36d1de16541b40ee468157f1aeb3cf709347e32654b730e1f970dc20edd"
        },
        {
            "publicKey": "3016901f539f794dcc4c2466be14678b30c5d503107a2fc8bbed4680a306b177"
        }
    ],
    "publicKey": "280a704efafae9410d7b07140bb130e4995eeb381ba90939b4eaefcaf740ca25",
    "privateKey": "0438082601f8b38ae010a621a48f4b4cd021c4e6e69219e3c2d8abab482039e9",
    "networkId": 0
}

},{}],21:[function(require,module,exports){
"use strict";

var sha = require('sha.js');
var nacl = require('tweetnacl');
var objectAssign = require('object-assign');
var fs = require('fs');
var bigInt = require("big-integer");

var ThinClient = (function() {

    var CONFIG = require('./config.json');
    var CONST = {
        MIN_INT8: -128,
        MAX_INT8: 127,
        MIN_INT16: -32768,
        MAX_INT16: 32767,
        MIN_INT32: -2147483648,
        MAX_INT32: 2147483647,
        MIN_INT64: '-9223372036854775808',
        MAX_INT64: '9223372036854775807',
        MAX_UINT8: 255,
        MAX_UINT16: 65535,
        MAX_UINT32: 4294967295,
        MAX_UINT64: '18446744073709551615',
        MERKLE_PATRICIA_KEY_LENGTH: 32,
        SIGNATURE_LENGTH: 64
    };
    var DBKey = createNewType({
        size: 34,
        fields: {
            variant: {type: Uint8, size: 1, from: 0, to: 1},
            key: {type: Hash, size: 32, from: 1, to: 33},
            length: {type: Uint8, size: 1, from: 33, to: 34}
        }
    });
    var Branch = createNewType({
        size: 132,
        fields: {
            left_hash: {type: Hash, size: 32, from: 0, to: 32},
            right_hash: {type: Hash, size: 32, from: 32, to: 64},
            left_key: {type: DBKey, size: 34, from: 64, to: 98},
            right_key: {type: DBKey, size: 34, from: 98, to: 132}
        }
    });
    var RootBranch = createNewType({
        size: 66,
        fields: {
            key: {type: DBKey, size: 34, from: 0, to: 34},
            hash: {type: Hash, size: 32, from: 34, to: 66}
        }
    });
    var Block = createNewType({
        size: 116,
        littleEndian: true,
        fields: {
            height: {type: Uint64, size: 8, from: 0, to: 8},
            propose_round: {type: Uint32, size: 4, from: 8, to: 12},
            time: {type: Timespec, size: 8, from: 12, to: 20},
            prev_hash: {type: Hash, size: 32, from: 20, to: 52},
            tx_hash: {type: Hash, size: 32, from: 52, to: 84},
            state_hash: {type: Hash, size: 32, from: 84, to: 116}
        }
    });
    var MessageHead = createNewType({
        size: 10,
        littleEndian: true,
        fields: {
            network_id: {type: Uint8, size: 1, from: 0, to: 1},
            version: {type: Uint8, size: 1, from: 1, to: 2},
            message_type: {type: Uint16, size: 2, from: 2, to: 4},
            service_id: {type: Uint16, size: 2, from: 4, to: 6},
            payload: {type: Uint32, size: 4, from: 6, to: 10}
        }
    });
    var Precommit = createNewMessage({
        size: 84,
        service_id: 0,
        message_type: 4,
        fields: {
            validator: {type: Uint32, size: 4, from: 0, to: 4},
            height: {type: Uint64, size: 8, from: 8, to: 16},
            round: {type: Uint32, size: 4, from: 16, to: 20},
            propose_hash: {type: Hash, size: 32, from: 20, to: 52},
            block_hash: {type: Hash, size: 32, from: 52, to: 84}
        }
    });

    /**
     * @constructor
     * @param {Object} type
     */
    function NewType(type) {
        this.size = type.size;
        this.littleEndian = type.littleEndian;
        this.fields = type.fields;
    }

    /**
     * Built-in method to serialize data into array of 8-bit integers
     * @param {Object} data
     * @returns {Array}
     */
    NewType.prototype.serialize = function(data) {
        return serialize([], 0, data, this);
    };

    /**
     * Create element of NewType class
     * @param {Object} type
     * @returns {NewType}
     */
    function createNewType(type) {
        return new NewType(type);
    }

    function NewMessage(type) {
        this.size = type.size;
        this.littleEndian = true;
        this.message_type = type.message_type;
        this.service_id = type.service_id;
        this.fields = type.fields;
    }

    NewMessage.prototype.serialize = function(data, signature) {
        var buffer = MessageHead.serialize({
            network_id: CONFIG.networkId,
            version: 0,
            message_type: this.message_type,
            service_id: this.service_id
        });

        // serialize and append message body
        buffer = serialize(buffer, MessageHead.size, data, this);
        if (typeof buffer === 'undefined') {
            return;
        }

        // calculate payload and insert it into buffer
        Uint32(buffer.length + CONST.SIGNATURE_LENGTH, buffer, MessageHead.fields.payload.from, MessageHead.fields.payload.to, true);

        return buffer;
    };

    function createNewMessage(type) {
        return new NewMessage(type);
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Int8(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, CONST.MIN_INT8, CONST.MAX_INT8, from, to, 1)) {
            return;
        }

        if (value < 0) {
            value = CONST.MAX_UINT8 + value + 1
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Int16(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, CONST.MIN_INT16, CONST.MAX_INT16, from, to, 2)) {
            return;
        }

        if (value < 0) {
            value = CONST.MAX_UINT16 + value + 1;
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Int32(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, CONST.MIN_INT32, CONST.MAX_INT32, from, to, 4)) {
            return;
        }

        if (value < 0) {
            value = CONST.MAX_UINT32 + value + 1;
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Int64(value, buffer, from, to, littleEndian) {
        var val = validateBigInteger(value, CONST.MIN_INT64, CONST.MAX_INT64, from, to, 8);

        if (val === false) {
            return;
        } else if (!bigInt.isInstance(val)) {
            return;
        }

        if (val.isNegative()) {
            val = bigInt(CONST.MAX_UINT64).plus(1).plus(val);
        }

        insertBigIntegerToByteArray(val, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Uint8(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, 0, CONST.MAX_UINT8, from, to, 1)) {
            return;
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Uint16(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, 0, CONST.MAX_UINT16, from, to, 2)) {
            return;
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Uint32(value, buffer, from, to, littleEndian) {
        if (!validateInteger(value, 0, CONST.MAX_UINT32, from, to, 4)) {
            return;
        }

        insertIntegerToByteArray(value, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Uint64(value, buffer, from, to, littleEndian) {
        var val = validateBigInteger(value, 0, CONST.MAX_UINT64, from, to, 8);

        if (val === false) {
            return;
        } else if (!bigInt.isInstance(val)) {
            return;
        }

        insertBigIntegerToByteArray(val, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {String} string
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function String(string, buffer, from, to, littleEndian) {
        if (typeof string !== 'string') {
            console.error('Wrong data type is passed as String. String is required');
            return;
        } else if ((to - from) !== 8) {
            console.error('String segment is of wrong length. 8 bytes long is required to store transmitted value.');
            return;
        }

        Uint32(buffer.length, buffer, from, from + 4, littleEndian); // index where string content starts in buffer
        Uint32(string.length, buffer, from + 4, from + 8, littleEndian); // string length
        insertStringToByteArray(string, buffer, buffer.length, buffer.length + string.length - 1); // string content

        return buffer;
    }

    /**
     * Built-in data type
     * @param {String} hash
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function Hash(hash, buffer, from, to) {
        if (!validateHexHash(hash)) {
            return;
        } else if ((to - from) !== 32) {
            console.error('Hash segment is of wrong length. 32 bytes long is required to store transmitted value.');
            return;
        }

        insertHexadecimalToArray(hash, buffer, from, to);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {String} digest
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function Digest(digest, buffer, from, to) {
        if (!validateHexHash(digest, 64)) {
            return;
        } else if ((to - from) !== 64) {
            console.error('Digest segment is of wrong length. 64 bytes long is required to store transmitted value.');
            return;
        }

        insertHexadecimalToArray(digest, buffer, from, to);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {String} publicKey
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function PublicKey(publicKey, buffer, from, to) {
        if (!validateHexHash(publicKey)) {
            return;
        } else if ((to - from) !== 32) {
            console.error('PublicKey segment is of wrong length. 32 bytes long is required to store transmitted value.');
            return;
        }

        insertHexadecimalToArray(publicKey, buffer, from, to);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {Number || String} nanoseconds
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function Timespec(nanoseconds, buffer, from, to, littleEndian) {
        var val = validateBigInteger(nanoseconds, 0, CONST.MAX_UINT64, from, to, 8);

        if (val === false) {
            return;
        } else if (!bigInt.isInstance(val)) {
            return;
        }

        insertBigIntegerToByteArray(val, buffer, from, to, littleEndian);

        return buffer;
    }

    /**
     * Built-in data type
     * @param {boolean} value
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function Bool(value, buffer, from, to) {
        if (typeof value !== 'boolean') {
            console.error('Wrong data type is passed as Boolean. Boolean is required');
            return;
        } else if ((to - from) !== 1) {
            console.error('Bool segment is of wrong length. 1 bytes long is required to store transmitted value.');
            return;
        }

        insertIntegerToByteArray(value ? 1 : 0, buffer, from, to);

        return buffer;
    }

    /**
     * Check integer number validity
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @param {Number} from
     * @param {Number} to
     * @param {Number} length
     * @returns {Boolean}
     */
    function validateInteger(value, min, max, from, to, length) {
        if (typeof value !== 'number') {
            console.error('Wrong data type is passed as number. Should be of type Number.');
            return false;
        } else if (value < min) {
            console.error('Number should be more or equal to ' + min + '.');
            return false;
        } else if (value > max) {
            console.error('Number should be less or equal to ' + max + '.');
            return false;
        } else if ((to - from) !== length) {
            console.error('Number segment is of wrong length. ' + length + ' bytes long is required to store transmitted value.');
            return false;
        }

        return true;
    }

    /**
     * Check bit integer number validity
     * @param {Number || String} value
     * @param {Number} min
     * @param {Number} max
     * @param {Number} from
     * @param {Number} to
     * @param {Number} length
     * @returns {bigInt || Boolean}
     */
    function validateBigInteger(value, min, max, from, to, length) {
        var val;

        if (!(typeof value === 'number' || typeof value === 'string')) {
            console.error('Wrong data type is passed as number. Should be of type Number or String.');
            return false;
        } else if ((to - from) !== length) {
            console.error('Number segment is of wrong length. ' + length + ' bytes long is required to store transmitted value.');
            return false;
        }

        try {
            val = bigInt(value);

            if (val.lt(min)) {
                console.error('Number should be more or equal to ' + min + '.');
                return false;
            } else if (val.gt(max)) {
                console.error('Number should be less or equal to ' + max + '.');
                return false;
            }

            return val;
        } catch (e) {
            console.error('Wrong data type is passed as number. Should be of type Number or String.');
            return false;
        }
    }

    /**
     * Check hash validity
     * @param {String} hash
     * @param {Number} bytes
     * @returns {Boolean}
     */
    function validateHexHash(hash, bytes) {
        var bytes = bytes || 32;

        if (typeof hash !== 'string') {
            console.error('Wrong data type is passed as hexadecimal string. String is required');
            return false;
        } else if (hash.length !== bytes * 2) {
            console.error('Hexadecimal string is of wrong length. ' + bytes * 2 + ' char symbols long is required. ' + hash.length + ' is passed.');
            return false;
        }

        for (var i = 0, len = hash.length; i < len; i++) {
            if (isNaN(parseInt(hash[i], 16))) {
                console.error('Invalid symbol in hexadecimal string.');
                return false;
            }
        }

        return true;
    }

    /**
     * Check array of 8-bit integers validity
     * @param {Array} arr
     * @param {Number} bytes
     * @returns {Boolean}
     */
    function validateBytesArray(arr, bytes) {
        if (bytes && arr.length !== bytes) {
            console.error('Array of 8-bit integers validity is of wrong length. ' + bytes * 2 + ' char symbols long is required. ' + hash.length + ' is passed.');
            return false;
        }

        for (var i = 0, len = arr.length; i < len; i++) {
            if (typeof arr[i] !== 'number') {
                console.error('Wrong data type is passed as byte. Number is required');
                return false;
            } else if (arr[i] < 0 || arr[i] > 255) {
                console.error('Byte should be in [0..255] range.');
                return false;
            }
        }

        return true;
    }

    /**
     * Check binary string validity
     * @param {String} str
     * @param {Number} bits
     * @returns {Boolean}
     */
    function validateBinaryString(str, bits) {
        if (typeof bits !== 'undefined' && str.length !== bits) {
            console.error('Binary string is of wrong length.');
            return null;
        }

        var bit;
        for (var i = 0; i < str.length; i++) {
            bit = parseInt(str[i]);
            if (isNaN(bit)) {
                console.error('Wrong bit is passed in binary string.');
                return false;
            } else if (bit > 1) {
                console.error('Wrong bit is passed in binary string. Bit should be 0 or 1.');
                return false;
            }
        }

        return true;
    }

    /**
     * Serialize data into array of 8-bit integers and insert into buffer
     * @param {Array} buffer
     * @param {Number} shift - the index to start write into buffer
     * @param {Object} data
     * @param type - can be {NewType} or one of built-in types
     */
    function serialize(buffer, shift, data, type) {
        for (var i = 0, len = type.size; i < len; i++) {
            buffer[shift + i] = 0;
        }

        for (var fieldName in data) {
            if (!data.hasOwnProperty(fieldName)) {
                continue;
            }

            var fieldType = type.fields[fieldName];

            if (typeof fieldType === 'undefined') {
                console.error(fieldName + ' field was not found in configuration of type.');
                return;
            }

            var fieldData = data[fieldName];
            var from = shift + fieldType.from;

            if (fieldType.type instanceof NewType) {
                var isFixed = (function checkIfIsFixed(fields) {
                    for (var fieldName in fields) {
                        if (!fields.hasOwnProperty(fieldName)) {
                            continue;
                        }

                        if (fields[fieldName].type instanceof NewType) {
                            checkIfIsFixed(fields[fieldName].type.fields);
                        } else if (fields[fieldName].type === String) {
                            return false;
                        }
                    }
                    return true;
                })(fieldType.type.fields);

                if (isFixed === true) {
                    serialize(buffer, from, fieldData, fieldType.type);
                } else {
                    var end = buffer.length;
                    Uint32(end, buffer, from, from + 4);
                    serialize(buffer, end, fieldData, fieldType.type);
                    Uint32(buffer.length - end, buffer, from + 4, from + 8);
                }
            } else {
                buffer = fieldType.type(fieldData, buffer, from, shift + fieldType.to, type.littleEndian);
                if (typeof buffer === 'undefined') {
                    return;
                }
            }
        }

        return buffer;
    }

    /**
     * Convert hexadecimal into array of 8-bit integers and insert into buffer
     * @param {String} str
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function insertHexadecimalToArray(str, buffer, from, to) {
        for (var i = 0, len = str.length; i < len; i += 2) {
            buffer[from] = parseInt(str.substr(i, 2), 16);
            from++;

            if (from > to) {
                break;
            }
        }
    }

    /**
     * Convert integer into array of 8-bit integers and insert into buffer
     * @param {Number} number
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function insertIntegerToByteArray(number, buffer, from, to, littleEndian) {
        var str = number.toString(16);

        insertNumberInHexToByteArray(str, buffer, from, to, littleEndian);
    }

    /**
     * Convert big integer into array of 8-bit integers and insert into buffer
     * @param {bigInt} number
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function insertBigIntegerToByteArray(number, buffer, from, to, littleEndian) {
        var str = number.toString(16);

        insertNumberInHexToByteArray(str, buffer, from, to, littleEndian);
    }

    /**
     * Insert number in hex into buffer
     * @param {String} number
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     * @param {Boolean} littleEndian
     */
    function insertNumberInHexToByteArray(number, buffer, from, to, littleEndian) {
        if (littleEndian === true) {
            // store Number as little-endian
            if (number.length < 3) {
                buffer[from] = parseInt(number, 16);
                return true;
            }

            for (var i = number.length; i > 0; i -= 2) {
                if (i > 1) {
                    buffer[from] = parseInt(number.substr(i - 2, 2), 16);
                } else {
                    buffer[from] = parseInt(number.substr(0, 1), 16);
                }

                from++;

                if (from >= to) {
                    break;
                }
            }
        } else {
            // store Number as big-endian
            if (number.length < 3) {
                buffer[to - 1] = parseInt(number, 16);
                return true;
            }

            for (var i = number.length; i > 0; i -= 2) {
                to--;

                if (i > 1) {
                    buffer[to] = parseInt(number.substr(i - 2, 2), 16);
                } else {
                    buffer[to] = parseInt(number.substr(0, 1), 16);
                }

                if (to <= from) {
                    break;
                }
            }
        }
    }

    /**
     * Convert String into array of 8-bit integers and insert into buffer
     * @param {String} str
     * @param {Array} buffer
     * @param {Number} from
     * @param {Number} to
     */
    function insertStringToByteArray(str, buffer, from, to) {
        var strBuffer = str.split('');
        for (var i = 0, len = strBuffer.length; i < len; i++) {
            buffer[from] = str[i].charCodeAt(0);
            from++;

            if (from > to) {
                break;
            }
        }
    }

    /**
     * Convert hexadecimal string into array of 8-bit integers
     * @param {String} str
     *  hexadecimal
     * @returns {Uint8Array}
     */
    function hexadecimalToUint8Array(str) {
        if (typeof str !== 'string') {
            console.error('Wrong data type of hexadecimal string');
            return new Uint8Array([]);
        }

        var array = [];
        for (var i = 0, len = str.length; i < len; i += 2) {
            array.push(parseInt(str.substr(i, 2), 16));
        }

        return new Uint8Array(array);
    }

    /**
     * Convert hexadecimal string into array of 8-bit integers
     * @param {String} str
     *  hexadecimal
     * @returns {String}
     */
    function hexadecimalToBinaryString(str) {
        var binaryStr = '';
        for (var i = 0, len = str.length; i < len; i += 2) {
            binaryStr += parseInt(str.substr(i, 2), 16).toString(2);
        }
        return binaryStr;
    }

    /**
     * Convert array of 8-bit integers into hexadecimal string
     * @param {Uint8Array} uint8arr
     * @returns {String}
     */
    function uint8ArrayToHexadecimal(uint8arr) {
        if (!(uint8arr instanceof Uint8Array)) {
            console.error('Wrong data type of array of 8-bit integers');
            return '';
        }

        var str = '';
        for (var i = 0, len = uint8arr.length; i < len; i++) {
            var hex = (uint8arr[i]).toString(16);
            hex = (hex.length === 1) ? '0' + hex : hex;
            str += hex;
        }

        return str.toLowerCase();
    }

    /**
     * Convert binary string into array of 8-bit integers
     * @param {String} binaryStr
     * @returns {Uint8Array}
     */
    function binaryStringToUint8Array(binaryStr) {
        var array = [];
        for (var i = 0, len = binaryStr.length; i < len; i += 8) {
            array.push(parseInt(binaryStr.substr(i, 8), 2));
        }

        return new Uint8Array(array);
    }

    /**
     * Convert binary string into hexadecimal string
     * @param {String} binaryStr
     * @returns {string}
     */
    function binaryStringToHexadecimal(binaryStr) {
        var str = '';
        for (var i = 0, len = binaryStr.length; i < len; i += 8) {
            var hex = (parseInt(binaryStr.substr(i, 8), 2)).toString(16);
            hex = (hex.length === 1) ? '0' + hex : hex;
            str += hex;
        }

        return str.toLowerCase();
    }

    /**
     * Check if element is of type {Object}
     * @param obj
     * @returns {boolean}
     */
    function isObject(obj) {
        return (typeof obj === 'object' && !Array.isArray(obj) && obj !== null && !(obj instanceof Date));
    }

    /**
     * Get length of object
     * @param {Object} obj
     * @returns {Number}
     */
    function getObjectLength(obj) {
        var l = 0;
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                l++;
            }
        }
        return l;
    }

    /**
     * Get SHA256 hash
     * Method with overloading. Accept two combinations of arguments:
     * 1) {Object} data, {NewType} type
     * 2) {Array} buffer
     * @return {String}
     */
    function hash(data, type) {
        var buffer;
        if (type instanceof NewType) {
            if (isObject(data)) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewType is expected.');
                    return;
                }
            } else {
                console.error('Wrong type of data. Should be object.');
                return;
            }
        } else if (type instanceof NewMessage) {
            if (isObject(data)) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewMessage is expected.');
                    return;
                }
            } else {
                console.error('Wrong type of data. Should be object.');
                return;
            }
        } else if (data instanceof Uint8Array) {
            buffer = data;
        } else if (Array.isArray(data)) {
            buffer = new Uint8Array(data);
        } else {
            console.error('Invalid type parameter.');
            return;
        }

        return sha('sha256').update(buffer, 'utf8').digest('hex');
    }

    /**
     * Get ED25519 signature
     * Method with overloading. Accept two combinations of arguments:
     * 1) {Object} data, {NewType || NewMessage} type, {String} secretKey
     * 2) {Array} buffer, {String} secretKey
     * @return {String}
     */
    function sign(data, type, secretKey) {
        var buffer;
        var secretKey = secretKey;
        var signature;

        if (typeof secretKey !== 'undefined') {
            if (type instanceof NewType) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewType is expected.');
                    return;
                }
            } else if (type instanceof NewMessage) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewMessage is expected.');
                    return;
                }
            } else {
                console.error('Invalid type parameter.');
                return;
            }
        } else {
            if (!validateBytesArray(data)) {
                console.error('Invalid data parameter.');
                return;
            }

            buffer = data;
            secretKey = type;
        }

        if (!validateHexHash(secretKey, 64)) {
            console.error('Invalid secretKey parameter.');
            return;
        }

        buffer = new Uint8Array(buffer);
        secretKey = hexadecimalToUint8Array(secretKey);
        signature = nacl.sign.detached(buffer, secretKey);

        return uint8ArrayToHexadecimal(signature);
    }

    /**
     * Verifies ED25519 signature
     * Method with overloading. Accept two combinations of arguments:
     * 1) {Object} data, {NewType || NewMessage} type, {String} signature, {String} publicKey
     * 2) {Array} buffer, {String} signature, {String} publicKey
     * @return {Boolean}
     */
    function verifySignature(data, type, signature, publicKey) {
        var buffer;
        var signature = signature;
        var publicKey = publicKey;

        if (typeof publicKey !== 'undefined') {
            if (type instanceof NewType) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewType is expected.');
                    return;
                }
            } else if (type instanceof NewMessage) {
                buffer = type.serialize(data);
                if (typeof buffer === 'undefined') {
                    console.error('Invalid data parameter. Instance of NewMessage is expected.');
                    return;
                }
            } else {
                console.error('Invalid type parameter.');
                return;
            }
        } else {
            if (!validateBytesArray(data)) {
                console.error('Invalid data parameter.');
                return;
            }

            buffer = data;
            publicKey = signature;
            signature = type;
        }

        if (!validateHexHash(publicKey)) {
            console.error('Invalid publicKey parameter.');
            return;
        } else if (!validateHexHash(signature, 64)) {
            console.error('Invalid signature parameter.');
            return;
        }

        buffer = new Uint8Array(buffer);
        signature = hexadecimalToUint8Array(signature);
        publicKey = hexadecimalToUint8Array(publicKey);

        return nacl.sign.detached.verify(buffer, signature, publicKey);
    }

    /**
     * Check Merkle tree proof and return array of elements
     * @param {String} rootHash
     * @param {Number} count
     * @param {Object} proofNode
     * @param {Array} range
     * @param {NewType} type (optional)
     * @return {Array}
     */
    function merkleProof(rootHash, count, proofNode, range, type) {
        /**
         * Get value from node, insert into elements array and return its hash
         * @param data
         * @param {Number} depth
         * @param {Number} index
         * @returns {String}
         */
        function getNodeValue(data, depth, index) {
            var element;
            var buffer;
            var elementsHash;

            if ((depth + 1) !== height) {
                console.error('Value node is on wrong height in tree.');
                return null;
            } else if (index < start || index > end) {
                console.error('Wrong index of value node.');
                return null;
            } else if ((start + elements.length) !== index) {
                console.error('Value node is on wrong position in tree.');
                return null;
            }

            if (typeof type === 'undefined') {
                if (Array.isArray(data)) {
                    if (validateBytesArray(data)) {
                        element = data.slice(0); // clone array of 8-bit integers
                        buffer = element;
                    } else {
                        console.error('Invalid array of 8-bit integers in tree.');
                        return null;
                    }
                } else {
                    console.error('Invalid value of type parameter. Array of 8-bit integers expected.');
                    return null;
                }
            } else if (NewType.prototype.isPrototypeOf(type)) {
                if (isObject(data)) {
                    element = objectAssign(data); // deep copy
                    buffer = type.serialize(data);
                    if (typeof buffer === 'undefined') {
                        return null;
                    }
                } else {
                    console.error('Invalid value node in tree. Object expected.');
                    return null;
                }

            } else {
                console.error('Invalid type of type parameter.');
                return null;
            }

            elements.push(element);

            elementsHash = hash(buffer);

            return elementsHash || null;
        }

        /**
         * Recursive tree traversal function
         * @param {Object} node
         * @param {Number} depth
         * @param {Number} index
         * @returns {null}
         */
        function recursive(node, depth, index) {
            var hashLeft;
            var hashRight;
            var summingBuffer;

            if (typeof node.left !== 'undefined') {
                if (typeof node.left === 'string') {
                    if (!validateHexHash(node.left)) {
                        return null;
                    }
                    hashLeft = node.left;
                } else if (isObject(node.left)) {
                    if (typeof node.left.val !== 'undefined') {
                        hashLeft = getNodeValue(node.left.val, depth, index * 2);
                    } else {
                        hashLeft = recursive(node.left, depth + 1, index * 2);
                    }
                    if (hashLeft === null) {
                        return null;
                    }
                } else {
                    console.error('Invalid type of left node.');
                    return null;
                }
            } else {
                console.error('Left node is missed.');
                return null;
            }

            if (depth === 0) {
                rootBranch = 'right';
            }

            if (typeof node.right !== 'undefined') {
                if (typeof node.right === 'string') {
                    if (!validateHexHash(node.right)) {
                        return null;
                    }
                    hashRight = node.right;
                } else if (isObject(node.right)) {
                    if (typeof node.right.val !== 'undefined') {
                        hashRight = getNodeValue(node.right.val, depth, index * 2 + 1);
                    } else {
                        hashRight = recursive(node.right, depth + 1, index * 2 + 1);
                    }
                    if (hashRight === null) {
                        return null;
                    }
                } else {
                    console.error('Invalid type of right node.');
                    return null;
                }

                summingBuffer = new Uint8Array(64);
                summingBuffer.set(hexadecimalToUint8Array(hashLeft));
                summingBuffer.set(hexadecimalToUint8Array(hashRight), 32);
            } else if (depth === 0 || rootBranch === 'left') {
                console.error('Right leaf is missed in left branch of tree.');
                return null;
            } else {
                summingBuffer = hexadecimalToUint8Array(hashLeft);
            }

            return hash(summingBuffer) || null;
        }

        var elements = [];
        var rootBranch = 'left';

        // validate parameters
        if (!validateHexHash(rootHash)) {
            return undefined;
        } else if (typeof count !== 'number') {
            console.error('Invalid value is passed as count parameter. Number expected.');
            return undefined;
        } else if (!isObject(proofNode)) {
            console.error('Invalid type of proofNode parameter. Object expected.');
            return undefined;
        } else if (!Array.isArray(range) || range.length !== 2) {
            console.error('Invalid type of range parameter. Array of two elements expected.');
            return undefined;
        } else if (typeof range[0] !== 'number' || typeof range[1] !== 'number') {
            console.error('Invalid value is passed as range parameter. Number expected.');
            return undefined;
        } else if (range[0] > range[1]) {
            console.error('Invalid range parameter. Start index can\'t be out of range.');
            return undefined;
        }

        if (range[0] > (count - 1)) {
            return [];
        }

        var height = Math.ceil(Math.log2(count));
        var start = range[0];
        var end = (range[1] < count) ? range[1] : (count - 1);
        var actualHash = recursive(proofNode, 0, 0);

        if (actualHash === null) { // tree is invalid
            return undefined;
        } else if (rootHash.toLowerCase() !== actualHash) {
            console.error('rootHash parameter is not equal to actual hash.');
            return undefined;
        } else if (elements.length !== ((start === end) ? 1 : (end - start + 1))) {
            console.error('Actual elements in tree amount is not equal to requested.');
            return undefined;
        }

        return elements;
    }

    /**
     * Check Merkle Patricia tree proof and return element
     * @param {String} rootHash
     * @param {Object} proofNode
     * @param key
     * @param {NewType} type (optional)
     * @return {Object}
     */
    function merklePatriciaProof(rootHash, proofNode, key, type) {
        /**
         * Get value from node
         * @param data
         * @returns {Array}
         */
        function getNodeValue(data) {
            if (Array.isArray(data)) {
                if (validateBytesArray(data)) {
                    return data.slice(0); // clone array of 8-bit integers
                } else {
                    return null;
                }
            } else if (isObject(data)) {
                return objectAssign(data); // deep copy
            } else {
                console.error('Invalid value node in tree. Object expected.');
                return null;
            }
        }

        /**
         * Check either suffix is a part of search key
         * @param {String} prefix
         * @param {String} suffix
         * @returns {Boolean}
         */
        function isPartOfSearchKey(prefix, suffix) {
            var diff = keyBinary.substr(prefix.length);
            return diff[0] === suffix[0];
        }

        /**
         * Recursive tree traversal function
         * @param {Object} node
         * @param {String} keyPrefix
         * @returns {null}
         */
        function recursive(node, keyPrefix) {
            if (getObjectLength(node) !== 2) {
                console.error('Invalid number of children in the tree node.');
                return null;
            }

            var levelData = {};

            for (var keySuffix in node) {
                if (!node.hasOwnProperty(keySuffix)) {
                    continue;
                }

                // validate key
                if (!validateBinaryString(keySuffix)) {
                    return null;
                }

                var branchValueHash;
                var fullKey = keyPrefix + keySuffix;
                var nodeValue = node[keySuffix];
                var branchType;
                var branchKey;
                var branchKeyHash;

                if (fullKey.length === CONST.MERKLE_PATRICIA_KEY_LENGTH * 8) {
                    if (typeof nodeValue === 'string') {
                        if (!validateHexHash(nodeValue)) {
                            return null;
                        }
                        branchValueHash = nodeValue;
                        branchType = 'hash';
                    } else if (isObject(nodeValue)) {
                        if (typeof nodeValue.val === 'undefined') {
                            console.error('Leaf tree contains invalid data.');
                            return null;
                        } else if (typeof element !== 'undefined') {
                            console.error('Tree can not contains more than one node with value.');
                            return null;
                        }

                        element = getNodeValue(nodeValue.val);
                        if (element === null) {
                            return null;
                        }

                        branchValueHash = hash(element, type);
                        if (typeof branchValueHash === 'undefined') {
                            return null;
                        }
                        branchType = 'value';
                    }  else {
                        console.error('Invalid type of node in tree leaf.');
                        return null;
                    }

                    branchKeyHash = binaryStringToHexadecimal(fullKey);
                    branchKey = {
                        variant: 1,
                        key: branchKeyHash,
                        length: 0
                    };
                } else if (fullKey.length < CONST.MERKLE_PATRICIA_KEY_LENGTH * 8) { // node is branch
                    if (typeof nodeValue === 'string') {
                        if (!validateHexHash(nodeValue)) {
                            return null;
                        }
                        branchValueHash = nodeValue;
                        branchType = 'hash';
                    } else if (isObject(nodeValue)) {
                        if (typeof nodeValue.val !== 'undefined') {
                            console.error('Node with value is at non-leaf position in tree.');
                            return null;
                        }

                        branchValueHash = recursive(nodeValue, fullKey);
                        if (branchValueHash === null) {
                            return null;
                        }
                        branchType = 'branch';
                    }  else {
                        console.error('Invalid type of node in tree.');
                        return null;
                    }

                    var binaryKeyLength = fullKey.length;
                    var binaryKey = fullKey;

                    for (var j = 0; j < (CONST.MERKLE_PATRICIA_KEY_LENGTH * 8 - fullKey.length); j++) {
                        binaryKey += '0';
                    }

                    branchKeyHash = binaryStringToHexadecimal(binaryKey);
                    branchKey = {
                        variant: 0,
                        key: branchKeyHash,
                        length: binaryKeyLength
                    };
                } else {
                    console.error('Invalid length of key in tree.');
                    return null;
                }

                if (keySuffix[0] === '0') { // '0' at the beginning means left branch/leaf
                    if (typeof levelData.left === 'undefined') {
                        levelData.left = {
                            hash: branchValueHash,
                            key: branchKey,
                            type: branchType,
                            suffix: keySuffix,
                            size: fullKey.length
                        };
                    } else {
                        console.error('Left node is duplicated in tree.');
                        return null;
                    }
                } else { // '1' at the beginning means right branch/leaf
                    if (typeof levelData.right === 'undefined') {
                        levelData.right = {
                            hash: branchValueHash,
                            key: branchKey,
                            type: branchType,
                            suffix: keySuffix,
                            size: fullKey.length
                        };
                    } else {
                        console.error('Right node is duplicated in tree.');
                        return null;
                    }
                }
            }

            if ((levelData.left.type === 'hash') && (levelData.right.type === 'hash') && (fullKey.length < CONST.MERKLE_PATRICIA_KEY_LENGTH * 8)) {
                if (isPartOfSearchKey(keyPrefix, levelData.left.suffix)) {
                    console.error('Tree is invalid. Left key is a part of search key but its branch is not expanded.');
                    return null;
                } else if (isPartOfSearchKey(keyPrefix, levelData.right.suffix)) {
                    console.error('Tree is invalid. Right key is a part of search key but its branch is not expanded.');
                    return null;
                }
            }

            return hash({
                left_hash: levelData.left.hash,
                right_hash: levelData.right.hash,
                left_key: levelData.left.key,
                right_key: levelData.right.key
            }, Branch);
        }

        var element;

        // validate rootHash parameter
        if (!validateHexHash(rootHash)) {
            return undefined;
        }
        var rootHash = rootHash.toLowerCase();

        // validate proofNode parameter
        if (!isObject(proofNode)) {
            console.error('Invalid type of proofNode parameter. Object expected.');
            return undefined;
        }

        // validate key parameter
        var key = key;
        if (Array.isArray(key)) {
            if (validateBytesArray(key, CONST.MERKLE_PATRICIA_KEY_LENGTH)) {
                key = uint8ArrayToHexadecimal(key);
            } else {
                return undefined;
            }
        } else if (typeof key === 'string') {
            if (!validateHexHash(key, CONST.MERKLE_PATRICIA_KEY_LENGTH)) {
                return undefined;
            }
        } else {
            console.error('Invalid type of key parameter. Aarray of 8-bit integers or hexadecimal string is expected.');
            return undefined;
        }
        var keyBinary = hexadecimalToBinaryString(key);

        var proofNodeRootNumberOfNodes = getObjectLength(proofNode);
        if (proofNodeRootNumberOfNodes === 0) {
            if (rootHash === (new Uint8Array(CONST.MERKLE_PATRICIA_KEY_LENGTH * 2)).join('')) {
                return null;
            } else {
                console.error('Invalid rootHash parameter of empty tree.');
                return undefined;
            }
        } else if (proofNodeRootNumberOfNodes === 1) {
            for (var i in proofNode) {
                if (!proofNode.hasOwnProperty(i)) {
                    continue;
                }

                if (!validateBinaryString(i, 256)) {
                    return undefined;
                }

                var data = proofNode[i];
                var nodeKeyBuffer = binaryStringToUint8Array(i);
                var nodeKey = uint8ArrayToHexadecimal(nodeKeyBuffer);
                var nodeHash;

                if (typeof data === 'string') {
                    if (!validateHexHash(data)) {
                        return undefined;
                    }

                    nodeHash = hash({
                        key: {
                            variant: 1,
                            key: nodeKey,
                            length: 0
                        },
                        hash: data
                    }, RootBranch);

                    if (rootHash === nodeHash) {
                        if (key !== nodeKey) {
                            return null; // element was not found in tree
                        } else {
                            console.error('Invalid key with hash is in the root of proofNode parameter.');
                            return undefined;
                        }
                    } else {
                        console.error('rootHash parameter is not equal to actual hash.');
                        return undefined;
                    }
                } else if (isObject(data)) {
                    element = getNodeValue(data.val);
                    if (element === null) {
                        return undefined;
                    }

                    var elementsHash = hash(element, type);
                    if (typeof elementsHash === 'undefined') {
                        return undefined;
                    }

                    nodeHash = hash({
                        key: {
                            variant: 1,
                            key: nodeKey,
                            length: 0
                        },
                        hash: elementsHash
                    }, RootBranch);

                    if (rootHash === nodeHash) {
                        if (key === nodeKey) {
                            return element;
                        } else {
                            console.error('Invalid key with value is in the root of proofNode parameter.');
                            return undefined
                        }
                    } else {
                        console.error('rootHash parameter is not equal to actual hash.');
                        return undefined;
                    }
                } else {
                    console.error('Invalid type of value in the root of proofNode parameter.');
                    return undefined;
                }

            }
        } else {
            var actualHash = recursive(proofNode, '');

            if (actualHash === null) { // tree is invalid
                return undefined;
            } else if (rootHash !== actualHash) {
                console.error('rootHash parameter is not equal to actual hash.');
                return undefined;
            }

            return element || null;
        }
    }

    /**
     * Verifies block
     * @param {Object} data
     * @return {Boolean}
     */
    function verifyBlock(data) {
        if (!isObject(data)) {
            console.error('Wrong type of data parameter. Object is expected.');
            return false;
        } else if (!isObject(data.block)) {
            console.error('Wrong type of block field in data parameter. Object is expected.');
            return false;
        } else if (!Array.isArray(data.precommits)) {
            console.error('Wrong type of precommits field in data parameter. Array is expected.');
            return false;
        }

        var validatorsTotalNumber = CONFIG.validators.length;
        var uniqueValidators = [];

        var round;
        var blockHash = hash(data.block, Block);

        for (var i in data.precommits) {
            if (!data.precommits.hasOwnProperty(i)) {
                continue;
            }

            var precommit = data.precommits[i];

            if (!isObject(precommit.body)) {
                console.error('Wrong type of precommits body. Object is expected.');
                return false;
            } else if (!validateHexHash(precommit.signature, 64)) {
                console.error('Wrong type of precommits signature. Hexadecimal of 64 length is expected.');
                return false;
            }

            if (precommit.body.validator >= validatorsTotalNumber) {
                console.error('Wrong index passed. Validator does not exist.');
                return false;
            }

            if (uniqueValidators.indexOf(precommit.body.validator) === -1) {
                uniqueValidators.push(precommit.body.validator);
            }

            if (precommit.body.height !== data.block.height) {
                console.error('Wrong height of block in precommit.');
                return false;
            } else if (precommit.body.block_hash !== blockHash) {
                console.error('Wrong hash of block in precommit.');
                return false;
            }

            if (typeof round === 'undefined') {
                round = precommit.body.round;
            } else if (precommit.body.round !== round) {
                console.error('Wrong round in precommit.');
                return false;
            }

            var publicKey = CONFIG.validators[precommit.body.validator].publicKey;

            if (!verifySignature(precommit.body, Precommit, precommit.signature, publicKey)) {
                console.error('Wrong signature of precommit.');
                return false;
            }
        }

        if (uniqueValidators.length <= validatorsTotalNumber * 2 / 3) {
            console.error('Not enough precommits from unique validators.');
            return false;
        }

        return true;
    }

    return {

        // API methods
        newType: createNewType,
        newMessage: createNewMessage,
        hash: hash,
        sign: sign,
        verifySignature: verifySignature,
        merkleProof: merkleProof,
        merklePatriciaProof: merklePatriciaProof,
        verifyBlock: verifyBlock,

        // built-in types
        Int8: Int8,
        Int16: Int16,
        Int32: Int32,
        Int64: Int64,
        Uint8: Uint8,
        Uint16: Uint16,
        Uint32: Uint32,
        Uint64: Uint64,
        String: String,
        Hash: Hash,
        Digest: Digest,
        PublicKey: PublicKey,
        Timespec: Timespec,
        Bool: Bool

    };

})();

module.exports = ThinClient;

},{"./config.json":20,"big-integer":2,"fs":4,"object-assign":9,"sha.js":11,"tweetnacl":18}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2JpZy1pbnRlZ2VyL0JpZ0ludGVnZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NoYS5qcy9oYXNoLmpzIiwibm9kZV9tb2R1bGVzL3NoYS5qcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zaGEuanMvc2hhLmpzIiwibm9kZV9tb2R1bGVzL3NoYS5qcy9zaGExLmpzIiwibm9kZV9tb2R1bGVzL3NoYS5qcy9zaGEyMjQuanMiLCJub2RlX21vZHVsZXMvc2hhLmpzL3NoYTI1Ni5qcyIsIm5vZGVfbW9kdWxlcy9zaGEuanMvc2hhMzg0LmpzIiwibm9kZV9tb2R1bGVzL3NoYS5qcy9zaGE1MTIuanMiLCJub2RlX21vZHVsZXMvdHdlZXRuYWNsL25hY2wtZmFzdC5qcyIsInNyYy9icm93c2VyLmpzIiwic3JjL2NvbmZpZy5qc29uIiwic3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5ckNBOzs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3dkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwMUVBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gcGxhY2VIb2xkZXJzQ291bnQgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcmV0dXJuIGI2NFtsZW4gLSAyXSA9PT0gJz0nID8gMiA6IGI2NFtsZW4gLSAxXSA9PT0gJz0nID8gMSA6IDBcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICByZXR1cm4gYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVyc0NvdW50KGI2NClcblxuICBhcnIgPSBuZXcgQXJyKGxlbiAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwidmFyIGJpZ0ludCA9IChmdW5jdGlvbiAodW5kZWZpbmVkKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuXHJcbiAgICB2YXIgQkFTRSA9IDFlNyxcclxuICAgICAgICBMT0dfQkFTRSA9IDcsXHJcbiAgICAgICAgTUFYX0lOVCA9IDkwMDcxOTkyNTQ3NDA5OTIsXHJcbiAgICAgICAgTUFYX0lOVF9BUlIgPSBzbWFsbFRvQXJyYXkoTUFYX0lOVCksXHJcbiAgICAgICAgTE9HX01BWF9JTlQgPSBNYXRoLmxvZyhNQVhfSU5UKTtcclxuXHJcbiAgICBmdW5jdGlvbiBJbnRlZ2VyKHYsIHJhZGl4KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gSW50ZWdlclswXTtcclxuICAgICAgICBpZiAodHlwZW9mIHJhZGl4ICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gK3JhZGl4ID09PSAxMCA/IHBhcnNlVmFsdWUodikgOiBwYXJzZUJhc2UodiwgcmFkaXgpO1xyXG4gICAgICAgIHJldHVybiBwYXJzZVZhbHVlKHYpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIEJpZ0ludGVnZXIodmFsdWUsIHNpZ24pIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy5zaWduID0gc2lnbjtcclxuICAgICAgICB0aGlzLmlzU21hbGwgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnRlZ2VyLnByb3RvdHlwZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gU21hbGxJbnRlZ2VyKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMuc2lnbiA9IHZhbHVlIDwgMDtcclxuICAgICAgICB0aGlzLmlzU21hbGwgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSW50ZWdlci5wcm90b3R5cGUpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGlzUHJlY2lzZShuKSB7XHJcbiAgICAgICAgcmV0dXJuIC1NQVhfSU5UIDwgbiAmJiBuIDwgTUFYX0lOVDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbWFsbFRvQXJyYXkobikgeyAvLyBGb3IgcGVyZm9ybWFuY2UgcmVhc29ucyBkb2Vzbid0IHJlZmVyZW5jZSBCQVNFLCBuZWVkIHRvIGNoYW5nZSB0aGlzIGZ1bmN0aW9uIGlmIEJBU0UgY2hhbmdlc1xyXG4gICAgICAgIGlmIChuIDwgMWU3KVxyXG4gICAgICAgICAgICByZXR1cm4gW25dO1xyXG4gICAgICAgIGlmIChuIDwgMWUxNClcclxuICAgICAgICAgICAgcmV0dXJuIFtuICUgMWU3LCBNYXRoLmZsb29yKG4gLyAxZTcpXTtcclxuICAgICAgICByZXR1cm4gW24gJSAxZTcsIE1hdGguZmxvb3IobiAvIDFlNykgJSAxZTcsIE1hdGguZmxvb3IobiAvIDFlMTQpXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcnJheVRvU21hbGwoYXJyKSB7IC8vIElmIEJBU0UgY2hhbmdlcyB0aGlzIGZ1bmN0aW9uIG1heSBuZWVkIHRvIGNoYW5nZVxyXG4gICAgICAgIHRyaW0oYXJyKTtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aDtcclxuICAgICAgICBpZiAobGVuZ3RoIDwgNCAmJiBjb21wYXJlQWJzKGFyciwgTUFYX0lOVF9BUlIpIDwgMCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIGFyclswXTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIGFyclswXSArIGFyclsxXSAqIEJBU0U7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gYXJyWzBdICsgKGFyclsxXSArIGFyclsyXSAqIEJBU0UpICogQkFTRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRyaW0odikge1xyXG4gICAgICAgIHZhciBpID0gdi5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKHZbLS1pXSA9PT0gMCk7XHJcbiAgICAgICAgdi5sZW5ndGggPSBpICsgMTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVBcnJheShsZW5ndGgpIHsgLy8gZnVuY3Rpb24gc2hhbWVsZXNzbHkgc3RvbGVuIGZyb20gWWFmZmxlJ3MgbGlicmFyeSBodHRwczovL2dpdGh1Yi5jb20vWWFmZmxlL0JpZ0ludGVnZXJcclxuICAgICAgICB2YXIgeCA9IG5ldyBBcnJheShsZW5ndGgpO1xyXG4gICAgICAgIHZhciBpID0gLTE7XHJcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xyXG4gICAgICAgICAgICB4W2ldID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHg7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdHJ1bmNhdGUobikge1xyXG4gICAgICAgIGlmIChuID4gMCkgcmV0dXJuIE1hdGguZmxvb3Iobik7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguY2VpbChuKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGQoYSwgYikgeyAvLyBhc3N1bWVzIGEgYW5kIGIgYXJlIGFycmF5cyB3aXRoIGEubGVuZ3RoID49IGIubGVuZ3RoXHJcbiAgICAgICAgdmFyIGxfYSA9IGEubGVuZ3RoLFxyXG4gICAgICAgICAgICBsX2IgPSBiLmxlbmd0aCxcclxuICAgICAgICAgICAgciA9IG5ldyBBcnJheShsX2EpLFxyXG4gICAgICAgICAgICBjYXJyeSA9IDAsXHJcbiAgICAgICAgICAgIGJhc2UgPSBCQVNFLFxyXG4gICAgICAgICAgICBzdW0sIGk7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxfYjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHN1bSA9IGFbaV0gKyBiW2ldICsgY2Fycnk7XHJcbiAgICAgICAgICAgIGNhcnJ5ID0gc3VtID49IGJhc2UgPyAxIDogMDtcclxuICAgICAgICAgICAgcltpXSA9IHN1bSAtIGNhcnJ5ICogYmFzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2hpbGUgKGkgPCBsX2EpIHtcclxuICAgICAgICAgICAgc3VtID0gYVtpXSArIGNhcnJ5O1xyXG4gICAgICAgICAgICBjYXJyeSA9IHN1bSA9PT0gYmFzZSA/IDEgOiAwO1xyXG4gICAgICAgICAgICByW2krK10gPSBzdW0gLSBjYXJyeSAqIGJhc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjYXJyeSA+IDApIHIucHVzaChjYXJyeSk7XHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkQW55KGEsIGIpIHtcclxuICAgICAgICBpZiAoYS5sZW5ndGggPj0gYi5sZW5ndGgpIHJldHVybiBhZGQoYSwgYik7XHJcbiAgICAgICAgcmV0dXJuIGFkZChiLCBhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRTbWFsbChhLCBjYXJyeSkgeyAvLyBhc3N1bWVzIGEgaXMgYXJyYXksIGNhcnJ5IGlzIG51bWJlciB3aXRoIDAgPD0gY2FycnkgPCBNQVhfSU5UXHJcbiAgICAgICAgdmFyIGwgPSBhLmxlbmd0aCxcclxuICAgICAgICAgICAgciA9IG5ldyBBcnJheShsKSxcclxuICAgICAgICAgICAgYmFzZSA9IEJBU0UsXHJcbiAgICAgICAgICAgIHN1bSwgaTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHN1bSA9IGFbaV0gLSBiYXNlICsgY2Fycnk7XHJcbiAgICAgICAgICAgIGNhcnJ5ID0gTWF0aC5mbG9vcihzdW0gLyBiYXNlKTtcclxuICAgICAgICAgICAgcltpXSA9IHN1bSAtIGNhcnJ5ICogYmFzZTtcclxuICAgICAgICAgICAgY2FycnkgKz0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2hpbGUgKGNhcnJ5ID4gMCkge1xyXG4gICAgICAgICAgICByW2krK10gPSBjYXJyeSAlIGJhc2U7XHJcbiAgICAgICAgICAgIGNhcnJ5ID0gTWF0aC5mbG9vcihjYXJyeSAvIGJhc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciB2YWx1ZSwgbiA9IHBhcnNlVmFsdWUodik7XHJcbiAgICAgICAgaWYgKHRoaXMuc2lnbiAhPT0gbi5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgYSA9IHRoaXMudmFsdWUsIGIgPSBuLnZhbHVlO1xyXG4gICAgICAgIGlmIChuLmlzU21hbGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKGEsIE1hdGguYWJzKGIpKSwgdGhpcy5zaWduKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZEFueShhLCBiKSwgdGhpcy5zaWduKTtcclxuICAgIH07XHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5wbHVzID0gQmlnSW50ZWdlci5wcm90b3R5cGUuYWRkO1xyXG5cclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgbiA9IHBhcnNlVmFsdWUodik7XHJcbiAgICAgICAgdmFyIGEgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIGlmIChhIDwgMCAhPT0gbi5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN1YnRyYWN0KG4ubmVnYXRlKCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgYiA9IG4udmFsdWU7XHJcbiAgICAgICAgaWYgKG4uaXNTbWFsbCkge1xyXG4gICAgICAgICAgICBpZiAoaXNQcmVjaXNlKGEgKyBiKSkgcmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYSArIGIpO1xyXG4gICAgICAgICAgICBiID0gc21hbGxUb0FycmF5KE1hdGguYWJzKGIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKGFkZFNtYWxsKGIsIE1hdGguYWJzKGEpKSwgYSA8IDApO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUucGx1cyA9IFNtYWxsSW50ZWdlci5wcm90b3R5cGUuYWRkO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0KGEsIGIpIHsgLy8gYXNzdW1lcyBhIGFuZCBiIGFyZSBhcnJheXMgd2l0aCBhID49IGJcclxuICAgICAgICB2YXIgYV9sID0gYS5sZW5ndGgsXHJcbiAgICAgICAgICAgIGJfbCA9IGIubGVuZ3RoLFxyXG4gICAgICAgICAgICByID0gbmV3IEFycmF5KGFfbCksXHJcbiAgICAgICAgICAgIGJvcnJvdyA9IDAsXHJcbiAgICAgICAgICAgIGJhc2UgPSBCQVNFLFxyXG4gICAgICAgICAgICBpLCBkaWZmZXJlbmNlO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBiX2w7IGkrKykge1xyXG4gICAgICAgICAgICBkaWZmZXJlbmNlID0gYVtpXSAtIGJvcnJvdyAtIGJbaV07XHJcbiAgICAgICAgICAgIGlmIChkaWZmZXJlbmNlIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgZGlmZmVyZW5jZSArPSBiYXNlO1xyXG4gICAgICAgICAgICAgICAgYm9ycm93ID0gMTtcclxuICAgICAgICAgICAgfSBlbHNlIGJvcnJvdyA9IDA7XHJcbiAgICAgICAgICAgIHJbaV0gPSBkaWZmZXJlbmNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGkgPSBiX2w7IGkgPCBhX2w7IGkrKykge1xyXG4gICAgICAgICAgICBkaWZmZXJlbmNlID0gYVtpXSAtIGJvcnJvdztcclxuICAgICAgICAgICAgaWYgKGRpZmZlcmVuY2UgPCAwKSBkaWZmZXJlbmNlICs9IGJhc2U7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcltpKytdID0gZGlmZmVyZW5jZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJbaV0gPSBkaWZmZXJlbmNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKDsgaSA8IGFfbDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJbaV0gPSBhW2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cmltKHIpO1xyXG4gICAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN1YnRyYWN0QW55KGEsIGIsIHNpZ24pIHtcclxuICAgICAgICB2YXIgdmFsdWUsIGlzU21hbGw7XHJcbiAgICAgICAgaWYgKGNvbXBhcmVBYnMoYSwgYikgPj0gMCkge1xyXG4gICAgICAgICAgICB2YWx1ZSA9IHN1YnRyYWN0KGEsYik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdmFsdWUgPSBzdWJ0cmFjdChiLCBhKTtcclxuICAgICAgICAgICAgc2lnbiA9ICFzaWduO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YWx1ZSA9IGFycmF5VG9TbWFsbCh2YWx1ZSk7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBpZiAoc2lnbikgdmFsdWUgPSAtdmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHZhbHVlLCBzaWduKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdWJ0cmFjdFNtYWxsKGEsIGIsIHNpZ24pIHsgLy8gYXNzdW1lcyBhIGlzIGFycmF5LCBiIGlzIG51bWJlciB3aXRoIDAgPD0gYiA8IE1BWF9JTlRcclxuICAgICAgICB2YXIgbCA9IGEubGVuZ3RoLFxyXG4gICAgICAgICAgICByID0gbmV3IEFycmF5KGwpLFxyXG4gICAgICAgICAgICBjYXJyeSA9IC1iLFxyXG4gICAgICAgICAgICBiYXNlID0gQkFTRSxcclxuICAgICAgICAgICAgaSwgZGlmZmVyZW5jZTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGRpZmZlcmVuY2UgPSBhW2ldICsgY2Fycnk7XHJcbiAgICAgICAgICAgIGNhcnJ5ID0gTWF0aC5mbG9vcihkaWZmZXJlbmNlIC8gYmFzZSk7XHJcbiAgICAgICAgICAgIGRpZmZlcmVuY2UgJT0gYmFzZTtcclxuICAgICAgICAgICAgcltpXSA9IGRpZmZlcmVuY2UgPCAwID8gZGlmZmVyZW5jZSArIGJhc2UgOiBkaWZmZXJlbmNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByID0gYXJyYXlUb1NtYWxsKHIpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgciA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBpZiAoc2lnbikgciA9IC1yO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihyKTtcclxuICAgICAgICB9IHJldHVybiBuZXcgQmlnSW50ZWdlcihyLCBzaWduKTtcclxuICAgIH1cclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgdmFyIG4gPSBwYXJzZVZhbHVlKHYpO1xyXG4gICAgICAgIGlmICh0aGlzLnNpZ24gIT09IG4uc2lnbikge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQobi5uZWdhdGUoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBhID0gdGhpcy52YWx1ZSwgYiA9IG4udmFsdWU7XHJcbiAgICAgICAgaWYgKG4uaXNTbWFsbClcclxuICAgICAgICAgICAgcmV0dXJuIHN1YnRyYWN0U21hbGwoYSwgTWF0aC5hYnMoYiksIHRoaXMuc2lnbik7XHJcbiAgICAgICAgcmV0dXJuIHN1YnRyYWN0QW55KGEsIGIsIHRoaXMuc2lnbik7XHJcbiAgICB9O1xyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUubWludXMgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdDtcclxuXHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgbiA9IHBhcnNlVmFsdWUodik7XHJcbiAgICAgICAgdmFyIGEgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIGlmIChhIDwgMCAhPT0gbi5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChuLm5lZ2F0ZSgpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGIgPSBuLnZhbHVlO1xyXG4gICAgICAgIGlmIChuLmlzU21hbGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYSAtIGIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3VidHJhY3RTbWFsbChiLCBNYXRoLmFicyhhKSwgYSA+PSAwKTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLm1pbnVzID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5zdWJ0cmFjdDtcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5uZWdhdGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHRoaXMudmFsdWUsICF0aGlzLnNpZ24pO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUubmVnYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzaWduID0gdGhpcy5zaWduO1xyXG4gICAgICAgIHZhciBzbWFsbCA9IG5ldyBTbWFsbEludGVnZXIoLXRoaXMudmFsdWUpO1xyXG4gICAgICAgIHNtYWxsLnNpZ24gPSAhc2lnbjtcclxuICAgICAgICByZXR1cm4gc21hbGw7XHJcbiAgICB9O1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEJpZ0ludGVnZXIodGhpcy52YWx1ZSwgZmFsc2UpO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgU21hbGxJbnRlZ2VyKE1hdGguYWJzKHRoaXMudmFsdWUpKTtcclxuICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gbXVsdGlwbHlMb25nKGEsIGIpIHtcclxuICAgICAgICB2YXIgYV9sID0gYS5sZW5ndGgsXHJcbiAgICAgICAgICAgIGJfbCA9IGIubGVuZ3RoLFxyXG4gICAgICAgICAgICBsID0gYV9sICsgYl9sLFxyXG4gICAgICAgICAgICByID0gY3JlYXRlQXJyYXkobCksXHJcbiAgICAgICAgICAgIGJhc2UgPSBCQVNFLFxyXG4gICAgICAgICAgICBwcm9kdWN0LCBjYXJyeSwgaSwgYV9pLCBiX2o7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFfbDsgKytpKSB7XHJcbiAgICAgICAgICAgIGFfaSA9IGFbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYl9sOyArK2opIHtcclxuICAgICAgICAgICAgICAgIGJfaiA9IGJbal07XHJcbiAgICAgICAgICAgICAgICBwcm9kdWN0ID0gYV9pICogYl9qICsgcltpICsgal07XHJcbiAgICAgICAgICAgICAgICBjYXJyeSA9IE1hdGguZmxvb3IocHJvZHVjdCAvIGJhc2UpO1xyXG4gICAgICAgICAgICAgICAgcltpICsgal0gPSBwcm9kdWN0IC0gY2FycnkgKiBiYXNlO1xyXG4gICAgICAgICAgICAgICAgcltpICsgaiArIDFdICs9IGNhcnJ5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyaW0ocik7XHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbXVsdGlwbHlTbWFsbChhLCBiKSB7IC8vIGFzc3VtZXMgYSBpcyBhcnJheSwgYiBpcyBudW1iZXIgd2l0aCB8YnwgPCBCQVNFXHJcbiAgICAgICAgdmFyIGwgPSBhLmxlbmd0aCxcclxuICAgICAgICAgICAgciA9IG5ldyBBcnJheShsKSxcclxuICAgICAgICAgICAgYmFzZSA9IEJBU0UsXHJcbiAgICAgICAgICAgIGNhcnJ5ID0gMCxcclxuICAgICAgICAgICAgcHJvZHVjdCwgaTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHByb2R1Y3QgPSBhW2ldICogYiArIGNhcnJ5O1xyXG4gICAgICAgICAgICBjYXJyeSA9IE1hdGguZmxvb3IocHJvZHVjdCAvIGJhc2UpO1xyXG4gICAgICAgICAgICByW2ldID0gcHJvZHVjdCAtIGNhcnJ5ICogYmFzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2hpbGUgKGNhcnJ5ID4gMCkge1xyXG4gICAgICAgICAgICByW2krK10gPSBjYXJyeSAlIGJhc2U7XHJcbiAgICAgICAgICAgIGNhcnJ5ID0gTWF0aC5mbG9vcihjYXJyeSAvIGJhc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzaGlmdExlZnQoeCwgbikge1xyXG4gICAgICAgIHZhciByID0gW107XHJcbiAgICAgICAgd2hpbGUgKG4tLSA+IDApIHIucHVzaCgwKTtcclxuICAgICAgICByZXR1cm4gci5jb25jYXQoeCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbXVsdGlwbHlLYXJhdHN1YmEoeCwgeSkge1xyXG4gICAgICAgIHZhciBuID0gTWF0aC5tYXgoeC5sZW5ndGgsIHkubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgaWYgKG4gPD0gMzApIHJldHVybiBtdWx0aXBseUxvbmcoeCwgeSk7XHJcbiAgICAgICAgbiA9IE1hdGguY2VpbChuIC8gMik7XHJcblxyXG4gICAgICAgIHZhciBiID0geC5zbGljZShuKSxcclxuICAgICAgICAgICAgYSA9IHguc2xpY2UoMCwgbiksXHJcbiAgICAgICAgICAgIGQgPSB5LnNsaWNlKG4pLFxyXG4gICAgICAgICAgICBjID0geS5zbGljZSgwLCBuKTtcclxuXHJcbiAgICAgICAgdmFyIGFjID0gbXVsdGlwbHlLYXJhdHN1YmEoYSwgYyksXHJcbiAgICAgICAgICAgIGJkID0gbXVsdGlwbHlLYXJhdHN1YmEoYiwgZCksXHJcbiAgICAgICAgICAgIGFiY2QgPSBtdWx0aXBseUthcmF0c3ViYShhZGRBbnkoYSwgYiksIGFkZEFueShjLCBkKSk7XHJcblxyXG4gICAgICAgIHZhciBwcm9kdWN0ID0gYWRkQW55KGFkZEFueShhYywgc2hpZnRMZWZ0KHN1YnRyYWN0KHN1YnRyYWN0KGFiY2QsIGFjKSwgYmQpLCBuKSksIHNoaWZ0TGVmdChiZCwgMiAqIG4pKTtcclxuICAgICAgICB0cmltKHByb2R1Y3QpO1xyXG4gICAgICAgIHJldHVybiBwcm9kdWN0O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb24gaXMgZGVyaXZlZCBmcm9tIGEgc3VyZmFjZSBmaXQgb2YgYSBncmFwaCBwbG90dGluZyB0aGUgcGVyZm9ybWFuY2UgZGlmZmVyZW5jZVxyXG4gICAgLy8gYmV0d2VlbiBsb25nIG11bHRpcGxpY2F0aW9uIGFuZCBrYXJhdHN1YmEgbXVsdGlwbGljYXRpb24gdmVyc3VzIHRoZSBsZW5ndGhzIG9mIHRoZSB0d28gYXJyYXlzLlxyXG4gICAgZnVuY3Rpb24gdXNlS2FyYXRzdWJhKGwxLCBsMikge1xyXG4gICAgICAgIHJldHVybiAtMC4wMTIgKiBsMSAtIDAuMDEyICogbDIgKyAwLjAwMDAxNSAqIGwxICogbDIgPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5ID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgdmFsdWUsIG4gPSBwYXJzZVZhbHVlKHYpLFxyXG4gICAgICAgICAgICBhID0gdGhpcy52YWx1ZSwgYiA9IG4udmFsdWUsXHJcbiAgICAgICAgICAgIHNpZ24gPSB0aGlzLnNpZ24gIT09IG4uc2lnbixcclxuICAgICAgICAgICAgYWJzO1xyXG4gICAgICAgIGlmIChuLmlzU21hbGwpIHtcclxuICAgICAgICAgICAgaWYgKGIgPT09IDApIHJldHVybiBJbnRlZ2VyWzBdO1xyXG4gICAgICAgICAgICBpZiAoYiA9PT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIGlmIChiID09PSAtMSkgcmV0dXJuIHRoaXMubmVnYXRlKCk7XHJcbiAgICAgICAgICAgIGFicyA9IE1hdGguYWJzKGIpO1xyXG4gICAgICAgICAgICBpZiAoYWJzIDwgQkFTRSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKG11bHRpcGx5U21hbGwoYSwgYWJzKSwgc2lnbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYiA9IHNtYWxsVG9BcnJheShhYnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXNlS2FyYXRzdWJhKGEubGVuZ3RoLCBiLmxlbmd0aCkpIC8vIEthcmF0c3ViYSBpcyBvbmx5IGZhc3RlciBmb3IgY2VydGFpbiBhcnJheSBzaXplc1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlLYXJhdHN1YmEoYSwgYiksIHNpZ24pO1xyXG4gICAgICAgIHJldHVybiBuZXcgQmlnSW50ZWdlcihtdWx0aXBseUxvbmcoYSwgYiksIHNpZ24pO1xyXG4gICAgfTtcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS50aW1lcyA9IEJpZ0ludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O1xyXG5cclxuICAgIGZ1bmN0aW9uIG11bHRpcGx5U21hbGxBbmRBcnJheShhLCBiLCBzaWduKSB7IC8vIGEgPj0gMFxyXG4gICAgICAgIGlmIChhIDwgQkFTRSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJpZ0ludGVnZXIobXVsdGlwbHlTbWFsbChiLCBhKSwgc2lnbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgQmlnSW50ZWdlcihtdWx0aXBseUxvbmcoYiwgc21hbGxUb0FycmF5KGEpKSwgc2lnbik7XHJcbiAgICB9XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLl9tdWx0aXBseUJ5U21hbGwgPSBmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICBpZiAoaXNQcmVjaXNlKGEudmFsdWUgKiB0aGlzLnZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBTbWFsbEludGVnZXIoYS52YWx1ZSAqIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBtdWx0aXBseVNtYWxsQW5kQXJyYXkoTWF0aC5hYnMoYS52YWx1ZSksIHNtYWxsVG9BcnJheShNYXRoLmFicyh0aGlzLnZhbHVlKSksIHRoaXMuc2lnbiAhPT0gYS5zaWduKTtcclxuICAgIH07XHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5fbXVsdGlwbHlCeVNtYWxsID0gZnVuY3Rpb24gKGEpIHtcclxuICAgICAgICAgICAgaWYgKGEudmFsdWUgPT09IDApIHJldHVybiBJbnRlZ2VyWzBdO1xyXG4gICAgICAgICAgICBpZiAoYS52YWx1ZSA9PT0gMSkgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIGlmIChhLnZhbHVlID09PSAtMSkgcmV0dXJuIHRoaXMubmVnYXRlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBtdWx0aXBseVNtYWxsQW5kQXJyYXkoTWF0aC5hYnMoYS52YWx1ZSksIHRoaXMudmFsdWUsIHRoaXMuc2lnbiAhPT0gYS5zaWduKTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLm11bHRpcGx5ID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gcGFyc2VWYWx1ZSh2KS5fbXVsdGlwbHlCeVNtYWxsKHRoaXMpO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUudGltZXMgPSBTbWFsbEludGVnZXIucHJvdG90eXBlLm11bHRpcGx5O1xyXG5cclxuICAgIGZ1bmN0aW9uIHNxdWFyZShhKSB7XHJcbiAgICAgICAgdmFyIGwgPSBhLmxlbmd0aCxcclxuICAgICAgICAgICAgciA9IGNyZWF0ZUFycmF5KGwgKyBsKSxcclxuICAgICAgICAgICAgYmFzZSA9IEJBU0UsXHJcbiAgICAgICAgICAgIHByb2R1Y3QsIGNhcnJ5LCBpLCBhX2ksIGFfajtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFfaSA9IGFbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICBhX2ogPSBhW2pdO1xyXG4gICAgICAgICAgICAgICAgcHJvZHVjdCA9IGFfaSAqIGFfaiArIHJbaSArIGpdO1xyXG4gICAgICAgICAgICAgICAgY2FycnkgPSBNYXRoLmZsb29yKHByb2R1Y3QgLyBiYXNlKTtcclxuICAgICAgICAgICAgICAgIHJbaSArIGpdID0gcHJvZHVjdCAtIGNhcnJ5ICogYmFzZTtcclxuICAgICAgICAgICAgICAgIHJbaSArIGogKyAxXSArPSBjYXJyeTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0cmltKHIpO1xyXG4gICAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLnNxdWFyZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEJpZ0ludGVnZXIoc3F1YXJlKHRoaXMudmFsdWUpLCBmYWxzZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuc3F1YXJlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWUgKiB0aGlzLnZhbHVlO1xyXG4gICAgICAgIGlmIChpc1ByZWNpc2UodmFsdWUpKSByZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih2YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKHNxdWFyZShzbWFsbFRvQXJyYXkoTWF0aC5hYnModGhpcy52YWx1ZSkpKSwgZmFsc2UpO1xyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBkaXZNb2QxKGEsIGIpIHsgLy8gTGVmdCBvdmVyIGZyb20gcHJldmlvdXMgdmVyc2lvbi4gUGVyZm9ybXMgZmFzdGVyIHRoYW4gZGl2TW9kMiBvbiBzbWFsbGVyIGlucHV0IHNpemVzLlxyXG4gICAgICAgIHZhciBhX2wgPSBhLmxlbmd0aCxcclxuICAgICAgICAgICAgYl9sID0gYi5sZW5ndGgsXHJcbiAgICAgICAgICAgIGJhc2UgPSBCQVNFLFxyXG4gICAgICAgICAgICByZXN1bHQgPSBjcmVhdGVBcnJheShiLmxlbmd0aCksXHJcbiAgICAgICAgICAgIGRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCA9IGJbYl9sIC0gMV0sXHJcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6YXRpb25cclxuICAgICAgICAgICAgbGFtYmRhID0gTWF0aC5jZWlsKGJhc2UgLyAoMiAqIGRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCkpLFxyXG4gICAgICAgICAgICByZW1haW5kZXIgPSBtdWx0aXBseVNtYWxsKGEsIGxhbWJkYSksXHJcbiAgICAgICAgICAgIGRpdmlzb3IgPSBtdWx0aXBseVNtYWxsKGIsIGxhbWJkYSksXHJcbiAgICAgICAgICAgIHF1b3RpZW50RGlnaXQsIHNoaWZ0LCBjYXJyeSwgYm9ycm93LCBpLCBsLCBxO1xyXG4gICAgICAgIGlmIChyZW1haW5kZXIubGVuZ3RoIDw9IGFfbCkgcmVtYWluZGVyLnB1c2goMCk7XHJcbiAgICAgICAgZGl2aXNvci5wdXNoKDApO1xyXG4gICAgICAgIGRpdmlzb3JNb3N0U2lnbmlmaWNhbnREaWdpdCA9IGRpdmlzb3JbYl9sIC0gMV07XHJcbiAgICAgICAgZm9yIChzaGlmdCA9IGFfbCAtIGJfbDsgc2hpZnQgPj0gMDsgc2hpZnQtLSkge1xyXG4gICAgICAgICAgICBxdW90aWVudERpZ2l0ID0gYmFzZSAtIDE7XHJcbiAgICAgICAgICAgIGlmIChyZW1haW5kZXJbc2hpZnQgKyBiX2xdICE9PSBkaXZpc29yTW9zdFNpZ25pZmljYW50RGlnaXQpIHtcclxuICAgICAgICAgICAgICBxdW90aWVudERpZ2l0ID0gTWF0aC5mbG9vcigocmVtYWluZGVyW3NoaWZ0ICsgYl9sXSAqIGJhc2UgKyByZW1haW5kZXJbc2hpZnQgKyBiX2wgLSAxXSkgLyBkaXZpc29yTW9zdFNpZ25pZmljYW50RGlnaXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHF1b3RpZW50RGlnaXQgPD0gYmFzZSAtIDFcclxuICAgICAgICAgICAgY2FycnkgPSAwO1xyXG4gICAgICAgICAgICBib3Jyb3cgPSAwO1xyXG4gICAgICAgICAgICBsID0gZGl2aXNvci5sZW5ndGg7XHJcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNhcnJ5ICs9IHF1b3RpZW50RGlnaXQgKiBkaXZpc29yW2ldO1xyXG4gICAgICAgICAgICAgICAgcSA9IE1hdGguZmxvb3IoY2FycnkgLyBiYXNlKTtcclxuICAgICAgICAgICAgICAgIGJvcnJvdyArPSByZW1haW5kZXJbc2hpZnQgKyBpXSAtIChjYXJyeSAtIHEgKiBiYXNlKTtcclxuICAgICAgICAgICAgICAgIGNhcnJ5ID0gcTtcclxuICAgICAgICAgICAgICAgIGlmIChib3Jyb3cgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVtYWluZGVyW3NoaWZ0ICsgaV0gPSBib3Jyb3cgKyBiYXNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJvcnJvdyA9IC0xO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZW1haW5kZXJbc2hpZnQgKyBpXSA9IGJvcnJvdztcclxuICAgICAgICAgICAgICAgICAgICBib3Jyb3cgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHdoaWxlIChib3Jyb3cgIT09IDApIHtcclxuICAgICAgICAgICAgICAgIHF1b3RpZW50RGlnaXQgLT0gMTtcclxuICAgICAgICAgICAgICAgIGNhcnJ5ID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXJyeSArPSByZW1haW5kZXJbc2hpZnQgKyBpXSAtIGJhc2UgKyBkaXZpc29yW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXJyeSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtYWluZGVyW3NoaWZ0ICsgaV0gPSBjYXJyeSArIGJhc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcnJ5ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1haW5kZXJbc2hpZnQgKyBpXSA9IGNhcnJ5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJyeSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYm9ycm93ICs9IGNhcnJ5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlc3VsdFtzaGlmdF0gPSBxdW90aWVudERpZ2l0O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBkZW5vcm1hbGl6YXRpb25cclxuICAgICAgICByZW1haW5kZXIgPSBkaXZNb2RTbWFsbChyZW1haW5kZXIsIGxhbWJkYSlbMF07XHJcbiAgICAgICAgcmV0dXJuIFthcnJheVRvU21hbGwocmVzdWx0KSwgYXJyYXlUb1NtYWxsKHJlbWFpbmRlcildO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRpdk1vZDIoYSwgYikgeyAvLyBJbXBsZW1lbnRhdGlvbiBpZGVhIHNoYW1lbGVzc2x5IHN0b2xlbiBmcm9tIFNpbGVudCBNYXR0J3MgbGlicmFyeSBodHRwOi8vc2lsZW50bWF0dC5jb20vYmlnaW50ZWdlci9cclxuICAgICAgICAvLyBQZXJmb3JtcyBmYXN0ZXIgdGhhbiBkaXZNb2QxIG9uIGxhcmdlciBpbnB1dCBzaXplcy5cclxuICAgICAgICB2YXIgYV9sID0gYS5sZW5ndGgsXHJcbiAgICAgICAgICAgIGJfbCA9IGIubGVuZ3RoLFxyXG4gICAgICAgICAgICByZXN1bHQgPSBbXSxcclxuICAgICAgICAgICAgcGFydCA9IFtdLFxyXG4gICAgICAgICAgICBiYXNlID0gQkFTRSxcclxuICAgICAgICAgICAgZ3Vlc3MsIHhsZW4sIGhpZ2h4LCBoaWdoeSwgY2hlY2s7XHJcbiAgICAgICAgd2hpbGUgKGFfbCkge1xyXG4gICAgICAgICAgICBwYXJ0LnVuc2hpZnQoYVstLWFfbF0pO1xyXG4gICAgICAgICAgICBpZiAoY29tcGFyZUFicyhwYXJ0LCBiKSA8IDApIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKDApO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeGxlbiA9IHBhcnQubGVuZ3RoO1xyXG4gICAgICAgICAgICBoaWdoeCA9IHBhcnRbeGxlbiAtIDFdICogYmFzZSArIHBhcnRbeGxlbiAtIDJdO1xyXG4gICAgICAgICAgICBoaWdoeSA9IGJbYl9sIC0gMV0gKiBiYXNlICsgYltiX2wgLSAyXTtcclxuICAgICAgICAgICAgaWYgKHhsZW4gPiBiX2wpIHtcclxuICAgICAgICAgICAgICAgIGhpZ2h4ID0gKGhpZ2h4ICsgMSkgKiBiYXNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGd1ZXNzID0gTWF0aC5jZWlsKGhpZ2h4IC8gaGlnaHkpO1xyXG4gICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICBjaGVjayA9IG11bHRpcGx5U21hbGwoYiwgZ3Vlc3MpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVBYnMoY2hlY2ssIHBhcnQpIDw9IDApIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZ3Vlc3MtLTtcclxuICAgICAgICAgICAgfSB3aGlsZSAoZ3Vlc3MpO1xyXG4gICAgICAgICAgICByZXN1bHQucHVzaChndWVzcyk7XHJcbiAgICAgICAgICAgIHBhcnQgPSBzdWJ0cmFjdChwYXJ0LCBjaGVjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJlc3VsdC5yZXZlcnNlKCk7XHJcbiAgICAgICAgcmV0dXJuIFthcnJheVRvU21hbGwocmVzdWx0KSwgYXJyYXlUb1NtYWxsKHBhcnQpXTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkaXZNb2RTbWFsbCh2YWx1ZSwgbGFtYmRhKSB7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCxcclxuICAgICAgICAgICAgcXVvdGllbnQgPSBjcmVhdGVBcnJheShsZW5ndGgpLFxyXG4gICAgICAgICAgICBiYXNlID0gQkFTRSxcclxuICAgICAgICAgICAgaSwgcSwgcmVtYWluZGVyLCBkaXZpc29yO1xyXG4gICAgICAgIHJlbWFpbmRlciA9IDA7XHJcbiAgICAgICAgZm9yIChpID0gbGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcclxuICAgICAgICAgICAgZGl2aXNvciA9IHJlbWFpbmRlciAqIGJhc2UgKyB2YWx1ZVtpXTtcclxuICAgICAgICAgICAgcSA9IHRydW5jYXRlKGRpdmlzb3IgLyBsYW1iZGEpO1xyXG4gICAgICAgICAgICByZW1haW5kZXIgPSBkaXZpc29yIC0gcSAqIGxhbWJkYTtcclxuICAgICAgICAgICAgcXVvdGllbnRbaV0gPSBxIHwgMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtxdW90aWVudCwgcmVtYWluZGVyIHwgMF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGl2TW9kQW55KHNlbGYsIHYpIHtcclxuICAgICAgICB2YXIgdmFsdWUsIG4gPSBwYXJzZVZhbHVlKHYpO1xyXG4gICAgICAgIHZhciBhID0gc2VsZi52YWx1ZSwgYiA9IG4udmFsdWU7XHJcbiAgICAgICAgdmFyIHF1b3RpZW50O1xyXG4gICAgICAgIGlmIChiID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZGl2aWRlIGJ5IHplcm9cIik7XHJcbiAgICAgICAgaWYgKHNlbGYuaXNTbWFsbCkge1xyXG4gICAgICAgICAgICBpZiAobi5pc1NtYWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW25ldyBTbWFsbEludGVnZXIodHJ1bmNhdGUoYSAvIGIpKSwgbmV3IFNtYWxsSW50ZWdlcihhICUgYildO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbSW50ZWdlclswXSwgc2VsZl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuLmlzU21hbGwpIHtcclxuICAgICAgICAgICAgaWYgKGIgPT09IDEpIHJldHVybiBbc2VsZiwgSW50ZWdlclswXV07XHJcbiAgICAgICAgICAgIGlmIChiID09IC0xKSByZXR1cm4gW3NlbGYubmVnYXRlKCksIEludGVnZXJbMF1dO1xyXG4gICAgICAgICAgICB2YXIgYWJzID0gTWF0aC5hYnMoYik7XHJcbiAgICAgICAgICAgIGlmIChhYnMgPCBCQVNFKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGRpdk1vZFNtYWxsKGEsIGFicyk7XHJcbiAgICAgICAgICAgICAgICBxdW90aWVudCA9IGFycmF5VG9TbWFsbCh2YWx1ZVswXSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmVtYWluZGVyID0gdmFsdWVbMV07XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5zaWduKSByZW1haW5kZXIgPSAtcmVtYWluZGVyO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBxdW90aWVudCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnNpZ24gIT09IG4uc2lnbikgcXVvdGllbnQgPSAtcXVvdGllbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtuZXcgU21hbGxJbnRlZ2VyKHF1b3RpZW50KSwgbmV3IFNtYWxsSW50ZWdlcihyZW1haW5kZXIpXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBbbmV3IEJpZ0ludGVnZXIocXVvdGllbnQsIHNlbGYuc2lnbiAhPT0gbi5zaWduKSwgbmV3IFNtYWxsSW50ZWdlcihyZW1haW5kZXIpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBiID0gc21hbGxUb0FycmF5KGFicyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjb21wYXJpc29uID0gY29tcGFyZUFicyhhLCBiKTtcclxuICAgICAgICBpZiAoY29tcGFyaXNvbiA9PT0gLTEpIHJldHVybiBbSW50ZWdlclswXSwgc2VsZl07XHJcbiAgICAgICAgaWYgKGNvbXBhcmlzb24gPT09IDApIHJldHVybiBbSW50ZWdlcltzZWxmLnNpZ24gPT09IG4uc2lnbiA/IDEgOiAtMV0sIEludGVnZXJbMF1dO1xyXG5cclxuICAgICAgICAvLyBkaXZNb2QxIGlzIGZhc3RlciBvbiBzbWFsbGVyIGlucHV0IHNpemVzXHJcbiAgICAgICAgaWYgKGEubGVuZ3RoICsgYi5sZW5ndGggPD0gMjAwKVxyXG4gICAgICAgICAgICB2YWx1ZSA9IGRpdk1vZDEoYSwgYik7XHJcbiAgICAgICAgZWxzZSB2YWx1ZSA9IGRpdk1vZDIoYSwgYik7XHJcblxyXG4gICAgICAgIHF1b3RpZW50ID0gdmFsdWVbMF07XHJcbiAgICAgICAgdmFyIHFTaWduID0gc2VsZi5zaWduICE9PSBuLnNpZ24sXHJcbiAgICAgICAgICAgIG1vZCA9IHZhbHVlWzFdLFxyXG4gICAgICAgICAgICBtU2lnbiA9IHNlbGYuc2lnbjtcclxuICAgICAgICBpZiAodHlwZW9mIHF1b3RpZW50ID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChxU2lnbikgcXVvdGllbnQgPSAtcXVvdGllbnQ7XHJcbiAgICAgICAgICAgIHF1b3RpZW50ID0gbmV3IFNtYWxsSW50ZWdlcihxdW90aWVudCk7XHJcbiAgICAgICAgfSBlbHNlIHF1b3RpZW50ID0gbmV3IEJpZ0ludGVnZXIocXVvdGllbnQsIHFTaWduKTtcclxuICAgICAgICBpZiAodHlwZW9mIG1vZCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICBpZiAobVNpZ24pIG1vZCA9IC1tb2Q7XHJcbiAgICAgICAgICAgIG1vZCA9IG5ldyBTbWFsbEludGVnZXIobW9kKTtcclxuICAgICAgICB9IGVsc2UgbW9kID0gbmV3IEJpZ0ludGVnZXIobW9kLCBtU2lnbik7XHJcbiAgICAgICAgcmV0dXJuIFtxdW90aWVudCwgbW9kXTtcclxuICAgIH1cclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZtb2QgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBkaXZNb2RBbnkodGhpcywgdik7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcXVvdGllbnQ6IHJlc3VsdFswXSxcclxuICAgICAgICAgICAgcmVtYWluZGVyOiByZXN1bHRbMV1cclxuICAgICAgICB9O1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuZGl2bW9kID0gQmlnSW50ZWdlci5wcm90b3R5cGUuZGl2bW9kO1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmRpdmlkZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIGRpdk1vZEFueSh0aGlzLCB2KVswXTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLm92ZXIgPSBTbWFsbEludGVnZXIucHJvdG90eXBlLmRpdmlkZSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLm92ZXIgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5kaXZpZGU7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gZGl2TW9kQW55KHRoaXMsIHYpWzFdO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUucmVtYWluZGVyID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tb2QgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5yZW1haW5kZXIgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2Q7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUucG93ID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgbiA9IHBhcnNlVmFsdWUodiksXHJcbiAgICAgICAgICAgIGEgPSB0aGlzLnZhbHVlLFxyXG4gICAgICAgICAgICBiID0gbi52YWx1ZSxcclxuICAgICAgICAgICAgdmFsdWUsIHgsIHk7XHJcbiAgICAgICAgaWYgKGIgPT09IDApIHJldHVybiBJbnRlZ2VyWzFdO1xyXG4gICAgICAgIGlmIChhID09PSAwKSByZXR1cm4gSW50ZWdlclswXTtcclxuICAgICAgICBpZiAoYSA9PT0gMSkgcmV0dXJuIEludGVnZXJbMV07XHJcbiAgICAgICAgaWYgKGEgPT09IC0xKSByZXR1cm4gbi5pc0V2ZW4oKSA/IEludGVnZXJbMV0gOiBJbnRlZ2VyWy0xXTtcclxuICAgICAgICBpZiAobi5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBJbnRlZ2VyWzBdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIW4uaXNTbWFsbCkgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGV4cG9uZW50IFwiICsgbi50b1N0cmluZygpICsgXCIgaXMgdG9vIGxhcmdlLlwiKTtcclxuICAgICAgICBpZiAodGhpcy5pc1NtYWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChpc1ByZWNpc2UodmFsdWUgPSBNYXRoLnBvdyhhLCBiKSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih0cnVuY2F0ZSh2YWx1ZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB4ID0gdGhpcztcclxuICAgICAgICB5ID0gSW50ZWdlclsxXTtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBpZiAoYiAmIDEgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHkgPSB5LnRpbWVzKHgpO1xyXG4gICAgICAgICAgICAgICAgLS1iO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChiID09PSAwKSBicmVhaztcclxuICAgICAgICAgICAgYiAvPSAyO1xyXG4gICAgICAgICAgICB4ID0geC5zcXVhcmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHk7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5wb3cgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5wb3c7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUubW9kUG93ID0gZnVuY3Rpb24gKGV4cCwgbW9kKSB7XHJcbiAgICAgICAgZXhwID0gcGFyc2VWYWx1ZShleHApO1xyXG4gICAgICAgIG1vZCA9IHBhcnNlVmFsdWUobW9kKTtcclxuICAgICAgICBpZiAobW9kLmlzWmVybygpKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgdGFrZSBtb2RQb3cgd2l0aCBtb2R1bHVzIDBcIik7XHJcbiAgICAgICAgdmFyIHIgPSBJbnRlZ2VyWzFdLFxyXG4gICAgICAgICAgICBiYXNlID0gdGhpcy5tb2QobW9kKTtcclxuICAgICAgICB3aGlsZSAoZXhwLmlzUG9zaXRpdmUoKSkge1xyXG4gICAgICAgICAgICBpZiAoYmFzZS5pc1plcm8oKSkgcmV0dXJuIEludGVnZXJbMF07XHJcbiAgICAgICAgICAgIGlmIChleHAuaXNPZGQoKSkgciA9IHIubXVsdGlwbHkoYmFzZSkubW9kKG1vZCk7XHJcbiAgICAgICAgICAgIGV4cCA9IGV4cC5kaXZpZGUoMik7XHJcbiAgICAgICAgICAgIGJhc2UgPSBiYXNlLnNxdWFyZSgpLm1vZChtb2QpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLm1vZFBvdyA9IEJpZ0ludGVnZXIucHJvdG90eXBlLm1vZFBvdztcclxuXHJcbiAgICBmdW5jdGlvbiBjb21wYXJlQWJzKGEsIGIpIHtcclxuICAgICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhLmxlbmd0aCA+IGIubGVuZ3RoID8gMSA6IC0xO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpID0gYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBpZiAoYVtpXSAhPT0gYltpXSkgcmV0dXJuIGFbaV0gPiBiW2ldID8gMSA6IC0xO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlQWJzID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgbiA9IHBhcnNlVmFsdWUodiksXHJcbiAgICAgICAgICAgIGEgPSB0aGlzLnZhbHVlLFxyXG4gICAgICAgICAgICBiID0gbi52YWx1ZTtcclxuICAgICAgICBpZiAobi5pc1NtYWxsKSByZXR1cm4gMTtcclxuICAgICAgICByZXR1cm4gY29tcGFyZUFicyhhLCBiKTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmVBYnMgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciBuID0gcGFyc2VWYWx1ZSh2KSxcclxuICAgICAgICAgICAgYSA9IE1hdGguYWJzKHRoaXMudmFsdWUpLFxyXG4gICAgICAgICAgICBiID0gbi52YWx1ZTtcclxuICAgICAgICBpZiAobi5pc1NtYWxsKSB7XHJcbiAgICAgICAgICAgIGIgPSBNYXRoLmFicyhiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGEgPT09IGIgPyAwIDogYSA+IGIgPyAxIDogLTE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH07XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgLy8gU2VlIGRpc2N1c3Npb24gYWJvdXQgY29tcGFyaXNvbiB3aXRoIEluZmluaXR5OlxyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wZXRlcm9sc29uL0JpZ0ludGVnZXIuanMvaXNzdWVzLzYxXHJcbiAgICAgICAgaWYgKHYgPT09IEluZmluaXR5KSB7XHJcbiAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHYgPT09IC1JbmZpbml0eSkge1xyXG4gICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBuID0gcGFyc2VWYWx1ZSh2KSxcclxuICAgICAgICAgICAgYSA9IHRoaXMudmFsdWUsXHJcbiAgICAgICAgICAgIGIgPSBuLnZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnNpZ24gIT09IG4uc2lnbikge1xyXG4gICAgICAgICAgICByZXR1cm4gbi5zaWduID8gMSA6IC0xO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobi5pc1NtYWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNpZ24gPyAtMSA6IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb21wYXJlQWJzKGEsIGIpICogKHRoaXMuc2lnbiA/IC0xIDogMSk7XHJcbiAgICB9O1xyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZVRvID0gQmlnSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZTtcclxuXHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIGlmICh2ID09PSBJbmZpbml0eSkge1xyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh2ID09PSAtSW5maW5pdHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgbiA9IHBhcnNlVmFsdWUodiksXHJcbiAgICAgICAgICAgIGEgPSB0aGlzLnZhbHVlLFxyXG4gICAgICAgICAgICBiID0gbi52YWx1ZTtcclxuICAgICAgICBpZiAobi5pc1NtYWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhID09IGIgPyAwIDogYSA+IGIgPyAxIDogLTE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhIDwgMCAhPT0gbi5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhIDwgMCA/IC0xIDogMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGEgPCAwID8gMSA6IC0xO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuY29tcGFyZVRvID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5jb21wYXJlO1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcGFyZSh2KSA9PT0gMDtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmVxID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5lcXVhbHMgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5lcSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmVxdWFscztcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3RFcXVhbHMgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvbXBhcmUodikgIT09IDA7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5uZXEgPSBTbWFsbEludGVnZXIucHJvdG90eXBlLm5vdEVxdWFscyA9IEJpZ0ludGVnZXIucHJvdG90eXBlLm5lcSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLm5vdEVxdWFscztcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb21wYXJlKHYpID4gMDtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmd0ID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyID0gQmlnSW50ZWdlci5wcm90b3R5cGUuZ3QgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5ncmVhdGVyO1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3NlciA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcGFyZSh2KSA8IDA7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5sdCA9IFNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVzc2VyID0gQmlnSW50ZWdlci5wcm90b3R5cGUubHQgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXI7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuZ3JlYXRlck9yRXF1YWxzID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb21wYXJlKHYpID49IDA7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5nZXEgPSBTbWFsbEludGVnZXIucHJvdG90eXBlLmdyZWF0ZXJPckVxdWFscyA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmdlcSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmdyZWF0ZXJPckVxdWFscztcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXJPckVxdWFscyA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcGFyZSh2KSA8PSAwO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUubGVxID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5sZXNzZXJPckVxdWFscyA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmxlcSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmxlc3Nlck9yRXF1YWxzO1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmlzRXZlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMudmFsdWVbMF0gJiAxKSA9PT0gMDtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmlzRXZlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMudmFsdWUgJiAxKSA9PT0gMDtcclxuICAgIH07XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuaXNPZGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuICh0aGlzLnZhbHVlWzBdICYgMSkgPT09IDE7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc09kZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gKHRoaXMudmFsdWUgJiAxKSA9PT0gMTtcclxuICAgIH07XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuaXNQb3NpdGl2ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gIXRoaXMuc2lnbjtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmlzUG9zaXRpdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWUgPiAwO1xyXG4gICAgfTtcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNpZ247XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc05lZ2F0aXZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlIDwgMDtcclxuICAgIH07XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuaXNVbml0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLmlzVW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5hYnModGhpcy52YWx1ZSkgPT09IDE7XHJcbiAgICB9O1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWUgPT09IDA7XHJcbiAgICB9O1xyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgdmFyIG4gPSBwYXJzZVZhbHVlKHYpO1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IG4udmFsdWU7XHJcbiAgICAgICAgaWYgKHZhbHVlID09PSAwKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHZhbHVlID09PSAxKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBpZiAodmFsdWUgPT09IDIpIHJldHVybiB0aGlzLmlzRXZlbigpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZChuKS5lcXVhbHMoSW50ZWdlclswXSk7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc0RpdmlzaWJsZUJ5ID0gQmlnSW50ZWdlci5wcm90b3R5cGUuaXNEaXZpc2libGVCeTtcclxuXHJcbiAgICBmdW5jdGlvbiBpc0Jhc2ljUHJpbWUodikge1xyXG4gICAgICAgIHZhciBuID0gdi5hYnMoKTtcclxuICAgICAgICBpZiAobi5pc1VuaXQoKSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmIChuLmVxdWFscygyKSB8fCBuLmVxdWFscygzKSB8fCBuLmVxdWFscyg1KSkgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgaWYgKG4uaXNFdmVuKCkgfHwgbi5pc0RpdmlzaWJsZUJ5KDMpIHx8IG4uaXNEaXZpc2libGVCeSg1KSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmIChuLmxlc3NlcigyNSkpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIC8vIHdlIGRvbid0IGtub3cgaWYgaXQncyBwcmltZTogbGV0IHRoZSBvdGhlciBmdW5jdGlvbnMgZmlndXJlIGl0IG91dFxyXG4gICAgfVxyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJpbWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGlzUHJpbWUgPSBpc0Jhc2ljUHJpbWUodGhpcyk7XHJcbiAgICAgICAgaWYgKGlzUHJpbWUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGlzUHJpbWU7XHJcbiAgICAgICAgdmFyIG4gPSB0aGlzLmFicygpLFxyXG4gICAgICAgICAgICBuUHJldiA9IG4ucHJldigpO1xyXG4gICAgICAgIHZhciBhID0gWzIsIDMsIDUsIDcsIDExLCAxMywgMTcsIDE5XSxcclxuICAgICAgICAgICAgYiA9IG5QcmV2LFxyXG4gICAgICAgICAgICBkLCB0LCBpLCB4O1xyXG4gICAgICAgIHdoaWxlIChiLmlzRXZlbigpKSBiID0gYi5kaXZpZGUoMik7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgeCA9IGJpZ0ludChhW2ldKS5tb2RQb3coYiwgbik7XHJcbiAgICAgICAgICAgIGlmICh4LmVxdWFscyhJbnRlZ2VyWzFdKSB8fCB4LmVxdWFscyhuUHJldikpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBmb3IgKHQgPSB0cnVlLCBkID0gYjsgdCAmJiBkLmxlc3NlcihuUHJldikgOyBkID0gZC5tdWx0aXBseSgyKSkge1xyXG4gICAgICAgICAgICAgICAgeCA9IHguc3F1YXJlKCkubW9kKG4pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHguZXF1YWxzKG5QcmV2KSkgdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuaXNQcmltZSA9IEJpZ0ludGVnZXIucHJvdG90eXBlLmlzUHJpbWU7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuaXNQcm9iYWJsZVByaW1lID0gZnVuY3Rpb24gKGl0ZXJhdGlvbnMpIHtcclxuICAgICAgICB2YXIgaXNQcmltZSA9IGlzQmFzaWNQcmltZSh0aGlzKTtcclxuICAgICAgICBpZiAoaXNQcmltZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gaXNQcmltZTtcclxuICAgICAgICB2YXIgbiA9IHRoaXMuYWJzKCk7XHJcbiAgICAgICAgdmFyIHQgPSBpdGVyYXRpb25zID09PSB1bmRlZmluZWQgPyA1IDogaXRlcmF0aW9ucztcclxuICAgICAgICAvLyB1c2UgdGhlIEZlcm1hdCBwcmltYWxpdHkgdGVzdFxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBhID0gYmlnSW50LnJhbmRCZXR3ZWVuKDIsIG4ubWludXMoMikpO1xyXG4gICAgICAgICAgICBpZiAoIWEubW9kUG93KG4ucHJldigpLCBuKS5pc1VuaXQoKSkgcmV0dXJuIGZhbHNlOyAvLyBkZWZpbml0ZWx5IGNvbXBvc2l0ZVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gbGFyZ2UgY2hhbmNlIG9mIGJlaW5nIHByaW1lXHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWUgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5pc1Byb2JhYmxlUHJpbWU7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUubW9kSW52ID0gZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICB2YXIgdCA9IGJpZ0ludC56ZXJvLCBuZXdUID0gYmlnSW50Lm9uZSwgciA9IHBhcnNlVmFsdWUobiksIG5ld1IgPSB0aGlzLmFicygpLCBxLCBsYXN0VCwgbGFzdFI7XHJcbiAgICAgICAgd2hpbGUgKCFuZXdSLmVxdWFscyhiaWdJbnQuemVybykpIHtcclxuICAgICAgICBcdHEgPSByLmRpdmlkZShuZXdSKTtcclxuICAgICAgICAgIGxhc3RUID0gdDtcclxuICAgICAgICAgIGxhc3RSID0gcjtcclxuICAgICAgICAgIHQgPSBuZXdUO1xyXG4gICAgICAgICAgciA9IG5ld1I7XHJcbiAgICAgICAgICBuZXdUID0gbGFzdFQuc3VidHJhY3QocS5tdWx0aXBseShuZXdUKSk7XHJcbiAgICAgICAgICBuZXdSID0gbGFzdFIuc3VidHJhY3QocS5tdWx0aXBseShuZXdSKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghci5lcXVhbHMoMSkpIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBhbmQgXCIgKyBuLnRvU3RyaW5nKCkgKyBcIiBhcmUgbm90IGNvLXByaW1lXCIpO1xyXG4gICAgICAgIGlmICh0LmNvbXBhcmUoMCkgPT09IC0xKSB7XHJcbiAgICAgICAgXHR0ID0gdC5hZGQobik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfVxyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnYgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5tb2RJbnY7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIGlmICh0aGlzLnNpZ24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN1YnRyYWN0U21hbGwodmFsdWUsIDEsIHRoaXMuc2lnbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgQmlnSW50ZWdlcihhZGRTbWFsbCh2YWx1ZSwgMSksIHRoaXMuc2lnbik7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgaWYgKHZhbHVlICsgMSA8IE1BWF9JTlQpIHJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHZhbHVlICsgMSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKE1BWF9JTlRfQVJSLCBmYWxzZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLnByZXYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgICAgICBpZiAodGhpcy5zaWduKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQmlnSW50ZWdlcihhZGRTbWFsbCh2YWx1ZSwgMSksIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3VidHJhY3RTbWFsbCh2YWx1ZSwgMSwgdGhpcy5zaWduKTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLnByZXYgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52YWx1ZTtcclxuICAgICAgICBpZiAodmFsdWUgLSAxID4gLU1BWF9JTlQpIHJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHZhbHVlIC0gMSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCaWdJbnRlZ2VyKE1BWF9JTlRfQVJSLCB0cnVlKTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHBvd2Vyc09mVHdvID0gWzFdO1xyXG4gICAgd2hpbGUgKHBvd2Vyc09mVHdvW3Bvd2Vyc09mVHdvLmxlbmd0aCAtIDFdIDw9IEJBU0UpIHBvd2Vyc09mVHdvLnB1c2goMiAqIHBvd2Vyc09mVHdvW3Bvd2Vyc09mVHdvLmxlbmd0aCAtIDFdKTtcclxuICAgIHZhciBwb3dlcnMyTGVuZ3RoID0gcG93ZXJzT2ZUd28ubGVuZ3RoLCBoaWdoZXN0UG93ZXIyID0gcG93ZXJzT2ZUd29bcG93ZXJzMkxlbmd0aCAtIDFdO1xyXG5cclxuICAgIGZ1bmN0aW9uIHNoaWZ0X2lzU21hbGwobikge1xyXG4gICAgICAgIHJldHVybiAoKHR5cGVvZiBuID09PSBcIm51bWJlclwiIHx8IHR5cGVvZiBuID09PSBcInN0cmluZ1wiKSAmJiArTWF0aC5hYnMobikgPD0gQkFTRSkgfHxcclxuICAgICAgICAgICAgKG4gaW5zdGFuY2VvZiBCaWdJbnRlZ2VyICYmIG4udmFsdWUubGVuZ3RoIDw9IDEpO1xyXG4gICAgfVxyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0TGVmdCA9IGZ1bmN0aW9uIChuKSB7XHJcbiAgICAgICAgaWYgKCFzaGlmdF9pc1NtYWxsKG4pKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihTdHJpbmcobikgKyBcIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbiA9ICtuO1xyXG4gICAgICAgIGlmIChuIDwgMCkgcmV0dXJuIHRoaXMuc2hpZnRSaWdodCgtbik7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHRoaXM7XHJcbiAgICAgICAgd2hpbGUgKG4gPj0gcG93ZXJzMkxlbmd0aCkge1xyXG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQubXVsdGlwbHkoaGlnaGVzdFBvd2VyMik7XHJcbiAgICAgICAgICAgIG4gLT0gcG93ZXJzMkxlbmd0aCAtIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQubXVsdGlwbHkocG93ZXJzT2ZUd29bbl0pO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0ID0gQmlnSW50ZWdlci5wcm90b3R5cGUuc2hpZnRMZWZ0O1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQgPSBmdW5jdGlvbiAobikge1xyXG4gICAgICAgIHZhciByZW1RdW87XHJcbiAgICAgICAgaWYgKCFzaGlmdF9pc1NtYWxsKG4pKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihTdHJpbmcobikgKyBcIiBpcyB0b28gbGFyZ2UgZm9yIHNoaWZ0aW5nLlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbiA9ICtuO1xyXG4gICAgICAgIGlmIChuIDwgMCkgcmV0dXJuIHRoaXMuc2hpZnRMZWZ0KC1uKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdGhpcztcclxuICAgICAgICB3aGlsZSAobiA+PSBwb3dlcnMyTGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuaXNaZXJvKCkpIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlbVF1byA9IGRpdk1vZEFueShyZXN1bHQsIGhpZ2hlc3RQb3dlcjIpO1xyXG4gICAgICAgICAgICByZXN1bHQgPSByZW1RdW9bMV0uaXNOZWdhdGl2ZSgpID8gcmVtUXVvWzBdLnByZXYoKSA6IHJlbVF1b1swXTtcclxuICAgICAgICAgICAgbiAtPSBwb3dlcnMyTGVuZ3RoIC0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVtUXVvID0gZGl2TW9kQW55KHJlc3VsdCwgcG93ZXJzT2ZUd29bbl0pO1xyXG4gICAgICAgIHJldHVybiByZW1RdW9bMV0uaXNOZWdhdGl2ZSgpID8gcmVtUXVvWzBdLnByZXYoKSA6IHJlbVF1b1swXTtcclxuICAgIH07XHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLnNoaWZ0UmlnaHQgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5zaGlmdFJpZ2h0O1xyXG5cclxuICAgIGZ1bmN0aW9uIGJpdHdpc2UoeCwgeSwgZm4pIHtcclxuICAgICAgICB5ID0gcGFyc2VWYWx1ZSh5KTtcclxuICAgICAgICB2YXIgeFNpZ24gPSB4LmlzTmVnYXRpdmUoKSwgeVNpZ24gPSB5LmlzTmVnYXRpdmUoKTtcclxuICAgICAgICB2YXIgeFJlbSA9IHhTaWduID8geC5ub3QoKSA6IHgsXHJcbiAgICAgICAgICAgIHlSZW0gPSB5U2lnbiA/IHkubm90KCkgOiB5O1xyXG4gICAgICAgIHZhciB4Qml0cyA9IFtdLCB5Qml0cyA9IFtdO1xyXG4gICAgICAgIHZhciB4U3RvcCA9IGZhbHNlLCB5U3RvcCA9IGZhbHNlO1xyXG4gICAgICAgIHdoaWxlICgheFN0b3AgfHwgIXlTdG9wKSB7XHJcbiAgICAgICAgICAgIGlmICh4UmVtLmlzWmVybygpKSB7IC8vIHZpcnR1YWwgc2lnbiBleHRlbnNpb24gZm9yIHNpbXVsYXRpbmcgdHdvJ3MgY29tcGxlbWVudFxyXG4gICAgICAgICAgICAgICAgeFN0b3AgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgeEJpdHMucHVzaCh4U2lnbiA/IDEgOiAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh4U2lnbikgeEJpdHMucHVzaCh4UmVtLmlzRXZlbigpID8gMSA6IDApOyAvLyB0d28ncyBjb21wbGVtZW50IGZvciBuZWdhdGl2ZSBudW1iZXJzXHJcbiAgICAgICAgICAgIGVsc2UgeEJpdHMucHVzaCh4UmVtLmlzRXZlbigpID8gMCA6IDEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHlSZW0uaXNaZXJvKCkpIHtcclxuICAgICAgICAgICAgICAgIHlTdG9wID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHlCaXRzLnB1c2goeVNpZ24gPyAxIDogMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoeVNpZ24pIHlCaXRzLnB1c2goeVJlbS5pc0V2ZW4oKSA/IDEgOiAwKTtcclxuICAgICAgICAgICAgZWxzZSB5Qml0cy5wdXNoKHlSZW0uaXNFdmVuKCkgPyAwIDogMSk7XHJcblxyXG4gICAgICAgICAgICB4UmVtID0geFJlbS5vdmVyKDIpO1xyXG4gICAgICAgICAgICB5UmVtID0geVJlbS5vdmVyKDIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmVzdWx0ID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4Qml0cy5sZW5ndGg7IGkrKykgcmVzdWx0LnB1c2goZm4oeEJpdHNbaV0sIHlCaXRzW2ldKSk7XHJcbiAgICAgICAgdmFyIHN1bSA9IGJpZ0ludChyZXN1bHQucG9wKCkpLm5lZ2F0ZSgpLnRpbWVzKGJpZ0ludCgyKS5wb3cocmVzdWx0Lmxlbmd0aCkpO1xyXG4gICAgICAgIHdoaWxlIChyZXN1bHQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHN1bSA9IHN1bS5hZGQoYmlnSW50KHJlc3VsdC5wb3AoKSkudGltZXMoYmlnSW50KDIpLnBvdyhyZXN1bHQubGVuZ3RoKSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3VtO1xyXG4gICAgfVxyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLm5vdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5uZWdhdGUoKS5wcmV2KCk7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS5ub3QgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5ub3Q7XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUuYW5kID0gZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICByZXR1cm4gYml0d2lzZSh0aGlzLCBuLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYSAmIGI7IH0pO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUuYW5kID0gQmlnSW50ZWdlci5wcm90b3R5cGUuYW5kO1xyXG5cclxuICAgIEJpZ0ludGVnZXIucHJvdG90eXBlLm9yID0gZnVuY3Rpb24gKG4pIHtcclxuICAgICAgICByZXR1cm4gYml0d2lzZSh0aGlzLCBuLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYSB8IGI7IH0pO1xyXG4gICAgfTtcclxuICAgIFNtYWxsSW50ZWdlci5wcm90b3R5cGUub3IgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS5vcjtcclxuXHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS54b3IgPSBmdW5jdGlvbiAobikge1xyXG4gICAgICAgIHJldHVybiBiaXR3aXNlKHRoaXMsIG4sIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhIF4gYjsgfSk7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS54b3IgPSBCaWdJbnRlZ2VyLnByb3RvdHlwZS54b3I7XHJcblxyXG4gICAgdmFyIExPQk1BU0tfSSA9IDEgPDwgMzAsIExPQk1BU0tfQkkgPSAoQkFTRSAmIC1CQVNFKSAqIChCQVNFICYgLUJBU0UpIHwgTE9CTUFTS19JO1xyXG4gICAgZnVuY3Rpb24gcm91Z2hMT0IobikgeyAvLyBnZXQgbG93ZXN0T25lQml0IChyb3VnaClcclxuICAgICAgICAvLyBTbWFsbEludGVnZXI6IHJldHVybiBNaW4obG93ZXN0T25lQml0KG4pLCAxIDw8IDMwKVxyXG4gICAgICAgIC8vIEJpZ0ludGVnZXI6IHJldHVybiBNaW4obG93ZXN0T25lQml0KG4pLCAxIDw8IDE0KSBbQkFTRT0xZTddXHJcbiAgICAgICAgdmFyIHYgPSBuLnZhbHVlLCB4ID0gdHlwZW9mIHYgPT09IFwibnVtYmVyXCIgPyB2IHwgTE9CTUFTS19JIDogdlswXSArIHZbMV0gKiBCQVNFIHwgTE9CTUFTS19CSTtcclxuICAgICAgICByZXR1cm4geCAmIC14O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1heChhLCBiKSB7XHJcbiAgICAgICAgYSA9IHBhcnNlVmFsdWUoYSk7XHJcbiAgICAgICAgYiA9IHBhcnNlVmFsdWUoYik7XHJcbiAgICAgICAgcmV0dXJuIGEuZ3JlYXRlcihiKSA/IGEgOiBiO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gbWluKGEsYikge1xyXG4gICAgICAgIGEgPSBwYXJzZVZhbHVlKGEpO1xyXG4gICAgICAgIGIgPSBwYXJzZVZhbHVlKGIpO1xyXG4gICAgICAgIHJldHVybiBhLmxlc3NlcihiKSA/IGEgOiBiO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gZ2NkKGEsIGIpIHtcclxuICAgICAgICBhID0gcGFyc2VWYWx1ZShhKS5hYnMoKTtcclxuICAgICAgICBiID0gcGFyc2VWYWx1ZShiKS5hYnMoKTtcclxuICAgICAgICBpZiAoYS5lcXVhbHMoYikpIHJldHVybiBhO1xyXG4gICAgICAgIGlmIChhLmlzWmVybygpKSByZXR1cm4gYjtcclxuICAgICAgICBpZiAoYi5pc1plcm8oKSkgcmV0dXJuIGE7XHJcbiAgICAgICAgdmFyIGMgPSBJbnRlZ2VyWzFdLCBkLCB0O1xyXG4gICAgICAgIHdoaWxlIChhLmlzRXZlbigpICYmIGIuaXNFdmVuKCkpIHtcclxuICAgICAgICAgICAgZCA9IE1hdGgubWluKHJvdWdoTE9CKGEpLCByb3VnaExPQihiKSk7XHJcbiAgICAgICAgICAgIGEgPSBhLmRpdmlkZShkKTtcclxuICAgICAgICAgICAgYiA9IGIuZGl2aWRlKGQpO1xyXG4gICAgICAgICAgICBjID0gYy5tdWx0aXBseShkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2hpbGUgKGEuaXNFdmVuKCkpIHtcclxuICAgICAgICAgICAgYSA9IGEuZGl2aWRlKHJvdWdoTE9CKGEpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICB3aGlsZSAoYi5pc0V2ZW4oKSkge1xyXG4gICAgICAgICAgICAgICAgYiA9IGIuZGl2aWRlKHJvdWdoTE9CKGIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYS5ncmVhdGVyKGIpKSB7XHJcbiAgICAgICAgICAgICAgICB0ID0gYjsgYiA9IGE7IGEgPSB0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGIgPSBiLnN1YnRyYWN0KGEpO1xyXG4gICAgICAgIH0gd2hpbGUgKCFiLmlzWmVybygpKTtcclxuICAgICAgICByZXR1cm4gYy5pc1VuaXQoKSA/IGEgOiBhLm11bHRpcGx5KGMpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gbGNtKGEsIGIpIHtcclxuICAgICAgICBhID0gcGFyc2VWYWx1ZShhKS5hYnMoKTtcclxuICAgICAgICBiID0gcGFyc2VWYWx1ZShiKS5hYnMoKTtcclxuICAgICAgICByZXR1cm4gYS5kaXZpZGUoZ2NkKGEsIGIpKS5tdWx0aXBseShiKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHJhbmRCZXR3ZWVuKGEsIGIpIHtcclxuICAgICAgICBhID0gcGFyc2VWYWx1ZShhKTtcclxuICAgICAgICBiID0gcGFyc2VWYWx1ZShiKTtcclxuICAgICAgICB2YXIgbG93ID0gbWluKGEsIGIpLCBoaWdoID0gbWF4KGEsIGIpO1xyXG4gICAgICAgIHZhciByYW5nZSA9IGhpZ2guc3VidHJhY3QobG93KTtcclxuICAgICAgICBpZiAocmFuZ2UuaXNTbWFsbCkgcmV0dXJuIGxvdy5hZGQoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogcmFuZ2UpKTtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gcmFuZ2UudmFsdWUubGVuZ3RoIC0gMTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gW10sIHJlc3RyaWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSBsZW5ndGg7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgICAgICAgIHZhciB0b3AgPSByZXN0cmljdGVkID8gcmFuZ2UudmFsdWVbaV0gOiBCQVNFO1xyXG4gICAgICAgICAgICB2YXIgZGlnaXQgPSB0cnVuY2F0ZShNYXRoLnJhbmRvbSgpICogdG9wKTtcclxuICAgICAgICAgICAgcmVzdWx0LnVuc2hpZnQoZGlnaXQpO1xyXG4gICAgICAgICAgICBpZiAoZGlnaXQgPCB0b3ApIHJlc3RyaWN0ZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVzdWx0ID0gYXJyYXlUb1NtYWxsKHJlc3VsdCk7XHJcbiAgICAgICAgcmV0dXJuIGxvdy5hZGQodHlwZW9mIHJlc3VsdCA9PT0gXCJudW1iZXJcIiA/IG5ldyBTbWFsbEludGVnZXIocmVzdWx0KSA6IG5ldyBCaWdJbnRlZ2VyKHJlc3VsdCwgZmFsc2UpKTtcclxuICAgIH1cclxuICAgIHZhciBwYXJzZUJhc2UgPSBmdW5jdGlvbiAodGV4dCwgYmFzZSkge1xyXG4gICAgICAgIHZhciB2YWwgPSBJbnRlZ2VyWzBdLCBwb3cgPSBJbnRlZ2VyWzFdLFxyXG4gICAgICAgICAgICBsZW5ndGggPSB0ZXh0Lmxlbmd0aDtcclxuICAgICAgICBpZiAoMiA8PSBiYXNlICYmIGJhc2UgPD0gMzYpIHtcclxuICAgICAgICAgICAgaWYgKGxlbmd0aCA8PSBMT0dfTUFYX0lOVCAvIE1hdGgubG9nKGJhc2UpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFNtYWxsSW50ZWdlcihwYXJzZUludCh0ZXh0LCBiYXNlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYmFzZSA9IHBhcnNlVmFsdWUoYmFzZSk7XHJcbiAgICAgICAgdmFyIGRpZ2l0cyA9IFtdO1xyXG4gICAgICAgIHZhciBpO1xyXG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdGV4dFswXSA9PT0gXCItXCI7XHJcbiAgICAgICAgZm9yIChpID0gaXNOZWdhdGl2ZSA/IDEgOiAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgYyA9IHRleHRbaV0udG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gYy5jaGFyQ29kZUF0KDApO1xyXG4gICAgICAgICAgICBpZiAoNDggPD0gY2hhckNvZGUgJiYgY2hhckNvZGUgPD0gNTcpIGRpZ2l0cy5wdXNoKHBhcnNlVmFsdWUoYykpO1xyXG4gICAgICAgICAgICBlbHNlIGlmICg5NyA8PSBjaGFyQ29kZSAmJiBjaGFyQ29kZSA8PSAxMjIpIGRpZ2l0cy5wdXNoKHBhcnNlVmFsdWUoYy5jaGFyQ29kZUF0KDApIC0gODcpKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAoYyA9PT0gXCI8XCIpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzdGFydCA9IGk7XHJcbiAgICAgICAgICAgICAgICBkbyB7IGkrKzsgfSB3aGlsZSAodGV4dFtpXSAhPT0gXCI+XCIpO1xyXG4gICAgICAgICAgICAgICAgZGlnaXRzLnB1c2gocGFyc2VWYWx1ZSh0ZXh0LnNsaWNlKHN0YXJ0ICsgMSwgaSkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHRocm93IG5ldyBFcnJvcihjICsgXCIgaXMgbm90IGEgdmFsaWQgY2hhcmFjdGVyXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkaWdpdHMucmV2ZXJzZSgpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBkaWdpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFsID0gdmFsLmFkZChkaWdpdHNbaV0udGltZXMocG93KSk7XHJcbiAgICAgICAgICAgIHBvdyA9IHBvdy50aW1lcyhiYXNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGlzTmVnYXRpdmUgPyB2YWwubmVnYXRlKCkgOiB2YWw7XHJcbiAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIHN0cmluZ2lmeShkaWdpdCkge1xyXG4gICAgICAgIHZhciB2ID0gZGlnaXQudmFsdWU7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSBcIm51bWJlclwiKSB2ID0gW3ZdO1xyXG4gICAgICAgIGlmICh2Lmxlbmd0aCA9PT0gMSAmJiB2WzBdIDw9IDM1KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcIjAxMjM0NTY3ODlhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5elwiLmNoYXJBdCh2WzBdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFwiPFwiICsgdiArIFwiPlwiO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gdG9CYXNlKG4sIGJhc2UpIHtcclxuICAgICAgICBiYXNlID0gYmlnSW50KGJhc2UpO1xyXG4gICAgICAgIGlmIChiYXNlLmlzWmVybygpKSB7XHJcbiAgICAgICAgICAgIGlmIChuLmlzWmVybygpKSByZXR1cm4gXCIwXCI7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjb252ZXJ0IG5vbnplcm8gbnVtYmVycyB0byBiYXNlIDAuXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYmFzZS5lcXVhbHMoLTEpKSB7XHJcbiAgICAgICAgICAgIGlmIChuLmlzWmVybygpKSByZXR1cm4gXCIwXCI7XHJcbiAgICAgICAgICAgIGlmIChuLmlzTmVnYXRpdmUoKSkgcmV0dXJuIG5ldyBBcnJheSgxIC0gbikuam9pbihcIjEwXCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gXCIxXCIgKyBuZXcgQXJyYXkoK24pLmpvaW4oXCIwMVwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG1pbnVzU2lnbiA9IFwiXCI7XHJcbiAgICAgICAgaWYgKG4uaXNOZWdhdGl2ZSgpICYmIGJhc2UuaXNQb3NpdGl2ZSgpKSB7XHJcbiAgICAgICAgICAgIG1pbnVzU2lnbiA9IFwiLVwiO1xyXG4gICAgICAgICAgICBuID0gbi5hYnMoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJhc2UuZXF1YWxzKDEpKSB7XHJcbiAgICAgICAgICAgIGlmIChuLmlzWmVybygpKSByZXR1cm4gXCIwXCI7XHJcbiAgICAgICAgICAgIHJldHVybiBtaW51c1NpZ24gKyBuZXcgQXJyYXkoK24gKyAxKS5qb2luKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgb3V0ID0gW107XHJcbiAgICAgICAgdmFyIGxlZnQgPSBuLCBkaXZtb2Q7XHJcbiAgICAgICAgd2hpbGUgKGxlZnQuaXNOZWdhdGl2ZSgpIHx8IGxlZnQuY29tcGFyZUFicyhiYXNlKSA+PSAwKSB7XHJcbiAgICAgICAgICAgIGRpdm1vZCA9IGxlZnQuZGl2bW9kKGJhc2UpO1xyXG4gICAgICAgICAgICBsZWZ0ID0gZGl2bW9kLnF1b3RpZW50O1xyXG4gICAgICAgICAgICB2YXIgZGlnaXQgPSBkaXZtb2QucmVtYWluZGVyO1xyXG4gICAgICAgICAgICBpZiAoZGlnaXQuaXNOZWdhdGl2ZSgpKSB7XHJcbiAgICAgICAgICAgICAgICBkaWdpdCA9IGJhc2UubWludXMoZGlnaXQpLmFicygpO1xyXG4gICAgICAgICAgICAgICAgbGVmdCA9IGxlZnQubmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG91dC5wdXNoKHN0cmluZ2lmeShkaWdpdCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBvdXQucHVzaChzdHJpbmdpZnkobGVmdCkpO1xyXG4gICAgICAgIHJldHVybiBtaW51c1NpZ24gKyBvdXQucmV2ZXJzZSgpLmpvaW4oXCJcIik7XHJcbiAgICB9XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAocmFkaXgpIHtcclxuICAgICAgICBpZiAocmFkaXggPT09IHVuZGVmaW5lZCkgcmFkaXggPSAxMDtcclxuICAgICAgICBpZiAocmFkaXggIT09IDEwKSByZXR1cm4gdG9CYXNlKHRoaXMsIHJhZGl4KTtcclxuICAgICAgICB2YXIgdiA9IHRoaXMudmFsdWUsIGwgPSB2Lmxlbmd0aCwgc3RyID0gU3RyaW5nKHZbLS1sXSksIHplcm9zID0gXCIwMDAwMDAwXCIsIGRpZ2l0O1xyXG4gICAgICAgIHdoaWxlICgtLWwgPj0gMCkge1xyXG4gICAgICAgICAgICBkaWdpdCA9IFN0cmluZyh2W2xdKTtcclxuICAgICAgICAgICAgc3RyICs9IHplcm9zLnNsaWNlKGRpZ2l0Lmxlbmd0aCkgKyBkaWdpdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNpZ24gPSB0aGlzLnNpZ24gPyBcIi1cIiA6IFwiXCI7XHJcbiAgICAgICAgcmV0dXJuIHNpZ24gKyBzdHI7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChyYWRpeCkge1xyXG4gICAgICAgIGlmIChyYWRpeCA9PT0gdW5kZWZpbmVkKSByYWRpeCA9IDEwO1xyXG4gICAgICAgIGlmIChyYWRpeCAhPSAxMCkgcmV0dXJuIHRvQmFzZSh0aGlzLCByYWRpeCk7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyh0aGlzLnZhbHVlKTtcclxuICAgIH07XHJcblxyXG4gICAgQmlnSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gK3RoaXMudG9TdHJpbmcoKTtcclxuICAgIH07XHJcbiAgICBCaWdJbnRlZ2VyLnByb3RvdHlwZS50b0pTTnVtYmVyID0gQmlnSW50ZWdlci5wcm90b3R5cGUudmFsdWVPZjtcclxuXHJcbiAgICBTbWFsbEludGVnZXIucHJvdG90eXBlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XHJcbiAgICB9O1xyXG4gICAgU21hbGxJbnRlZ2VyLnByb3RvdHlwZS50b0pTTnVtYmVyID0gU21hbGxJbnRlZ2VyLnByb3RvdHlwZS52YWx1ZU9mO1xyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlU3RyaW5nVmFsdWUodikge1xyXG4gICAgICAgICAgICBpZiAoaXNQcmVjaXNlKCt2KSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHggPSArdjtcclxuICAgICAgICAgICAgICAgIGlmICh4ID09PSB0cnVuY2F0ZSh4KSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFNtYWxsSW50ZWdlcih4KTtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiSW52YWxpZCBpbnRlZ2VyOiBcIiArIHY7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHNpZ24gPSB2WzBdID09PSBcIi1cIjtcclxuICAgICAgICAgICAgaWYgKHNpZ24pIHYgPSB2LnNsaWNlKDEpO1xyXG4gICAgICAgICAgICB2YXIgc3BsaXQgPSB2LnNwbGl0KC9lL2kpO1xyXG4gICAgICAgICAgICBpZiAoc3BsaXQubGVuZ3RoID4gMikgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBpbnRlZ2VyOiBcIiArIHNwbGl0LmpvaW4oXCJlXCIpKTtcclxuICAgICAgICAgICAgaWYgKHNwbGl0Lmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV4cCA9IHNwbGl0WzFdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGV4cFswXSA9PT0gXCIrXCIpIGV4cCA9IGV4cC5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgIGV4cCA9ICtleHA7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhwICE9PSB0cnVuY2F0ZShleHApIHx8ICFpc1ByZWNpc2UoZXhwKSkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBpbnRlZ2VyOiBcIiArIGV4cCArIFwiIGlzIG5vdCBhIHZhbGlkIGV4cG9uZW50LlwiKTtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gc3BsaXRbMF07XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVjaW1hbFBsYWNlID0gdGV4dC5pbmRleE9mKFwiLlwiKTtcclxuICAgICAgICAgICAgICAgIGlmIChkZWNpbWFsUGxhY2UgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4cCAtPSB0ZXh0Lmxlbmd0aCAtIGRlY2ltYWxQbGFjZSAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dCA9IHRleHQuc2xpY2UoMCwgZGVjaW1hbFBsYWNlKSArIHRleHQuc2xpY2UoZGVjaW1hbFBsYWNlICsgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZXhwIDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGluY2x1ZGUgbmVnYXRpdmUgZXhwb25lbnQgcGFydCBmb3IgaW50ZWdlcnNcIik7XHJcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IChuZXcgQXJyYXkoZXhwICsgMSkpLmpvaW4oXCIwXCIpO1xyXG4gICAgICAgICAgICAgICAgdiA9IHRleHQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGlzVmFsaWQgPSAvXihbMC05XVswLTldKikkLy50ZXN0KHYpO1xyXG4gICAgICAgICAgICBpZiAoIWlzVmFsaWQpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgaW50ZWdlcjogXCIgKyB2KTtcclxuICAgICAgICAgICAgdmFyIHIgPSBbXSwgbWF4ID0gdi5sZW5ndGgsIGwgPSBMT0dfQkFTRSwgbWluID0gbWF4IC0gbDtcclxuICAgICAgICAgICAgd2hpbGUgKG1heCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHIucHVzaCgrdi5zbGljZShtaW4sIG1heCkpO1xyXG4gICAgICAgICAgICAgICAgbWluIC09IGw7XHJcbiAgICAgICAgICAgICAgICBpZiAobWluIDwgMCkgbWluID0gMDtcclxuICAgICAgICAgICAgICAgIG1heCAtPSBsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyaW0ocik7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQmlnSW50ZWdlcihyLCBzaWduKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZU51bWJlclZhbHVlKHYpIHtcclxuICAgICAgICBpZiAoaXNQcmVjaXNlKHYpKSB7XHJcbiAgICAgICAgICAgIGlmICh2ICE9PSB0cnVuY2F0ZSh2KSkgdGhyb3cgbmV3IEVycm9yKHYgKyBcIiBpcyBub3QgYW4gaW50ZWdlci5cIik7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU21hbGxJbnRlZ2VyKHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcGFyc2VTdHJpbmdWYWx1ZSh2LnRvU3RyaW5nKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlVmFsdWUodikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdiA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyc2VOdW1iZXJWYWx1ZSh2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVN0cmluZ1ZhbHVlKHYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdjtcclxuICAgIH1cclxuICAgIC8vIFByZS1kZWZpbmUgbnVtYmVycyBpbiByYW5nZSBbLTk5OSw5OTldXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IDEwMDA7IGkrKykge1xyXG4gICAgICAgIEludGVnZXJbaV0gPSBuZXcgU21hbGxJbnRlZ2VyKGkpO1xyXG4gICAgICAgIGlmIChpID4gMCkgSW50ZWdlclstaV0gPSBuZXcgU21hbGxJbnRlZ2VyKC1pKTtcclxuICAgIH1cclxuICAgIC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XHJcbiAgICBJbnRlZ2VyLm9uZSA9IEludGVnZXJbMV07XHJcbiAgICBJbnRlZ2VyLnplcm8gPSBJbnRlZ2VyWzBdO1xyXG4gICAgSW50ZWdlci5taW51c09uZSA9IEludGVnZXJbLTFdO1xyXG4gICAgSW50ZWdlci5tYXggPSBtYXg7XHJcbiAgICBJbnRlZ2VyLm1pbiA9IG1pbjtcclxuICAgIEludGVnZXIuZ2NkID0gZ2NkO1xyXG4gICAgSW50ZWdlci5sY20gPSBsY207XHJcbiAgICBJbnRlZ2VyLmlzSW5zdGFuY2UgPSBmdW5jdGlvbiAoeCkgeyByZXR1cm4geCBpbnN0YW5jZW9mIEJpZ0ludGVnZXIgfHwgeCBpbnN0YW5jZW9mIFNtYWxsSW50ZWdlcjsgfTtcclxuICAgIEludGVnZXIucmFuZEJldHdlZW4gPSByYW5kQmV0d2VlbjtcclxuICAgIHJldHVybiBJbnRlZ2VyO1xyXG59KSgpO1xyXG5cclxuLy8gTm9kZS5qcyBjaGVja1xyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuaGFzT3duUHJvcGVydHkoXCJleHBvcnRzXCIpKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGJpZ0ludDtcclxufVxyXG4iLCIiLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBEdWUgdG8gdmFyaW91cyBicm93c2VyIGJ1Z3MsIHNvbWV0aW1lcyB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uIHdpbGwgYmUgdXNlZCBldmVuXG4gKiB3aGVuIHRoZSBicm93c2VyIHN1cHBvcnRzIHR5cGVkIGFycmF5cy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqICAgLSBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsXG4gKiAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzguXG4gKlxuICogICAtIENocm9tZSA5LTEwIGlzIG1pc3NpbmcgdGhlIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24uXG4gKlxuICogICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgICBpbmNvcnJlY3QgbGVuZ3RoIGluIHNvbWUgc2l0dWF0aW9ucy5cblxuICogV2UgZGV0ZWN0IHRoZXNlIGJ1Z2d5IGJyb3dzZXJzIGFuZCBzZXQgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXlcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IGJlaGF2ZXMgY29ycmVjdGx5LlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUICE9PSB1bmRlZmluZWRcbiAgPyBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVFxuICA6IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuLypcbiAqIEV4cG9ydCBrTWF4TGVuZ3RoIGFmdGVyIHR5cGVkIGFycmF5IHN1cHBvcnQgaXMgZGV0ZXJtaW5lZC5cbiAqL1xuZXhwb3J0cy5rTWF4TGVuZ3RoID0ga01heExlbmd0aCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBhcnIuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24ga01heExlbmd0aCAoKSB7XG4gIHJldHVybiBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVFxuICAgID8gMHg3ZmZmZmZmZlxuICAgIDogMHgzZmZmZmZmZlxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKHRoYXQsIGxlbmd0aCkge1xuICBpZiAoa01heExlbmd0aCgpIDwgbGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICAgIHRoYXQuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gYW4gb2JqZWN0IGluc3RhbmNlIG9mIHRoZSBCdWZmZXIgY2xhc3NcbiAgICBpZiAodGhhdCA9PT0gbnVsbCkge1xuICAgICAgdGhhdCA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICAgIH1cbiAgICB0aGF0Lmxlbmd0aCA9IGxlbmd0aFxuICB9XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUodGhpcywgYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKHRoaXMsIGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuLy8gVE9ETzogTGVnYWN5LCBub3QgbmVlZGVkIGFueW1vcmUuIFJlbW92ZSBpbiBuZXh0IG1ham9yIHZlcnNpb24uXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gZnJvbSAodGhhdCwgdmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJiB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh0aGF0LCB2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoYXQsIHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKG51bGwsIHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbmlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICBCdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG4gIEJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gICAgLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgICAgdmFsdWU6IG51bGwsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG5lZ2F0aXZlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAodGhhdCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHRoYXQsIHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2MobnVsbCwgc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlICh0aGF0LCBzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgdGhhdCA9IGNyZWF0ZUJ1ZmZlcih0aGF0LCBzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgKytpKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKG51bGwsIHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHRoYXQsIHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSB0aGF0LndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICB0aGF0ID0gdGhhdC5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyICh0aGF0LCBhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGFycmF5LmJ5dGVMZW5ndGggLy8gdGhpcyB0aHJvd3MgaWYgYGFycmF5YCBpcyBub3QgYSB2YWxpZCBBcnJheUJ1ZmZlclxuXG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYXJyYXkgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBhcnJheSA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICB0aGF0ID0gYXJyYXlcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdCA9IGZyb21BcnJheUxpa2UodGhhdCwgYXJyYXkpXG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAodGhhdCwgb2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHRoYXQgPSBjcmVhdGVCdWZmZXIodGhhdCwgbGVuKVxuXG4gICAgaWYgKHRoYXQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdFxuICAgIH1cblxuICAgIG9iai5jb3B5KHRoYXQsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gdGhhdFxuICB9XG5cbiAgaWYgKG9iaikge1xuICAgIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICBvYmouYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHx8ICdsZW5ndGgnIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBpc25hbihvYmoubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHRoYXQsIDApXG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZSh0aGF0LCBvYmopXG4gICAgfVxuXG4gICAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KG9iai5kYXRhKSkge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqLmRhdGEpXG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksIG9yIGFycmF5LWxpa2Ugb2JqZWN0LicpXG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoKClgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IHN0cmluZyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoZSBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIGFuZCBgaXMtYnVmZmVyYCAoaW4gU2FmYXJpIDUtNykgdG8gZGV0ZWN0XG4vLyBCdWZmZXIgaW5zdGFuY2VzLlxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCB8IDBcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0ICAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAoaXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJlxuICAgICAgICB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47ICsraSkge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgKytpKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7ICsraSkge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmIChjb2RlIDwgMjU2KSB7XG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiB1dGY4VG9CeXRlcyhuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGlzbmFuICh2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gdmFsIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvKlxub2JqZWN0LWFzc2lnblxuKGMpIFNpbmRyZSBTb3JodXNcbkBsaWNlbnNlIE1JVFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwiLy8gcHJvdG90eXBlIGNsYXNzIGZvciBoYXNoIGZ1bmN0aW9uc1xuZnVuY3Rpb24gSGFzaCAoYmxvY2tTaXplLCBmaW5hbFNpemUpIHtcbiAgdGhpcy5fYmxvY2sgPSBuZXcgQnVmZmVyKGJsb2NrU2l6ZSlcbiAgdGhpcy5fZmluYWxTaXplID0gZmluYWxTaXplXG4gIHRoaXMuX2Jsb2NrU2l6ZSA9IGJsb2NrU2l6ZVxuICB0aGlzLl9sZW4gPSAwXG4gIHRoaXMuX3MgPSAwXG59XG5cbkhhc2gucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChkYXRhLCBlbmMpIHtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgIGVuYyA9IGVuYyB8fCAndXRmOCdcbiAgICBkYXRhID0gbmV3IEJ1ZmZlcihkYXRhLCBlbmMpXG4gIH1cblxuICB2YXIgbCA9IHRoaXMuX2xlbiArPSBkYXRhLmxlbmd0aFxuICB2YXIgcyA9IHRoaXMuX3MgfHwgMFxuICB2YXIgZiA9IDBcbiAgdmFyIGJ1ZmZlciA9IHRoaXMuX2Jsb2NrXG5cbiAgd2hpbGUgKHMgPCBsKSB7XG4gICAgdmFyIHQgPSBNYXRoLm1pbihkYXRhLmxlbmd0aCwgZiArIHRoaXMuX2Jsb2NrU2l6ZSAtIChzICUgdGhpcy5fYmxvY2tTaXplKSlcbiAgICB2YXIgY2ggPSAodCAtIGYpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoOyBpKyspIHtcbiAgICAgIGJ1ZmZlclsocyAlIHRoaXMuX2Jsb2NrU2l6ZSkgKyBpXSA9IGRhdGFbaSArIGZdXG4gICAgfVxuXG4gICAgcyArPSBjaFxuICAgIGYgKz0gY2hcblxuICAgIGlmICgocyAlIHRoaXMuX2Jsb2NrU2l6ZSkgPT09IDApIHtcbiAgICAgIHRoaXMuX3VwZGF0ZShidWZmZXIpXG4gICAgfVxuICB9XG4gIHRoaXMuX3MgPSBzXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuSGFzaC5wcm90b3R5cGUuZGlnZXN0ID0gZnVuY3Rpb24gKGVuYykge1xuICAvLyBTdXBwb3NlIHRoZSBsZW5ndGggb2YgdGhlIG1lc3NhZ2UgTSwgaW4gYml0cywgaXMgbFxuICB2YXIgbCA9IHRoaXMuX2xlbiAqIDhcblxuICAvLyBBcHBlbmQgdGhlIGJpdCAxIHRvIHRoZSBlbmQgb2YgdGhlIG1lc3NhZ2VcbiAgdGhpcy5fYmxvY2tbdGhpcy5fbGVuICUgdGhpcy5fYmxvY2tTaXplXSA9IDB4ODBcblxuICAvLyBhbmQgdGhlbiBrIHplcm8gYml0cywgd2hlcmUgayBpcyB0aGUgc21hbGxlc3Qgbm9uLW5lZ2F0aXZlIHNvbHV0aW9uIHRvIHRoZSBlcXVhdGlvbiAobCArIDEgKyBrKSA9PT0gZmluYWxTaXplIG1vZCBibG9ja1NpemVcbiAgdGhpcy5fYmxvY2suZmlsbCgwLCB0aGlzLl9sZW4gJSB0aGlzLl9ibG9ja1NpemUgKyAxKVxuXG4gIGlmIChsICUgKHRoaXMuX2Jsb2NrU2l6ZSAqIDgpID49IHRoaXMuX2ZpbmFsU2l6ZSAqIDgpIHtcbiAgICB0aGlzLl91cGRhdGUodGhpcy5fYmxvY2spXG4gICAgdGhpcy5fYmxvY2suZmlsbCgwKVxuICB9XG5cbiAgLy8gdG8gdGhpcyBhcHBlbmQgdGhlIGJsb2NrIHdoaWNoIGlzIGVxdWFsIHRvIHRoZSBudW1iZXIgbCB3cml0dGVuIGluIGJpbmFyeVxuICAvLyBUT0RPOiBoYW5kbGUgY2FzZSB3aGVyZSBsIGlzID4gTWF0aC5wb3coMiwgMjkpXG4gIHRoaXMuX2Jsb2NrLndyaXRlSW50MzJCRShsLCB0aGlzLl9ibG9ja1NpemUgLSA0KVxuXG4gIHZhciBoYXNoID0gdGhpcy5fdXBkYXRlKHRoaXMuX2Jsb2NrKSB8fCB0aGlzLl9oYXNoKClcblxuICByZXR1cm4gZW5jID8gaGFzaC50b1N0cmluZyhlbmMpIDogaGFzaFxufVxuXG5IYXNoLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ191cGRhdGUgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzcycpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFzaFxuIiwidmFyIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFNIQSAoYWxnb3JpdGhtKSB7XG4gIGFsZ29yaXRobSA9IGFsZ29yaXRobS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIEFsZ29yaXRobSA9IGV4cG9ydHNbYWxnb3JpdGhtXVxuICBpZiAoIUFsZ29yaXRobSkgdGhyb3cgbmV3IEVycm9yKGFsZ29yaXRobSArICcgaXMgbm90IHN1cHBvcnRlZCAod2UgYWNjZXB0IHB1bGwgcmVxdWVzdHMpJylcblxuICByZXR1cm4gbmV3IEFsZ29yaXRobSgpXG59XG5cbmV4cG9ydHMuc2hhID0gcmVxdWlyZSgnLi9zaGEnKVxuZXhwb3J0cy5zaGExID0gcmVxdWlyZSgnLi9zaGExJylcbmV4cG9ydHMuc2hhMjI0ID0gcmVxdWlyZSgnLi9zaGEyMjQnKVxuZXhwb3J0cy5zaGEyNTYgPSByZXF1aXJlKCcuL3NoYTI1NicpXG5leHBvcnRzLnNoYTM4NCA9IHJlcXVpcmUoJy4vc2hhMzg0JylcbmV4cG9ydHMuc2hhNTEyID0gcmVxdWlyZSgnLi9zaGE1MTInKVxuIiwiLypcbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgU2VjdXJlIEhhc2ggQWxnb3JpdGhtLCBTSEEtMCwgYXMgZGVmaW5lZFxuICogaW4gRklQUyBQVUIgMTgwLTFcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgZGVyaXZlZCBmcm9tIHNoYTEuanMgb2YgdGhlIHNhbWUgcmVwb3NpdG9yeS5cbiAqIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gU0hBLTAgYW5kIFNIQS0xIGlzIGp1c3QgYSBiaXR3aXNlIHJvdGF0ZSBsZWZ0XG4gKiBvcGVyYXRpb24gd2FzIGFkZGVkLlxuICovXG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBIYXNoID0gcmVxdWlyZSgnLi9oYXNoJylcblxudmFyIEsgPSBbXG4gIDB4NWE4Mjc5OTksIDB4NmVkOWViYTEsIDB4OGYxYmJjZGMgfCAwLCAweGNhNjJjMWQ2IHwgMFxuXVxuXG52YXIgVyA9IG5ldyBBcnJheSg4MClcblxuZnVuY3Rpb24gU2hhICgpIHtcbiAgdGhpcy5pbml0KClcbiAgdGhpcy5fdyA9IFdcblxuICBIYXNoLmNhbGwodGhpcywgNjQsIDU2KVxufVxuXG5pbmhlcml0cyhTaGEsIEhhc2gpXG5cblNoYS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fYSA9IDB4Njc0NTIzMDFcbiAgdGhpcy5fYiA9IDB4ZWZjZGFiODlcbiAgdGhpcy5fYyA9IDB4OThiYWRjZmVcbiAgdGhpcy5fZCA9IDB4MTAzMjU0NzZcbiAgdGhpcy5fZSA9IDB4YzNkMmUxZjBcblxuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiByb3RsNSAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDUpIHwgKG51bSA+Pj4gMjcpXG59XG5cbmZ1bmN0aW9uIHJvdGwzMCAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDMwKSB8IChudW0gPj4+IDIpXG59XG5cbmZ1bmN0aW9uIGZ0IChzLCBiLCBjLCBkKSB7XG4gIGlmIChzID09PSAwKSByZXR1cm4gKGIgJiBjKSB8ICgofmIpICYgZClcbiAgaWYgKHMgPT09IDIpIHJldHVybiAoYiAmIGMpIHwgKGIgJiBkKSB8IChjICYgZClcbiAgcmV0dXJuIGIgXiBjIF4gZFxufVxuXG5TaGEucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiAoTSkge1xuICB2YXIgVyA9IHRoaXMuX3dcblxuICB2YXIgYSA9IHRoaXMuX2EgfCAwXG4gIHZhciBiID0gdGhpcy5fYiB8IDBcbiAgdmFyIGMgPSB0aGlzLl9jIHwgMFxuICB2YXIgZCA9IHRoaXMuX2QgfCAwXG4gIHZhciBlID0gdGhpcy5fZSB8IDBcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IDE2OyArK2kpIFdbaV0gPSBNLnJlYWRJbnQzMkJFKGkgKiA0KVxuICBmb3IgKDsgaSA8IDgwOyArK2kpIFdbaV0gPSBXW2kgLSAzXSBeIFdbaSAtIDhdIF4gV1tpIC0gMTRdIF4gV1tpIC0gMTZdXG5cbiAgZm9yICh2YXIgaiA9IDA7IGogPCA4MDsgKytqKSB7XG4gICAgdmFyIHMgPSB+fihqIC8gMjApXG4gICAgdmFyIHQgPSAocm90bDUoYSkgKyBmdChzLCBiLCBjLCBkKSArIGUgKyBXW2pdICsgS1tzXSkgfCAwXG5cbiAgICBlID0gZFxuICAgIGQgPSBjXG4gICAgYyA9IHJvdGwzMChiKVxuICAgIGIgPSBhXG4gICAgYSA9IHRcbiAgfVxuXG4gIHRoaXMuX2EgPSAoYSArIHRoaXMuX2EpIHwgMFxuICB0aGlzLl9iID0gKGIgKyB0aGlzLl9iKSB8IDBcbiAgdGhpcy5fYyA9IChjICsgdGhpcy5fYykgfCAwXG4gIHRoaXMuX2QgPSAoZCArIHRoaXMuX2QpIHwgMFxuICB0aGlzLl9lID0gKGUgKyB0aGlzLl9lKSB8IDBcbn1cblxuU2hhLnByb3RvdHlwZS5faGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEggPSBuZXcgQnVmZmVyKDIwKVxuXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2EgfCAwLCAwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9iIHwgMCwgNClcbiAgSC53cml0ZUludDMyQkUodGhpcy5fYyB8IDAsIDgpXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2QgfCAwLCAxMilcbiAgSC53cml0ZUludDMyQkUodGhpcy5fZSB8IDAsIDE2KVxuXG4gIHJldHVybiBIXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2hhXG4iLCIvKlxuICogQSBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBTZWN1cmUgSGFzaCBBbGdvcml0aG0sIFNIQS0xLCBhcyBkZWZpbmVkXG4gKiBpbiBGSVBTIFBVQiAxODAtMVxuICogVmVyc2lvbiAyLjFhIENvcHlyaWdodCBQYXVsIEpvaG5zdG9uIDIwMDAgLSAyMDAyLlxuICogT3RoZXIgY29udHJpYnV0b3JzOiBHcmVnIEhvbHQsIEFuZHJldyBLZXBlcnQsIFlkbmFyLCBMb3N0aW5ldFxuICogRGlzdHJpYnV0ZWQgdW5kZXIgdGhlIEJTRCBMaWNlbnNlXG4gKiBTZWUgaHR0cDovL3BhamhvbWUub3JnLnVrL2NyeXB0L21kNSBmb3IgZGV0YWlscy5cbiAqL1xuXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpXG52YXIgSGFzaCA9IHJlcXVpcmUoJy4vaGFzaCcpXG5cbnZhciBLID0gW1xuICAweDVhODI3OTk5LCAweDZlZDllYmExLCAweDhmMWJiY2RjIHwgMCwgMHhjYTYyYzFkNiB8IDBcbl1cblxudmFyIFcgPSBuZXcgQXJyYXkoODApXG5cbmZ1bmN0aW9uIFNoYTEgKCkge1xuICB0aGlzLmluaXQoKVxuICB0aGlzLl93ID0gV1xuXG4gIEhhc2guY2FsbCh0aGlzLCA2NCwgNTYpXG59XG5cbmluaGVyaXRzKFNoYTEsIEhhc2gpXG5cblNoYTEucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX2EgPSAweDY3NDUyMzAxXG4gIHRoaXMuX2IgPSAweGVmY2RhYjg5XG4gIHRoaXMuX2MgPSAweDk4YmFkY2ZlXG4gIHRoaXMuX2QgPSAweDEwMzI1NDc2XG4gIHRoaXMuX2UgPSAweGMzZDJlMWYwXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuZnVuY3Rpb24gcm90bDEgKG51bSkge1xuICByZXR1cm4gKG51bSA8PCAxKSB8IChudW0gPj4+IDMxKVxufVxuXG5mdW5jdGlvbiByb3RsNSAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDUpIHwgKG51bSA+Pj4gMjcpXG59XG5cbmZ1bmN0aW9uIHJvdGwzMCAobnVtKSB7XG4gIHJldHVybiAobnVtIDw8IDMwKSB8IChudW0gPj4+IDIpXG59XG5cbmZ1bmN0aW9uIGZ0IChzLCBiLCBjLCBkKSB7XG4gIGlmIChzID09PSAwKSByZXR1cm4gKGIgJiBjKSB8ICgofmIpICYgZClcbiAgaWYgKHMgPT09IDIpIHJldHVybiAoYiAmIGMpIHwgKGIgJiBkKSB8IChjICYgZClcbiAgcmV0dXJuIGIgXiBjIF4gZFxufVxuXG5TaGExLnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gKE0pIHtcbiAgdmFyIFcgPSB0aGlzLl93XG5cbiAgdmFyIGEgPSB0aGlzLl9hIHwgMFxuICB2YXIgYiA9IHRoaXMuX2IgfCAwXG4gIHZhciBjID0gdGhpcy5fYyB8IDBcbiAgdmFyIGQgPSB0aGlzLl9kIHwgMFxuICB2YXIgZSA9IHRoaXMuX2UgfCAwXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgKytpKSBXW2ldID0gTS5yZWFkSW50MzJCRShpICogNClcbiAgZm9yICg7IGkgPCA4MDsgKytpKSBXW2ldID0gcm90bDEoV1tpIC0gM10gXiBXW2kgLSA4XSBeIFdbaSAtIDE0XSBeIFdbaSAtIDE2XSlcblxuICBmb3IgKHZhciBqID0gMDsgaiA8IDgwOyArK2opIHtcbiAgICB2YXIgcyA9IH5+KGogLyAyMClcbiAgICB2YXIgdCA9IChyb3RsNShhKSArIGZ0KHMsIGIsIGMsIGQpICsgZSArIFdbal0gKyBLW3NdKSB8IDBcblxuICAgIGUgPSBkXG4gICAgZCA9IGNcbiAgICBjID0gcm90bDMwKGIpXG4gICAgYiA9IGFcbiAgICBhID0gdFxuICB9XG5cbiAgdGhpcy5fYSA9IChhICsgdGhpcy5fYSkgfCAwXG4gIHRoaXMuX2IgPSAoYiArIHRoaXMuX2IpIHwgMFxuICB0aGlzLl9jID0gKGMgKyB0aGlzLl9jKSB8IDBcbiAgdGhpcy5fZCA9IChkICsgdGhpcy5fZCkgfCAwXG4gIHRoaXMuX2UgPSAoZSArIHRoaXMuX2UpIHwgMFxufVxuXG5TaGExLnByb3RvdHlwZS5faGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEggPSBuZXcgQnVmZmVyKDIwKVxuXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2EgfCAwLCAwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9iIHwgMCwgNClcbiAgSC53cml0ZUludDMyQkUodGhpcy5fYyB8IDAsIDgpXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2QgfCAwLCAxMilcbiAgSC53cml0ZUludDMyQkUodGhpcy5fZSB8IDAsIDE2KVxuXG4gIHJldHVybiBIXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2hhMVxuIiwiLyoqXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFNlY3VyZSBIYXNoIEFsZ29yaXRobSwgU0hBLTI1NiwgYXMgZGVmaW5lZFxuICogaW4gRklQUyAxODAtMlxuICogVmVyc2lvbiAyLjItYmV0YSBDb3B5cmlnaHQgQW5nZWwgTWFyaW4sIFBhdWwgSm9obnN0b24gMjAwMCAtIDIwMDkuXG4gKiBPdGhlciBjb250cmlidXRvcnM6IEdyZWcgSG9sdCwgQW5kcmV3IEtlcGVydCwgWWRuYXIsIExvc3RpbmV0XG4gKlxuICovXG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBTaGEyNTYgPSByZXF1aXJlKCcuL3NoYTI1NicpXG52YXIgSGFzaCA9IHJlcXVpcmUoJy4vaGFzaCcpXG5cbnZhciBXID0gbmV3IEFycmF5KDY0KVxuXG5mdW5jdGlvbiBTaGEyMjQgKCkge1xuICB0aGlzLmluaXQoKVxuXG4gIHRoaXMuX3cgPSBXIC8vIG5ldyBBcnJheSg2NClcblxuICBIYXNoLmNhbGwodGhpcywgNjQsIDU2KVxufVxuXG5pbmhlcml0cyhTaGEyMjQsIFNoYTI1NilcblxuU2hhMjI0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9hID0gMHhjMTA1OWVkOFxuICB0aGlzLl9iID0gMHgzNjdjZDUwN1xuICB0aGlzLl9jID0gMHgzMDcwZGQxN1xuICB0aGlzLl9kID0gMHhmNzBlNTkzOVxuICB0aGlzLl9lID0gMHhmZmMwMGIzMVxuICB0aGlzLl9mID0gMHg2ODU4MTUxMVxuICB0aGlzLl9nID0gMHg2NGY5OGZhN1xuICB0aGlzLl9oID0gMHhiZWZhNGZhNFxuXG4gIHJldHVybiB0aGlzXG59XG5cblNoYTIyNC5wcm90b3R5cGUuX2hhc2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBIID0gbmV3IEJ1ZmZlcigyOClcblxuICBILndyaXRlSW50MzJCRSh0aGlzLl9hLCAwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9iLCA0KVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9jLCA4KVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9kLCAxMilcbiAgSC53cml0ZUludDMyQkUodGhpcy5fZSwgMTYpXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2YsIDIwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9nLCAyNClcblxuICByZXR1cm4gSFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYTIyNFxuIiwiLyoqXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFNlY3VyZSBIYXNoIEFsZ29yaXRobSwgU0hBLTI1NiwgYXMgZGVmaW5lZFxuICogaW4gRklQUyAxODAtMlxuICogVmVyc2lvbiAyLjItYmV0YSBDb3B5cmlnaHQgQW5nZWwgTWFyaW4sIFBhdWwgSm9obnN0b24gMjAwMCAtIDIwMDkuXG4gKiBPdGhlciBjb250cmlidXRvcnM6IEdyZWcgSG9sdCwgQW5kcmV3IEtlcGVydCwgWWRuYXIsIExvc3RpbmV0XG4gKlxuICovXG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBIYXNoID0gcmVxdWlyZSgnLi9oYXNoJylcblxudmFyIEsgPSBbXG4gIDB4NDI4QTJGOTgsIDB4NzEzNzQ0OTEsIDB4QjVDMEZCQ0YsIDB4RTlCNURCQTUsXG4gIDB4Mzk1NkMyNUIsIDB4NTlGMTExRjEsIDB4OTIzRjgyQTQsIDB4QUIxQzVFRDUsXG4gIDB4RDgwN0FBOTgsIDB4MTI4MzVCMDEsIDB4MjQzMTg1QkUsIDB4NTUwQzdEQzMsXG4gIDB4NzJCRTVENzQsIDB4ODBERUIxRkUsIDB4OUJEQzA2QTcsIDB4QzE5QkYxNzQsXG4gIDB4RTQ5QjY5QzEsIDB4RUZCRTQ3ODYsIDB4MEZDMTlEQzYsIDB4MjQwQ0ExQ0MsXG4gIDB4MkRFOTJDNkYsIDB4NEE3NDg0QUEsIDB4NUNCMEE5REMsIDB4NzZGOTg4REEsXG4gIDB4OTgzRTUxNTIsIDB4QTgzMUM2NkQsIDB4QjAwMzI3QzgsIDB4QkY1OTdGQzcsXG4gIDB4QzZFMDBCRjMsIDB4RDVBNzkxNDcsIDB4MDZDQTYzNTEsIDB4MTQyOTI5NjcsXG4gIDB4MjdCNzBBODUsIDB4MkUxQjIxMzgsIDB4NEQyQzZERkMsIDB4NTMzODBEMTMsXG4gIDB4NjUwQTczNTQsIDB4NzY2QTBBQkIsIDB4ODFDMkM5MkUsIDB4OTI3MjJDODUsXG4gIDB4QTJCRkU4QTEsIDB4QTgxQTY2NEIsIDB4QzI0QjhCNzAsIDB4Qzc2QzUxQTMsXG4gIDB4RDE5MkU4MTksIDB4RDY5OTA2MjQsIDB4RjQwRTM1ODUsIDB4MTA2QUEwNzAsXG4gIDB4MTlBNEMxMTYsIDB4MUUzNzZDMDgsIDB4Mjc0ODc3NEMsIDB4MzRCMEJDQjUsXG4gIDB4MzkxQzBDQjMsIDB4NEVEOEFBNEEsIDB4NUI5Q0NBNEYsIDB4NjgyRTZGRjMsXG4gIDB4NzQ4RjgyRUUsIDB4NzhBNTYzNkYsIDB4ODRDODc4MTQsIDB4OENDNzAyMDgsXG4gIDB4OTBCRUZGRkEsIDB4QTQ1MDZDRUIsIDB4QkVGOUEzRjcsIDB4QzY3MTc4RjJcbl1cblxudmFyIFcgPSBuZXcgQXJyYXkoNjQpXG5cbmZ1bmN0aW9uIFNoYTI1NiAoKSB7XG4gIHRoaXMuaW5pdCgpXG5cbiAgdGhpcy5fdyA9IFcgLy8gbmV3IEFycmF5KDY0KVxuXG4gIEhhc2guY2FsbCh0aGlzLCA2NCwgNTYpXG59XG5cbmluaGVyaXRzKFNoYTI1NiwgSGFzaClcblxuU2hhMjU2LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9hID0gMHg2YTA5ZTY2N1xuICB0aGlzLl9iID0gMHhiYjY3YWU4NVxuICB0aGlzLl9jID0gMHgzYzZlZjM3MlxuICB0aGlzLl9kID0gMHhhNTRmZjUzYVxuICB0aGlzLl9lID0gMHg1MTBlNTI3ZlxuICB0aGlzLl9mID0gMHg5YjA1Njg4Y1xuICB0aGlzLl9nID0gMHgxZjgzZDlhYlxuICB0aGlzLl9oID0gMHg1YmUwY2QxOVxuXG4gIHJldHVybiB0aGlzXG59XG5cbmZ1bmN0aW9uIGNoICh4LCB5LCB6KSB7XG4gIHJldHVybiB6IF4gKHggJiAoeSBeIHopKVxufVxuXG5mdW5jdGlvbiBtYWogKHgsIHksIHopIHtcbiAgcmV0dXJuICh4ICYgeSkgfCAoeiAmICh4IHwgeSkpXG59XG5cbmZ1bmN0aW9uIHNpZ21hMCAoeCkge1xuICByZXR1cm4gKHggPj4+IDIgfCB4IDw8IDMwKSBeICh4ID4+PiAxMyB8IHggPDwgMTkpIF4gKHggPj4+IDIyIHwgeCA8PCAxMClcbn1cblxuZnVuY3Rpb24gc2lnbWExICh4KSB7XG4gIHJldHVybiAoeCA+Pj4gNiB8IHggPDwgMjYpIF4gKHggPj4+IDExIHwgeCA8PCAyMSkgXiAoeCA+Pj4gMjUgfCB4IDw8IDcpXG59XG5cbmZ1bmN0aW9uIGdhbW1hMCAoeCkge1xuICByZXR1cm4gKHggPj4+IDcgfCB4IDw8IDI1KSBeICh4ID4+PiAxOCB8IHggPDwgMTQpIF4gKHggPj4+IDMpXG59XG5cbmZ1bmN0aW9uIGdhbW1hMSAoeCkge1xuICByZXR1cm4gKHggPj4+IDE3IHwgeCA8PCAxNSkgXiAoeCA+Pj4gMTkgfCB4IDw8IDEzKSBeICh4ID4+PiAxMClcbn1cblxuU2hhMjU2LnByb3RvdHlwZS5fdXBkYXRlID0gZnVuY3Rpb24gKE0pIHtcbiAgdmFyIFcgPSB0aGlzLl93XG5cbiAgdmFyIGEgPSB0aGlzLl9hIHwgMFxuICB2YXIgYiA9IHRoaXMuX2IgfCAwXG4gIHZhciBjID0gdGhpcy5fYyB8IDBcbiAgdmFyIGQgPSB0aGlzLl9kIHwgMFxuICB2YXIgZSA9IHRoaXMuX2UgfCAwXG4gIHZhciBmID0gdGhpcy5fZiB8IDBcbiAgdmFyIGcgPSB0aGlzLl9nIHwgMFxuICB2YXIgaCA9IHRoaXMuX2ggfCAwXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgKytpKSBXW2ldID0gTS5yZWFkSW50MzJCRShpICogNClcbiAgZm9yICg7IGkgPCA2NDsgKytpKSBXW2ldID0gKGdhbW1hMShXW2kgLSAyXSkgKyBXW2kgLSA3XSArIGdhbW1hMChXW2kgLSAxNV0pICsgV1tpIC0gMTZdKSB8IDBcblxuICBmb3IgKHZhciBqID0gMDsgaiA8IDY0OyArK2opIHtcbiAgICB2YXIgVDEgPSAoaCArIHNpZ21hMShlKSArIGNoKGUsIGYsIGcpICsgS1tqXSArIFdbal0pIHwgMFxuICAgIHZhciBUMiA9IChzaWdtYTAoYSkgKyBtYWooYSwgYiwgYykpIHwgMFxuXG4gICAgaCA9IGdcbiAgICBnID0gZlxuICAgIGYgPSBlXG4gICAgZSA9IChkICsgVDEpIHwgMFxuICAgIGQgPSBjXG4gICAgYyA9IGJcbiAgICBiID0gYVxuICAgIGEgPSAoVDEgKyBUMikgfCAwXG4gIH1cblxuICB0aGlzLl9hID0gKGEgKyB0aGlzLl9hKSB8IDBcbiAgdGhpcy5fYiA9IChiICsgdGhpcy5fYikgfCAwXG4gIHRoaXMuX2MgPSAoYyArIHRoaXMuX2MpIHwgMFxuICB0aGlzLl9kID0gKGQgKyB0aGlzLl9kKSB8IDBcbiAgdGhpcy5fZSA9IChlICsgdGhpcy5fZSkgfCAwXG4gIHRoaXMuX2YgPSAoZiArIHRoaXMuX2YpIHwgMFxuICB0aGlzLl9nID0gKGcgKyB0aGlzLl9nKSB8IDBcbiAgdGhpcy5faCA9IChoICsgdGhpcy5faCkgfCAwXG59XG5cblNoYTI1Ni5wcm90b3R5cGUuX2hhc2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBIID0gbmV3IEJ1ZmZlcigzMilcblxuICBILndyaXRlSW50MzJCRSh0aGlzLl9hLCAwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9iLCA0KVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9jLCA4KVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9kLCAxMilcbiAgSC53cml0ZUludDMyQkUodGhpcy5fZSwgMTYpXG4gIEgud3JpdGVJbnQzMkJFKHRoaXMuX2YsIDIwKVxuICBILndyaXRlSW50MzJCRSh0aGlzLl9nLCAyNClcbiAgSC53cml0ZUludDMyQkUodGhpcy5faCwgMjgpXG5cbiAgcmV0dXJuIEhcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTaGEyNTZcbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJylcbnZhciBTSEE1MTIgPSByZXF1aXJlKCcuL3NoYTUxMicpXG52YXIgSGFzaCA9IHJlcXVpcmUoJy4vaGFzaCcpXG5cbnZhciBXID0gbmV3IEFycmF5KDE2MClcblxuZnVuY3Rpb24gU2hhMzg0ICgpIHtcbiAgdGhpcy5pbml0KClcbiAgdGhpcy5fdyA9IFdcblxuICBIYXNoLmNhbGwodGhpcywgMTI4LCAxMTIpXG59XG5cbmluaGVyaXRzKFNoYTM4NCwgU0hBNTEyKVxuXG5TaGEzODQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX2FoID0gMHhjYmJiOWQ1ZFxuICB0aGlzLl9iaCA9IDB4NjI5YTI5MmFcbiAgdGhpcy5fY2ggPSAweDkxNTkwMTVhXG4gIHRoaXMuX2RoID0gMHgxNTJmZWNkOFxuICB0aGlzLl9laCA9IDB4NjczMzI2NjdcbiAgdGhpcy5fZmggPSAweDhlYjQ0YTg3XG4gIHRoaXMuX2doID0gMHhkYjBjMmUwZFxuICB0aGlzLl9oaCA9IDB4NDdiNTQ4MWRcblxuICB0aGlzLl9hbCA9IDB4YzEwNTllZDhcbiAgdGhpcy5fYmwgPSAweDM2N2NkNTA3XG4gIHRoaXMuX2NsID0gMHgzMDcwZGQxN1xuICB0aGlzLl9kbCA9IDB4ZjcwZTU5MzlcbiAgdGhpcy5fZWwgPSAweGZmYzAwYjMxXG4gIHRoaXMuX2ZsID0gMHg2ODU4MTUxMVxuICB0aGlzLl9nbCA9IDB4NjRmOThmYTdcbiAgdGhpcy5faGwgPSAweGJlZmE0ZmE0XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuU2hhMzg0LnByb3RvdHlwZS5faGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEggPSBuZXcgQnVmZmVyKDQ4KVxuXG4gIGZ1bmN0aW9uIHdyaXRlSW50NjRCRSAoaCwgbCwgb2Zmc2V0KSB7XG4gICAgSC53cml0ZUludDMyQkUoaCwgb2Zmc2V0KVxuICAgIEgud3JpdGVJbnQzMkJFKGwsIG9mZnNldCArIDQpXG4gIH1cblxuICB3cml0ZUludDY0QkUodGhpcy5fYWgsIHRoaXMuX2FsLCAwKVxuICB3cml0ZUludDY0QkUodGhpcy5fYmgsIHRoaXMuX2JsLCA4KVxuICB3cml0ZUludDY0QkUodGhpcy5fY2gsIHRoaXMuX2NsLCAxNilcbiAgd3JpdGVJbnQ2NEJFKHRoaXMuX2RoLCB0aGlzLl9kbCwgMjQpXG4gIHdyaXRlSW50NjRCRSh0aGlzLl9laCwgdGhpcy5fZWwsIDMyKVxuICB3cml0ZUludDY0QkUodGhpcy5fZmgsIHRoaXMuX2ZsLCA0MClcblxuICByZXR1cm4gSFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYTM4NFxuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKVxudmFyIEhhc2ggPSByZXF1aXJlKCcuL2hhc2gnKVxuXG52YXIgSyA9IFtcbiAgMHg0MjhhMmY5OCwgMHhkNzI4YWUyMiwgMHg3MTM3NDQ5MSwgMHgyM2VmNjVjZCxcbiAgMHhiNWMwZmJjZiwgMHhlYzRkM2IyZiwgMHhlOWI1ZGJhNSwgMHg4MTg5ZGJiYyxcbiAgMHgzOTU2YzI1YiwgMHhmMzQ4YjUzOCwgMHg1OWYxMTFmMSwgMHhiNjA1ZDAxOSxcbiAgMHg5MjNmODJhNCwgMHhhZjE5NGY5YiwgMHhhYjFjNWVkNSwgMHhkYTZkODExOCxcbiAgMHhkODA3YWE5OCwgMHhhMzAzMDI0MiwgMHgxMjgzNWIwMSwgMHg0NTcwNmZiZSxcbiAgMHgyNDMxODViZSwgMHg0ZWU0YjI4YywgMHg1NTBjN2RjMywgMHhkNWZmYjRlMixcbiAgMHg3MmJlNWQ3NCwgMHhmMjdiODk2ZiwgMHg4MGRlYjFmZSwgMHgzYjE2OTZiMSxcbiAgMHg5YmRjMDZhNywgMHgyNWM3MTIzNSwgMHhjMTliZjE3NCwgMHhjZjY5MjY5NCxcbiAgMHhlNDliNjljMSwgMHg5ZWYxNGFkMiwgMHhlZmJlNDc4NiwgMHgzODRmMjVlMyxcbiAgMHgwZmMxOWRjNiwgMHg4YjhjZDViNSwgMHgyNDBjYTFjYywgMHg3N2FjOWM2NSxcbiAgMHgyZGU5MmM2ZiwgMHg1OTJiMDI3NSwgMHg0YTc0ODRhYSwgMHg2ZWE2ZTQ4MyxcbiAgMHg1Y2IwYTlkYywgMHhiZDQxZmJkNCwgMHg3NmY5ODhkYSwgMHg4MzExNTNiNSxcbiAgMHg5ODNlNTE1MiwgMHhlZTY2ZGZhYiwgMHhhODMxYzY2ZCwgMHgyZGI0MzIxMCxcbiAgMHhiMDAzMjdjOCwgMHg5OGZiMjEzZiwgMHhiZjU5N2ZjNywgMHhiZWVmMGVlNCxcbiAgMHhjNmUwMGJmMywgMHgzZGE4OGZjMiwgMHhkNWE3OTE0NywgMHg5MzBhYTcyNSxcbiAgMHgwNmNhNjM1MSwgMHhlMDAzODI2ZiwgMHgxNDI5Mjk2NywgMHgwYTBlNmU3MCxcbiAgMHgyN2I3MGE4NSwgMHg0NmQyMmZmYywgMHgyZTFiMjEzOCwgMHg1YzI2YzkyNixcbiAgMHg0ZDJjNmRmYywgMHg1YWM0MmFlZCwgMHg1MzM4MGQxMywgMHg5ZDk1YjNkZixcbiAgMHg2NTBhNzM1NCwgMHg4YmFmNjNkZSwgMHg3NjZhMGFiYiwgMHgzYzc3YjJhOCxcbiAgMHg4MWMyYzkyZSwgMHg0N2VkYWVlNiwgMHg5MjcyMmM4NSwgMHgxNDgyMzUzYixcbiAgMHhhMmJmZThhMSwgMHg0Y2YxMDM2NCwgMHhhODFhNjY0YiwgMHhiYzQyMzAwMSxcbiAgMHhjMjRiOGI3MCwgMHhkMGY4OTc5MSwgMHhjNzZjNTFhMywgMHgwNjU0YmUzMCxcbiAgMHhkMTkyZTgxOSwgMHhkNmVmNTIxOCwgMHhkNjk5MDYyNCwgMHg1NTY1YTkxMCxcbiAgMHhmNDBlMzU4NSwgMHg1NzcxMjAyYSwgMHgxMDZhYTA3MCwgMHgzMmJiZDFiOCxcbiAgMHgxOWE0YzExNiwgMHhiOGQyZDBjOCwgMHgxZTM3NmMwOCwgMHg1MTQxYWI1MyxcbiAgMHgyNzQ4Nzc0YywgMHhkZjhlZWI5OSwgMHgzNGIwYmNiNSwgMHhlMTliNDhhOCxcbiAgMHgzOTFjMGNiMywgMHhjNWM5NWE2MywgMHg0ZWQ4YWE0YSwgMHhlMzQxOGFjYixcbiAgMHg1YjljY2E0ZiwgMHg3NzYzZTM3MywgMHg2ODJlNmZmMywgMHhkNmIyYjhhMyxcbiAgMHg3NDhmODJlZSwgMHg1ZGVmYjJmYywgMHg3OGE1NjM2ZiwgMHg0MzE3MmY2MCxcbiAgMHg4NGM4NzgxNCwgMHhhMWYwYWI3MiwgMHg4Y2M3MDIwOCwgMHgxYTY0MzllYyxcbiAgMHg5MGJlZmZmYSwgMHgyMzYzMWUyOCwgMHhhNDUwNmNlYiwgMHhkZTgyYmRlOSxcbiAgMHhiZWY5YTNmNywgMHhiMmM2NzkxNSwgMHhjNjcxNzhmMiwgMHhlMzcyNTMyYixcbiAgMHhjYTI3M2VjZSwgMHhlYTI2NjE5YywgMHhkMTg2YjhjNywgMHgyMWMwYzIwNyxcbiAgMHhlYWRhN2RkNiwgMHhjZGUwZWIxZSwgMHhmNTdkNGY3ZiwgMHhlZTZlZDE3OCxcbiAgMHgwNmYwNjdhYSwgMHg3MjE3NmZiYSwgMHgwYTYzN2RjNSwgMHhhMmM4OThhNixcbiAgMHgxMTNmOTgwNCwgMHhiZWY5MGRhZSwgMHgxYjcxMGIzNSwgMHgxMzFjNDcxYixcbiAgMHgyOGRiNzdmNSwgMHgyMzA0N2Q4NCwgMHgzMmNhYWI3YiwgMHg0MGM3MjQ5MyxcbiAgMHgzYzllYmUwYSwgMHgxNWM5YmViYywgMHg0MzFkNjdjNCwgMHg5YzEwMGQ0YyxcbiAgMHg0Y2M1ZDRiZSwgMHhjYjNlNDJiNiwgMHg1OTdmMjk5YywgMHhmYzY1N2UyYSxcbiAgMHg1ZmNiNmZhYiwgMHgzYWQ2ZmFlYywgMHg2YzQ0MTk4YywgMHg0YTQ3NTgxN1xuXVxuXG52YXIgVyA9IG5ldyBBcnJheSgxNjApXG5cbmZ1bmN0aW9uIFNoYTUxMiAoKSB7XG4gIHRoaXMuaW5pdCgpXG4gIHRoaXMuX3cgPSBXXG5cbiAgSGFzaC5jYWxsKHRoaXMsIDEyOCwgMTEyKVxufVxuXG5pbmhlcml0cyhTaGE1MTIsIEhhc2gpXG5cblNoYTUxMi5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fYWggPSAweDZhMDllNjY3XG4gIHRoaXMuX2JoID0gMHhiYjY3YWU4NVxuICB0aGlzLl9jaCA9IDB4M2M2ZWYzNzJcbiAgdGhpcy5fZGggPSAweGE1NGZmNTNhXG4gIHRoaXMuX2VoID0gMHg1MTBlNTI3ZlxuICB0aGlzLl9maCA9IDB4OWIwNTY4OGNcbiAgdGhpcy5fZ2ggPSAweDFmODNkOWFiXG4gIHRoaXMuX2hoID0gMHg1YmUwY2QxOVxuXG4gIHRoaXMuX2FsID0gMHhmM2JjYzkwOFxuICB0aGlzLl9ibCA9IDB4ODRjYWE3M2JcbiAgdGhpcy5fY2wgPSAweGZlOTRmODJiXG4gIHRoaXMuX2RsID0gMHg1ZjFkMzZmMVxuICB0aGlzLl9lbCA9IDB4YWRlNjgyZDFcbiAgdGhpcy5fZmwgPSAweDJiM2U2YzFmXG4gIHRoaXMuX2dsID0gMHhmYjQxYmQ2YlxuICB0aGlzLl9obCA9IDB4MTM3ZTIxNzlcblxuICByZXR1cm4gdGhpc1xufVxuXG5mdW5jdGlvbiBDaCAoeCwgeSwgeikge1xuICByZXR1cm4geiBeICh4ICYgKHkgXiB6KSlcbn1cblxuZnVuY3Rpb24gbWFqICh4LCB5LCB6KSB7XG4gIHJldHVybiAoeCAmIHkpIHwgKHogJiAoeCB8IHkpKVxufVxuXG5mdW5jdGlvbiBzaWdtYTAgKHgsIHhsKSB7XG4gIHJldHVybiAoeCA+Pj4gMjggfCB4bCA8PCA0KSBeICh4bCA+Pj4gMiB8IHggPDwgMzApIF4gKHhsID4+PiA3IHwgeCA8PCAyNSlcbn1cblxuZnVuY3Rpb24gc2lnbWExICh4LCB4bCkge1xuICByZXR1cm4gKHggPj4+IDE0IHwgeGwgPDwgMTgpIF4gKHggPj4+IDE4IHwgeGwgPDwgMTQpIF4gKHhsID4+PiA5IHwgeCA8PCAyMylcbn1cblxuZnVuY3Rpb24gR2FtbWEwICh4LCB4bCkge1xuICByZXR1cm4gKHggPj4+IDEgfCB4bCA8PCAzMSkgXiAoeCA+Pj4gOCB8IHhsIDw8IDI0KSBeICh4ID4+PiA3KVxufVxuXG5mdW5jdGlvbiBHYW1tYTBsICh4LCB4bCkge1xuICByZXR1cm4gKHggPj4+IDEgfCB4bCA8PCAzMSkgXiAoeCA+Pj4gOCB8IHhsIDw8IDI0KSBeICh4ID4+PiA3IHwgeGwgPDwgMjUpXG59XG5cbmZ1bmN0aW9uIEdhbW1hMSAoeCwgeGwpIHtcbiAgcmV0dXJuICh4ID4+PiAxOSB8IHhsIDw8IDEzKSBeICh4bCA+Pj4gMjkgfCB4IDw8IDMpIF4gKHggPj4+IDYpXG59XG5cbmZ1bmN0aW9uIEdhbW1hMWwgKHgsIHhsKSB7XG4gIHJldHVybiAoeCA+Pj4gMTkgfCB4bCA8PCAxMykgXiAoeGwgPj4+IDI5IHwgeCA8PCAzKSBeICh4ID4+PiA2IHwgeGwgPDwgMjYpXG59XG5cbmZ1bmN0aW9uIGdldENhcnJ5IChhLCBiKSB7XG4gIHJldHVybiAoYSA+Pj4gMCkgPCAoYiA+Pj4gMCkgPyAxIDogMFxufVxuXG5TaGE1MTIucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiAoTSkge1xuICB2YXIgVyA9IHRoaXMuX3dcblxuICB2YXIgYWggPSB0aGlzLl9haCB8IDBcbiAgdmFyIGJoID0gdGhpcy5fYmggfCAwXG4gIHZhciBjaCA9IHRoaXMuX2NoIHwgMFxuICB2YXIgZGggPSB0aGlzLl9kaCB8IDBcbiAgdmFyIGVoID0gdGhpcy5fZWggfCAwXG4gIHZhciBmaCA9IHRoaXMuX2ZoIHwgMFxuICB2YXIgZ2ggPSB0aGlzLl9naCB8IDBcbiAgdmFyIGhoID0gdGhpcy5faGggfCAwXG5cbiAgdmFyIGFsID0gdGhpcy5fYWwgfCAwXG4gIHZhciBibCA9IHRoaXMuX2JsIHwgMFxuICB2YXIgY2wgPSB0aGlzLl9jbCB8IDBcbiAgdmFyIGRsID0gdGhpcy5fZGwgfCAwXG4gIHZhciBlbCA9IHRoaXMuX2VsIHwgMFxuICB2YXIgZmwgPSB0aGlzLl9mbCB8IDBcbiAgdmFyIGdsID0gdGhpcy5fZ2wgfCAwXG4gIHZhciBobCA9IHRoaXMuX2hsIHwgMFxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMzI7IGkgKz0gMikge1xuICAgIFdbaV0gPSBNLnJlYWRJbnQzMkJFKGkgKiA0KVxuICAgIFdbaSArIDFdID0gTS5yZWFkSW50MzJCRShpICogNCArIDQpXG4gIH1cbiAgZm9yICg7IGkgPCAxNjA7IGkgKz0gMikge1xuICAgIHZhciB4aCA9IFdbaSAtIDE1ICogMl1cbiAgICB2YXIgeGwgPSBXW2kgLSAxNSAqIDIgKyAxXVxuICAgIHZhciBnYW1tYTAgPSBHYW1tYTAoeGgsIHhsKVxuICAgIHZhciBnYW1tYTBsID0gR2FtbWEwbCh4bCwgeGgpXG5cbiAgICB4aCA9IFdbaSAtIDIgKiAyXVxuICAgIHhsID0gV1tpIC0gMiAqIDIgKyAxXVxuICAgIHZhciBnYW1tYTEgPSBHYW1tYTEoeGgsIHhsKVxuICAgIHZhciBnYW1tYTFsID0gR2FtbWExbCh4bCwgeGgpXG5cbiAgICAvLyBXW2ldID0gZ2FtbWEwICsgV1tpIC0gN10gKyBnYW1tYTEgKyBXW2kgLSAxNl1cbiAgICB2YXIgV2k3aCA9IFdbaSAtIDcgKiAyXVxuICAgIHZhciBXaTdsID0gV1tpIC0gNyAqIDIgKyAxXVxuXG4gICAgdmFyIFdpMTZoID0gV1tpIC0gMTYgKiAyXVxuICAgIHZhciBXaTE2bCA9IFdbaSAtIDE2ICogMiArIDFdXG5cbiAgICB2YXIgV2lsID0gKGdhbW1hMGwgKyBXaTdsKSB8IDBcbiAgICB2YXIgV2loID0gKGdhbW1hMCArIFdpN2ggKyBnZXRDYXJyeShXaWwsIGdhbW1hMGwpKSB8IDBcbiAgICBXaWwgPSAoV2lsICsgZ2FtbWExbCkgfCAwXG4gICAgV2loID0gKFdpaCArIGdhbW1hMSArIGdldENhcnJ5KFdpbCwgZ2FtbWExbCkpIHwgMFxuICAgIFdpbCA9IChXaWwgKyBXaTE2bCkgfCAwXG4gICAgV2loID0gKFdpaCArIFdpMTZoICsgZ2V0Q2FycnkoV2lsLCBXaTE2bCkpIHwgMFxuXG4gICAgV1tpXSA9IFdpaFxuICAgIFdbaSArIDFdID0gV2lsXG4gIH1cblxuICBmb3IgKHZhciBqID0gMDsgaiA8IDE2MDsgaiArPSAyKSB7XG4gICAgV2loID0gV1tqXVxuICAgIFdpbCA9IFdbaiArIDFdXG5cbiAgICB2YXIgbWFqaCA9IG1haihhaCwgYmgsIGNoKVxuICAgIHZhciBtYWpsID0gbWFqKGFsLCBibCwgY2wpXG5cbiAgICB2YXIgc2lnbWEwaCA9IHNpZ21hMChhaCwgYWwpXG4gICAgdmFyIHNpZ21hMGwgPSBzaWdtYTAoYWwsIGFoKVxuICAgIHZhciBzaWdtYTFoID0gc2lnbWExKGVoLCBlbClcbiAgICB2YXIgc2lnbWExbCA9IHNpZ21hMShlbCwgZWgpXG5cbiAgICAvLyB0MSA9IGggKyBzaWdtYTEgKyBjaCArIEtbal0gKyBXW2pdXG4gICAgdmFyIEtpaCA9IEtbal1cbiAgICB2YXIgS2lsID0gS1tqICsgMV1cblxuICAgIHZhciBjaGggPSBDaChlaCwgZmgsIGdoKVxuICAgIHZhciBjaGwgPSBDaChlbCwgZmwsIGdsKVxuXG4gICAgdmFyIHQxbCA9IChobCArIHNpZ21hMWwpIHwgMFxuICAgIHZhciB0MWggPSAoaGggKyBzaWdtYTFoICsgZ2V0Q2FycnkodDFsLCBobCkpIHwgMFxuICAgIHQxbCA9ICh0MWwgKyBjaGwpIHwgMFxuICAgIHQxaCA9ICh0MWggKyBjaGggKyBnZXRDYXJyeSh0MWwsIGNobCkpIHwgMFxuICAgIHQxbCA9ICh0MWwgKyBLaWwpIHwgMFxuICAgIHQxaCA9ICh0MWggKyBLaWggKyBnZXRDYXJyeSh0MWwsIEtpbCkpIHwgMFxuICAgIHQxbCA9ICh0MWwgKyBXaWwpIHwgMFxuICAgIHQxaCA9ICh0MWggKyBXaWggKyBnZXRDYXJyeSh0MWwsIFdpbCkpIHwgMFxuXG4gICAgLy8gdDIgPSBzaWdtYTAgKyBtYWpcbiAgICB2YXIgdDJsID0gKHNpZ21hMGwgKyBtYWpsKSB8IDBcbiAgICB2YXIgdDJoID0gKHNpZ21hMGggKyBtYWpoICsgZ2V0Q2FycnkodDJsLCBzaWdtYTBsKSkgfCAwXG5cbiAgICBoaCA9IGdoXG4gICAgaGwgPSBnbFxuICAgIGdoID0gZmhcbiAgICBnbCA9IGZsXG4gICAgZmggPSBlaFxuICAgIGZsID0gZWxcbiAgICBlbCA9IChkbCArIHQxbCkgfCAwXG4gICAgZWggPSAoZGggKyB0MWggKyBnZXRDYXJyeShlbCwgZGwpKSB8IDBcbiAgICBkaCA9IGNoXG4gICAgZGwgPSBjbFxuICAgIGNoID0gYmhcbiAgICBjbCA9IGJsXG4gICAgYmggPSBhaFxuICAgIGJsID0gYWxcbiAgICBhbCA9ICh0MWwgKyB0MmwpIHwgMFxuICAgIGFoID0gKHQxaCArIHQyaCArIGdldENhcnJ5KGFsLCB0MWwpKSB8IDBcbiAgfVxuXG4gIHRoaXMuX2FsID0gKHRoaXMuX2FsICsgYWwpIHwgMFxuICB0aGlzLl9ibCA9ICh0aGlzLl9ibCArIGJsKSB8IDBcbiAgdGhpcy5fY2wgPSAodGhpcy5fY2wgKyBjbCkgfCAwXG4gIHRoaXMuX2RsID0gKHRoaXMuX2RsICsgZGwpIHwgMFxuICB0aGlzLl9lbCA9ICh0aGlzLl9lbCArIGVsKSB8IDBcbiAgdGhpcy5fZmwgPSAodGhpcy5fZmwgKyBmbCkgfCAwXG4gIHRoaXMuX2dsID0gKHRoaXMuX2dsICsgZ2wpIHwgMFxuICB0aGlzLl9obCA9ICh0aGlzLl9obCArIGhsKSB8IDBcblxuICB0aGlzLl9haCA9ICh0aGlzLl9haCArIGFoICsgZ2V0Q2FycnkodGhpcy5fYWwsIGFsKSkgfCAwXG4gIHRoaXMuX2JoID0gKHRoaXMuX2JoICsgYmggKyBnZXRDYXJyeSh0aGlzLl9ibCwgYmwpKSB8IDBcbiAgdGhpcy5fY2ggPSAodGhpcy5fY2ggKyBjaCArIGdldENhcnJ5KHRoaXMuX2NsLCBjbCkpIHwgMFxuICB0aGlzLl9kaCA9ICh0aGlzLl9kaCArIGRoICsgZ2V0Q2FycnkodGhpcy5fZGwsIGRsKSkgfCAwXG4gIHRoaXMuX2VoID0gKHRoaXMuX2VoICsgZWggKyBnZXRDYXJyeSh0aGlzLl9lbCwgZWwpKSB8IDBcbiAgdGhpcy5fZmggPSAodGhpcy5fZmggKyBmaCArIGdldENhcnJ5KHRoaXMuX2ZsLCBmbCkpIHwgMFxuICB0aGlzLl9naCA9ICh0aGlzLl9naCArIGdoICsgZ2V0Q2FycnkodGhpcy5fZ2wsIGdsKSkgfCAwXG4gIHRoaXMuX2hoID0gKHRoaXMuX2hoICsgaGggKyBnZXRDYXJyeSh0aGlzLl9obCwgaGwpKSB8IDBcbn1cblxuU2hhNTEyLnByb3RvdHlwZS5faGFzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEggPSBuZXcgQnVmZmVyKDY0KVxuXG4gIGZ1bmN0aW9uIHdyaXRlSW50NjRCRSAoaCwgbCwgb2Zmc2V0KSB7XG4gICAgSC53cml0ZUludDMyQkUoaCwgb2Zmc2V0KVxuICAgIEgud3JpdGVJbnQzMkJFKGwsIG9mZnNldCArIDQpXG4gIH1cblxuICB3cml0ZUludDY0QkUodGhpcy5fYWgsIHRoaXMuX2FsLCAwKVxuICB3cml0ZUludDY0QkUodGhpcy5fYmgsIHRoaXMuX2JsLCA4KVxuICB3cml0ZUludDY0QkUodGhpcy5fY2gsIHRoaXMuX2NsLCAxNilcbiAgd3JpdGVJbnQ2NEJFKHRoaXMuX2RoLCB0aGlzLl9kbCwgMjQpXG4gIHdyaXRlSW50NjRCRSh0aGlzLl9laCwgdGhpcy5fZWwsIDMyKVxuICB3cml0ZUludDY0QkUodGhpcy5fZmgsIHRoaXMuX2ZsLCA0MClcbiAgd3JpdGVJbnQ2NEJFKHRoaXMuX2doLCB0aGlzLl9nbCwgNDgpXG4gIHdyaXRlSW50NjRCRSh0aGlzLl9oaCwgdGhpcy5faGwsIDU2KVxuXG4gIHJldHVybiBIXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2hhNTEyXG4iLCIoZnVuY3Rpb24obmFjbCkge1xuJ3VzZSBzdHJpY3QnO1xuXG4vLyBQb3J0ZWQgaW4gMjAxNCBieSBEbWl0cnkgQ2hlc3RueWtoIGFuZCBEZXZpIE1hbmRpcmkuXG4vLyBQdWJsaWMgZG9tYWluLlxuLy9cbi8vIEltcGxlbWVudGF0aW9uIGRlcml2ZWQgZnJvbSBUd2VldE5hQ2wgdmVyc2lvbiAyMDE0MDQyNy5cbi8vIFNlZSBmb3IgZGV0YWlsczogaHR0cDovL3R3ZWV0bmFjbC5jci55cC50by9cblxudmFyIGdmID0gZnVuY3Rpb24oaW5pdCkge1xuICB2YXIgaSwgciA9IG5ldyBGbG9hdDY0QXJyYXkoMTYpO1xuICBpZiAoaW5pdCkgZm9yIChpID0gMDsgaSA8IGluaXQubGVuZ3RoOyBpKyspIHJbaV0gPSBpbml0W2ldO1xuICByZXR1cm4gcjtcbn07XG5cbi8vICBQbHVnZ2FibGUsIGluaXRpYWxpemVkIGluIGhpZ2gtbGV2ZWwgQVBJIGJlbG93LlxudmFyIHJhbmRvbWJ5dGVzID0gZnVuY3Rpb24oLyogeCwgbiAqLykgeyB0aHJvdyBuZXcgRXJyb3IoJ25vIFBSTkcnKTsgfTtcblxudmFyIF8wID0gbmV3IFVpbnQ4QXJyYXkoMTYpO1xudmFyIF85ID0gbmV3IFVpbnQ4QXJyYXkoMzIpOyBfOVswXSA9IDk7XG5cbnZhciBnZjAgPSBnZigpLFxuICAgIGdmMSA9IGdmKFsxXSksXG4gICAgXzEyMTY2NSA9IGdmKFsweGRiNDEsIDFdKSxcbiAgICBEID0gZ2YoWzB4NzhhMywgMHgxMzU5LCAweDRkY2EsIDB4NzVlYiwgMHhkOGFiLCAweDQxNDEsIDB4MGE0ZCwgMHgwMDcwLCAweGU4OTgsIDB4Nzc3OSwgMHg0MDc5LCAweDhjYzcsIDB4ZmU3MywgMHgyYjZmLCAweDZjZWUsIDB4NTIwM10pLFxuICAgIEQyID0gZ2YoWzB4ZjE1OSwgMHgyNmIyLCAweDliOTQsIDB4ZWJkNiwgMHhiMTU2LCAweDgyODMsIDB4MTQ5YSwgMHgwMGUwLCAweGQxMzAsIDB4ZWVmMywgMHg4MGYyLCAweDE5OGUsIDB4ZmNlNywgMHg1NmRmLCAweGQ5ZGMsIDB4MjQwNl0pLFxuICAgIFggPSBnZihbMHhkNTFhLCAweDhmMjUsIDB4MmQ2MCwgMHhjOTU2LCAweGE3YjIsIDB4OTUyNSwgMHhjNzYwLCAweDY5MmMsIDB4ZGM1YywgMHhmZGQ2LCAweGUyMzEsIDB4YzBhNCwgMHg1M2ZlLCAweGNkNmUsIDB4MzZkMywgMHgyMTY5XSksXG4gICAgWSA9IGdmKFsweDY2NTgsIDB4NjY2NiwgMHg2NjY2LCAweDY2NjYsIDB4NjY2NiwgMHg2NjY2LCAweDY2NjYsIDB4NjY2NiwgMHg2NjY2LCAweDY2NjYsIDB4NjY2NiwgMHg2NjY2LCAweDY2NjYsIDB4NjY2NiwgMHg2NjY2LCAweDY2NjZdKSxcbiAgICBJID0gZ2YoWzB4YTBiMCwgMHg0YTBlLCAweDFiMjcsIDB4YzRlZSwgMHhlNDc4LCAweGFkMmYsIDB4MTgwNiwgMHgyZjQzLCAweGQ3YTcsIDB4M2RmYiwgMHgwMDk5LCAweDJiNGQsIDB4ZGYwYiwgMHg0ZmMxLCAweDI0ODAsIDB4MmI4M10pO1xuXG5mdW5jdGlvbiB0czY0KHgsIGksIGgsIGwpIHtcbiAgeFtpXSAgID0gKGggPj4gMjQpICYgMHhmZjtcbiAgeFtpKzFdID0gKGggPj4gMTYpICYgMHhmZjtcbiAgeFtpKzJdID0gKGggPj4gIDgpICYgMHhmZjtcbiAgeFtpKzNdID0gaCAmIDB4ZmY7XG4gIHhbaSs0XSA9IChsID4+IDI0KSAgJiAweGZmO1xuICB4W2krNV0gPSAobCA+PiAxNikgICYgMHhmZjtcbiAgeFtpKzZdID0gKGwgPj4gIDgpICAmIDB4ZmY7XG4gIHhbaSs3XSA9IGwgJiAweGZmO1xufVxuXG5mdW5jdGlvbiB2bih4LCB4aSwgeSwgeWksIG4pIHtcbiAgdmFyIGksZCA9IDA7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIGQgfD0geFt4aStpXV55W3lpK2ldO1xuICByZXR1cm4gKDEgJiAoKGQgLSAxKSA+Pj4gOCkpIC0gMTtcbn1cblxuZnVuY3Rpb24gY3J5cHRvX3ZlcmlmeV8xNih4LCB4aSwgeSwgeWkpIHtcbiAgcmV0dXJuIHZuKHgseGkseSx5aSwxNik7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b192ZXJpZnlfMzIoeCwgeGksIHksIHlpKSB7XG4gIHJldHVybiB2bih4LHhpLHkseWksMzIpO1xufVxuXG5mdW5jdGlvbiBjb3JlX3NhbHNhMjAobywgcCwgaywgYykge1xuICB2YXIgajAgID0gY1sgMF0gJiAweGZmIHwgKGNbIDFdICYgMHhmZik8PDggfCAoY1sgMl0gJiAweGZmKTw8MTYgfCAoY1sgM10gJiAweGZmKTw8MjQsXG4gICAgICBqMSAgPSBrWyAwXSAmIDB4ZmYgfCAoa1sgMV0gJiAweGZmKTw8OCB8IChrWyAyXSAmIDB4ZmYpPDwxNiB8IChrWyAzXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoyICA9IGtbIDRdICYgMHhmZiB8IChrWyA1XSAmIDB4ZmYpPDw4IHwgKGtbIDZdICYgMHhmZik8PDE2IHwgKGtbIDddICYgMHhmZik8PDI0LFxuICAgICAgajMgID0ga1sgOF0gJiAweGZmIHwgKGtbIDldICYgMHhmZik8PDggfCAoa1sxMF0gJiAweGZmKTw8MTYgfCAoa1sxMV0gJiAweGZmKTw8MjQsXG4gICAgICBqNCAgPSBrWzEyXSAmIDB4ZmYgfCAoa1sxM10gJiAweGZmKTw8OCB8IChrWzE0XSAmIDB4ZmYpPDwxNiB8IChrWzE1XSAmIDB4ZmYpPDwyNCxcbiAgICAgIGo1ICA9IGNbIDRdICYgMHhmZiB8IChjWyA1XSAmIDB4ZmYpPDw4IHwgKGNbIDZdICYgMHhmZik8PDE2IHwgKGNbIDddICYgMHhmZik8PDI0LFxuICAgICAgajYgID0gcFsgMF0gJiAweGZmIHwgKHBbIDFdICYgMHhmZik8PDggfCAocFsgMl0gJiAweGZmKTw8MTYgfCAocFsgM10gJiAweGZmKTw8MjQsXG4gICAgICBqNyAgPSBwWyA0XSAmIDB4ZmYgfCAocFsgNV0gJiAweGZmKTw8OCB8IChwWyA2XSAmIDB4ZmYpPDwxNiB8IChwWyA3XSAmIDB4ZmYpPDwyNCxcbiAgICAgIGo4ICA9IHBbIDhdICYgMHhmZiB8IChwWyA5XSAmIDB4ZmYpPDw4IHwgKHBbMTBdICYgMHhmZik8PDE2IHwgKHBbMTFdICYgMHhmZik8PDI0LFxuICAgICAgajkgID0gcFsxMl0gJiAweGZmIHwgKHBbMTNdICYgMHhmZik8PDggfCAocFsxNF0gJiAweGZmKTw8MTYgfCAocFsxNV0gJiAweGZmKTw8MjQsXG4gICAgICBqMTAgPSBjWyA4XSAmIDB4ZmYgfCAoY1sgOV0gJiAweGZmKTw8OCB8IChjWzEwXSAmIDB4ZmYpPDwxNiB8IChjWzExXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoxMSA9IGtbMTZdICYgMHhmZiB8IChrWzE3XSAmIDB4ZmYpPDw4IHwgKGtbMThdICYgMHhmZik8PDE2IHwgKGtbMTldICYgMHhmZik8PDI0LFxuICAgICAgajEyID0ga1syMF0gJiAweGZmIHwgKGtbMjFdICYgMHhmZik8PDggfCAoa1syMl0gJiAweGZmKTw8MTYgfCAoa1syM10gJiAweGZmKTw8MjQsXG4gICAgICBqMTMgPSBrWzI0XSAmIDB4ZmYgfCAoa1syNV0gJiAweGZmKTw8OCB8IChrWzI2XSAmIDB4ZmYpPDwxNiB8IChrWzI3XSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoxNCA9IGtbMjhdICYgMHhmZiB8IChrWzI5XSAmIDB4ZmYpPDw4IHwgKGtbMzBdICYgMHhmZik8PDE2IHwgKGtbMzFdICYgMHhmZik8PDI0LFxuICAgICAgajE1ID0gY1sxMl0gJiAweGZmIHwgKGNbMTNdICYgMHhmZik8PDggfCAoY1sxNF0gJiAweGZmKTw8MTYgfCAoY1sxNV0gJiAweGZmKTw8MjQ7XG5cbiAgdmFyIHgwID0gajAsIHgxID0gajEsIHgyID0gajIsIHgzID0gajMsIHg0ID0gajQsIHg1ID0gajUsIHg2ID0gajYsIHg3ID0gajcsXG4gICAgICB4OCA9IGo4LCB4OSA9IGo5LCB4MTAgPSBqMTAsIHgxMSA9IGoxMSwgeDEyID0gajEyLCB4MTMgPSBqMTMsIHgxNCA9IGoxNCxcbiAgICAgIHgxNSA9IGoxNSwgdTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IDIwOyBpICs9IDIpIHtcbiAgICB1ID0geDAgKyB4MTIgfCAwO1xuICAgIHg0IF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4NCArIHgwIHwgMDtcbiAgICB4OCBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDggKyB4NCB8IDA7XG4gICAgeDEyIF49IHU8PDEzIHwgdT4+PigzMi0xMyk7XG4gICAgdSA9IHgxMiArIHg4IHwgMDtcbiAgICB4MCBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuXG4gICAgdSA9IHg1ICsgeDEgfCAwO1xuICAgIHg5IF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4OSArIHg1IHwgMDtcbiAgICB4MTMgXj0gdTw8OSB8IHU+Pj4oMzItOSk7XG4gICAgdSA9IHgxMyArIHg5IHwgMDtcbiAgICB4MSBePSB1PDwxMyB8IHU+Pj4oMzItMTMpO1xuICAgIHUgPSB4MSArIHgxMyB8IDA7XG4gICAgeDUgXj0gdTw8MTggfCB1Pj4+KDMyLTE4KTtcblxuICAgIHUgPSB4MTAgKyB4NiB8IDA7XG4gICAgeDE0IF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4MTQgKyB4MTAgfCAwO1xuICAgIHgyIF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4MiArIHgxNCB8IDA7XG4gICAgeDYgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDYgKyB4MiB8IDA7XG4gICAgeDEwIF49IHU8PDE4IHwgdT4+PigzMi0xOCk7XG5cbiAgICB1ID0geDE1ICsgeDExIHwgMDtcbiAgICB4MyBePSB1PDw3IHwgdT4+PigzMi03KTtcbiAgICB1ID0geDMgKyB4MTUgfCAwO1xuICAgIHg3IF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4NyArIHgzIHwgMDtcbiAgICB4MTEgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDExICsgeDcgfCAwO1xuICAgIHgxNSBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuXG4gICAgdSA9IHgwICsgeDMgfCAwO1xuICAgIHgxIF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4MSArIHgwIHwgMDtcbiAgICB4MiBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDIgKyB4MSB8IDA7XG4gICAgeDMgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDMgKyB4MiB8IDA7XG4gICAgeDAgXj0gdTw8MTggfCB1Pj4+KDMyLTE4KTtcblxuICAgIHUgPSB4NSArIHg0IHwgMDtcbiAgICB4NiBePSB1PDw3IHwgdT4+PigzMi03KTtcbiAgICB1ID0geDYgKyB4NSB8IDA7XG4gICAgeDcgXj0gdTw8OSB8IHU+Pj4oMzItOSk7XG4gICAgdSA9IHg3ICsgeDYgfCAwO1xuICAgIHg0IF49IHU8PDEzIHwgdT4+PigzMi0xMyk7XG4gICAgdSA9IHg0ICsgeDcgfCAwO1xuICAgIHg1IF49IHU8PDE4IHwgdT4+PigzMi0xOCk7XG5cbiAgICB1ID0geDEwICsgeDkgfCAwO1xuICAgIHgxMSBePSB1PDw3IHwgdT4+PigzMi03KTtcbiAgICB1ID0geDExICsgeDEwIHwgMDtcbiAgICB4OCBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDggKyB4MTEgfCAwO1xuICAgIHg5IF49IHU8PDEzIHwgdT4+PigzMi0xMyk7XG4gICAgdSA9IHg5ICsgeDggfCAwO1xuICAgIHgxMCBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuXG4gICAgdSA9IHgxNSArIHgxNCB8IDA7XG4gICAgeDEyIF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4MTIgKyB4MTUgfCAwO1xuICAgIHgxMyBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDEzICsgeDEyIHwgMDtcbiAgICB4MTQgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDE0ICsgeDEzIHwgMDtcbiAgICB4MTUgXj0gdTw8MTggfCB1Pj4+KDMyLTE4KTtcbiAgfVxuICAgeDAgPSAgeDAgKyAgajAgfCAwO1xuICAgeDEgPSAgeDEgKyAgajEgfCAwO1xuICAgeDIgPSAgeDIgKyAgajIgfCAwO1xuICAgeDMgPSAgeDMgKyAgajMgfCAwO1xuICAgeDQgPSAgeDQgKyAgajQgfCAwO1xuICAgeDUgPSAgeDUgKyAgajUgfCAwO1xuICAgeDYgPSAgeDYgKyAgajYgfCAwO1xuICAgeDcgPSAgeDcgKyAgajcgfCAwO1xuICAgeDggPSAgeDggKyAgajggfCAwO1xuICAgeDkgPSAgeDkgKyAgajkgfCAwO1xuICB4MTAgPSB4MTAgKyBqMTAgfCAwO1xuICB4MTEgPSB4MTEgKyBqMTEgfCAwO1xuICB4MTIgPSB4MTIgKyBqMTIgfCAwO1xuICB4MTMgPSB4MTMgKyBqMTMgfCAwO1xuICB4MTQgPSB4MTQgKyBqMTQgfCAwO1xuICB4MTUgPSB4MTUgKyBqMTUgfCAwO1xuXG4gIG9bIDBdID0geDAgPj4+ICAwICYgMHhmZjtcbiAgb1sgMV0gPSB4MCA+Pj4gIDggJiAweGZmO1xuICBvWyAyXSA9IHgwID4+PiAxNiAmIDB4ZmY7XG4gIG9bIDNdID0geDAgPj4+IDI0ICYgMHhmZjtcblxuICBvWyA0XSA9IHgxID4+PiAgMCAmIDB4ZmY7XG4gIG9bIDVdID0geDEgPj4+ICA4ICYgMHhmZjtcbiAgb1sgNl0gPSB4MSA+Pj4gMTYgJiAweGZmO1xuICBvWyA3XSA9IHgxID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1sgOF0gPSB4MiA+Pj4gIDAgJiAweGZmO1xuICBvWyA5XSA9IHgyID4+PiAgOCAmIDB4ZmY7XG4gIG9bMTBdID0geDIgPj4+IDE2ICYgMHhmZjtcbiAgb1sxMV0gPSB4MiA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bMTJdID0geDMgPj4+ICAwICYgMHhmZjtcbiAgb1sxM10gPSB4MyA+Pj4gIDggJiAweGZmO1xuICBvWzE0XSA9IHgzID4+PiAxNiAmIDB4ZmY7XG4gIG9bMTVdID0geDMgPj4+IDI0ICYgMHhmZjtcblxuICBvWzE2XSA9IHg0ID4+PiAgMCAmIDB4ZmY7XG4gIG9bMTddID0geDQgPj4+ICA4ICYgMHhmZjtcbiAgb1sxOF0gPSB4NCA+Pj4gMTYgJiAweGZmO1xuICBvWzE5XSA9IHg0ID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1syMF0gPSB4NSA+Pj4gIDAgJiAweGZmO1xuICBvWzIxXSA9IHg1ID4+PiAgOCAmIDB4ZmY7XG4gIG9bMjJdID0geDUgPj4+IDE2ICYgMHhmZjtcbiAgb1syM10gPSB4NSA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bMjRdID0geDYgPj4+ICAwICYgMHhmZjtcbiAgb1syNV0gPSB4NiA+Pj4gIDggJiAweGZmO1xuICBvWzI2XSA9IHg2ID4+PiAxNiAmIDB4ZmY7XG4gIG9bMjddID0geDYgPj4+IDI0ICYgMHhmZjtcblxuICBvWzI4XSA9IHg3ID4+PiAgMCAmIDB4ZmY7XG4gIG9bMjldID0geDcgPj4+ICA4ICYgMHhmZjtcbiAgb1szMF0gPSB4NyA+Pj4gMTYgJiAweGZmO1xuICBvWzMxXSA9IHg3ID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1szMl0gPSB4OCA+Pj4gIDAgJiAweGZmO1xuICBvWzMzXSA9IHg4ID4+PiAgOCAmIDB4ZmY7XG4gIG9bMzRdID0geDggPj4+IDE2ICYgMHhmZjtcbiAgb1szNV0gPSB4OCA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bMzZdID0geDkgPj4+ICAwICYgMHhmZjtcbiAgb1szN10gPSB4OSA+Pj4gIDggJiAweGZmO1xuICBvWzM4XSA9IHg5ID4+PiAxNiAmIDB4ZmY7XG4gIG9bMzldID0geDkgPj4+IDI0ICYgMHhmZjtcblxuICBvWzQwXSA9IHgxMCA+Pj4gIDAgJiAweGZmO1xuICBvWzQxXSA9IHgxMCA+Pj4gIDggJiAweGZmO1xuICBvWzQyXSA9IHgxMCA+Pj4gMTYgJiAweGZmO1xuICBvWzQzXSA9IHgxMCA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bNDRdID0geDExID4+PiAgMCAmIDB4ZmY7XG4gIG9bNDVdID0geDExID4+PiAgOCAmIDB4ZmY7XG4gIG9bNDZdID0geDExID4+PiAxNiAmIDB4ZmY7XG4gIG9bNDddID0geDExID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1s0OF0gPSB4MTIgPj4+ICAwICYgMHhmZjtcbiAgb1s0OV0gPSB4MTIgPj4+ICA4ICYgMHhmZjtcbiAgb1s1MF0gPSB4MTIgPj4+IDE2ICYgMHhmZjtcbiAgb1s1MV0gPSB4MTIgPj4+IDI0ICYgMHhmZjtcblxuICBvWzUyXSA9IHgxMyA+Pj4gIDAgJiAweGZmO1xuICBvWzUzXSA9IHgxMyA+Pj4gIDggJiAweGZmO1xuICBvWzU0XSA9IHgxMyA+Pj4gMTYgJiAweGZmO1xuICBvWzU1XSA9IHgxMyA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bNTZdID0geDE0ID4+PiAgMCAmIDB4ZmY7XG4gIG9bNTddID0geDE0ID4+PiAgOCAmIDB4ZmY7XG4gIG9bNThdID0geDE0ID4+PiAxNiAmIDB4ZmY7XG4gIG9bNTldID0geDE0ID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1s2MF0gPSB4MTUgPj4+ICAwICYgMHhmZjtcbiAgb1s2MV0gPSB4MTUgPj4+ICA4ICYgMHhmZjtcbiAgb1s2Ml0gPSB4MTUgPj4+IDE2ICYgMHhmZjtcbiAgb1s2M10gPSB4MTUgPj4+IDI0ICYgMHhmZjtcbn1cblxuZnVuY3Rpb24gY29yZV9oc2Fsc2EyMChvLHAsayxjKSB7XG4gIHZhciBqMCAgPSBjWyAwXSAmIDB4ZmYgfCAoY1sgMV0gJiAweGZmKTw8OCB8IChjWyAyXSAmIDB4ZmYpPDwxNiB8IChjWyAzXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoxICA9IGtbIDBdICYgMHhmZiB8IChrWyAxXSAmIDB4ZmYpPDw4IHwgKGtbIDJdICYgMHhmZik8PDE2IHwgKGtbIDNdICYgMHhmZik8PDI0LFxuICAgICAgajIgID0ga1sgNF0gJiAweGZmIHwgKGtbIDVdICYgMHhmZik8PDggfCAoa1sgNl0gJiAweGZmKTw8MTYgfCAoa1sgN10gJiAweGZmKTw8MjQsXG4gICAgICBqMyAgPSBrWyA4XSAmIDB4ZmYgfCAoa1sgOV0gJiAweGZmKTw8OCB8IChrWzEwXSAmIDB4ZmYpPDwxNiB8IChrWzExXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGo0ICA9IGtbMTJdICYgMHhmZiB8IChrWzEzXSAmIDB4ZmYpPDw4IHwgKGtbMTRdICYgMHhmZik8PDE2IHwgKGtbMTVdICYgMHhmZik8PDI0LFxuICAgICAgajUgID0gY1sgNF0gJiAweGZmIHwgKGNbIDVdICYgMHhmZik8PDggfCAoY1sgNl0gJiAweGZmKTw8MTYgfCAoY1sgN10gJiAweGZmKTw8MjQsXG4gICAgICBqNiAgPSBwWyAwXSAmIDB4ZmYgfCAocFsgMV0gJiAweGZmKTw8OCB8IChwWyAyXSAmIDB4ZmYpPDwxNiB8IChwWyAzXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGo3ICA9IHBbIDRdICYgMHhmZiB8IChwWyA1XSAmIDB4ZmYpPDw4IHwgKHBbIDZdICYgMHhmZik8PDE2IHwgKHBbIDddICYgMHhmZik8PDI0LFxuICAgICAgajggID0gcFsgOF0gJiAweGZmIHwgKHBbIDldICYgMHhmZik8PDggfCAocFsxMF0gJiAweGZmKTw8MTYgfCAocFsxMV0gJiAweGZmKTw8MjQsXG4gICAgICBqOSAgPSBwWzEyXSAmIDB4ZmYgfCAocFsxM10gJiAweGZmKTw8OCB8IChwWzE0XSAmIDB4ZmYpPDwxNiB8IChwWzE1XSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoxMCA9IGNbIDhdICYgMHhmZiB8IChjWyA5XSAmIDB4ZmYpPDw4IHwgKGNbMTBdICYgMHhmZik8PDE2IHwgKGNbMTFdICYgMHhmZik8PDI0LFxuICAgICAgajExID0ga1sxNl0gJiAweGZmIHwgKGtbMTddICYgMHhmZik8PDggfCAoa1sxOF0gJiAweGZmKTw8MTYgfCAoa1sxOV0gJiAweGZmKTw8MjQsXG4gICAgICBqMTIgPSBrWzIwXSAmIDB4ZmYgfCAoa1syMV0gJiAweGZmKTw8OCB8IChrWzIyXSAmIDB4ZmYpPDwxNiB8IChrWzIzXSAmIDB4ZmYpPDwyNCxcbiAgICAgIGoxMyA9IGtbMjRdICYgMHhmZiB8IChrWzI1XSAmIDB4ZmYpPDw4IHwgKGtbMjZdICYgMHhmZik8PDE2IHwgKGtbMjddICYgMHhmZik8PDI0LFxuICAgICAgajE0ID0ga1syOF0gJiAweGZmIHwgKGtbMjldICYgMHhmZik8PDggfCAoa1szMF0gJiAweGZmKTw8MTYgfCAoa1szMV0gJiAweGZmKTw8MjQsXG4gICAgICBqMTUgPSBjWzEyXSAmIDB4ZmYgfCAoY1sxM10gJiAweGZmKTw8OCB8IChjWzE0XSAmIDB4ZmYpPDwxNiB8IChjWzE1XSAmIDB4ZmYpPDwyNDtcblxuICB2YXIgeDAgPSBqMCwgeDEgPSBqMSwgeDIgPSBqMiwgeDMgPSBqMywgeDQgPSBqNCwgeDUgPSBqNSwgeDYgPSBqNiwgeDcgPSBqNyxcbiAgICAgIHg4ID0gajgsIHg5ID0gajksIHgxMCA9IGoxMCwgeDExID0gajExLCB4MTIgPSBqMTIsIHgxMyA9IGoxMywgeDE0ID0gajE0LFxuICAgICAgeDE1ID0gajE1LCB1O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMjA7IGkgKz0gMikge1xuICAgIHUgPSB4MCArIHgxMiB8IDA7XG4gICAgeDQgXj0gdTw8NyB8IHU+Pj4oMzItNyk7XG4gICAgdSA9IHg0ICsgeDAgfCAwO1xuICAgIHg4IF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4OCArIHg0IHwgMDtcbiAgICB4MTIgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDEyICsgeDggfCAwO1xuICAgIHgwIF49IHU8PDE4IHwgdT4+PigzMi0xOCk7XG5cbiAgICB1ID0geDUgKyB4MSB8IDA7XG4gICAgeDkgXj0gdTw8NyB8IHU+Pj4oMzItNyk7XG4gICAgdSA9IHg5ICsgeDUgfCAwO1xuICAgIHgxMyBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDEzICsgeDkgfCAwO1xuICAgIHgxIF49IHU8PDEzIHwgdT4+PigzMi0xMyk7XG4gICAgdSA9IHgxICsgeDEzIHwgMDtcbiAgICB4NSBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuXG4gICAgdSA9IHgxMCArIHg2IHwgMDtcbiAgICB4MTQgXj0gdTw8NyB8IHU+Pj4oMzItNyk7XG4gICAgdSA9IHgxNCArIHgxMCB8IDA7XG4gICAgeDIgXj0gdTw8OSB8IHU+Pj4oMzItOSk7XG4gICAgdSA9IHgyICsgeDE0IHwgMDtcbiAgICB4NiBePSB1PDwxMyB8IHU+Pj4oMzItMTMpO1xuICAgIHUgPSB4NiArIHgyIHwgMDtcbiAgICB4MTAgXj0gdTw8MTggfCB1Pj4+KDMyLTE4KTtcblxuICAgIHUgPSB4MTUgKyB4MTEgfCAwO1xuICAgIHgzIF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4MyArIHgxNSB8IDA7XG4gICAgeDcgXj0gdTw8OSB8IHU+Pj4oMzItOSk7XG4gICAgdSA9IHg3ICsgeDMgfCAwO1xuICAgIHgxMSBePSB1PDwxMyB8IHU+Pj4oMzItMTMpO1xuICAgIHUgPSB4MTEgKyB4NyB8IDA7XG4gICAgeDE1IF49IHU8PDE4IHwgdT4+PigzMi0xOCk7XG5cbiAgICB1ID0geDAgKyB4MyB8IDA7XG4gICAgeDEgXj0gdTw8NyB8IHU+Pj4oMzItNyk7XG4gICAgdSA9IHgxICsgeDAgfCAwO1xuICAgIHgyIF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4MiArIHgxIHwgMDtcbiAgICB4MyBePSB1PDwxMyB8IHU+Pj4oMzItMTMpO1xuICAgIHUgPSB4MyArIHgyIHwgMDtcbiAgICB4MCBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuXG4gICAgdSA9IHg1ICsgeDQgfCAwO1xuICAgIHg2IF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4NiArIHg1IHwgMDtcbiAgICB4NyBePSB1PDw5IHwgdT4+PigzMi05KTtcbiAgICB1ID0geDcgKyB4NiB8IDA7XG4gICAgeDQgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDQgKyB4NyB8IDA7XG4gICAgeDUgXj0gdTw8MTggfCB1Pj4+KDMyLTE4KTtcblxuICAgIHUgPSB4MTAgKyB4OSB8IDA7XG4gICAgeDExIF49IHU8PDcgfCB1Pj4+KDMyLTcpO1xuICAgIHUgPSB4MTEgKyB4MTAgfCAwO1xuICAgIHg4IF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4OCArIHgxMSB8IDA7XG4gICAgeDkgXj0gdTw8MTMgfCB1Pj4+KDMyLTEzKTtcbiAgICB1ID0geDkgKyB4OCB8IDA7XG4gICAgeDEwIF49IHU8PDE4IHwgdT4+PigzMi0xOCk7XG5cbiAgICB1ID0geDE1ICsgeDE0IHwgMDtcbiAgICB4MTIgXj0gdTw8NyB8IHU+Pj4oMzItNyk7XG4gICAgdSA9IHgxMiArIHgxNSB8IDA7XG4gICAgeDEzIF49IHU8PDkgfCB1Pj4+KDMyLTkpO1xuICAgIHUgPSB4MTMgKyB4MTIgfCAwO1xuICAgIHgxNCBePSB1PDwxMyB8IHU+Pj4oMzItMTMpO1xuICAgIHUgPSB4MTQgKyB4MTMgfCAwO1xuICAgIHgxNSBePSB1PDwxOCB8IHU+Pj4oMzItMTgpO1xuICB9XG5cbiAgb1sgMF0gPSB4MCA+Pj4gIDAgJiAweGZmO1xuICBvWyAxXSA9IHgwID4+PiAgOCAmIDB4ZmY7XG4gIG9bIDJdID0geDAgPj4+IDE2ICYgMHhmZjtcbiAgb1sgM10gPSB4MCA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bIDRdID0geDUgPj4+ICAwICYgMHhmZjtcbiAgb1sgNV0gPSB4NSA+Pj4gIDggJiAweGZmO1xuICBvWyA2XSA9IHg1ID4+PiAxNiAmIDB4ZmY7XG4gIG9bIDddID0geDUgPj4+IDI0ICYgMHhmZjtcblxuICBvWyA4XSA9IHgxMCA+Pj4gIDAgJiAweGZmO1xuICBvWyA5XSA9IHgxMCA+Pj4gIDggJiAweGZmO1xuICBvWzEwXSA9IHgxMCA+Pj4gMTYgJiAweGZmO1xuICBvWzExXSA9IHgxMCA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bMTJdID0geDE1ID4+PiAgMCAmIDB4ZmY7XG4gIG9bMTNdID0geDE1ID4+PiAgOCAmIDB4ZmY7XG4gIG9bMTRdID0geDE1ID4+PiAxNiAmIDB4ZmY7XG4gIG9bMTVdID0geDE1ID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1sxNl0gPSB4NiA+Pj4gIDAgJiAweGZmO1xuICBvWzE3XSA9IHg2ID4+PiAgOCAmIDB4ZmY7XG4gIG9bMThdID0geDYgPj4+IDE2ICYgMHhmZjtcbiAgb1sxOV0gPSB4NiA+Pj4gMjQgJiAweGZmO1xuXG4gIG9bMjBdID0geDcgPj4+ICAwICYgMHhmZjtcbiAgb1syMV0gPSB4NyA+Pj4gIDggJiAweGZmO1xuICBvWzIyXSA9IHg3ID4+PiAxNiAmIDB4ZmY7XG4gIG9bMjNdID0geDcgPj4+IDI0ICYgMHhmZjtcblxuICBvWzI0XSA9IHg4ID4+PiAgMCAmIDB4ZmY7XG4gIG9bMjVdID0geDggPj4+ICA4ICYgMHhmZjtcbiAgb1syNl0gPSB4OCA+Pj4gMTYgJiAweGZmO1xuICBvWzI3XSA9IHg4ID4+PiAyNCAmIDB4ZmY7XG5cbiAgb1syOF0gPSB4OSA+Pj4gIDAgJiAweGZmO1xuICBvWzI5XSA9IHg5ID4+PiAgOCAmIDB4ZmY7XG4gIG9bMzBdID0geDkgPj4+IDE2ICYgMHhmZjtcbiAgb1szMV0gPSB4OSA+Pj4gMjQgJiAweGZmO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9fY29yZV9zYWxzYTIwKG91dCxpbnAsayxjKSB7XG4gIGNvcmVfc2Fsc2EyMChvdXQsaW5wLGssYyk7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19jb3JlX2hzYWxzYTIwKG91dCxpbnAsayxjKSB7XG4gIGNvcmVfaHNhbHNhMjAob3V0LGlucCxrLGMpO1xufVxuXG52YXIgc2lnbWEgPSBuZXcgVWludDhBcnJheShbMTAxLCAxMjAsIDExMiwgOTcsIDExMCwgMTAwLCAzMiwgNTEsIDUwLCA0NSwgOTgsIDEyMSwgMTE2LCAxMDEsIDMyLCAxMDddKTtcbiAgICAgICAgICAgIC8vIFwiZXhwYW5kIDMyLWJ5dGUga1wiXG5cbmZ1bmN0aW9uIGNyeXB0b19zdHJlYW1fc2Fsc2EyMF94b3IoYyxjcG9zLG0sbXBvcyxiLG4saykge1xuICB2YXIgeiA9IG5ldyBVaW50OEFycmF5KDE2KSwgeCA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgdmFyIHUsIGk7XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB6W2ldID0gMDtcbiAgZm9yIChpID0gMDsgaSA8IDg7IGkrKykgeltpXSA9IG5baV07XG4gIHdoaWxlIChiID49IDY0KSB7XG4gICAgY3J5cHRvX2NvcmVfc2Fsc2EyMCh4LHosayxzaWdtYSk7XG4gICAgZm9yIChpID0gMDsgaSA8IDY0OyBpKyspIGNbY3BvcytpXSA9IG1bbXBvcytpXSBeIHhbaV07XG4gICAgdSA9IDE7XG4gICAgZm9yIChpID0gODsgaSA8IDE2OyBpKyspIHtcbiAgICAgIHUgPSB1ICsgKHpbaV0gJiAweGZmKSB8IDA7XG4gICAgICB6W2ldID0gdSAmIDB4ZmY7XG4gICAgICB1ID4+Pj0gODtcbiAgICB9XG4gICAgYiAtPSA2NDtcbiAgICBjcG9zICs9IDY0O1xuICAgIG1wb3MgKz0gNjQ7XG4gIH1cbiAgaWYgKGIgPiAwKSB7XG4gICAgY3J5cHRvX2NvcmVfc2Fsc2EyMCh4LHosayxzaWdtYSk7XG4gICAgZm9yIChpID0gMDsgaSA8IGI7IGkrKykgY1tjcG9zK2ldID0gbVttcG9zK2ldIF4geFtpXTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gY3J5cHRvX3N0cmVhbV9zYWxzYTIwKGMsY3BvcyxiLG4saykge1xuICB2YXIgeiA9IG5ldyBVaW50OEFycmF5KDE2KSwgeCA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgdmFyIHUsIGk7XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB6W2ldID0gMDtcbiAgZm9yIChpID0gMDsgaSA8IDg7IGkrKykgeltpXSA9IG5baV07XG4gIHdoaWxlIChiID49IDY0KSB7XG4gICAgY3J5cHRvX2NvcmVfc2Fsc2EyMCh4LHosayxzaWdtYSk7XG4gICAgZm9yIChpID0gMDsgaSA8IDY0OyBpKyspIGNbY3BvcytpXSA9IHhbaV07XG4gICAgdSA9IDE7XG4gICAgZm9yIChpID0gODsgaSA8IDE2OyBpKyspIHtcbiAgICAgIHUgPSB1ICsgKHpbaV0gJiAweGZmKSB8IDA7XG4gICAgICB6W2ldID0gdSAmIDB4ZmY7XG4gICAgICB1ID4+Pj0gODtcbiAgICB9XG4gICAgYiAtPSA2NDtcbiAgICBjcG9zICs9IDY0O1xuICB9XG4gIGlmIChiID4gMCkge1xuICAgIGNyeXB0b19jb3JlX3NhbHNhMjAoeCx6LGssc2lnbWEpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBiOyBpKyspIGNbY3BvcytpXSA9IHhbaV07XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19zdHJlYW0oYyxjcG9zLGQsbixrKSB7XG4gIHZhciBzID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBjcnlwdG9fY29yZV9oc2Fsc2EyMChzLG4sayxzaWdtYSk7XG4gIHZhciBzbiA9IG5ldyBVaW50OEFycmF5KDgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykgc25baV0gPSBuW2krMTZdO1xuICByZXR1cm4gY3J5cHRvX3N0cmVhbV9zYWxzYTIwKGMsY3BvcyxkLHNuLHMpO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9fc3RyZWFtX3hvcihjLGNwb3MsbSxtcG9zLGQsbixrKSB7XG4gIHZhciBzID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBjcnlwdG9fY29yZV9oc2Fsc2EyMChzLG4sayxzaWdtYSk7XG4gIHZhciBzbiA9IG5ldyBVaW50OEFycmF5KDgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IDg7IGkrKykgc25baV0gPSBuW2krMTZdO1xuICByZXR1cm4gY3J5cHRvX3N0cmVhbV9zYWxzYTIwX3hvcihjLGNwb3MsbSxtcG9zLGQsc24scyk7XG59XG5cbi8qXG4qIFBvcnQgb2YgQW5kcmV3IE1vb24ncyBQb2x5MTMwNS1kb25uYS0xNi4gUHVibGljIGRvbWFpbi5cbiogaHR0cHM6Ly9naXRodWIuY29tL2Zsb29keWJlcnJ5L3BvbHkxMzA1LWRvbm5hXG4qL1xuXG52YXIgcG9seTEzMDUgPSBmdW5jdGlvbihrZXkpIHtcbiAgdGhpcy5idWZmZXIgPSBuZXcgVWludDhBcnJheSgxNik7XG4gIHRoaXMuciA9IG5ldyBVaW50MTZBcnJheSgxMCk7XG4gIHRoaXMuaCA9IG5ldyBVaW50MTZBcnJheSgxMCk7XG4gIHRoaXMucGFkID0gbmV3IFVpbnQxNkFycmF5KDgpO1xuICB0aGlzLmxlZnRvdmVyID0gMDtcbiAgdGhpcy5maW4gPSAwO1xuXG4gIHZhciB0MCwgdDEsIHQyLCB0MywgdDQsIHQ1LCB0NiwgdDc7XG5cbiAgdDAgPSBrZXlbIDBdICYgMHhmZiB8IChrZXlbIDFdICYgMHhmZikgPDwgODsgdGhpcy5yWzBdID0gKCB0MCAgICAgICAgICAgICAgICAgICAgICkgJiAweDFmZmY7XG4gIHQxID0ga2V5WyAyXSAmIDB4ZmYgfCAoa2V5WyAzXSAmIDB4ZmYpIDw8IDg7IHRoaXMuclsxXSA9ICgodDAgPj4+IDEzKSB8ICh0MSA8PCAgMykpICYgMHgxZmZmO1xuICB0MiA9IGtleVsgNF0gJiAweGZmIHwgKGtleVsgNV0gJiAweGZmKSA8PCA4OyB0aGlzLnJbMl0gPSAoKHQxID4+PiAxMCkgfCAodDIgPDwgIDYpKSAmIDB4MWYwMztcbiAgdDMgPSBrZXlbIDZdICYgMHhmZiB8IChrZXlbIDddICYgMHhmZikgPDwgODsgdGhpcy5yWzNdID0gKCh0MiA+Pj4gIDcpIHwgKHQzIDw8ICA5KSkgJiAweDFmZmY7XG4gIHQ0ID0ga2V5WyA4XSAmIDB4ZmYgfCAoa2V5WyA5XSAmIDB4ZmYpIDw8IDg7IHRoaXMucls0XSA9ICgodDMgPj4+ICA0KSB8ICh0NCA8PCAxMikpICYgMHgwMGZmO1xuICB0aGlzLnJbNV0gPSAoKHQ0ID4+PiAgMSkpICYgMHgxZmZlO1xuICB0NSA9IGtleVsxMF0gJiAweGZmIHwgKGtleVsxMV0gJiAweGZmKSA8PCA4OyB0aGlzLnJbNl0gPSAoKHQ0ID4+PiAxNCkgfCAodDUgPDwgIDIpKSAmIDB4MWZmZjtcbiAgdDYgPSBrZXlbMTJdICYgMHhmZiB8IChrZXlbMTNdICYgMHhmZikgPDwgODsgdGhpcy5yWzddID0gKCh0NSA+Pj4gMTEpIHwgKHQ2IDw8ICA1KSkgJiAweDFmODE7XG4gIHQ3ID0ga2V5WzE0XSAmIDB4ZmYgfCAoa2V5WzE1XSAmIDB4ZmYpIDw8IDg7IHRoaXMucls4XSA9ICgodDYgPj4+ICA4KSB8ICh0NyA8PCAgOCkpICYgMHgxZmZmO1xuICB0aGlzLnJbOV0gPSAoKHQ3ID4+PiAgNSkpICYgMHgwMDdmO1xuXG4gIHRoaXMucGFkWzBdID0ga2V5WzE2XSAmIDB4ZmYgfCAoa2V5WzE3XSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzFdID0ga2V5WzE4XSAmIDB4ZmYgfCAoa2V5WzE5XSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzJdID0ga2V5WzIwXSAmIDB4ZmYgfCAoa2V5WzIxXSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzNdID0ga2V5WzIyXSAmIDB4ZmYgfCAoa2V5WzIzXSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzRdID0ga2V5WzI0XSAmIDB4ZmYgfCAoa2V5WzI1XSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzVdID0ga2V5WzI2XSAmIDB4ZmYgfCAoa2V5WzI3XSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzZdID0ga2V5WzI4XSAmIDB4ZmYgfCAoa2V5WzI5XSAmIDB4ZmYpIDw8IDg7XG4gIHRoaXMucGFkWzddID0ga2V5WzMwXSAmIDB4ZmYgfCAoa2V5WzMxXSAmIDB4ZmYpIDw8IDg7XG59O1xuXG5wb2x5MTMwNS5wcm90b3R5cGUuYmxvY2tzID0gZnVuY3Rpb24obSwgbXBvcywgYnl0ZXMpIHtcbiAgdmFyIGhpYml0ID0gdGhpcy5maW4gPyAwIDogKDEgPDwgMTEpO1xuICB2YXIgdDAsIHQxLCB0MiwgdDMsIHQ0LCB0NSwgdDYsIHQ3LCBjO1xuICB2YXIgZDAsIGQxLCBkMiwgZDMsIGQ0LCBkNSwgZDYsIGQ3LCBkOCwgZDk7XG5cbiAgdmFyIGgwID0gdGhpcy5oWzBdLFxuICAgICAgaDEgPSB0aGlzLmhbMV0sXG4gICAgICBoMiA9IHRoaXMuaFsyXSxcbiAgICAgIGgzID0gdGhpcy5oWzNdLFxuICAgICAgaDQgPSB0aGlzLmhbNF0sXG4gICAgICBoNSA9IHRoaXMuaFs1XSxcbiAgICAgIGg2ID0gdGhpcy5oWzZdLFxuICAgICAgaDcgPSB0aGlzLmhbN10sXG4gICAgICBoOCA9IHRoaXMuaFs4XSxcbiAgICAgIGg5ID0gdGhpcy5oWzldO1xuXG4gIHZhciByMCA9IHRoaXMuclswXSxcbiAgICAgIHIxID0gdGhpcy5yWzFdLFxuICAgICAgcjIgPSB0aGlzLnJbMl0sXG4gICAgICByMyA9IHRoaXMuclszXSxcbiAgICAgIHI0ID0gdGhpcy5yWzRdLFxuICAgICAgcjUgPSB0aGlzLnJbNV0sXG4gICAgICByNiA9IHRoaXMucls2XSxcbiAgICAgIHI3ID0gdGhpcy5yWzddLFxuICAgICAgcjggPSB0aGlzLnJbOF0sXG4gICAgICByOSA9IHRoaXMucls5XTtcblxuICB3aGlsZSAoYnl0ZXMgPj0gMTYpIHtcbiAgICB0MCA9IG1bbXBvcysgMF0gJiAweGZmIHwgKG1bbXBvcysgMV0gJiAweGZmKSA8PCA4OyBoMCArPSAoIHQwICAgICAgICAgICAgICAgICAgICAgKSAmIDB4MWZmZjtcbiAgICB0MSA9IG1bbXBvcysgMl0gJiAweGZmIHwgKG1bbXBvcysgM10gJiAweGZmKSA8PCA4OyBoMSArPSAoKHQwID4+PiAxMykgfCAodDEgPDwgIDMpKSAmIDB4MWZmZjtcbiAgICB0MiA9IG1bbXBvcysgNF0gJiAweGZmIHwgKG1bbXBvcysgNV0gJiAweGZmKSA8PCA4OyBoMiArPSAoKHQxID4+PiAxMCkgfCAodDIgPDwgIDYpKSAmIDB4MWZmZjtcbiAgICB0MyA9IG1bbXBvcysgNl0gJiAweGZmIHwgKG1bbXBvcysgN10gJiAweGZmKSA8PCA4OyBoMyArPSAoKHQyID4+PiAgNykgfCAodDMgPDwgIDkpKSAmIDB4MWZmZjtcbiAgICB0NCA9IG1bbXBvcysgOF0gJiAweGZmIHwgKG1bbXBvcysgOV0gJiAweGZmKSA8PCA4OyBoNCArPSAoKHQzID4+PiAgNCkgfCAodDQgPDwgMTIpKSAmIDB4MWZmZjtcbiAgICBoNSArPSAoKHQ0ID4+PiAgMSkpICYgMHgxZmZmO1xuICAgIHQ1ID0gbVttcG9zKzEwXSAmIDB4ZmYgfCAobVttcG9zKzExXSAmIDB4ZmYpIDw8IDg7IGg2ICs9ICgodDQgPj4+IDE0KSB8ICh0NSA8PCAgMikpICYgMHgxZmZmO1xuICAgIHQ2ID0gbVttcG9zKzEyXSAmIDB4ZmYgfCAobVttcG9zKzEzXSAmIDB4ZmYpIDw8IDg7IGg3ICs9ICgodDUgPj4+IDExKSB8ICh0NiA8PCAgNSkpICYgMHgxZmZmO1xuICAgIHQ3ID0gbVttcG9zKzE0XSAmIDB4ZmYgfCAobVttcG9zKzE1XSAmIDB4ZmYpIDw8IDg7IGg4ICs9ICgodDYgPj4+ICA4KSB8ICh0NyA8PCAgOCkpICYgMHgxZmZmO1xuICAgIGg5ICs9ICgodDcgPj4+IDUpKSB8IGhpYml0O1xuXG4gICAgYyA9IDA7XG5cbiAgICBkMCA9IGM7XG4gICAgZDAgKz0gaDAgKiByMDtcbiAgICBkMCArPSBoMSAqICg1ICogcjkpO1xuICAgIGQwICs9IGgyICogKDUgKiByOCk7XG4gICAgZDAgKz0gaDMgKiAoNSAqIHI3KTtcbiAgICBkMCArPSBoNCAqICg1ICogcjYpO1xuICAgIGMgPSAoZDAgPj4+IDEzKTsgZDAgJj0gMHgxZmZmO1xuICAgIGQwICs9IGg1ICogKDUgKiByNSk7XG4gICAgZDAgKz0gaDYgKiAoNSAqIHI0KTtcbiAgICBkMCArPSBoNyAqICg1ICogcjMpO1xuICAgIGQwICs9IGg4ICogKDUgKiByMik7XG4gICAgZDAgKz0gaDkgKiAoNSAqIHIxKTtcbiAgICBjICs9IChkMCA+Pj4gMTMpOyBkMCAmPSAweDFmZmY7XG5cbiAgICBkMSA9IGM7XG4gICAgZDEgKz0gaDAgKiByMTtcbiAgICBkMSArPSBoMSAqIHIwO1xuICAgIGQxICs9IGgyICogKDUgKiByOSk7XG4gICAgZDEgKz0gaDMgKiAoNSAqIHI4KTtcbiAgICBkMSArPSBoNCAqICg1ICogcjcpO1xuICAgIGMgPSAoZDEgPj4+IDEzKTsgZDEgJj0gMHgxZmZmO1xuICAgIGQxICs9IGg1ICogKDUgKiByNik7XG4gICAgZDEgKz0gaDYgKiAoNSAqIHI1KTtcbiAgICBkMSArPSBoNyAqICg1ICogcjQpO1xuICAgIGQxICs9IGg4ICogKDUgKiByMyk7XG4gICAgZDEgKz0gaDkgKiAoNSAqIHIyKTtcbiAgICBjICs9IChkMSA+Pj4gMTMpOyBkMSAmPSAweDFmZmY7XG5cbiAgICBkMiA9IGM7XG4gICAgZDIgKz0gaDAgKiByMjtcbiAgICBkMiArPSBoMSAqIHIxO1xuICAgIGQyICs9IGgyICogcjA7XG4gICAgZDIgKz0gaDMgKiAoNSAqIHI5KTtcbiAgICBkMiArPSBoNCAqICg1ICogcjgpO1xuICAgIGMgPSAoZDIgPj4+IDEzKTsgZDIgJj0gMHgxZmZmO1xuICAgIGQyICs9IGg1ICogKDUgKiByNyk7XG4gICAgZDIgKz0gaDYgKiAoNSAqIHI2KTtcbiAgICBkMiArPSBoNyAqICg1ICogcjUpO1xuICAgIGQyICs9IGg4ICogKDUgKiByNCk7XG4gICAgZDIgKz0gaDkgKiAoNSAqIHIzKTtcbiAgICBjICs9IChkMiA+Pj4gMTMpOyBkMiAmPSAweDFmZmY7XG5cbiAgICBkMyA9IGM7XG4gICAgZDMgKz0gaDAgKiByMztcbiAgICBkMyArPSBoMSAqIHIyO1xuICAgIGQzICs9IGgyICogcjE7XG4gICAgZDMgKz0gaDMgKiByMDtcbiAgICBkMyArPSBoNCAqICg1ICogcjkpO1xuICAgIGMgPSAoZDMgPj4+IDEzKTsgZDMgJj0gMHgxZmZmO1xuICAgIGQzICs9IGg1ICogKDUgKiByOCk7XG4gICAgZDMgKz0gaDYgKiAoNSAqIHI3KTtcbiAgICBkMyArPSBoNyAqICg1ICogcjYpO1xuICAgIGQzICs9IGg4ICogKDUgKiByNSk7XG4gICAgZDMgKz0gaDkgKiAoNSAqIHI0KTtcbiAgICBjICs9IChkMyA+Pj4gMTMpOyBkMyAmPSAweDFmZmY7XG5cbiAgICBkNCA9IGM7XG4gICAgZDQgKz0gaDAgKiByNDtcbiAgICBkNCArPSBoMSAqIHIzO1xuICAgIGQ0ICs9IGgyICogcjI7XG4gICAgZDQgKz0gaDMgKiByMTtcbiAgICBkNCArPSBoNCAqIHIwO1xuICAgIGMgPSAoZDQgPj4+IDEzKTsgZDQgJj0gMHgxZmZmO1xuICAgIGQ0ICs9IGg1ICogKDUgKiByOSk7XG4gICAgZDQgKz0gaDYgKiAoNSAqIHI4KTtcbiAgICBkNCArPSBoNyAqICg1ICogcjcpO1xuICAgIGQ0ICs9IGg4ICogKDUgKiByNik7XG4gICAgZDQgKz0gaDkgKiAoNSAqIHI1KTtcbiAgICBjICs9IChkNCA+Pj4gMTMpOyBkNCAmPSAweDFmZmY7XG5cbiAgICBkNSA9IGM7XG4gICAgZDUgKz0gaDAgKiByNTtcbiAgICBkNSArPSBoMSAqIHI0O1xuICAgIGQ1ICs9IGgyICogcjM7XG4gICAgZDUgKz0gaDMgKiByMjtcbiAgICBkNSArPSBoNCAqIHIxO1xuICAgIGMgPSAoZDUgPj4+IDEzKTsgZDUgJj0gMHgxZmZmO1xuICAgIGQ1ICs9IGg1ICogcjA7XG4gICAgZDUgKz0gaDYgKiAoNSAqIHI5KTtcbiAgICBkNSArPSBoNyAqICg1ICogcjgpO1xuICAgIGQ1ICs9IGg4ICogKDUgKiByNyk7XG4gICAgZDUgKz0gaDkgKiAoNSAqIHI2KTtcbiAgICBjICs9IChkNSA+Pj4gMTMpOyBkNSAmPSAweDFmZmY7XG5cbiAgICBkNiA9IGM7XG4gICAgZDYgKz0gaDAgKiByNjtcbiAgICBkNiArPSBoMSAqIHI1O1xuICAgIGQ2ICs9IGgyICogcjQ7XG4gICAgZDYgKz0gaDMgKiByMztcbiAgICBkNiArPSBoNCAqIHIyO1xuICAgIGMgPSAoZDYgPj4+IDEzKTsgZDYgJj0gMHgxZmZmO1xuICAgIGQ2ICs9IGg1ICogcjE7XG4gICAgZDYgKz0gaDYgKiByMDtcbiAgICBkNiArPSBoNyAqICg1ICogcjkpO1xuICAgIGQ2ICs9IGg4ICogKDUgKiByOCk7XG4gICAgZDYgKz0gaDkgKiAoNSAqIHI3KTtcbiAgICBjICs9IChkNiA+Pj4gMTMpOyBkNiAmPSAweDFmZmY7XG5cbiAgICBkNyA9IGM7XG4gICAgZDcgKz0gaDAgKiByNztcbiAgICBkNyArPSBoMSAqIHI2O1xuICAgIGQ3ICs9IGgyICogcjU7XG4gICAgZDcgKz0gaDMgKiByNDtcbiAgICBkNyArPSBoNCAqIHIzO1xuICAgIGMgPSAoZDcgPj4+IDEzKTsgZDcgJj0gMHgxZmZmO1xuICAgIGQ3ICs9IGg1ICogcjI7XG4gICAgZDcgKz0gaDYgKiByMTtcbiAgICBkNyArPSBoNyAqIHIwO1xuICAgIGQ3ICs9IGg4ICogKDUgKiByOSk7XG4gICAgZDcgKz0gaDkgKiAoNSAqIHI4KTtcbiAgICBjICs9IChkNyA+Pj4gMTMpOyBkNyAmPSAweDFmZmY7XG5cbiAgICBkOCA9IGM7XG4gICAgZDggKz0gaDAgKiByODtcbiAgICBkOCArPSBoMSAqIHI3O1xuICAgIGQ4ICs9IGgyICogcjY7XG4gICAgZDggKz0gaDMgKiByNTtcbiAgICBkOCArPSBoNCAqIHI0O1xuICAgIGMgPSAoZDggPj4+IDEzKTsgZDggJj0gMHgxZmZmO1xuICAgIGQ4ICs9IGg1ICogcjM7XG4gICAgZDggKz0gaDYgKiByMjtcbiAgICBkOCArPSBoNyAqIHIxO1xuICAgIGQ4ICs9IGg4ICogcjA7XG4gICAgZDggKz0gaDkgKiAoNSAqIHI5KTtcbiAgICBjICs9IChkOCA+Pj4gMTMpOyBkOCAmPSAweDFmZmY7XG5cbiAgICBkOSA9IGM7XG4gICAgZDkgKz0gaDAgKiByOTtcbiAgICBkOSArPSBoMSAqIHI4O1xuICAgIGQ5ICs9IGgyICogcjc7XG4gICAgZDkgKz0gaDMgKiByNjtcbiAgICBkOSArPSBoNCAqIHI1O1xuICAgIGMgPSAoZDkgPj4+IDEzKTsgZDkgJj0gMHgxZmZmO1xuICAgIGQ5ICs9IGg1ICogcjQ7XG4gICAgZDkgKz0gaDYgKiByMztcbiAgICBkOSArPSBoNyAqIHIyO1xuICAgIGQ5ICs9IGg4ICogcjE7XG4gICAgZDkgKz0gaDkgKiByMDtcbiAgICBjICs9IChkOSA+Pj4gMTMpOyBkOSAmPSAweDFmZmY7XG5cbiAgICBjID0gKCgoYyA8PCAyKSArIGMpKSB8IDA7XG4gICAgYyA9IChjICsgZDApIHwgMDtcbiAgICBkMCA9IGMgJiAweDFmZmY7XG4gICAgYyA9IChjID4+PiAxMyk7XG4gICAgZDEgKz0gYztcblxuICAgIGgwID0gZDA7XG4gICAgaDEgPSBkMTtcbiAgICBoMiA9IGQyO1xuICAgIGgzID0gZDM7XG4gICAgaDQgPSBkNDtcbiAgICBoNSA9IGQ1O1xuICAgIGg2ID0gZDY7XG4gICAgaDcgPSBkNztcbiAgICBoOCA9IGQ4O1xuICAgIGg5ID0gZDk7XG5cbiAgICBtcG9zICs9IDE2O1xuICAgIGJ5dGVzIC09IDE2O1xuICB9XG4gIHRoaXMuaFswXSA9IGgwO1xuICB0aGlzLmhbMV0gPSBoMTtcbiAgdGhpcy5oWzJdID0gaDI7XG4gIHRoaXMuaFszXSA9IGgzO1xuICB0aGlzLmhbNF0gPSBoNDtcbiAgdGhpcy5oWzVdID0gaDU7XG4gIHRoaXMuaFs2XSA9IGg2O1xuICB0aGlzLmhbN10gPSBoNztcbiAgdGhpcy5oWzhdID0gaDg7XG4gIHRoaXMuaFs5XSA9IGg5O1xufTtcblxucG9seTEzMDUucHJvdG90eXBlLmZpbmlzaCA9IGZ1bmN0aW9uKG1hYywgbWFjcG9zKSB7XG4gIHZhciBnID0gbmV3IFVpbnQxNkFycmF5KDEwKTtcbiAgdmFyIGMsIG1hc2ssIGYsIGk7XG5cbiAgaWYgKHRoaXMubGVmdG92ZXIpIHtcbiAgICBpID0gdGhpcy5sZWZ0b3ZlcjtcbiAgICB0aGlzLmJ1ZmZlcltpKytdID0gMTtcbiAgICBmb3IgKDsgaSA8IDE2OyBpKyspIHRoaXMuYnVmZmVyW2ldID0gMDtcbiAgICB0aGlzLmZpbiA9IDE7XG4gICAgdGhpcy5ibG9ja3ModGhpcy5idWZmZXIsIDAsIDE2KTtcbiAgfVxuXG4gIGMgPSB0aGlzLmhbMV0gPj4+IDEzO1xuICB0aGlzLmhbMV0gJj0gMHgxZmZmO1xuICBmb3IgKGkgPSAyOyBpIDwgMTA7IGkrKykge1xuICAgIHRoaXMuaFtpXSArPSBjO1xuICAgIGMgPSB0aGlzLmhbaV0gPj4+IDEzO1xuICAgIHRoaXMuaFtpXSAmPSAweDFmZmY7XG4gIH1cbiAgdGhpcy5oWzBdICs9IChjICogNSk7XG4gIGMgPSB0aGlzLmhbMF0gPj4+IDEzO1xuICB0aGlzLmhbMF0gJj0gMHgxZmZmO1xuICB0aGlzLmhbMV0gKz0gYztcbiAgYyA9IHRoaXMuaFsxXSA+Pj4gMTM7XG4gIHRoaXMuaFsxXSAmPSAweDFmZmY7XG4gIHRoaXMuaFsyXSArPSBjO1xuXG4gIGdbMF0gPSB0aGlzLmhbMF0gKyA1O1xuICBjID0gZ1swXSA+Pj4gMTM7XG4gIGdbMF0gJj0gMHgxZmZmO1xuICBmb3IgKGkgPSAxOyBpIDwgMTA7IGkrKykge1xuICAgIGdbaV0gPSB0aGlzLmhbaV0gKyBjO1xuICAgIGMgPSBnW2ldID4+PiAxMztcbiAgICBnW2ldICY9IDB4MWZmZjtcbiAgfVxuICBnWzldIC09ICgxIDw8IDEzKTtcblxuICBtYXNrID0gKGMgXiAxKSAtIDE7XG4gIGZvciAoaSA9IDA7IGkgPCAxMDsgaSsrKSBnW2ldICY9IG1hc2s7XG4gIG1hc2sgPSB+bWFzaztcbiAgZm9yIChpID0gMDsgaSA8IDEwOyBpKyspIHRoaXMuaFtpXSA9ICh0aGlzLmhbaV0gJiBtYXNrKSB8IGdbaV07XG5cbiAgdGhpcy5oWzBdID0gKCh0aGlzLmhbMF0gICAgICAgKSB8ICh0aGlzLmhbMV0gPDwgMTMpICAgICAgICAgICAgICAgICAgICApICYgMHhmZmZmO1xuICB0aGlzLmhbMV0gPSAoKHRoaXMuaFsxXSA+Pj4gIDMpIHwgKHRoaXMuaFsyXSA8PCAxMCkgICAgICAgICAgICAgICAgICAgICkgJiAweGZmZmY7XG4gIHRoaXMuaFsyXSA9ICgodGhpcy5oWzJdID4+PiAgNikgfCAodGhpcy5oWzNdIDw8ICA3KSAgICAgICAgICAgICAgICAgICAgKSAmIDB4ZmZmZjtcbiAgdGhpcy5oWzNdID0gKCh0aGlzLmhbM10gPj4+ICA5KSB8ICh0aGlzLmhbNF0gPDwgIDQpICAgICAgICAgICAgICAgICAgICApICYgMHhmZmZmO1xuICB0aGlzLmhbNF0gPSAoKHRoaXMuaFs0XSA+Pj4gMTIpIHwgKHRoaXMuaFs1XSA8PCAgMSkgfCAodGhpcy5oWzZdIDw8IDE0KSkgJiAweGZmZmY7XG4gIHRoaXMuaFs1XSA9ICgodGhpcy5oWzZdID4+PiAgMikgfCAodGhpcy5oWzddIDw8IDExKSAgICAgICAgICAgICAgICAgICAgKSAmIDB4ZmZmZjtcbiAgdGhpcy5oWzZdID0gKCh0aGlzLmhbN10gPj4+ICA1KSB8ICh0aGlzLmhbOF0gPDwgIDgpICAgICAgICAgICAgICAgICAgICApICYgMHhmZmZmO1xuICB0aGlzLmhbN10gPSAoKHRoaXMuaFs4XSA+Pj4gIDgpIHwgKHRoaXMuaFs5XSA8PCAgNSkgICAgICAgICAgICAgICAgICAgICkgJiAweGZmZmY7XG5cbiAgZiA9IHRoaXMuaFswXSArIHRoaXMucGFkWzBdO1xuICB0aGlzLmhbMF0gPSBmICYgMHhmZmZmO1xuICBmb3IgKGkgPSAxOyBpIDwgODsgaSsrKSB7XG4gICAgZiA9ICgoKHRoaXMuaFtpXSArIHRoaXMucGFkW2ldKSB8IDApICsgKGYgPj4+IDE2KSkgfCAwO1xuICAgIHRoaXMuaFtpXSA9IGYgJiAweGZmZmY7XG4gIH1cblxuICBtYWNbbWFjcG9zKyAwXSA9ICh0aGlzLmhbMF0gPj4+IDApICYgMHhmZjtcbiAgbWFjW21hY3BvcysgMV0gPSAodGhpcy5oWzBdID4+PiA4KSAmIDB4ZmY7XG4gIG1hY1ttYWNwb3MrIDJdID0gKHRoaXMuaFsxXSA+Pj4gMCkgJiAweGZmO1xuICBtYWNbbWFjcG9zKyAzXSA9ICh0aGlzLmhbMV0gPj4+IDgpICYgMHhmZjtcbiAgbWFjW21hY3BvcysgNF0gPSAodGhpcy5oWzJdID4+PiAwKSAmIDB4ZmY7XG4gIG1hY1ttYWNwb3MrIDVdID0gKHRoaXMuaFsyXSA+Pj4gOCkgJiAweGZmO1xuICBtYWNbbWFjcG9zKyA2XSA9ICh0aGlzLmhbM10gPj4+IDApICYgMHhmZjtcbiAgbWFjW21hY3BvcysgN10gPSAodGhpcy5oWzNdID4+PiA4KSAmIDB4ZmY7XG4gIG1hY1ttYWNwb3MrIDhdID0gKHRoaXMuaFs0XSA+Pj4gMCkgJiAweGZmO1xuICBtYWNbbWFjcG9zKyA5XSA9ICh0aGlzLmhbNF0gPj4+IDgpICYgMHhmZjtcbiAgbWFjW21hY3BvcysxMF0gPSAodGhpcy5oWzVdID4+PiAwKSAmIDB4ZmY7XG4gIG1hY1ttYWNwb3MrMTFdID0gKHRoaXMuaFs1XSA+Pj4gOCkgJiAweGZmO1xuICBtYWNbbWFjcG9zKzEyXSA9ICh0aGlzLmhbNl0gPj4+IDApICYgMHhmZjtcbiAgbWFjW21hY3BvcysxM10gPSAodGhpcy5oWzZdID4+PiA4KSAmIDB4ZmY7XG4gIG1hY1ttYWNwb3MrMTRdID0gKHRoaXMuaFs3XSA+Pj4gMCkgJiAweGZmO1xuICBtYWNbbWFjcG9zKzE1XSA9ICh0aGlzLmhbN10gPj4+IDgpICYgMHhmZjtcbn07XG5cbnBvbHkxMzA1LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihtLCBtcG9zLCBieXRlcykge1xuICB2YXIgaSwgd2FudDtcblxuICBpZiAodGhpcy5sZWZ0b3Zlcikge1xuICAgIHdhbnQgPSAoMTYgLSB0aGlzLmxlZnRvdmVyKTtcbiAgICBpZiAod2FudCA+IGJ5dGVzKVxuICAgICAgd2FudCA9IGJ5dGVzO1xuICAgIGZvciAoaSA9IDA7IGkgPCB3YW50OyBpKyspXG4gICAgICB0aGlzLmJ1ZmZlclt0aGlzLmxlZnRvdmVyICsgaV0gPSBtW21wb3MraV07XG4gICAgYnl0ZXMgLT0gd2FudDtcbiAgICBtcG9zICs9IHdhbnQ7XG4gICAgdGhpcy5sZWZ0b3ZlciArPSB3YW50O1xuICAgIGlmICh0aGlzLmxlZnRvdmVyIDwgMTYpXG4gICAgICByZXR1cm47XG4gICAgdGhpcy5ibG9ja3ModGhpcy5idWZmZXIsIDAsIDE2KTtcbiAgICB0aGlzLmxlZnRvdmVyID0gMDtcbiAgfVxuXG4gIGlmIChieXRlcyA+PSAxNikge1xuICAgIHdhbnQgPSBieXRlcyAtIChieXRlcyAlIDE2KTtcbiAgICB0aGlzLmJsb2NrcyhtLCBtcG9zLCB3YW50KTtcbiAgICBtcG9zICs9IHdhbnQ7XG4gICAgYnl0ZXMgLT0gd2FudDtcbiAgfVxuXG4gIGlmIChieXRlcykge1xuICAgIGZvciAoaSA9IDA7IGkgPCBieXRlczsgaSsrKVxuICAgICAgdGhpcy5idWZmZXJbdGhpcy5sZWZ0b3ZlciArIGldID0gbVttcG9zK2ldO1xuICAgIHRoaXMubGVmdG92ZXIgKz0gYnl0ZXM7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNyeXB0b19vbmV0aW1lYXV0aChvdXQsIG91dHBvcywgbSwgbXBvcywgbiwgaykge1xuICB2YXIgcyA9IG5ldyBwb2x5MTMwNShrKTtcbiAgcy51cGRhdGUobSwgbXBvcywgbik7XG4gIHMuZmluaXNoKG91dCwgb3V0cG9zKTtcbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19vbmV0aW1lYXV0aF92ZXJpZnkoaCwgaHBvcywgbSwgbXBvcywgbiwgaykge1xuICB2YXIgeCA9IG5ldyBVaW50OEFycmF5KDE2KTtcbiAgY3J5cHRvX29uZXRpbWVhdXRoKHgsMCxtLG1wb3MsbixrKTtcbiAgcmV0dXJuIGNyeXB0b192ZXJpZnlfMTYoaCxocG9zLHgsMCk7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19zZWNyZXRib3goYyxtLGQsbixrKSB7XG4gIHZhciBpO1xuICBpZiAoZCA8IDMyKSByZXR1cm4gLTE7XG4gIGNyeXB0b19zdHJlYW1feG9yKGMsMCxtLDAsZCxuLGspO1xuICBjcnlwdG9fb25ldGltZWF1dGgoYywgMTYsIGMsIDMyLCBkIC0gMzIsIGMpO1xuICBmb3IgKGkgPSAwOyBpIDwgMTY7IGkrKykgY1tpXSA9IDA7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9fc2VjcmV0Ym94X29wZW4obSxjLGQsbixrKSB7XG4gIHZhciBpO1xuICB2YXIgeCA9IG5ldyBVaW50OEFycmF5KDMyKTtcbiAgaWYgKGQgPCAzMikgcmV0dXJuIC0xO1xuICBjcnlwdG9fc3RyZWFtKHgsMCwzMixuLGspO1xuICBpZiAoY3J5cHRvX29uZXRpbWVhdXRoX3ZlcmlmeShjLCAxNixjLCAzMixkIC0gMzIseCkgIT09IDApIHJldHVybiAtMTtcbiAgY3J5cHRvX3N0cmVhbV94b3IobSwwLGMsMCxkLG4sayk7XG4gIGZvciAoaSA9IDA7IGkgPCAzMjsgaSsrKSBtW2ldID0gMDtcbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIHNldDI1NTE5KHIsIGEpIHtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSByW2ldID0gYVtpXXwwO1xufVxuXG5mdW5jdGlvbiBjYXIyNTUxOShvKSB7XG4gIHZhciBpLCB2LCBjID0gMTtcbiAgZm9yIChpID0gMDsgaSA8IDE2OyBpKyspIHtcbiAgICB2ID0gb1tpXSArIGMgKyA2NTUzNTtcbiAgICBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpO1xuICAgIG9baV0gPSB2IC0gYyAqIDY1NTM2O1xuICB9XG4gIG9bMF0gKz0gYy0xICsgMzcgKiAoYy0xKTtcbn1cblxuZnVuY3Rpb24gc2VsMjU1MTkocCwgcSwgYikge1xuICB2YXIgdCwgYyA9IH4oYi0xKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgdCA9IGMgJiAocFtpXSBeIHFbaV0pO1xuICAgIHBbaV0gXj0gdDtcbiAgICBxW2ldIF49IHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFjazI1NTE5KG8sIG4pIHtcbiAgdmFyIGksIGosIGI7XG4gIHZhciBtID0gZ2YoKSwgdCA9IGdmKCk7XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB0W2ldID0gbltpXTtcbiAgY2FyMjU1MTkodCk7XG4gIGNhcjI1NTE5KHQpO1xuICBjYXIyNTUxOSh0KTtcbiAgZm9yIChqID0gMDsgaiA8IDI7IGorKykge1xuICAgIG1bMF0gPSB0WzBdIC0gMHhmZmVkO1xuICAgIGZvciAoaSA9IDE7IGkgPCAxNTsgaSsrKSB7XG4gICAgICBtW2ldID0gdFtpXSAtIDB4ZmZmZiAtICgobVtpLTFdPj4xNikgJiAxKTtcbiAgICAgIG1baS0xXSAmPSAweGZmZmY7XG4gICAgfVxuICAgIG1bMTVdID0gdFsxNV0gLSAweDdmZmYgLSAoKG1bMTRdPj4xNikgJiAxKTtcbiAgICBiID0gKG1bMTVdPj4xNikgJiAxO1xuICAgIG1bMTRdICY9IDB4ZmZmZjtcbiAgICBzZWwyNTUxOSh0LCBtLCAxLWIpO1xuICB9XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgb1syKmldID0gdFtpXSAmIDB4ZmY7XG4gICAgb1syKmkrMV0gPSB0W2ldPj44O1xuICB9XG59XG5cbmZ1bmN0aW9uIG5lcTI1NTE5KGEsIGIpIHtcbiAgdmFyIGMgPSBuZXcgVWludDhBcnJheSgzMiksIGQgPSBuZXcgVWludDhBcnJheSgzMik7XG4gIHBhY2syNTUxOShjLCBhKTtcbiAgcGFjazI1NTE5KGQsIGIpO1xuICByZXR1cm4gY3J5cHRvX3ZlcmlmeV8zMihjLCAwLCBkLCAwKTtcbn1cblxuZnVuY3Rpb24gcGFyMjU1MTkoYSkge1xuICB2YXIgZCA9IG5ldyBVaW50OEFycmF5KDMyKTtcbiAgcGFjazI1NTE5KGQsIGEpO1xuICByZXR1cm4gZFswXSAmIDE7XG59XG5cbmZ1bmN0aW9uIHVucGFjazI1NTE5KG8sIG4pIHtcbiAgdmFyIGk7XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSBvW2ldID0gblsyKmldICsgKG5bMippKzFdIDw8IDgpO1xuICBvWzE1XSAmPSAweDdmZmY7XG59XG5cbmZ1bmN0aW9uIEEobywgYSwgYikge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IDE2OyBpKyspIG9baV0gPSBhW2ldICsgYltpXTtcbn1cblxuZnVuY3Rpb24gWihvLCBhLCBiKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMTY7IGkrKykgb1tpXSA9IGFbaV0gLSBiW2ldO1xufVxuXG5mdW5jdGlvbiBNKG8sIGEsIGIpIHtcbiAgdmFyIHYsIGMsXG4gICAgIHQwID0gMCwgIHQxID0gMCwgIHQyID0gMCwgIHQzID0gMCwgIHQ0ID0gMCwgIHQ1ID0gMCwgIHQ2ID0gMCwgIHQ3ID0gMCxcbiAgICAgdDggPSAwLCAgdDkgPSAwLCB0MTAgPSAwLCB0MTEgPSAwLCB0MTIgPSAwLCB0MTMgPSAwLCB0MTQgPSAwLCB0MTUgPSAwLFxuICAgIHQxNiA9IDAsIHQxNyA9IDAsIHQxOCA9IDAsIHQxOSA9IDAsIHQyMCA9IDAsIHQyMSA9IDAsIHQyMiA9IDAsIHQyMyA9IDAsXG4gICAgdDI0ID0gMCwgdDI1ID0gMCwgdDI2ID0gMCwgdDI3ID0gMCwgdDI4ID0gMCwgdDI5ID0gMCwgdDMwID0gMCxcbiAgICBiMCA9IGJbMF0sXG4gICAgYjEgPSBiWzFdLFxuICAgIGIyID0gYlsyXSxcbiAgICBiMyA9IGJbM10sXG4gICAgYjQgPSBiWzRdLFxuICAgIGI1ID0gYls1XSxcbiAgICBiNiA9IGJbNl0sXG4gICAgYjcgPSBiWzddLFxuICAgIGI4ID0gYls4XSxcbiAgICBiOSA9IGJbOV0sXG4gICAgYjEwID0gYlsxMF0sXG4gICAgYjExID0gYlsxMV0sXG4gICAgYjEyID0gYlsxMl0sXG4gICAgYjEzID0gYlsxM10sXG4gICAgYjE0ID0gYlsxNF0sXG4gICAgYjE1ID0gYlsxNV07XG5cbiAgdiA9IGFbMF07XG4gIHQwICs9IHYgKiBiMDtcbiAgdDEgKz0gdiAqIGIxO1xuICB0MiArPSB2ICogYjI7XG4gIHQzICs9IHYgKiBiMztcbiAgdDQgKz0gdiAqIGI0O1xuICB0NSArPSB2ICogYjU7XG4gIHQ2ICs9IHYgKiBiNjtcbiAgdDcgKz0gdiAqIGI3O1xuICB0OCArPSB2ICogYjg7XG4gIHQ5ICs9IHYgKiBiOTtcbiAgdDEwICs9IHYgKiBiMTA7XG4gIHQxMSArPSB2ICogYjExO1xuICB0MTIgKz0gdiAqIGIxMjtcbiAgdDEzICs9IHYgKiBiMTM7XG4gIHQxNCArPSB2ICogYjE0O1xuICB0MTUgKz0gdiAqIGIxNTtcbiAgdiA9IGFbMV07XG4gIHQxICs9IHYgKiBiMDtcbiAgdDIgKz0gdiAqIGIxO1xuICB0MyArPSB2ICogYjI7XG4gIHQ0ICs9IHYgKiBiMztcbiAgdDUgKz0gdiAqIGI0O1xuICB0NiArPSB2ICogYjU7XG4gIHQ3ICs9IHYgKiBiNjtcbiAgdDggKz0gdiAqIGI3O1xuICB0OSArPSB2ICogYjg7XG4gIHQxMCArPSB2ICogYjk7XG4gIHQxMSArPSB2ICogYjEwO1xuICB0MTIgKz0gdiAqIGIxMTtcbiAgdDEzICs9IHYgKiBiMTI7XG4gIHQxNCArPSB2ICogYjEzO1xuICB0MTUgKz0gdiAqIGIxNDtcbiAgdDE2ICs9IHYgKiBiMTU7XG4gIHYgPSBhWzJdO1xuICB0MiArPSB2ICogYjA7XG4gIHQzICs9IHYgKiBiMTtcbiAgdDQgKz0gdiAqIGIyO1xuICB0NSArPSB2ICogYjM7XG4gIHQ2ICs9IHYgKiBiNDtcbiAgdDcgKz0gdiAqIGI1O1xuICB0OCArPSB2ICogYjY7XG4gIHQ5ICs9IHYgKiBiNztcbiAgdDEwICs9IHYgKiBiODtcbiAgdDExICs9IHYgKiBiOTtcbiAgdDEyICs9IHYgKiBiMTA7XG4gIHQxMyArPSB2ICogYjExO1xuICB0MTQgKz0gdiAqIGIxMjtcbiAgdDE1ICs9IHYgKiBiMTM7XG4gIHQxNiArPSB2ICogYjE0O1xuICB0MTcgKz0gdiAqIGIxNTtcbiAgdiA9IGFbM107XG4gIHQzICs9IHYgKiBiMDtcbiAgdDQgKz0gdiAqIGIxO1xuICB0NSArPSB2ICogYjI7XG4gIHQ2ICs9IHYgKiBiMztcbiAgdDcgKz0gdiAqIGI0O1xuICB0OCArPSB2ICogYjU7XG4gIHQ5ICs9IHYgKiBiNjtcbiAgdDEwICs9IHYgKiBiNztcbiAgdDExICs9IHYgKiBiODtcbiAgdDEyICs9IHYgKiBiOTtcbiAgdDEzICs9IHYgKiBiMTA7XG4gIHQxNCArPSB2ICogYjExO1xuICB0MTUgKz0gdiAqIGIxMjtcbiAgdDE2ICs9IHYgKiBiMTM7XG4gIHQxNyArPSB2ICogYjE0O1xuICB0MTggKz0gdiAqIGIxNTtcbiAgdiA9IGFbNF07XG4gIHQ0ICs9IHYgKiBiMDtcbiAgdDUgKz0gdiAqIGIxO1xuICB0NiArPSB2ICogYjI7XG4gIHQ3ICs9IHYgKiBiMztcbiAgdDggKz0gdiAqIGI0O1xuICB0OSArPSB2ICogYjU7XG4gIHQxMCArPSB2ICogYjY7XG4gIHQxMSArPSB2ICogYjc7XG4gIHQxMiArPSB2ICogYjg7XG4gIHQxMyArPSB2ICogYjk7XG4gIHQxNCArPSB2ICogYjEwO1xuICB0MTUgKz0gdiAqIGIxMTtcbiAgdDE2ICs9IHYgKiBiMTI7XG4gIHQxNyArPSB2ICogYjEzO1xuICB0MTggKz0gdiAqIGIxNDtcbiAgdDE5ICs9IHYgKiBiMTU7XG4gIHYgPSBhWzVdO1xuICB0NSArPSB2ICogYjA7XG4gIHQ2ICs9IHYgKiBiMTtcbiAgdDcgKz0gdiAqIGIyO1xuICB0OCArPSB2ICogYjM7XG4gIHQ5ICs9IHYgKiBiNDtcbiAgdDEwICs9IHYgKiBiNTtcbiAgdDExICs9IHYgKiBiNjtcbiAgdDEyICs9IHYgKiBiNztcbiAgdDEzICs9IHYgKiBiODtcbiAgdDE0ICs9IHYgKiBiOTtcbiAgdDE1ICs9IHYgKiBiMTA7XG4gIHQxNiArPSB2ICogYjExO1xuICB0MTcgKz0gdiAqIGIxMjtcbiAgdDE4ICs9IHYgKiBiMTM7XG4gIHQxOSArPSB2ICogYjE0O1xuICB0MjAgKz0gdiAqIGIxNTtcbiAgdiA9IGFbNl07XG4gIHQ2ICs9IHYgKiBiMDtcbiAgdDcgKz0gdiAqIGIxO1xuICB0OCArPSB2ICogYjI7XG4gIHQ5ICs9IHYgKiBiMztcbiAgdDEwICs9IHYgKiBiNDtcbiAgdDExICs9IHYgKiBiNTtcbiAgdDEyICs9IHYgKiBiNjtcbiAgdDEzICs9IHYgKiBiNztcbiAgdDE0ICs9IHYgKiBiODtcbiAgdDE1ICs9IHYgKiBiOTtcbiAgdDE2ICs9IHYgKiBiMTA7XG4gIHQxNyArPSB2ICogYjExO1xuICB0MTggKz0gdiAqIGIxMjtcbiAgdDE5ICs9IHYgKiBiMTM7XG4gIHQyMCArPSB2ICogYjE0O1xuICB0MjEgKz0gdiAqIGIxNTtcbiAgdiA9IGFbN107XG4gIHQ3ICs9IHYgKiBiMDtcbiAgdDggKz0gdiAqIGIxO1xuICB0OSArPSB2ICogYjI7XG4gIHQxMCArPSB2ICogYjM7XG4gIHQxMSArPSB2ICogYjQ7XG4gIHQxMiArPSB2ICogYjU7XG4gIHQxMyArPSB2ICogYjY7XG4gIHQxNCArPSB2ICogYjc7XG4gIHQxNSArPSB2ICogYjg7XG4gIHQxNiArPSB2ICogYjk7XG4gIHQxNyArPSB2ICogYjEwO1xuICB0MTggKz0gdiAqIGIxMTtcbiAgdDE5ICs9IHYgKiBiMTI7XG4gIHQyMCArPSB2ICogYjEzO1xuICB0MjEgKz0gdiAqIGIxNDtcbiAgdDIyICs9IHYgKiBiMTU7XG4gIHYgPSBhWzhdO1xuICB0OCArPSB2ICogYjA7XG4gIHQ5ICs9IHYgKiBiMTtcbiAgdDEwICs9IHYgKiBiMjtcbiAgdDExICs9IHYgKiBiMztcbiAgdDEyICs9IHYgKiBiNDtcbiAgdDEzICs9IHYgKiBiNTtcbiAgdDE0ICs9IHYgKiBiNjtcbiAgdDE1ICs9IHYgKiBiNztcbiAgdDE2ICs9IHYgKiBiODtcbiAgdDE3ICs9IHYgKiBiOTtcbiAgdDE4ICs9IHYgKiBiMTA7XG4gIHQxOSArPSB2ICogYjExO1xuICB0MjAgKz0gdiAqIGIxMjtcbiAgdDIxICs9IHYgKiBiMTM7XG4gIHQyMiArPSB2ICogYjE0O1xuICB0MjMgKz0gdiAqIGIxNTtcbiAgdiA9IGFbOV07XG4gIHQ5ICs9IHYgKiBiMDtcbiAgdDEwICs9IHYgKiBiMTtcbiAgdDExICs9IHYgKiBiMjtcbiAgdDEyICs9IHYgKiBiMztcbiAgdDEzICs9IHYgKiBiNDtcbiAgdDE0ICs9IHYgKiBiNTtcbiAgdDE1ICs9IHYgKiBiNjtcbiAgdDE2ICs9IHYgKiBiNztcbiAgdDE3ICs9IHYgKiBiODtcbiAgdDE4ICs9IHYgKiBiOTtcbiAgdDE5ICs9IHYgKiBiMTA7XG4gIHQyMCArPSB2ICogYjExO1xuICB0MjEgKz0gdiAqIGIxMjtcbiAgdDIyICs9IHYgKiBiMTM7XG4gIHQyMyArPSB2ICogYjE0O1xuICB0MjQgKz0gdiAqIGIxNTtcbiAgdiA9IGFbMTBdO1xuICB0MTAgKz0gdiAqIGIwO1xuICB0MTEgKz0gdiAqIGIxO1xuICB0MTIgKz0gdiAqIGIyO1xuICB0MTMgKz0gdiAqIGIzO1xuICB0MTQgKz0gdiAqIGI0O1xuICB0MTUgKz0gdiAqIGI1O1xuICB0MTYgKz0gdiAqIGI2O1xuICB0MTcgKz0gdiAqIGI3O1xuICB0MTggKz0gdiAqIGI4O1xuICB0MTkgKz0gdiAqIGI5O1xuICB0MjAgKz0gdiAqIGIxMDtcbiAgdDIxICs9IHYgKiBiMTE7XG4gIHQyMiArPSB2ICogYjEyO1xuICB0MjMgKz0gdiAqIGIxMztcbiAgdDI0ICs9IHYgKiBiMTQ7XG4gIHQyNSArPSB2ICogYjE1O1xuICB2ID0gYVsxMV07XG4gIHQxMSArPSB2ICogYjA7XG4gIHQxMiArPSB2ICogYjE7XG4gIHQxMyArPSB2ICogYjI7XG4gIHQxNCArPSB2ICogYjM7XG4gIHQxNSArPSB2ICogYjQ7XG4gIHQxNiArPSB2ICogYjU7XG4gIHQxNyArPSB2ICogYjY7XG4gIHQxOCArPSB2ICogYjc7XG4gIHQxOSArPSB2ICogYjg7XG4gIHQyMCArPSB2ICogYjk7XG4gIHQyMSArPSB2ICogYjEwO1xuICB0MjIgKz0gdiAqIGIxMTtcbiAgdDIzICs9IHYgKiBiMTI7XG4gIHQyNCArPSB2ICogYjEzO1xuICB0MjUgKz0gdiAqIGIxNDtcbiAgdDI2ICs9IHYgKiBiMTU7XG4gIHYgPSBhWzEyXTtcbiAgdDEyICs9IHYgKiBiMDtcbiAgdDEzICs9IHYgKiBiMTtcbiAgdDE0ICs9IHYgKiBiMjtcbiAgdDE1ICs9IHYgKiBiMztcbiAgdDE2ICs9IHYgKiBiNDtcbiAgdDE3ICs9IHYgKiBiNTtcbiAgdDE4ICs9IHYgKiBiNjtcbiAgdDE5ICs9IHYgKiBiNztcbiAgdDIwICs9IHYgKiBiODtcbiAgdDIxICs9IHYgKiBiOTtcbiAgdDIyICs9IHYgKiBiMTA7XG4gIHQyMyArPSB2ICogYjExO1xuICB0MjQgKz0gdiAqIGIxMjtcbiAgdDI1ICs9IHYgKiBiMTM7XG4gIHQyNiArPSB2ICogYjE0O1xuICB0MjcgKz0gdiAqIGIxNTtcbiAgdiA9IGFbMTNdO1xuICB0MTMgKz0gdiAqIGIwO1xuICB0MTQgKz0gdiAqIGIxO1xuICB0MTUgKz0gdiAqIGIyO1xuICB0MTYgKz0gdiAqIGIzO1xuICB0MTcgKz0gdiAqIGI0O1xuICB0MTggKz0gdiAqIGI1O1xuICB0MTkgKz0gdiAqIGI2O1xuICB0MjAgKz0gdiAqIGI3O1xuICB0MjEgKz0gdiAqIGI4O1xuICB0MjIgKz0gdiAqIGI5O1xuICB0MjMgKz0gdiAqIGIxMDtcbiAgdDI0ICs9IHYgKiBiMTE7XG4gIHQyNSArPSB2ICogYjEyO1xuICB0MjYgKz0gdiAqIGIxMztcbiAgdDI3ICs9IHYgKiBiMTQ7XG4gIHQyOCArPSB2ICogYjE1O1xuICB2ID0gYVsxNF07XG4gIHQxNCArPSB2ICogYjA7XG4gIHQxNSArPSB2ICogYjE7XG4gIHQxNiArPSB2ICogYjI7XG4gIHQxNyArPSB2ICogYjM7XG4gIHQxOCArPSB2ICogYjQ7XG4gIHQxOSArPSB2ICogYjU7XG4gIHQyMCArPSB2ICogYjY7XG4gIHQyMSArPSB2ICogYjc7XG4gIHQyMiArPSB2ICogYjg7XG4gIHQyMyArPSB2ICogYjk7XG4gIHQyNCArPSB2ICogYjEwO1xuICB0MjUgKz0gdiAqIGIxMTtcbiAgdDI2ICs9IHYgKiBiMTI7XG4gIHQyNyArPSB2ICogYjEzO1xuICB0MjggKz0gdiAqIGIxNDtcbiAgdDI5ICs9IHYgKiBiMTU7XG4gIHYgPSBhWzE1XTtcbiAgdDE1ICs9IHYgKiBiMDtcbiAgdDE2ICs9IHYgKiBiMTtcbiAgdDE3ICs9IHYgKiBiMjtcbiAgdDE4ICs9IHYgKiBiMztcbiAgdDE5ICs9IHYgKiBiNDtcbiAgdDIwICs9IHYgKiBiNTtcbiAgdDIxICs9IHYgKiBiNjtcbiAgdDIyICs9IHYgKiBiNztcbiAgdDIzICs9IHYgKiBiODtcbiAgdDI0ICs9IHYgKiBiOTtcbiAgdDI1ICs9IHYgKiBiMTA7XG4gIHQyNiArPSB2ICogYjExO1xuICB0MjcgKz0gdiAqIGIxMjtcbiAgdDI4ICs9IHYgKiBiMTM7XG4gIHQyOSArPSB2ICogYjE0O1xuICB0MzAgKz0gdiAqIGIxNTtcblxuICB0MCAgKz0gMzggKiB0MTY7XG4gIHQxICArPSAzOCAqIHQxNztcbiAgdDIgICs9IDM4ICogdDE4O1xuICB0MyAgKz0gMzggKiB0MTk7XG4gIHQ0ICArPSAzOCAqIHQyMDtcbiAgdDUgICs9IDM4ICogdDIxO1xuICB0NiAgKz0gMzggKiB0MjI7XG4gIHQ3ICArPSAzOCAqIHQyMztcbiAgdDggICs9IDM4ICogdDI0O1xuICB0OSAgKz0gMzggKiB0MjU7XG4gIHQxMCArPSAzOCAqIHQyNjtcbiAgdDExICs9IDM4ICogdDI3O1xuICB0MTIgKz0gMzggKiB0Mjg7XG4gIHQxMyArPSAzOCAqIHQyOTtcbiAgdDE0ICs9IDM4ICogdDMwO1xuICAvLyB0MTUgbGVmdCBhcyBpc1xuXG4gIC8vIGZpcnN0IGNhclxuICBjID0gMTtcbiAgdiA9ICB0MCArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQwID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0MSArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQxID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0MiArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQyID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0MyArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQzID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0NCArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ0ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0NSArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ1ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0NiArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ2ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0NyArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ3ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0OCArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ4ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9ICB0OSArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgIHQ5ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxMCArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDEwID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxMSArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDExID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxMiArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDEyID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxMyArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDEzID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxNCArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDE0ID0gdiAtIGMgKiA2NTUzNjtcbiAgdiA9IHQxNSArIGMgKyA2NTUzNTsgYyA9IE1hdGguZmxvb3IodiAvIDY1NTM2KTsgdDE1ID0gdiAtIGMgKiA2NTUzNjtcbiAgdDAgKz0gYy0xICsgMzcgKiAoYy0xKTtcblxuICAvLyBzZWNvbmQgY2FyXG4gIGMgPSAxO1xuICB2ID0gIHQwICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDAgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQxICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDEgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQyICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDIgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQzICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDMgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ0ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDQgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ1ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDUgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ2ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDYgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ3ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDcgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ4ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDggPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gIHQ5ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyAgdDkgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDEwICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTAgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDExICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTEgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDEyICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTIgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDEzICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTMgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDE0ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTQgPSB2IC0gYyAqIDY1NTM2O1xuICB2ID0gdDE1ICsgYyArIDY1NTM1OyBjID0gTWF0aC5mbG9vcih2IC8gNjU1MzYpOyB0MTUgPSB2IC0gYyAqIDY1NTM2O1xuICB0MCArPSBjLTEgKyAzNyAqIChjLTEpO1xuXG4gIG9bIDBdID0gdDA7XG4gIG9bIDFdID0gdDE7XG4gIG9bIDJdID0gdDI7XG4gIG9bIDNdID0gdDM7XG4gIG9bIDRdID0gdDQ7XG4gIG9bIDVdID0gdDU7XG4gIG9bIDZdID0gdDY7XG4gIG9bIDddID0gdDc7XG4gIG9bIDhdID0gdDg7XG4gIG9bIDldID0gdDk7XG4gIG9bMTBdID0gdDEwO1xuICBvWzExXSA9IHQxMTtcbiAgb1sxMl0gPSB0MTI7XG4gIG9bMTNdID0gdDEzO1xuICBvWzE0XSA9IHQxNDtcbiAgb1sxNV0gPSB0MTU7XG59XG5cbmZ1bmN0aW9uIFMobywgYSkge1xuICBNKG8sIGEsIGEpO1xufVxuXG5mdW5jdGlvbiBpbnYyNTUxOShvLCBpKSB7XG4gIHZhciBjID0gZ2YoKTtcbiAgdmFyIGE7XG4gIGZvciAoYSA9IDA7IGEgPCAxNjsgYSsrKSBjW2FdID0gaVthXTtcbiAgZm9yIChhID0gMjUzOyBhID49IDA7IGEtLSkge1xuICAgIFMoYywgYyk7XG4gICAgaWYoYSAhPT0gMiAmJiBhICE9PSA0KSBNKGMsIGMsIGkpO1xuICB9XG4gIGZvciAoYSA9IDA7IGEgPCAxNjsgYSsrKSBvW2FdID0gY1thXTtcbn1cblxuZnVuY3Rpb24gcG93MjUyMyhvLCBpKSB7XG4gIHZhciBjID0gZ2YoKTtcbiAgdmFyIGE7XG4gIGZvciAoYSA9IDA7IGEgPCAxNjsgYSsrKSBjW2FdID0gaVthXTtcbiAgZm9yIChhID0gMjUwOyBhID49IDA7IGEtLSkge1xuICAgICAgUyhjLCBjKTtcbiAgICAgIGlmKGEgIT09IDEpIE0oYywgYywgaSk7XG4gIH1cbiAgZm9yIChhID0gMDsgYSA8IDE2OyBhKyspIG9bYV0gPSBjW2FdO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9fc2NhbGFybXVsdChxLCBuLCBwKSB7XG4gIHZhciB6ID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICB2YXIgeCA9IG5ldyBGbG9hdDY0QXJyYXkoODApLCByLCBpO1xuICB2YXIgYSA9IGdmKCksIGIgPSBnZigpLCBjID0gZ2YoKSxcbiAgICAgIGQgPSBnZigpLCBlID0gZ2YoKSwgZiA9IGdmKCk7XG4gIGZvciAoaSA9IDA7IGkgPCAzMTsgaSsrKSB6W2ldID0gbltpXTtcbiAgelszMV09KG5bMzFdJjEyNyl8NjQ7XG4gIHpbMF0mPTI0ODtcbiAgdW5wYWNrMjU1MTkoeCxwKTtcbiAgZm9yIChpID0gMDsgaSA8IDE2OyBpKyspIHtcbiAgICBiW2ldPXhbaV07XG4gICAgZFtpXT1hW2ldPWNbaV09MDtcbiAgfVxuICBhWzBdPWRbMF09MTtcbiAgZm9yIChpPTI1NDsgaT49MDsgLS1pKSB7XG4gICAgcj0oeltpPj4+M10+Pj4oaSY3KSkmMTtcbiAgICBzZWwyNTUxOShhLGIscik7XG4gICAgc2VsMjU1MTkoYyxkLHIpO1xuICAgIEEoZSxhLGMpO1xuICAgIFooYSxhLGMpO1xuICAgIEEoYyxiLGQpO1xuICAgIFooYixiLGQpO1xuICAgIFMoZCxlKTtcbiAgICBTKGYsYSk7XG4gICAgTShhLGMsYSk7XG4gICAgTShjLGIsZSk7XG4gICAgQShlLGEsYyk7XG4gICAgWihhLGEsYyk7XG4gICAgUyhiLGEpO1xuICAgIFooYyxkLGYpO1xuICAgIE0oYSxjLF8xMjE2NjUpO1xuICAgIEEoYSxhLGQpO1xuICAgIE0oYyxjLGEpO1xuICAgIE0oYSxkLGYpO1xuICAgIE0oZCxiLHgpO1xuICAgIFMoYixlKTtcbiAgICBzZWwyNTUxOShhLGIscik7XG4gICAgc2VsMjU1MTkoYyxkLHIpO1xuICB9XG4gIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgeFtpKzE2XT1hW2ldO1xuICAgIHhbaSszMl09Y1tpXTtcbiAgICB4W2krNDhdPWJbaV07XG4gICAgeFtpKzY0XT1kW2ldO1xuICB9XG4gIHZhciB4MzIgPSB4LnN1YmFycmF5KDMyKTtcbiAgdmFyIHgxNiA9IHguc3ViYXJyYXkoMTYpO1xuICBpbnYyNTUxOSh4MzIseDMyKTtcbiAgTSh4MTYseDE2LHgzMik7XG4gIHBhY2syNTUxOShxLHgxNik7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9fc2NhbGFybXVsdF9iYXNlKHEsIG4pIHtcbiAgcmV0dXJuIGNyeXB0b19zY2FsYXJtdWx0KHEsIG4sIF85KTtcbn1cblxuZnVuY3Rpb24gY3J5cHRvX2JveF9rZXlwYWlyKHksIHgpIHtcbiAgcmFuZG9tYnl0ZXMoeCwgMzIpO1xuICByZXR1cm4gY3J5cHRvX3NjYWxhcm11bHRfYmFzZSh5LCB4KTtcbn1cblxuZnVuY3Rpb24gY3J5cHRvX2JveF9iZWZvcmVubShrLCB5LCB4KSB7XG4gIHZhciBzID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBjcnlwdG9fc2NhbGFybXVsdChzLCB4LCB5KTtcbiAgcmV0dXJuIGNyeXB0b19jb3JlX2hzYWxzYTIwKGssIF8wLCBzLCBzaWdtYSk7XG59XG5cbnZhciBjcnlwdG9fYm94X2FmdGVybm0gPSBjcnlwdG9fc2VjcmV0Ym94O1xudmFyIGNyeXB0b19ib3hfb3Blbl9hZnRlcm5tID0gY3J5cHRvX3NlY3JldGJveF9vcGVuO1xuXG5mdW5jdGlvbiBjcnlwdG9fYm94KGMsIG0sIGQsIG4sIHksIHgpIHtcbiAgdmFyIGsgPSBuZXcgVWludDhBcnJheSgzMik7XG4gIGNyeXB0b19ib3hfYmVmb3Jlbm0oaywgeSwgeCk7XG4gIHJldHVybiBjcnlwdG9fYm94X2FmdGVybm0oYywgbSwgZCwgbiwgayk7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19ib3hfb3BlbihtLCBjLCBkLCBuLCB5LCB4KSB7XG4gIHZhciBrID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBjcnlwdG9fYm94X2JlZm9yZW5tKGssIHksIHgpO1xuICByZXR1cm4gY3J5cHRvX2JveF9vcGVuX2FmdGVybm0obSwgYywgZCwgbiwgayk7XG59XG5cbnZhciBLID0gW1xuICAweDQyOGEyZjk4LCAweGQ3MjhhZTIyLCAweDcxMzc0NDkxLCAweDIzZWY2NWNkLFxuICAweGI1YzBmYmNmLCAweGVjNGQzYjJmLCAweGU5YjVkYmE1LCAweDgxODlkYmJjLFxuICAweDM5NTZjMjViLCAweGYzNDhiNTM4LCAweDU5ZjExMWYxLCAweGI2MDVkMDE5LFxuICAweDkyM2Y4MmE0LCAweGFmMTk0ZjliLCAweGFiMWM1ZWQ1LCAweGRhNmQ4MTE4LFxuICAweGQ4MDdhYTk4LCAweGEzMDMwMjQyLCAweDEyODM1YjAxLCAweDQ1NzA2ZmJlLFxuICAweDI0MzE4NWJlLCAweDRlZTRiMjhjLCAweDU1MGM3ZGMzLCAweGQ1ZmZiNGUyLFxuICAweDcyYmU1ZDc0LCAweGYyN2I4OTZmLCAweDgwZGViMWZlLCAweDNiMTY5NmIxLFxuICAweDliZGMwNmE3LCAweDI1YzcxMjM1LCAweGMxOWJmMTc0LCAweGNmNjkyNjk0LFxuICAweGU0OWI2OWMxLCAweDllZjE0YWQyLCAweGVmYmU0Nzg2LCAweDM4NGYyNWUzLFxuICAweDBmYzE5ZGM2LCAweDhiOGNkNWI1LCAweDI0MGNhMWNjLCAweDc3YWM5YzY1LFxuICAweDJkZTkyYzZmLCAweDU5MmIwMjc1LCAweDRhNzQ4NGFhLCAweDZlYTZlNDgzLFxuICAweDVjYjBhOWRjLCAweGJkNDFmYmQ0LCAweDc2Zjk4OGRhLCAweDgzMTE1M2I1LFxuICAweDk4M2U1MTUyLCAweGVlNjZkZmFiLCAweGE4MzFjNjZkLCAweDJkYjQzMjEwLFxuICAweGIwMDMyN2M4LCAweDk4ZmIyMTNmLCAweGJmNTk3ZmM3LCAweGJlZWYwZWU0LFxuICAweGM2ZTAwYmYzLCAweDNkYTg4ZmMyLCAweGQ1YTc5MTQ3LCAweDkzMGFhNzI1LFxuICAweDA2Y2E2MzUxLCAweGUwMDM4MjZmLCAweDE0MjkyOTY3LCAweDBhMGU2ZTcwLFxuICAweDI3YjcwYTg1LCAweDQ2ZDIyZmZjLCAweDJlMWIyMTM4LCAweDVjMjZjOTI2LFxuICAweDRkMmM2ZGZjLCAweDVhYzQyYWVkLCAweDUzMzgwZDEzLCAweDlkOTViM2RmLFxuICAweDY1MGE3MzU0LCAweDhiYWY2M2RlLCAweDc2NmEwYWJiLCAweDNjNzdiMmE4LFxuICAweDgxYzJjOTJlLCAweDQ3ZWRhZWU2LCAweDkyNzIyYzg1LCAweDE0ODIzNTNiLFxuICAweGEyYmZlOGExLCAweDRjZjEwMzY0LCAweGE4MWE2NjRiLCAweGJjNDIzMDAxLFxuICAweGMyNGI4YjcwLCAweGQwZjg5NzkxLCAweGM3NmM1MWEzLCAweDA2NTRiZTMwLFxuICAweGQxOTJlODE5LCAweGQ2ZWY1MjE4LCAweGQ2OTkwNjI0LCAweDU1NjVhOTEwLFxuICAweGY0MGUzNTg1LCAweDU3NzEyMDJhLCAweDEwNmFhMDcwLCAweDMyYmJkMWI4LFxuICAweDE5YTRjMTE2LCAweGI4ZDJkMGM4LCAweDFlMzc2YzA4LCAweDUxNDFhYjUzLFxuICAweDI3NDg3NzRjLCAweGRmOGVlYjk5LCAweDM0YjBiY2I1LCAweGUxOWI0OGE4LFxuICAweDM5MWMwY2IzLCAweGM1Yzk1YTYzLCAweDRlZDhhYTRhLCAweGUzNDE4YWNiLFxuICAweDViOWNjYTRmLCAweDc3NjNlMzczLCAweDY4MmU2ZmYzLCAweGQ2YjJiOGEzLFxuICAweDc0OGY4MmVlLCAweDVkZWZiMmZjLCAweDc4YTU2MzZmLCAweDQzMTcyZjYwLFxuICAweDg0Yzg3ODE0LCAweGExZjBhYjcyLCAweDhjYzcwMjA4LCAweDFhNjQzOWVjLFxuICAweDkwYmVmZmZhLCAweDIzNjMxZTI4LCAweGE0NTA2Y2ViLCAweGRlODJiZGU5LFxuICAweGJlZjlhM2Y3LCAweGIyYzY3OTE1LCAweGM2NzE3OGYyLCAweGUzNzI1MzJiLFxuICAweGNhMjczZWNlLCAweGVhMjY2MTljLCAweGQxODZiOGM3LCAweDIxYzBjMjA3LFxuICAweGVhZGE3ZGQ2LCAweGNkZTBlYjFlLCAweGY1N2Q0ZjdmLCAweGVlNmVkMTc4LFxuICAweDA2ZjA2N2FhLCAweDcyMTc2ZmJhLCAweDBhNjM3ZGM1LCAweGEyYzg5OGE2LFxuICAweDExM2Y5ODA0LCAweGJlZjkwZGFlLCAweDFiNzEwYjM1LCAweDEzMWM0NzFiLFxuICAweDI4ZGI3N2Y1LCAweDIzMDQ3ZDg0LCAweDMyY2FhYjdiLCAweDQwYzcyNDkzLFxuICAweDNjOWViZTBhLCAweDE1YzliZWJjLCAweDQzMWQ2N2M0LCAweDljMTAwZDRjLFxuICAweDRjYzVkNGJlLCAweGNiM2U0MmI2LCAweDU5N2YyOTljLCAweGZjNjU3ZTJhLFxuICAweDVmY2I2ZmFiLCAweDNhZDZmYWVjLCAweDZjNDQxOThjLCAweDRhNDc1ODE3XG5dO1xuXG5mdW5jdGlvbiBjcnlwdG9faGFzaGJsb2Nrc19obChoaCwgaGwsIG0sIG4pIHtcbiAgdmFyIHdoID0gbmV3IEludDMyQXJyYXkoMTYpLCB3bCA9IG5ldyBJbnQzMkFycmF5KDE2KSxcbiAgICAgIGJoMCwgYmgxLCBiaDIsIGJoMywgYmg0LCBiaDUsIGJoNiwgYmg3LFxuICAgICAgYmwwLCBibDEsIGJsMiwgYmwzLCBibDQsIGJsNSwgYmw2LCBibDcsXG4gICAgICB0aCwgdGwsIGksIGosIGgsIGwsIGEsIGIsIGMsIGQ7XG5cbiAgdmFyIGFoMCA9IGhoWzBdLFxuICAgICAgYWgxID0gaGhbMV0sXG4gICAgICBhaDIgPSBoaFsyXSxcbiAgICAgIGFoMyA9IGhoWzNdLFxuICAgICAgYWg0ID0gaGhbNF0sXG4gICAgICBhaDUgPSBoaFs1XSxcbiAgICAgIGFoNiA9IGhoWzZdLFxuICAgICAgYWg3ID0gaGhbN10sXG5cbiAgICAgIGFsMCA9IGhsWzBdLFxuICAgICAgYWwxID0gaGxbMV0sXG4gICAgICBhbDIgPSBobFsyXSxcbiAgICAgIGFsMyA9IGhsWzNdLFxuICAgICAgYWw0ID0gaGxbNF0sXG4gICAgICBhbDUgPSBobFs1XSxcbiAgICAgIGFsNiA9IGhsWzZdLFxuICAgICAgYWw3ID0gaGxbN107XG5cbiAgdmFyIHBvcyA9IDA7XG4gIHdoaWxlIChuID49IDEyOCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBqID0gOCAqIGkgKyBwb3M7XG4gICAgICB3aFtpXSA9IChtW2orMF0gPDwgMjQpIHwgKG1baisxXSA8PCAxNikgfCAobVtqKzJdIDw8IDgpIHwgbVtqKzNdO1xuICAgICAgd2xbaV0gPSAobVtqKzRdIDw8IDI0KSB8IChtW2orNV0gPDwgMTYpIHwgKG1bais2XSA8PCA4KSB8IG1bais3XTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IDgwOyBpKyspIHtcbiAgICAgIGJoMCA9IGFoMDtcbiAgICAgIGJoMSA9IGFoMTtcbiAgICAgIGJoMiA9IGFoMjtcbiAgICAgIGJoMyA9IGFoMztcbiAgICAgIGJoNCA9IGFoNDtcbiAgICAgIGJoNSA9IGFoNTtcbiAgICAgIGJoNiA9IGFoNjtcbiAgICAgIGJoNyA9IGFoNztcblxuICAgICAgYmwwID0gYWwwO1xuICAgICAgYmwxID0gYWwxO1xuICAgICAgYmwyID0gYWwyO1xuICAgICAgYmwzID0gYWwzO1xuICAgICAgYmw0ID0gYWw0O1xuICAgICAgYmw1ID0gYWw1O1xuICAgICAgYmw2ID0gYWw2O1xuICAgICAgYmw3ID0gYWw3O1xuXG4gICAgICAvLyBhZGRcbiAgICAgIGggPSBhaDc7XG4gICAgICBsID0gYWw3O1xuXG4gICAgICBhID0gbCAmIDB4ZmZmZjsgYiA9IGwgPj4+IDE2O1xuICAgICAgYyA9IGggJiAweGZmZmY7IGQgPSBoID4+PiAxNjtcblxuICAgICAgLy8gU2lnbWExXG4gICAgICBoID0gKChhaDQgPj4+IDE0KSB8IChhbDQgPDwgKDMyLTE0KSkpIF4gKChhaDQgPj4+IDE4KSB8IChhbDQgPDwgKDMyLTE4KSkpIF4gKChhbDQgPj4+ICg0MS0zMikpIHwgKGFoNCA8PCAoMzItKDQxLTMyKSkpKTtcbiAgICAgIGwgPSAoKGFsNCA+Pj4gMTQpIHwgKGFoNCA8PCAoMzItMTQpKSkgXiAoKGFsNCA+Pj4gMTgpIHwgKGFoNCA8PCAoMzItMTgpKSkgXiAoKGFoNCA+Pj4gKDQxLTMyKSkgfCAoYWw0IDw8ICgzMi0oNDEtMzIpKSkpO1xuXG4gICAgICBhICs9IGwgJiAweGZmZmY7IGIgKz0gbCA+Pj4gMTY7XG4gICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgIC8vIENoXG4gICAgICBoID0gKGFoNCAmIGFoNSkgXiAofmFoNCAmIGFoNik7XG4gICAgICBsID0gKGFsNCAmIGFsNSkgXiAofmFsNCAmIGFsNik7XG5cbiAgICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICAgIGMgKz0gaCAmIDB4ZmZmZjsgZCArPSBoID4+PiAxNjtcblxuICAgICAgLy8gS1xuICAgICAgaCA9IEtbaSoyXTtcbiAgICAgIGwgPSBLW2kqMisxXTtcblxuICAgICAgYSArPSBsICYgMHhmZmZmOyBiICs9IGwgPj4+IDE2O1xuICAgICAgYyArPSBoICYgMHhmZmZmOyBkICs9IGggPj4+IDE2O1xuXG4gICAgICAvLyB3XG4gICAgICBoID0gd2hbaSUxNl07XG4gICAgICBsID0gd2xbaSUxNl07XG5cbiAgICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICAgIGMgKz0gaCAmIDB4ZmZmZjsgZCArPSBoID4+PiAxNjtcblxuICAgICAgYiArPSBhID4+PiAxNjtcbiAgICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgICBkICs9IGMgPj4+IDE2O1xuXG4gICAgICB0aCA9IGMgJiAweGZmZmYgfCBkIDw8IDE2O1xuICAgICAgdGwgPSBhICYgMHhmZmZmIHwgYiA8PCAxNjtcblxuICAgICAgLy8gYWRkXG4gICAgICBoID0gdGg7XG4gICAgICBsID0gdGw7XG5cbiAgICAgIGEgPSBsICYgMHhmZmZmOyBiID0gbCA+Pj4gMTY7XG4gICAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgICAvLyBTaWdtYTBcbiAgICAgIGggPSAoKGFoMCA+Pj4gMjgpIHwgKGFsMCA8PCAoMzItMjgpKSkgXiAoKGFsMCA+Pj4gKDM0LTMyKSkgfCAoYWgwIDw8ICgzMi0oMzQtMzIpKSkpIF4gKChhbDAgPj4+ICgzOS0zMikpIHwgKGFoMCA8PCAoMzItKDM5LTMyKSkpKTtcbiAgICAgIGwgPSAoKGFsMCA+Pj4gMjgpIHwgKGFoMCA8PCAoMzItMjgpKSkgXiAoKGFoMCA+Pj4gKDM0LTMyKSkgfCAoYWwwIDw8ICgzMi0oMzQtMzIpKSkpIF4gKChhaDAgPj4+ICgzOS0zMikpIHwgKGFsMCA8PCAoMzItKDM5LTMyKSkpKTtcblxuICAgICAgYSArPSBsICYgMHhmZmZmOyBiICs9IGwgPj4+IDE2O1xuICAgICAgYyArPSBoICYgMHhmZmZmOyBkICs9IGggPj4+IDE2O1xuXG4gICAgICAvLyBNYWpcbiAgICAgIGggPSAoYWgwICYgYWgxKSBeIChhaDAgJiBhaDIpIF4gKGFoMSAmIGFoMik7XG4gICAgICBsID0gKGFsMCAmIGFsMSkgXiAoYWwwICYgYWwyKSBeIChhbDEgJiBhbDIpO1xuXG4gICAgICBhICs9IGwgJiAweGZmZmY7IGIgKz0gbCA+Pj4gMTY7XG4gICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgIGIgKz0gYSA+Pj4gMTY7XG4gICAgICBjICs9IGIgPj4+IDE2O1xuICAgICAgZCArPSBjID4+PiAxNjtcblxuICAgICAgYmg3ID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgICAgYmw3ID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgICAvLyBhZGRcbiAgICAgIGggPSBiaDM7XG4gICAgICBsID0gYmwzO1xuXG4gICAgICBhID0gbCAmIDB4ZmZmZjsgYiA9IGwgPj4+IDE2O1xuICAgICAgYyA9IGggJiAweGZmZmY7IGQgPSBoID4+PiAxNjtcblxuICAgICAgaCA9IHRoO1xuICAgICAgbCA9IHRsO1xuXG4gICAgICBhICs9IGwgJiAweGZmZmY7IGIgKz0gbCA+Pj4gMTY7XG4gICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgIGIgKz0gYSA+Pj4gMTY7XG4gICAgICBjICs9IGIgPj4+IDE2O1xuICAgICAgZCArPSBjID4+PiAxNjtcblxuICAgICAgYmgzID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgICAgYmwzID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgICBhaDEgPSBiaDA7XG4gICAgICBhaDIgPSBiaDE7XG4gICAgICBhaDMgPSBiaDI7XG4gICAgICBhaDQgPSBiaDM7XG4gICAgICBhaDUgPSBiaDQ7XG4gICAgICBhaDYgPSBiaDU7XG4gICAgICBhaDcgPSBiaDY7XG4gICAgICBhaDAgPSBiaDc7XG5cbiAgICAgIGFsMSA9IGJsMDtcbiAgICAgIGFsMiA9IGJsMTtcbiAgICAgIGFsMyA9IGJsMjtcbiAgICAgIGFsNCA9IGJsMztcbiAgICAgIGFsNSA9IGJsNDtcbiAgICAgIGFsNiA9IGJsNTtcbiAgICAgIGFsNyA9IGJsNjtcbiAgICAgIGFsMCA9IGJsNztcblxuICAgICAgaWYgKGklMTYgPT09IDE1KSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCAxNjsgaisrKSB7XG4gICAgICAgICAgLy8gYWRkXG4gICAgICAgICAgaCA9IHdoW2pdO1xuICAgICAgICAgIGwgPSB3bFtqXTtcblxuICAgICAgICAgIGEgPSBsICYgMHhmZmZmOyBiID0gbCA+Pj4gMTY7XG4gICAgICAgICAgYyA9IGggJiAweGZmZmY7IGQgPSBoID4+PiAxNjtcblxuICAgICAgICAgIGggPSB3aFsoais5KSUxNl07XG4gICAgICAgICAgbCA9IHdsWyhqKzkpJTE2XTtcblxuICAgICAgICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICAgICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgICAgICAvLyBzaWdtYTBcbiAgICAgICAgICB0aCA9IHdoWyhqKzEpJTE2XTtcbiAgICAgICAgICB0bCA9IHdsWyhqKzEpJTE2XTtcbiAgICAgICAgICBoID0gKCh0aCA+Pj4gMSkgfCAodGwgPDwgKDMyLTEpKSkgXiAoKHRoID4+PiA4KSB8ICh0bCA8PCAoMzItOCkpKSBeICh0aCA+Pj4gNyk7XG4gICAgICAgICAgbCA9ICgodGwgPj4+IDEpIHwgKHRoIDw8ICgzMi0xKSkpIF4gKCh0bCA+Pj4gOCkgfCAodGggPDwgKDMyLTgpKSkgXiAoKHRsID4+PiA3KSB8ICh0aCA8PCAoMzItNykpKTtcblxuICAgICAgICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICAgICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgICAgICAvLyBzaWdtYTFcbiAgICAgICAgICB0aCA9IHdoWyhqKzE0KSUxNl07XG4gICAgICAgICAgdGwgPSB3bFsoaisxNCklMTZdO1xuICAgICAgICAgIGggPSAoKHRoID4+PiAxOSkgfCAodGwgPDwgKDMyLTE5KSkpIF4gKCh0bCA+Pj4gKDYxLTMyKSkgfCAodGggPDwgKDMyLSg2MS0zMikpKSkgXiAodGggPj4+IDYpO1xuICAgICAgICAgIGwgPSAoKHRsID4+PiAxOSkgfCAodGggPDwgKDMyLTE5KSkpIF4gKCh0aCA+Pj4gKDYxLTMyKSkgfCAodGwgPDwgKDMyLSg2MS0zMikpKSkgXiAoKHRsID4+PiA2KSB8ICh0aCA8PCAoMzItNikpKTtcblxuICAgICAgICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICAgICAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICAgICAgICBiICs9IGEgPj4+IDE2O1xuICAgICAgICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgICAgICAgZCArPSBjID4+PiAxNjtcblxuICAgICAgICAgIHdoW2pdID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgICAgICAgIHdsW2pdID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkXG4gICAgaCA9IGFoMDtcbiAgICBsID0gYWwwO1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzBdO1xuICAgIGwgPSBobFswXTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzBdID0gYWgwID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzBdID0gYWwwID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoMTtcbiAgICBsID0gYWwxO1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzFdO1xuICAgIGwgPSBobFsxXTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzFdID0gYWgxID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzFdID0gYWwxID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoMjtcbiAgICBsID0gYWwyO1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzJdO1xuICAgIGwgPSBobFsyXTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzJdID0gYWgyID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzJdID0gYWwyID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoMztcbiAgICBsID0gYWwzO1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzNdO1xuICAgIGwgPSBobFszXTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzNdID0gYWgzID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzNdID0gYWwzID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoNDtcbiAgICBsID0gYWw0O1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzRdO1xuICAgIGwgPSBobFs0XTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzRdID0gYWg0ID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzRdID0gYWw0ID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoNTtcbiAgICBsID0gYWw1O1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzVdO1xuICAgIGwgPSBobFs1XTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzVdID0gYWg1ID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzVdID0gYWw1ID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoNjtcbiAgICBsID0gYWw2O1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzZdO1xuICAgIGwgPSBobFs2XTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzZdID0gYWg2ID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzZdID0gYWw2ID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgaCA9IGFoNztcbiAgICBsID0gYWw3O1xuXG4gICAgYSA9IGwgJiAweGZmZmY7IGIgPSBsID4+PiAxNjtcbiAgICBjID0gaCAmIDB4ZmZmZjsgZCA9IGggPj4+IDE2O1xuXG4gICAgaCA9IGhoWzddO1xuICAgIGwgPSBobFs3XTtcblxuICAgIGEgKz0gbCAmIDB4ZmZmZjsgYiArPSBsID4+PiAxNjtcbiAgICBjICs9IGggJiAweGZmZmY7IGQgKz0gaCA+Pj4gMTY7XG5cbiAgICBiICs9IGEgPj4+IDE2O1xuICAgIGMgKz0gYiA+Pj4gMTY7XG4gICAgZCArPSBjID4+PiAxNjtcblxuICAgIGhoWzddID0gYWg3ID0gKGMgJiAweGZmZmYpIHwgKGQgPDwgMTYpO1xuICAgIGhsWzddID0gYWw3ID0gKGEgJiAweGZmZmYpIHwgKGIgPDwgMTYpO1xuXG4gICAgcG9zICs9IDEyODtcbiAgICBuIC09IDEyODtcbiAgfVxuXG4gIHJldHVybiBuO1xufVxuXG5mdW5jdGlvbiBjcnlwdG9faGFzaChvdXQsIG0sIG4pIHtcbiAgdmFyIGhoID0gbmV3IEludDMyQXJyYXkoOCksXG4gICAgICBobCA9IG5ldyBJbnQzMkFycmF5KDgpLFxuICAgICAgeCA9IG5ldyBVaW50OEFycmF5KDI1NiksXG4gICAgICBpLCBiID0gbjtcblxuICBoaFswXSA9IDB4NmEwOWU2Njc7XG4gIGhoWzFdID0gMHhiYjY3YWU4NTtcbiAgaGhbMl0gPSAweDNjNmVmMzcyO1xuICBoaFszXSA9IDB4YTU0ZmY1M2E7XG4gIGhoWzRdID0gMHg1MTBlNTI3ZjtcbiAgaGhbNV0gPSAweDliMDU2ODhjO1xuICBoaFs2XSA9IDB4MWY4M2Q5YWI7XG4gIGhoWzddID0gMHg1YmUwY2QxOTtcblxuICBobFswXSA9IDB4ZjNiY2M5MDg7XG4gIGhsWzFdID0gMHg4NGNhYTczYjtcbiAgaGxbMl0gPSAweGZlOTRmODJiO1xuICBobFszXSA9IDB4NWYxZDM2ZjE7XG4gIGhsWzRdID0gMHhhZGU2ODJkMTtcbiAgaGxbNV0gPSAweDJiM2U2YzFmO1xuICBobFs2XSA9IDB4ZmI0MWJkNmI7XG4gIGhsWzddID0gMHgxMzdlMjE3OTtcblxuICBjcnlwdG9faGFzaGJsb2Nrc19obChoaCwgaGwsIG0sIG4pO1xuICBuICU9IDEyODtcblxuICBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSB4W2ldID0gbVtiLW4raV07XG4gIHhbbl0gPSAxMjg7XG5cbiAgbiA9IDI1Ni0xMjgqKG48MTEyPzE6MCk7XG4gIHhbbi05XSA9IDA7XG4gIHRzNjQoeCwgbi04LCAgKGIgLyAweDIwMDAwMDAwKSB8IDAsIGIgPDwgMyk7XG4gIGNyeXB0b19oYXNoYmxvY2tzX2hsKGhoLCBobCwgeCwgbik7XG5cbiAgZm9yIChpID0gMDsgaSA8IDg7IGkrKykgdHM2NChvdXQsIDgqaSwgaGhbaV0sIGhsW2ldKTtcblxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gYWRkKHAsIHEpIHtcbiAgdmFyIGEgPSBnZigpLCBiID0gZ2YoKSwgYyA9IGdmKCksXG4gICAgICBkID0gZ2YoKSwgZSA9IGdmKCksIGYgPSBnZigpLFxuICAgICAgZyA9IGdmKCksIGggPSBnZigpLCB0ID0gZ2YoKTtcblxuICBaKGEsIHBbMV0sIHBbMF0pO1xuICBaKHQsIHFbMV0sIHFbMF0pO1xuICBNKGEsIGEsIHQpO1xuICBBKGIsIHBbMF0sIHBbMV0pO1xuICBBKHQsIHFbMF0sIHFbMV0pO1xuICBNKGIsIGIsIHQpO1xuICBNKGMsIHBbM10sIHFbM10pO1xuICBNKGMsIGMsIEQyKTtcbiAgTShkLCBwWzJdLCBxWzJdKTtcbiAgQShkLCBkLCBkKTtcbiAgWihlLCBiLCBhKTtcbiAgWihmLCBkLCBjKTtcbiAgQShnLCBkLCBjKTtcbiAgQShoLCBiLCBhKTtcblxuICBNKHBbMF0sIGUsIGYpO1xuICBNKHBbMV0sIGgsIGcpO1xuICBNKHBbMl0sIGcsIGYpO1xuICBNKHBbM10sIGUsIGgpO1xufVxuXG5mdW5jdGlvbiBjc3dhcChwLCBxLCBiKSB7XG4gIHZhciBpO1xuICBmb3IgKGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgc2VsMjU1MTkocFtpXSwgcVtpXSwgYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFjayhyLCBwKSB7XG4gIHZhciB0eCA9IGdmKCksIHR5ID0gZ2YoKSwgemkgPSBnZigpO1xuICBpbnYyNTUxOSh6aSwgcFsyXSk7XG4gIE0odHgsIHBbMF0sIHppKTtcbiAgTSh0eSwgcFsxXSwgemkpO1xuICBwYWNrMjU1MTkociwgdHkpO1xuICByWzMxXSBePSBwYXIyNTUxOSh0eCkgPDwgNztcbn1cblxuZnVuY3Rpb24gc2NhbGFybXVsdChwLCBxLCBzKSB7XG4gIHZhciBiLCBpO1xuICBzZXQyNTUxOShwWzBdLCBnZjApO1xuICBzZXQyNTUxOShwWzFdLCBnZjEpO1xuICBzZXQyNTUxOShwWzJdLCBnZjEpO1xuICBzZXQyNTUxOShwWzNdLCBnZjApO1xuICBmb3IgKGkgPSAyNTU7IGkgPj0gMDsgLS1pKSB7XG4gICAgYiA9IChzWyhpLzgpfDBdID4+IChpJjcpKSAmIDE7XG4gICAgY3N3YXAocCwgcSwgYik7XG4gICAgYWRkKHEsIHApO1xuICAgIGFkZChwLCBwKTtcbiAgICBjc3dhcChwLCBxLCBiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzY2FsYXJiYXNlKHAsIHMpIHtcbiAgdmFyIHEgPSBbZ2YoKSwgZ2YoKSwgZ2YoKSwgZ2YoKV07XG4gIHNldDI1NTE5KHFbMF0sIFgpO1xuICBzZXQyNTUxOShxWzFdLCBZKTtcbiAgc2V0MjU1MTkocVsyXSwgZ2YxKTtcbiAgTShxWzNdLCBYLCBZKTtcbiAgc2NhbGFybXVsdChwLCBxLCBzKTtcbn1cblxuZnVuY3Rpb24gY3J5cHRvX3NpZ25fa2V5cGFpcihwaywgc2ssIHNlZWRlZCkge1xuICB2YXIgZCA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgdmFyIHAgPSBbZ2YoKSwgZ2YoKSwgZ2YoKSwgZ2YoKV07XG4gIHZhciBpO1xuXG4gIGlmICghc2VlZGVkKSByYW5kb21ieXRlcyhzaywgMzIpO1xuICBjcnlwdG9faGFzaChkLCBzaywgMzIpO1xuICBkWzBdICY9IDI0ODtcbiAgZFszMV0gJj0gMTI3O1xuICBkWzMxXSB8PSA2NDtcblxuICBzY2FsYXJiYXNlKHAsIGQpO1xuICBwYWNrKHBrLCBwKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgMzI7IGkrKykgc2tbaSszMl0gPSBwa1tpXTtcbiAgcmV0dXJuIDA7XG59XG5cbnZhciBMID0gbmV3IEZsb2F0NjRBcnJheShbMHhlZCwgMHhkMywgMHhmNSwgMHg1YywgMHgxYSwgMHg2MywgMHgxMiwgMHg1OCwgMHhkNiwgMHg5YywgMHhmNywgMHhhMiwgMHhkZSwgMHhmOSwgMHhkZSwgMHgxNCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMHgxMF0pO1xuXG5mdW5jdGlvbiBtb2RMKHIsIHgpIHtcbiAgdmFyIGNhcnJ5LCBpLCBqLCBrO1xuICBmb3IgKGkgPSA2MzsgaSA+PSAzMjsgLS1pKSB7XG4gICAgY2FycnkgPSAwO1xuICAgIGZvciAoaiA9IGkgLSAzMiwgayA9IGkgLSAxMjsgaiA8IGs7ICsraikge1xuICAgICAgeFtqXSArPSBjYXJyeSAtIDE2ICogeFtpXSAqIExbaiAtIChpIC0gMzIpXTtcbiAgICAgIGNhcnJ5ID0gKHhbal0gKyAxMjgpID4+IDg7XG4gICAgICB4W2pdIC09IGNhcnJ5ICogMjU2O1xuICAgIH1cbiAgICB4W2pdICs9IGNhcnJ5O1xuICAgIHhbaV0gPSAwO1xuICB9XG4gIGNhcnJ5ID0gMDtcbiAgZm9yIChqID0gMDsgaiA8IDMyOyBqKyspIHtcbiAgICB4W2pdICs9IGNhcnJ5IC0gKHhbMzFdID4+IDQpICogTFtqXTtcbiAgICBjYXJyeSA9IHhbal0gPj4gODtcbiAgICB4W2pdICY9IDI1NTtcbiAgfVxuICBmb3IgKGogPSAwOyBqIDwgMzI7IGorKykgeFtqXSAtPSBjYXJyeSAqIExbal07XG4gIGZvciAoaSA9IDA7IGkgPCAzMjsgaSsrKSB7XG4gICAgeFtpKzFdICs9IHhbaV0gPj4gODtcbiAgICByW2ldID0geFtpXSAmIDI1NTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWR1Y2Uocikge1xuICB2YXIgeCA9IG5ldyBGbG9hdDY0QXJyYXkoNjQpLCBpO1xuICBmb3IgKGkgPSAwOyBpIDwgNjQ7IGkrKykgeFtpXSA9IHJbaV07XG4gIGZvciAoaSA9IDA7IGkgPCA2NDsgaSsrKSByW2ldID0gMDtcbiAgbW9kTChyLCB4KTtcbn1cblxuLy8gTm90ZTogZGlmZmVyZW5jZSBmcm9tIEMgLSBzbWxlbiByZXR1cm5lZCwgbm90IHBhc3NlZCBhcyBhcmd1bWVudC5cbmZ1bmN0aW9uIGNyeXB0b19zaWduKHNtLCBtLCBuLCBzaykge1xuICB2YXIgZCA9IG5ldyBVaW50OEFycmF5KDY0KSwgaCA9IG5ldyBVaW50OEFycmF5KDY0KSwgciA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgdmFyIGksIGosIHggPSBuZXcgRmxvYXQ2NEFycmF5KDY0KTtcbiAgdmFyIHAgPSBbZ2YoKSwgZ2YoKSwgZ2YoKSwgZ2YoKV07XG5cbiAgY3J5cHRvX2hhc2goZCwgc2ssIDMyKTtcbiAgZFswXSAmPSAyNDg7XG4gIGRbMzFdICY9IDEyNztcbiAgZFszMV0gfD0gNjQ7XG5cbiAgdmFyIHNtbGVuID0gbiArIDY0O1xuICBmb3IgKGkgPSAwOyBpIDwgbjsgaSsrKSBzbVs2NCArIGldID0gbVtpXTtcbiAgZm9yIChpID0gMDsgaSA8IDMyOyBpKyspIHNtWzMyICsgaV0gPSBkWzMyICsgaV07XG5cbiAgY3J5cHRvX2hhc2gociwgc20uc3ViYXJyYXkoMzIpLCBuKzMyKTtcbiAgcmVkdWNlKHIpO1xuICBzY2FsYXJiYXNlKHAsIHIpO1xuICBwYWNrKHNtLCBwKTtcblxuICBmb3IgKGkgPSAzMjsgaSA8IDY0OyBpKyspIHNtW2ldID0gc2tbaV07XG4gIGNyeXB0b19oYXNoKGgsIHNtLCBuICsgNjQpO1xuICByZWR1Y2UoaCk7XG5cbiAgZm9yIChpID0gMDsgaSA8IDY0OyBpKyspIHhbaV0gPSAwO1xuICBmb3IgKGkgPSAwOyBpIDwgMzI7IGkrKykgeFtpXSA9IHJbaV07XG4gIGZvciAoaSA9IDA7IGkgPCAzMjsgaSsrKSB7XG4gICAgZm9yIChqID0gMDsgaiA8IDMyOyBqKyspIHtcbiAgICAgIHhbaStqXSArPSBoW2ldICogZFtqXTtcbiAgICB9XG4gIH1cblxuICBtb2RMKHNtLnN1YmFycmF5KDMyKSwgeCk7XG4gIHJldHVybiBzbWxlbjtcbn1cblxuZnVuY3Rpb24gdW5wYWNrbmVnKHIsIHApIHtcbiAgdmFyIHQgPSBnZigpLCBjaGsgPSBnZigpLCBudW0gPSBnZigpLFxuICAgICAgZGVuID0gZ2YoKSwgZGVuMiA9IGdmKCksIGRlbjQgPSBnZigpLFxuICAgICAgZGVuNiA9IGdmKCk7XG5cbiAgc2V0MjU1MTkoclsyXSwgZ2YxKTtcbiAgdW5wYWNrMjU1MTkoclsxXSwgcCk7XG4gIFMobnVtLCByWzFdKTtcbiAgTShkZW4sIG51bSwgRCk7XG4gIFoobnVtLCBudW0sIHJbMl0pO1xuICBBKGRlbiwgclsyXSwgZGVuKTtcblxuICBTKGRlbjIsIGRlbik7XG4gIFMoZGVuNCwgZGVuMik7XG4gIE0oZGVuNiwgZGVuNCwgZGVuMik7XG4gIE0odCwgZGVuNiwgbnVtKTtcbiAgTSh0LCB0LCBkZW4pO1xuXG4gIHBvdzI1MjModCwgdCk7XG4gIE0odCwgdCwgbnVtKTtcbiAgTSh0LCB0LCBkZW4pO1xuICBNKHQsIHQsIGRlbik7XG4gIE0oclswXSwgdCwgZGVuKTtcblxuICBTKGNoaywgclswXSk7XG4gIE0oY2hrLCBjaGssIGRlbik7XG4gIGlmIChuZXEyNTUxOShjaGssIG51bSkpIE0oclswXSwgclswXSwgSSk7XG5cbiAgUyhjaGssIHJbMF0pO1xuICBNKGNoaywgY2hrLCBkZW4pO1xuICBpZiAobmVxMjU1MTkoY2hrLCBudW0pKSByZXR1cm4gLTE7XG5cbiAgaWYgKHBhcjI1NTE5KHJbMF0pID09PSAocFszMV0+PjcpKSBaKHJbMF0sIGdmMCwgclswXSk7XG5cbiAgTShyWzNdLCByWzBdLCByWzFdKTtcbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGNyeXB0b19zaWduX29wZW4obSwgc20sIG4sIHBrKSB7XG4gIHZhciBpLCBtbGVuO1xuICB2YXIgdCA9IG5ldyBVaW50OEFycmF5KDMyKSwgaCA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgdmFyIHAgPSBbZ2YoKSwgZ2YoKSwgZ2YoKSwgZ2YoKV0sXG4gICAgICBxID0gW2dmKCksIGdmKCksIGdmKCksIGdmKCldO1xuXG4gIG1sZW4gPSAtMTtcbiAgaWYgKG4gPCA2NCkgcmV0dXJuIC0xO1xuXG4gIGlmICh1bnBhY2tuZWcocSwgcGspKSByZXR1cm4gLTE7XG5cbiAgZm9yIChpID0gMDsgaSA8IG47IGkrKykgbVtpXSA9IHNtW2ldO1xuICBmb3IgKGkgPSAwOyBpIDwgMzI7IGkrKykgbVtpKzMyXSA9IHBrW2ldO1xuICBjcnlwdG9faGFzaChoLCBtLCBuKTtcbiAgcmVkdWNlKGgpO1xuICBzY2FsYXJtdWx0KHAsIHEsIGgpO1xuXG4gIHNjYWxhcmJhc2UocSwgc20uc3ViYXJyYXkoMzIpKTtcbiAgYWRkKHAsIHEpO1xuICBwYWNrKHQsIHApO1xuXG4gIG4gLT0gNjQ7XG4gIGlmIChjcnlwdG9fdmVyaWZ5XzMyKHNtLCAwLCB0LCAwKSkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIG1baV0gPSAwO1xuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIG1baV0gPSBzbVtpICsgNjRdO1xuICBtbGVuID0gbjtcbiAgcmV0dXJuIG1sZW47XG59XG5cbnZhciBjcnlwdG9fc2VjcmV0Ym94X0tFWUJZVEVTID0gMzIsXG4gICAgY3J5cHRvX3NlY3JldGJveF9OT05DRUJZVEVTID0gMjQsXG4gICAgY3J5cHRvX3NlY3JldGJveF9aRVJPQllURVMgPSAzMixcbiAgICBjcnlwdG9fc2VjcmV0Ym94X0JPWFpFUk9CWVRFUyA9IDE2LFxuICAgIGNyeXB0b19zY2FsYXJtdWx0X0JZVEVTID0gMzIsXG4gICAgY3J5cHRvX3NjYWxhcm11bHRfU0NBTEFSQllURVMgPSAzMixcbiAgICBjcnlwdG9fYm94X1BVQkxJQ0tFWUJZVEVTID0gMzIsXG4gICAgY3J5cHRvX2JveF9TRUNSRVRLRVlCWVRFUyA9IDMyLFxuICAgIGNyeXB0b19ib3hfQkVGT1JFTk1CWVRFUyA9IDMyLFxuICAgIGNyeXB0b19ib3hfTk9OQ0VCWVRFUyA9IGNyeXB0b19zZWNyZXRib3hfTk9OQ0VCWVRFUyxcbiAgICBjcnlwdG9fYm94X1pFUk9CWVRFUyA9IGNyeXB0b19zZWNyZXRib3hfWkVST0JZVEVTLFxuICAgIGNyeXB0b19ib3hfQk9YWkVST0JZVEVTID0gY3J5cHRvX3NlY3JldGJveF9CT1haRVJPQllURVMsXG4gICAgY3J5cHRvX3NpZ25fQllURVMgPSA2NCxcbiAgICBjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUyA9IDMyLFxuICAgIGNyeXB0b19zaWduX1NFQ1JFVEtFWUJZVEVTID0gNjQsXG4gICAgY3J5cHRvX3NpZ25fU0VFREJZVEVTID0gMzIsXG4gICAgY3J5cHRvX2hhc2hfQllURVMgPSA2NDtcblxubmFjbC5sb3dsZXZlbCA9IHtcbiAgY3J5cHRvX2NvcmVfaHNhbHNhMjA6IGNyeXB0b19jb3JlX2hzYWxzYTIwLFxuICBjcnlwdG9fc3RyZWFtX3hvcjogY3J5cHRvX3N0cmVhbV94b3IsXG4gIGNyeXB0b19zdHJlYW06IGNyeXB0b19zdHJlYW0sXG4gIGNyeXB0b19zdHJlYW1fc2Fsc2EyMF94b3I6IGNyeXB0b19zdHJlYW1fc2Fsc2EyMF94b3IsXG4gIGNyeXB0b19zdHJlYW1fc2Fsc2EyMDogY3J5cHRvX3N0cmVhbV9zYWxzYTIwLFxuICBjcnlwdG9fb25ldGltZWF1dGg6IGNyeXB0b19vbmV0aW1lYXV0aCxcbiAgY3J5cHRvX29uZXRpbWVhdXRoX3ZlcmlmeTogY3J5cHRvX29uZXRpbWVhdXRoX3ZlcmlmeSxcbiAgY3J5cHRvX3ZlcmlmeV8xNjogY3J5cHRvX3ZlcmlmeV8xNixcbiAgY3J5cHRvX3ZlcmlmeV8zMjogY3J5cHRvX3ZlcmlmeV8zMixcbiAgY3J5cHRvX3NlY3JldGJveDogY3J5cHRvX3NlY3JldGJveCxcbiAgY3J5cHRvX3NlY3JldGJveF9vcGVuOiBjcnlwdG9fc2VjcmV0Ym94X29wZW4sXG4gIGNyeXB0b19zY2FsYXJtdWx0OiBjcnlwdG9fc2NhbGFybXVsdCxcbiAgY3J5cHRvX3NjYWxhcm11bHRfYmFzZTogY3J5cHRvX3NjYWxhcm11bHRfYmFzZSxcbiAgY3J5cHRvX2JveF9iZWZvcmVubTogY3J5cHRvX2JveF9iZWZvcmVubSxcbiAgY3J5cHRvX2JveF9hZnRlcm5tOiBjcnlwdG9fYm94X2FmdGVybm0sXG4gIGNyeXB0b19ib3g6IGNyeXB0b19ib3gsXG4gIGNyeXB0b19ib3hfb3BlbjogY3J5cHRvX2JveF9vcGVuLFxuICBjcnlwdG9fYm94X2tleXBhaXI6IGNyeXB0b19ib3hfa2V5cGFpcixcbiAgY3J5cHRvX2hhc2g6IGNyeXB0b19oYXNoLFxuICBjcnlwdG9fc2lnbjogY3J5cHRvX3NpZ24sXG4gIGNyeXB0b19zaWduX2tleXBhaXI6IGNyeXB0b19zaWduX2tleXBhaXIsXG4gIGNyeXB0b19zaWduX29wZW46IGNyeXB0b19zaWduX29wZW4sXG5cbiAgY3J5cHRvX3NlY3JldGJveF9LRVlCWVRFUzogY3J5cHRvX3NlY3JldGJveF9LRVlCWVRFUyxcbiAgY3J5cHRvX3NlY3JldGJveF9OT05DRUJZVEVTOiBjcnlwdG9fc2VjcmV0Ym94X05PTkNFQllURVMsXG4gIGNyeXB0b19zZWNyZXRib3hfWkVST0JZVEVTOiBjcnlwdG9fc2VjcmV0Ym94X1pFUk9CWVRFUyxcbiAgY3J5cHRvX3NlY3JldGJveF9CT1haRVJPQllURVM6IGNyeXB0b19zZWNyZXRib3hfQk9YWkVST0JZVEVTLFxuICBjcnlwdG9fc2NhbGFybXVsdF9CWVRFUzogY3J5cHRvX3NjYWxhcm11bHRfQllURVMsXG4gIGNyeXB0b19zY2FsYXJtdWx0X1NDQUxBUkJZVEVTOiBjcnlwdG9fc2NhbGFybXVsdF9TQ0FMQVJCWVRFUyxcbiAgY3J5cHRvX2JveF9QVUJMSUNLRVlCWVRFUzogY3J5cHRvX2JveF9QVUJMSUNLRVlCWVRFUyxcbiAgY3J5cHRvX2JveF9TRUNSRVRLRVlCWVRFUzogY3J5cHRvX2JveF9TRUNSRVRLRVlCWVRFUyxcbiAgY3J5cHRvX2JveF9CRUZPUkVOTUJZVEVTOiBjcnlwdG9fYm94X0JFRk9SRU5NQllURVMsXG4gIGNyeXB0b19ib3hfTk9OQ0VCWVRFUzogY3J5cHRvX2JveF9OT05DRUJZVEVTLFxuICBjcnlwdG9fYm94X1pFUk9CWVRFUzogY3J5cHRvX2JveF9aRVJPQllURVMsXG4gIGNyeXB0b19ib3hfQk9YWkVST0JZVEVTOiBjcnlwdG9fYm94X0JPWFpFUk9CWVRFUyxcbiAgY3J5cHRvX3NpZ25fQllURVM6IGNyeXB0b19zaWduX0JZVEVTLFxuICBjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUzogY3J5cHRvX3NpZ25fUFVCTElDS0VZQllURVMsXG4gIGNyeXB0b19zaWduX1NFQ1JFVEtFWUJZVEVTOiBjcnlwdG9fc2lnbl9TRUNSRVRLRVlCWVRFUyxcbiAgY3J5cHRvX3NpZ25fU0VFREJZVEVTOiBjcnlwdG9fc2lnbl9TRUVEQllURVMsXG4gIGNyeXB0b19oYXNoX0JZVEVTOiBjcnlwdG9faGFzaF9CWVRFU1xufTtcblxuLyogSGlnaC1sZXZlbCBBUEkgKi9cblxuZnVuY3Rpb24gY2hlY2tMZW5ndGhzKGssIG4pIHtcbiAgaWYgKGsubGVuZ3RoICE9PSBjcnlwdG9fc2VjcmV0Ym94X0tFWUJZVEVTKSB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBrZXkgc2l6ZScpO1xuICBpZiAobi5sZW5ndGggIT09IGNyeXB0b19zZWNyZXRib3hfTk9OQ0VCWVRFUykgdGhyb3cgbmV3IEVycm9yKCdiYWQgbm9uY2Ugc2l6ZScpO1xufVxuXG5mdW5jdGlvbiBjaGVja0JveExlbmd0aHMocGssIHNrKSB7XG4gIGlmIChway5sZW5ndGggIT09IGNyeXB0b19ib3hfUFVCTElDS0VZQllURVMpIHRocm93IG5ldyBFcnJvcignYmFkIHB1YmxpYyBrZXkgc2l6ZScpO1xuICBpZiAoc2subGVuZ3RoICE9PSBjcnlwdG9fYm94X1NFQ1JFVEtFWUJZVEVTKSB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBzZWNyZXQga2V5IHNpemUnKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tBcnJheVR5cGVzKCkge1xuICB2YXIgdCwgaTtcbiAgZm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICBpZiAoKHQgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJndW1lbnRzW2ldKSkgIT09ICdbb2JqZWN0IFVpbnQ4QXJyYXldJylcbiAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd1bmV4cGVjdGVkIHR5cGUgJyArIHQgKyAnLCB1c2UgVWludDhBcnJheScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXAoYXJyKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBhcnJbaV0gPSAwO1xufVxuXG4vLyBUT0RPOiBDb21wbGV0ZWx5IHJlbW92ZSB0aGlzIGluIHYwLjE1LlxuaWYgKCFuYWNsLnV0aWwpIHtcbiAgbmFjbC51dGlsID0ge307XG4gIG5hY2wudXRpbC5kZWNvZGVVVEY4ID0gbmFjbC51dGlsLmVuY29kZVVURjggPSBuYWNsLnV0aWwuZW5jb2RlQmFzZTY0ID0gbmFjbC51dGlsLmRlY29kZUJhc2U2NCA9IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbmFjbC51dGlsIG1vdmVkIGludG8gc2VwYXJhdGUgcGFja2FnZTogaHR0cHM6Ly9naXRodWIuY29tL2RjaGVzdC90d2VldG5hY2wtdXRpbC1qcycpO1xuICB9O1xufVxuXG5uYWNsLnJhbmRvbUJ5dGVzID0gZnVuY3Rpb24obikge1xuICB2YXIgYiA9IG5ldyBVaW50OEFycmF5KG4pO1xuICByYW5kb21ieXRlcyhiLCBuKTtcbiAgcmV0dXJuIGI7XG59O1xuXG5uYWNsLnNlY3JldGJveCA9IGZ1bmN0aW9uKG1zZywgbm9uY2UsIGtleSkge1xuICBjaGVja0FycmF5VHlwZXMobXNnLCBub25jZSwga2V5KTtcbiAgY2hlY2tMZW5ndGhzKGtleSwgbm9uY2UpO1xuICB2YXIgbSA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19zZWNyZXRib3hfWkVST0JZVEVTICsgbXNnLmxlbmd0aCk7XG4gIHZhciBjID0gbmV3IFVpbnQ4QXJyYXkobS5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG1zZy5sZW5ndGg7IGkrKykgbVtpK2NyeXB0b19zZWNyZXRib3hfWkVST0JZVEVTXSA9IG1zZ1tpXTtcbiAgY3J5cHRvX3NlY3JldGJveChjLCBtLCBtLmxlbmd0aCwgbm9uY2UsIGtleSk7XG4gIHJldHVybiBjLnN1YmFycmF5KGNyeXB0b19zZWNyZXRib3hfQk9YWkVST0JZVEVTKTtcbn07XG5cbm5hY2wuc2VjcmV0Ym94Lm9wZW4gPSBmdW5jdGlvbihib3gsIG5vbmNlLCBrZXkpIHtcbiAgY2hlY2tBcnJheVR5cGVzKGJveCwgbm9uY2UsIGtleSk7XG4gIGNoZWNrTGVuZ3RocyhrZXksIG5vbmNlKTtcbiAgdmFyIGMgPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2VjcmV0Ym94X0JPWFpFUk9CWVRFUyArIGJveC5sZW5ndGgpO1xuICB2YXIgbSA9IG5ldyBVaW50OEFycmF5KGMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBib3gubGVuZ3RoOyBpKyspIGNbaStjcnlwdG9fc2VjcmV0Ym94X0JPWFpFUk9CWVRFU10gPSBib3hbaV07XG4gIGlmIChjLmxlbmd0aCA8IDMyKSByZXR1cm4gZmFsc2U7XG4gIGlmIChjcnlwdG9fc2VjcmV0Ym94X29wZW4obSwgYywgYy5sZW5ndGgsIG5vbmNlLCBrZXkpICE9PSAwKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBtLnN1YmFycmF5KGNyeXB0b19zZWNyZXRib3hfWkVST0JZVEVTKTtcbn07XG5cbm5hY2wuc2VjcmV0Ym94LmtleUxlbmd0aCA9IGNyeXB0b19zZWNyZXRib3hfS0VZQllURVM7XG5uYWNsLnNlY3JldGJveC5ub25jZUxlbmd0aCA9IGNyeXB0b19zZWNyZXRib3hfTk9OQ0VCWVRFUztcbm5hY2wuc2VjcmV0Ym94Lm92ZXJoZWFkTGVuZ3RoID0gY3J5cHRvX3NlY3JldGJveF9CT1haRVJPQllURVM7XG5cbm5hY2wuc2NhbGFyTXVsdCA9IGZ1bmN0aW9uKG4sIHApIHtcbiAgY2hlY2tBcnJheVR5cGVzKG4sIHApO1xuICBpZiAobi5sZW5ndGggIT09IGNyeXB0b19zY2FsYXJtdWx0X1NDQUxBUkJZVEVTKSB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBuIHNpemUnKTtcbiAgaWYgKHAubGVuZ3RoICE9PSBjcnlwdG9fc2NhbGFybXVsdF9CWVRFUykgdGhyb3cgbmV3IEVycm9yKCdiYWQgcCBzaXplJyk7XG4gIHZhciBxID0gbmV3IFVpbnQ4QXJyYXkoY3J5cHRvX3NjYWxhcm11bHRfQllURVMpO1xuICBjcnlwdG9fc2NhbGFybXVsdChxLCBuLCBwKTtcbiAgcmV0dXJuIHE7XG59O1xuXG5uYWNsLnNjYWxhck11bHQuYmFzZSA9IGZ1bmN0aW9uKG4pIHtcbiAgY2hlY2tBcnJheVR5cGVzKG4pO1xuICBpZiAobi5sZW5ndGggIT09IGNyeXB0b19zY2FsYXJtdWx0X1NDQUxBUkJZVEVTKSB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBuIHNpemUnKTtcbiAgdmFyIHEgPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2NhbGFybXVsdF9CWVRFUyk7XG4gIGNyeXB0b19zY2FsYXJtdWx0X2Jhc2UocSwgbik7XG4gIHJldHVybiBxO1xufTtcblxubmFjbC5zY2FsYXJNdWx0LnNjYWxhckxlbmd0aCA9IGNyeXB0b19zY2FsYXJtdWx0X1NDQUxBUkJZVEVTO1xubmFjbC5zY2FsYXJNdWx0Lmdyb3VwRWxlbWVudExlbmd0aCA9IGNyeXB0b19zY2FsYXJtdWx0X0JZVEVTO1xuXG5uYWNsLmJveCA9IGZ1bmN0aW9uKG1zZywgbm9uY2UsIHB1YmxpY0tleSwgc2VjcmV0S2V5KSB7XG4gIHZhciBrID0gbmFjbC5ib3guYmVmb3JlKHB1YmxpY0tleSwgc2VjcmV0S2V5KTtcbiAgcmV0dXJuIG5hY2wuc2VjcmV0Ym94KG1zZywgbm9uY2UsIGspO1xufTtcblxubmFjbC5ib3guYmVmb3JlID0gZnVuY3Rpb24ocHVibGljS2V5LCBzZWNyZXRLZXkpIHtcbiAgY2hlY2tBcnJheVR5cGVzKHB1YmxpY0tleSwgc2VjcmV0S2V5KTtcbiAgY2hlY2tCb3hMZW5ndGhzKHB1YmxpY0tleSwgc2VjcmV0S2V5KTtcbiAgdmFyIGsgPSBuZXcgVWludDhBcnJheShjcnlwdG9fYm94X0JFRk9SRU5NQllURVMpO1xuICBjcnlwdG9fYm94X2JlZm9yZW5tKGssIHB1YmxpY0tleSwgc2VjcmV0S2V5KTtcbiAgcmV0dXJuIGs7XG59O1xuXG5uYWNsLmJveC5hZnRlciA9IG5hY2wuc2VjcmV0Ym94O1xuXG5uYWNsLmJveC5vcGVuID0gZnVuY3Rpb24obXNnLCBub25jZSwgcHVibGljS2V5LCBzZWNyZXRLZXkpIHtcbiAgdmFyIGsgPSBuYWNsLmJveC5iZWZvcmUocHVibGljS2V5LCBzZWNyZXRLZXkpO1xuICByZXR1cm4gbmFjbC5zZWNyZXRib3gub3Blbihtc2csIG5vbmNlLCBrKTtcbn07XG5cbm5hY2wuYm94Lm9wZW4uYWZ0ZXIgPSBuYWNsLnNlY3JldGJveC5vcGVuO1xuXG5uYWNsLmJveC5rZXlQYWlyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwayA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19ib3hfUFVCTElDS0VZQllURVMpO1xuICB2YXIgc2sgPSBuZXcgVWludDhBcnJheShjcnlwdG9fYm94X1NFQ1JFVEtFWUJZVEVTKTtcbiAgY3J5cHRvX2JveF9rZXlwYWlyKHBrLCBzayk7XG4gIHJldHVybiB7cHVibGljS2V5OiBwaywgc2VjcmV0S2V5OiBza307XG59O1xuXG5uYWNsLmJveC5rZXlQYWlyLmZyb21TZWNyZXRLZXkgPSBmdW5jdGlvbihzZWNyZXRLZXkpIHtcbiAgY2hlY2tBcnJheVR5cGVzKHNlY3JldEtleSk7XG4gIGlmIChzZWNyZXRLZXkubGVuZ3RoICE9PSBjcnlwdG9fYm94X1NFQ1JFVEtFWUJZVEVTKVxuICAgIHRocm93IG5ldyBFcnJvcignYmFkIHNlY3JldCBrZXkgc2l6ZScpO1xuICB2YXIgcGsgPSBuZXcgVWludDhBcnJheShjcnlwdG9fYm94X1BVQkxJQ0tFWUJZVEVTKTtcbiAgY3J5cHRvX3NjYWxhcm11bHRfYmFzZShwaywgc2VjcmV0S2V5KTtcbiAgcmV0dXJuIHtwdWJsaWNLZXk6IHBrLCBzZWNyZXRLZXk6IG5ldyBVaW50OEFycmF5KHNlY3JldEtleSl9O1xufTtcblxubmFjbC5ib3gucHVibGljS2V5TGVuZ3RoID0gY3J5cHRvX2JveF9QVUJMSUNLRVlCWVRFUztcbm5hY2wuYm94LnNlY3JldEtleUxlbmd0aCA9IGNyeXB0b19ib3hfU0VDUkVUS0VZQllURVM7XG5uYWNsLmJveC5zaGFyZWRLZXlMZW5ndGggPSBjcnlwdG9fYm94X0JFRk9SRU5NQllURVM7XG5uYWNsLmJveC5ub25jZUxlbmd0aCA9IGNyeXB0b19ib3hfTk9OQ0VCWVRFUztcbm5hY2wuYm94Lm92ZXJoZWFkTGVuZ3RoID0gbmFjbC5zZWNyZXRib3gub3ZlcmhlYWRMZW5ndGg7XG5cbm5hY2wuc2lnbiA9IGZ1bmN0aW9uKG1zZywgc2VjcmV0S2V5KSB7XG4gIGNoZWNrQXJyYXlUeXBlcyhtc2csIHNlY3JldEtleSk7XG4gIGlmIChzZWNyZXRLZXkubGVuZ3RoICE9PSBjcnlwdG9fc2lnbl9TRUNSRVRLRVlCWVRFUylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBzZWNyZXQga2V5IHNpemUnKTtcbiAgdmFyIHNpZ25lZE1zZyA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19zaWduX0JZVEVTK21zZy5sZW5ndGgpO1xuICBjcnlwdG9fc2lnbihzaWduZWRNc2csIG1zZywgbXNnLmxlbmd0aCwgc2VjcmV0S2V5KTtcbiAgcmV0dXJuIHNpZ25lZE1zZztcbn07XG5cbm5hY2wuc2lnbi5vcGVuID0gZnVuY3Rpb24oc2lnbmVkTXNnLCBwdWJsaWNLZXkpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT09IDIpXG4gICAgdGhyb3cgbmV3IEVycm9yKCduYWNsLnNpZ24ub3BlbiBhY2NlcHRzIDIgYXJndW1lbnRzOyBkaWQgeW91IG1lYW4gdG8gdXNlIG5hY2wuc2lnbi5kZXRhY2hlZC52ZXJpZnk/Jyk7XG4gIGNoZWNrQXJyYXlUeXBlcyhzaWduZWRNc2csIHB1YmxpY0tleSk7XG4gIGlmIChwdWJsaWNLZXkubGVuZ3RoICE9PSBjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBwdWJsaWMga2V5IHNpemUnKTtcbiAgdmFyIHRtcCA9IG5ldyBVaW50OEFycmF5KHNpZ25lZE1zZy5sZW5ndGgpO1xuICB2YXIgbWxlbiA9IGNyeXB0b19zaWduX29wZW4odG1wLCBzaWduZWRNc2csIHNpZ25lZE1zZy5sZW5ndGgsIHB1YmxpY0tleSk7XG4gIGlmIChtbGVuIDwgMCkgcmV0dXJuIG51bGw7XG4gIHZhciBtID0gbmV3IFVpbnQ4QXJyYXkobWxlbik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbS5sZW5ndGg7IGkrKykgbVtpXSA9IHRtcFtpXTtcbiAgcmV0dXJuIG07XG59O1xuXG5uYWNsLnNpZ24uZGV0YWNoZWQgPSBmdW5jdGlvbihtc2csIHNlY3JldEtleSkge1xuICB2YXIgc2lnbmVkTXNnID0gbmFjbC5zaWduKG1zZywgc2VjcmV0S2V5KTtcbiAgdmFyIHNpZyA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19zaWduX0JZVEVTKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWcubGVuZ3RoOyBpKyspIHNpZ1tpXSA9IHNpZ25lZE1zZ1tpXTtcbiAgcmV0dXJuIHNpZztcbn07XG5cbm5hY2wuc2lnbi5kZXRhY2hlZC52ZXJpZnkgPSBmdW5jdGlvbihtc2csIHNpZywgcHVibGljS2V5KSB7XG4gIGNoZWNrQXJyYXlUeXBlcyhtc2csIHNpZywgcHVibGljS2V5KTtcbiAgaWYgKHNpZy5sZW5ndGggIT09IGNyeXB0b19zaWduX0JZVEVTKVxuICAgIHRocm93IG5ldyBFcnJvcignYmFkIHNpZ25hdHVyZSBzaXplJyk7XG4gIGlmIChwdWJsaWNLZXkubGVuZ3RoICE9PSBjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBwdWJsaWMga2V5IHNpemUnKTtcbiAgdmFyIHNtID0gbmV3IFVpbnQ4QXJyYXkoY3J5cHRvX3NpZ25fQllURVMgKyBtc2cubGVuZ3RoKTtcbiAgdmFyIG0gPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2lnbl9CWVRFUyArIG1zZy5sZW5ndGgpO1xuICB2YXIgaTtcbiAgZm9yIChpID0gMDsgaSA8IGNyeXB0b19zaWduX0JZVEVTOyBpKyspIHNtW2ldID0gc2lnW2ldO1xuICBmb3IgKGkgPSAwOyBpIDwgbXNnLmxlbmd0aDsgaSsrKSBzbVtpK2NyeXB0b19zaWduX0JZVEVTXSA9IG1zZ1tpXTtcbiAgcmV0dXJuIChjcnlwdG9fc2lnbl9vcGVuKG0sIHNtLCBzbS5sZW5ndGgsIHB1YmxpY0tleSkgPj0gMCk7XG59O1xuXG5uYWNsLnNpZ24ua2V5UGFpciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGsgPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUyk7XG4gIHZhciBzayA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19zaWduX1NFQ1JFVEtFWUJZVEVTKTtcbiAgY3J5cHRvX3NpZ25fa2V5cGFpcihwaywgc2spO1xuICByZXR1cm4ge3B1YmxpY0tleTogcGssIHNlY3JldEtleTogc2t9O1xufTtcblxubmFjbC5zaWduLmtleVBhaXIuZnJvbVNlY3JldEtleSA9IGZ1bmN0aW9uKHNlY3JldEtleSkge1xuICBjaGVja0FycmF5VHlwZXMoc2VjcmV0S2V5KTtcbiAgaWYgKHNlY3JldEtleS5sZW5ndGggIT09IGNyeXB0b19zaWduX1NFQ1JFVEtFWUJZVEVTKVxuICAgIHRocm93IG5ldyBFcnJvcignYmFkIHNlY3JldCBrZXkgc2l6ZScpO1xuICB2YXIgcGsgPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2lnbl9QVUJMSUNLRVlCWVRFUyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGsubGVuZ3RoOyBpKyspIHBrW2ldID0gc2VjcmV0S2V5WzMyK2ldO1xuICByZXR1cm4ge3B1YmxpY0tleTogcGssIHNlY3JldEtleTogbmV3IFVpbnQ4QXJyYXkoc2VjcmV0S2V5KX07XG59O1xuXG5uYWNsLnNpZ24ua2V5UGFpci5mcm9tU2VlZCA9IGZ1bmN0aW9uKHNlZWQpIHtcbiAgY2hlY2tBcnJheVR5cGVzKHNlZWQpO1xuICBpZiAoc2VlZC5sZW5ndGggIT09IGNyeXB0b19zaWduX1NFRURCWVRFUylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBzZWVkIHNpemUnKTtcbiAgdmFyIHBrID0gbmV3IFVpbnQ4QXJyYXkoY3J5cHRvX3NpZ25fUFVCTElDS0VZQllURVMpO1xuICB2YXIgc2sgPSBuZXcgVWludDhBcnJheShjcnlwdG9fc2lnbl9TRUNSRVRLRVlCWVRFUyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgMzI7IGkrKykgc2tbaV0gPSBzZWVkW2ldO1xuICBjcnlwdG9fc2lnbl9rZXlwYWlyKHBrLCBzaywgdHJ1ZSk7XG4gIHJldHVybiB7cHVibGljS2V5OiBwaywgc2VjcmV0S2V5OiBza307XG59O1xuXG5uYWNsLnNpZ24ucHVibGljS2V5TGVuZ3RoID0gY3J5cHRvX3NpZ25fUFVCTElDS0VZQllURVM7XG5uYWNsLnNpZ24uc2VjcmV0S2V5TGVuZ3RoID0gY3J5cHRvX3NpZ25fU0VDUkVUS0VZQllURVM7XG5uYWNsLnNpZ24uc2VlZExlbmd0aCA9IGNyeXB0b19zaWduX1NFRURCWVRFUztcbm5hY2wuc2lnbi5zaWduYXR1cmVMZW5ndGggPSBjcnlwdG9fc2lnbl9CWVRFUztcblxubmFjbC5oYXNoID0gZnVuY3Rpb24obXNnKSB7XG4gIGNoZWNrQXJyYXlUeXBlcyhtc2cpO1xuICB2YXIgaCA9IG5ldyBVaW50OEFycmF5KGNyeXB0b19oYXNoX0JZVEVTKTtcbiAgY3J5cHRvX2hhc2goaCwgbXNnLCBtc2cubGVuZ3RoKTtcbiAgcmV0dXJuIGg7XG59O1xuXG5uYWNsLmhhc2guaGFzaExlbmd0aCA9IGNyeXB0b19oYXNoX0JZVEVTO1xuXG5uYWNsLnZlcmlmeSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgY2hlY2tBcnJheVR5cGVzKHgsIHkpO1xuICAvLyBaZXJvIGxlbmd0aCBhcmd1bWVudHMgYXJlIGNvbnNpZGVyZWQgbm90IGVxdWFsLlxuICBpZiAoeC5sZW5ndGggPT09IDAgfHwgeS5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgaWYgKHgubGVuZ3RoICE9PSB5Lmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gKHZuKHgsIDAsIHksIDAsIHgubGVuZ3RoKSA9PT0gMCkgPyB0cnVlIDogZmFsc2U7XG59O1xuXG5uYWNsLnNldFBSTkcgPSBmdW5jdGlvbihmbikge1xuICByYW5kb21ieXRlcyA9IGZuO1xufTtcblxuKGZ1bmN0aW9uKCkge1xuICAvLyBJbml0aWFsaXplIFBSTkcgaWYgZW52aXJvbm1lbnQgcHJvdmlkZXMgQ1NQUk5HLlxuICAvLyBJZiBub3QsIG1ldGhvZHMgY2FsbGluZyByYW5kb21ieXRlcyB3aWxsIHRocm93LlxuICB2YXIgY3J5cHRvID0gdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gKHNlbGYuY3J5cHRvIHx8IHNlbGYubXNDcnlwdG8pIDogbnVsbDtcbiAgaWYgKGNyeXB0byAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gICAgLy8gQnJvd3NlcnMuXG4gICAgdmFyIFFVT1RBID0gNjU1MzY7XG4gICAgbmFjbC5zZXRQUk5HKGZ1bmN0aW9uKHgsIG4pIHtcbiAgICAgIHZhciBpLCB2ID0gbmV3IFVpbnQ4QXJyYXkobik7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbjsgaSArPSBRVU9UQSkge1xuICAgICAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHYuc3ViYXJyYXkoaSwgaSArIE1hdGgubWluKG4gLSBpLCBRVU9UQSkpKTtcbiAgICAgIH1cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIHhbaV0gPSB2W2ldO1xuICAgICAgY2xlYW51cCh2KTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBOb2RlLmpzLlxuICAgIGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuICAgIGlmIChjcnlwdG8gJiYgY3J5cHRvLnJhbmRvbUJ5dGVzKSB7XG4gICAgICBuYWNsLnNldFBSTkcoZnVuY3Rpb24oeCwgbikge1xuICAgICAgICB2YXIgaSwgdiA9IGNyeXB0by5yYW5kb21CeXRlcyhuKTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykgeFtpXSA9IHZbaV07XG4gICAgICAgIGNsZWFudXAodik7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pKCk7XG5cbn0pKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzID8gbW9kdWxlLmV4cG9ydHMgOiAoc2VsZi5uYWNsID0gc2VsZi5uYWNsIHx8IHt9KSk7XG4iLCJ2YXIgRXhvbnVtID0gcmVxdWlyZSgnLi9pbmRleC5qcycpO1xuXG53aW5kb3cuRXhvbnVtID0gd2luZG93LkV4b251bSB8fCBFeG9udW07XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCJ2YWxpZGF0b3JzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwdWJsaWNLZXlcIjogXCJlYjdlM2FkNTVmOTdlNWQ1NjkzZmUwZTY5ZjRjMjZiZDExNzMwNzdkYmZmYjVmZmY1YjY5ZjIxM2Y3MWJlZTNmXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwdWJsaWNLZXlcIjogXCIzZDE3NzAyYTNmMjYwY2NmMGQxNzEyNzljZWVlNzRkYzczMDkwNDllMTFiZmQxM2Q4MzlmNjZmODY3ZjJkNTA0XCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwdWJsaWNLZXlcIjogXCI2MTJiYzM2ZDFkZTE2NTQxYjQwZWU0NjgxNTdmMWFlYjNjZjcwOTM0N2UzMjY1NGI3MzBlMWY5NzBkYzIwZWRkXCJcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJwdWJsaWNLZXlcIjogXCIzMDE2OTAxZjUzOWY3OTRkY2M0YzI0NjZiZTE0Njc4YjMwYzVkNTAzMTA3YTJmYzhiYmVkNDY4MGEzMDZiMTc3XCJcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJwdWJsaWNLZXlcIjogXCIyODBhNzA0ZWZhZmFlOTQxMGQ3YjA3MTQwYmIxMzBlNDk5NWVlYjM4MWJhOTA5MzliNGVhZWZjYWY3NDBjYTI1XCIsXG4gICAgXCJwcml2YXRlS2V5XCI6IFwiMDQzODA4MjYwMWY4YjM4YWUwMTBhNjIxYTQ4ZjRiNGNkMDIxYzRlNmU2OTIxOWUzYzJkOGFiYWI0ODIwMzllOVwiLFxuICAgIFwibmV0d29ya0lkXCI6IDBcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc2hhID0gcmVxdWlyZSgnc2hhLmpzJyk7XG52YXIgbmFjbCA9IHJlcXVpcmUoJ3R3ZWV0bmFjbCcpO1xudmFyIG9iamVjdEFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgYmlnSW50ID0gcmVxdWlyZShcImJpZy1pbnRlZ2VyXCIpO1xuXG52YXIgVGhpbkNsaWVudCA9IChmdW5jdGlvbigpIHtcblxuICAgIHZhciBDT05GSUcgPSByZXF1aXJlKCcuL2NvbmZpZy5qc29uJyk7XG4gICAgdmFyIENPTlNUID0ge1xuICAgICAgICBNSU5fSU5UODogLTEyOCxcbiAgICAgICAgTUFYX0lOVDg6IDEyNyxcbiAgICAgICAgTUlOX0lOVDE2OiAtMzI3NjgsXG4gICAgICAgIE1BWF9JTlQxNjogMzI3NjcsXG4gICAgICAgIE1JTl9JTlQzMjogLTIxNDc0ODM2NDgsXG4gICAgICAgIE1BWF9JTlQzMjogMjE0NzQ4MzY0NyxcbiAgICAgICAgTUlOX0lOVDY0OiAnLTkyMjMzNzIwMzY4NTQ3NzU4MDgnLFxuICAgICAgICBNQVhfSU5UNjQ6ICc5MjIzMzcyMDM2ODU0Nzc1ODA3JyxcbiAgICAgICAgTUFYX1VJTlQ4OiAyNTUsXG4gICAgICAgIE1BWF9VSU5UMTY6IDY1NTM1LFxuICAgICAgICBNQVhfVUlOVDMyOiA0Mjk0OTY3Mjk1LFxuICAgICAgICBNQVhfVUlOVDY0OiAnMTg0NDY3NDQwNzM3MDk1NTE2MTUnLFxuICAgICAgICBNRVJLTEVfUEFUUklDSUFfS0VZX0xFTkdUSDogMzIsXG4gICAgICAgIFNJR05BVFVSRV9MRU5HVEg6IDY0XG4gICAgfTtcbiAgICB2YXIgREJLZXkgPSBjcmVhdGVOZXdUeXBlKHtcbiAgICAgICAgc2l6ZTogMzQsXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgdmFyaWFudDoge3R5cGU6IFVpbnQ4LCBzaXplOiAxLCBmcm9tOiAwLCB0bzogMX0sXG4gICAgICAgICAgICBrZXk6IHt0eXBlOiBIYXNoLCBzaXplOiAzMiwgZnJvbTogMSwgdG86IDMzfSxcbiAgICAgICAgICAgIGxlbmd0aDoge3R5cGU6IFVpbnQ4LCBzaXplOiAxLCBmcm9tOiAzMywgdG86IDM0fVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgdmFyIEJyYW5jaCA9IGNyZWF0ZU5ld1R5cGUoe1xuICAgICAgICBzaXplOiAxMzIsXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgbGVmdF9oYXNoOiB7dHlwZTogSGFzaCwgc2l6ZTogMzIsIGZyb206IDAsIHRvOiAzMn0sXG4gICAgICAgICAgICByaWdodF9oYXNoOiB7dHlwZTogSGFzaCwgc2l6ZTogMzIsIGZyb206IDMyLCB0bzogNjR9LFxuICAgICAgICAgICAgbGVmdF9rZXk6IHt0eXBlOiBEQktleSwgc2l6ZTogMzQsIGZyb206IDY0LCB0bzogOTh9LFxuICAgICAgICAgICAgcmlnaHRfa2V5OiB7dHlwZTogREJLZXksIHNpemU6IDM0LCBmcm9tOiA5OCwgdG86IDEzMn1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBSb290QnJhbmNoID0gY3JlYXRlTmV3VHlwZSh7XG4gICAgICAgIHNpemU6IDY2LFxuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICAgIGtleToge3R5cGU6IERCS2V5LCBzaXplOiAzNCwgZnJvbTogMCwgdG86IDM0fSxcbiAgICAgICAgICAgIGhhc2g6IHt0eXBlOiBIYXNoLCBzaXplOiAzMiwgZnJvbTogMzQsIHRvOiA2Nn1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBCbG9jayA9IGNyZWF0ZU5ld1R5cGUoe1xuICAgICAgICBzaXplOiAxMTYsXG4gICAgICAgIGxpdHRsZUVuZGlhbjogdHJ1ZSxcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgICBoZWlnaHQ6IHt0eXBlOiBVaW50NjQsIHNpemU6IDgsIGZyb206IDAsIHRvOiA4fSxcbiAgICAgICAgICAgIHByb3Bvc2Vfcm91bmQ6IHt0eXBlOiBVaW50MzIsIHNpemU6IDQsIGZyb206IDgsIHRvOiAxMn0sXG4gICAgICAgICAgICB0aW1lOiB7dHlwZTogVGltZXNwZWMsIHNpemU6IDgsIGZyb206IDEyLCB0bzogMjB9LFxuICAgICAgICAgICAgcHJldl9oYXNoOiB7dHlwZTogSGFzaCwgc2l6ZTogMzIsIGZyb206IDIwLCB0bzogNTJ9LFxuICAgICAgICAgICAgdHhfaGFzaDoge3R5cGU6IEhhc2gsIHNpemU6IDMyLCBmcm9tOiA1MiwgdG86IDg0fSxcbiAgICAgICAgICAgIHN0YXRlX2hhc2g6IHt0eXBlOiBIYXNoLCBzaXplOiAzMiwgZnJvbTogODQsIHRvOiAxMTZ9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgTWVzc2FnZUhlYWQgPSBjcmVhdGVOZXdUeXBlKHtcbiAgICAgICAgc2l6ZTogMTAsXG4gICAgICAgIGxpdHRsZUVuZGlhbjogdHJ1ZSxcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgICBuZXR3b3JrX2lkOiB7dHlwZTogVWludDgsIHNpemU6IDEsIGZyb206IDAsIHRvOiAxfSxcbiAgICAgICAgICAgIHZlcnNpb246IHt0eXBlOiBVaW50OCwgc2l6ZTogMSwgZnJvbTogMSwgdG86IDJ9LFxuICAgICAgICAgICAgbWVzc2FnZV90eXBlOiB7dHlwZTogVWludDE2LCBzaXplOiAyLCBmcm9tOiAyLCB0bzogNH0sXG4gICAgICAgICAgICBzZXJ2aWNlX2lkOiB7dHlwZTogVWludDE2LCBzaXplOiAyLCBmcm9tOiA0LCB0bzogNn0sXG4gICAgICAgICAgICBwYXlsb2FkOiB7dHlwZTogVWludDMyLCBzaXplOiA0LCBmcm9tOiA2LCB0bzogMTB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgUHJlY29tbWl0ID0gY3JlYXRlTmV3TWVzc2FnZSh7XG4gICAgICAgIHNpemU6IDg0LFxuICAgICAgICBzZXJ2aWNlX2lkOiAwLFxuICAgICAgICBtZXNzYWdlX3R5cGU6IDQsXG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgICAgdmFsaWRhdG9yOiB7dHlwZTogVWludDMyLCBzaXplOiA0LCBmcm9tOiAwLCB0bzogNH0sXG4gICAgICAgICAgICBoZWlnaHQ6IHt0eXBlOiBVaW50NjQsIHNpemU6IDgsIGZyb206IDgsIHRvOiAxNn0sXG4gICAgICAgICAgICByb3VuZDoge3R5cGU6IFVpbnQzMiwgc2l6ZTogNCwgZnJvbTogMTYsIHRvOiAyMH0sXG4gICAgICAgICAgICBwcm9wb3NlX2hhc2g6IHt0eXBlOiBIYXNoLCBzaXplOiAzMiwgZnJvbTogMjAsIHRvOiA1Mn0sXG4gICAgICAgICAgICBibG9ja19oYXNoOiB7dHlwZTogSGFzaCwgc2l6ZTogMzIsIGZyb206IDUyLCB0bzogODR9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0eXBlXG4gICAgICovXG4gICAgZnVuY3Rpb24gTmV3VHlwZSh0eXBlKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHR5cGUuc2l6ZTtcbiAgICAgICAgdGhpcy5saXR0bGVFbmRpYW4gPSB0eXBlLmxpdHRsZUVuZGlhbjtcbiAgICAgICAgdGhpcy5maWVsZHMgPSB0eXBlLmZpZWxkcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBtZXRob2QgdG8gc2VyaWFsaXplIGRhdGEgaW50byBhcnJheSBvZiA4LWJpdCBpbnRlZ2Vyc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhXG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqL1xuICAgIE5ld1R5cGUucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShbXSwgMCwgZGF0YSwgdGhpcyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBlbGVtZW50IG9mIE5ld1R5cGUgY2xhc3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHlwZVxuICAgICAqIEByZXR1cm5zIHtOZXdUeXBlfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU5ld1R5cGUodHlwZSkge1xuICAgICAgICByZXR1cm4gbmV3IE5ld1R5cGUodHlwZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gTmV3TWVzc2FnZSh0eXBlKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IHR5cGUuc2l6ZTtcbiAgICAgICAgdGhpcy5saXR0bGVFbmRpYW4gPSB0cnVlO1xuICAgICAgICB0aGlzLm1lc3NhZ2VfdHlwZSA9IHR5cGUubWVzc2FnZV90eXBlO1xuICAgICAgICB0aGlzLnNlcnZpY2VfaWQgPSB0eXBlLnNlcnZpY2VfaWQ7XG4gICAgICAgIHRoaXMuZmllbGRzID0gdHlwZS5maWVsZHM7XG4gICAgfVxuXG4gICAgTmV3TWVzc2FnZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24oZGF0YSwgc2lnbmF0dXJlKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBNZXNzYWdlSGVhZC5zZXJpYWxpemUoe1xuICAgICAgICAgICAgbmV0d29ya19pZDogQ09ORklHLm5ldHdvcmtJZCxcbiAgICAgICAgICAgIHZlcnNpb246IDAsXG4gICAgICAgICAgICBtZXNzYWdlX3R5cGU6IHRoaXMubWVzc2FnZV90eXBlLFxuICAgICAgICAgICAgc2VydmljZV9pZDogdGhpcy5zZXJ2aWNlX2lkXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNlcmlhbGl6ZSBhbmQgYXBwZW5kIG1lc3NhZ2UgYm9keVxuICAgICAgICBidWZmZXIgPSBzZXJpYWxpemUoYnVmZmVyLCBNZXNzYWdlSGVhZC5zaXplLCBkYXRhLCB0aGlzKTtcbiAgICAgICAgaWYgKHR5cGVvZiBidWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjYWxjdWxhdGUgcGF5bG9hZCBhbmQgaW5zZXJ0IGl0IGludG8gYnVmZmVyXG4gICAgICAgIFVpbnQzMihidWZmZXIubGVuZ3RoICsgQ09OU1QuU0lHTkFUVVJFX0xFTkdUSCwgYnVmZmVyLCBNZXNzYWdlSGVhZC5maWVsZHMucGF5bG9hZC5mcm9tLCBNZXNzYWdlSGVhZC5maWVsZHMucGF5bG9hZC50bywgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlTmV3TWVzc2FnZSh0eXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgTmV3TWVzc2FnZSh0eXBlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEludDgodmFsdWUsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbikge1xuICAgICAgICBpZiAoIXZhbGlkYXRlSW50ZWdlcih2YWx1ZSwgQ09OU1QuTUlOX0lOVDgsIENPTlNULk1BWF9JTlQ4LCBmcm9tLCB0bywgMSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgICAgICAgIHZhbHVlID0gQ09OU1QuTUFYX1VJTlQ4ICsgdmFsdWUgKyAxXG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRJbnRlZ2VyVG9CeXRlQXJyYXkodmFsdWUsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbik7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEludDE2KHZhbHVlLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pIHtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZUludGVnZXIodmFsdWUsIENPTlNULk1JTl9JTlQxNiwgQ09OU1QuTUFYX0lOVDE2LCBmcm9tLCB0bywgMikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgICAgICAgIHZhbHVlID0gQ09OU1QuTUFYX1VJTlQxNiArIHZhbHVlICsgMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydEludGVnZXJUb0J5dGVBcnJheSh2YWx1ZSwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKTtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWx0LWluIGRhdGEgdHlwZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyIHx8IFN0cmluZ30gdmFsdWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuXG4gICAgICovXG4gICAgZnVuY3Rpb24gSW50MzIodmFsdWUsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbikge1xuICAgICAgICBpZiAoIXZhbGlkYXRlSW50ZWdlcih2YWx1ZSwgQ09OU1QuTUlOX0lOVDMyLCBDT05TVC5NQVhfSU5UMzIsIGZyb20sIHRvLCA0KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlIDwgMCkge1xuICAgICAgICAgICAgdmFsdWUgPSBDT05TVC5NQVhfVUlOVDMyICsgdmFsdWUgKyAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5zZXJ0SW50ZWdlclRvQnl0ZUFycmF5KHZhbHVlLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pO1xuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbHQtaW4gZGF0YSB0eXBlXG4gICAgICogQHBhcmFtIHtOdW1iZXIgfHwgU3RyaW5nfSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBmcm9tXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRvXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBsaXR0bGVFbmRpYW5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBJbnQ2NCh2YWx1ZSwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIHZhciB2YWwgPSB2YWxpZGF0ZUJpZ0ludGVnZXIodmFsdWUsIENPTlNULk1JTl9JTlQ2NCwgQ09OU1QuTUFYX0lOVDY0LCBmcm9tLCB0bywgOCk7XG5cbiAgICAgICAgaWYgKHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghYmlnSW50LmlzSW5zdGFuY2UodmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbC5pc05lZ2F0aXZlKCkpIHtcbiAgICAgICAgICAgIHZhbCA9IGJpZ0ludChDT05TVC5NQVhfVUlOVDY0KS5wbHVzKDEpLnBsdXModmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydEJpZ0ludGVnZXJUb0J5dGVBcnJheSh2YWwsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbik7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFVpbnQ4KHZhbHVlLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pIHtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZUludGVnZXIodmFsdWUsIDAsIENPTlNULk1BWF9VSU5UOCwgZnJvbSwgdG8sIDEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRJbnRlZ2VyVG9CeXRlQXJyYXkodmFsdWUsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbik7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFVpbnQxNih2YWx1ZSwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIGlmICghdmFsaWRhdGVJbnRlZ2VyKHZhbHVlLCAwLCBDT05TVC5NQVhfVUlOVDE2LCBmcm9tLCB0bywgMikpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydEludGVnZXJUb0J5dGVBcnJheSh2YWx1ZSwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKTtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWx0LWluIGRhdGEgdHlwZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyIHx8IFN0cmluZ30gdmFsdWVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuXG4gICAgICovXG4gICAgZnVuY3Rpb24gVWludDMyKHZhbHVlLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pIHtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZUludGVnZXIodmFsdWUsIDAsIENPTlNULk1BWF9VSU5UMzIsIGZyb20sIHRvLCA0KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5zZXJ0SW50ZWdlclRvQnl0ZUFycmF5KHZhbHVlLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pO1xuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbHQtaW4gZGF0YSB0eXBlXG4gICAgICogQHBhcmFtIHtOdW1iZXIgfHwgU3RyaW5nfSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBmcm9tXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRvXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBsaXR0bGVFbmRpYW5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBVaW50NjQodmFsdWUsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbikge1xuICAgICAgICB2YXIgdmFsID0gdmFsaWRhdGVCaWdJbnRlZ2VyKHZhbHVlLCAwLCBDT05TVC5NQVhfVUlOVDY0LCBmcm9tLCB0bywgOCk7XG5cbiAgICAgICAgaWYgKHZhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICghYmlnSW50LmlzSW5zdGFuY2UodmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5zZXJ0QmlnSW50ZWdlclRvQnl0ZUFycmF5KHZhbCwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKTtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWx0LWluIGRhdGEgdHlwZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmdcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU3RyaW5nKHN0cmluZywgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgZGF0YSB0eXBlIGlzIHBhc3NlZCBhcyBTdHJpbmcuIFN0cmluZyBpcyByZXF1aXJlZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCh0byAtIGZyb20pICE9PSA4KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTdHJpbmcgc2VnbWVudCBpcyBvZiB3cm9uZyBsZW5ndGguIDggYnl0ZXMgbG9uZyBpcyByZXF1aXJlZCB0byBzdG9yZSB0cmFuc21pdHRlZCB2YWx1ZS4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIFVpbnQzMihidWZmZXIubGVuZ3RoLCBidWZmZXIsIGZyb20sIGZyb20gKyA0LCBsaXR0bGVFbmRpYW4pOyAvLyBpbmRleCB3aGVyZSBzdHJpbmcgY29udGVudCBzdGFydHMgaW4gYnVmZmVyXG4gICAgICAgIFVpbnQzMihzdHJpbmcubGVuZ3RoLCBidWZmZXIsIGZyb20gKyA0LCBmcm9tICsgOCwgbGl0dGxlRW5kaWFuKTsgLy8gc3RyaW5nIGxlbmd0aFxuICAgICAgICBpbnNlcnRTdHJpbmdUb0J5dGVBcnJheShzdHJpbmcsIGJ1ZmZlciwgYnVmZmVyLmxlbmd0aCwgYnVmZmVyLmxlbmd0aCArIHN0cmluZy5sZW5ndGggLSAxKTsgLy8gc3RyaW5nIGNvbnRlbnRcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWx0LWluIGRhdGEgdHlwZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoYXNoXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBIYXNoKGhhc2gsIGJ1ZmZlciwgZnJvbSwgdG8pIHtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2goaGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmICgodG8gLSBmcm9tKSAhPT0gMzIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hhc2ggc2VnbWVudCBpcyBvZiB3cm9uZyBsZW5ndGguIDMyIGJ5dGVzIGxvbmcgaXMgcmVxdWlyZWQgdG8gc3RvcmUgdHJhbnNtaXR0ZWQgdmFsdWUuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRIZXhhZGVjaW1hbFRvQXJyYXkoaGFzaCwgYnVmZmVyLCBmcm9tLCB0byk7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZGlnZXN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBEaWdlc3QoZGlnZXN0LCBidWZmZXIsIGZyb20sIHRvKSB7XG4gICAgICAgIGlmICghdmFsaWRhdGVIZXhIYXNoKGRpZ2VzdCwgNjQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoKHRvIC0gZnJvbSkgIT09IDY0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdEaWdlc3Qgc2VnbWVudCBpcyBvZiB3cm9uZyBsZW5ndGguIDY0IGJ5dGVzIGxvbmcgaXMgcmVxdWlyZWQgdG8gc3RvcmUgdHJhbnNtaXR0ZWQgdmFsdWUuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpbnNlcnRIZXhhZGVjaW1hbFRvQXJyYXkoZGlnZXN0LCBidWZmZXIsIGZyb20sIHRvKTtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWx0LWluIGRhdGEgdHlwZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwdWJsaWNLZXlcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIFB1YmxpY0tleShwdWJsaWNLZXksIGJ1ZmZlciwgZnJvbSwgdG8pIHtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2gocHVibGljS2V5KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCh0byAtIGZyb20pICE9PSAzMikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUHVibGljS2V5IHNlZ21lbnQgaXMgb2Ygd3JvbmcgbGVuZ3RoLiAzMiBieXRlcyBsb25nIGlzIHJlcXVpcmVkIHRvIHN0b3JlIHRyYW5zbWl0dGVkIHZhbHVlLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5zZXJ0SGV4YWRlY2ltYWxUb0FycmF5KHB1YmxpY0tleSwgYnVmZmVyLCBmcm9tLCB0byk7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IG5hbm9zZWNvbmRzXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFRpbWVzcGVjKG5hbm9zZWNvbmRzLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pIHtcbiAgICAgICAgdmFyIHZhbCA9IHZhbGlkYXRlQmlnSW50ZWdlcihuYW5vc2Vjb25kcywgMCwgQ09OU1QuTUFYX1VJTlQ2NCwgZnJvbSwgdG8sIDgpO1xuXG4gICAgICAgIGlmICh2YWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoIWJpZ0ludC5pc0luc3RhbmNlKHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydEJpZ0ludGVnZXJUb0J5dGVBcnJheSh2YWwsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbik7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsdC1pbiBkYXRhIHR5cGVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBCb29sKHZhbHVlLCBidWZmZXIsIGZyb20sIHRvKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgZGF0YSB0eXBlIGlzIHBhc3NlZCBhcyBCb29sZWFuLiBCb29sZWFuIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoKHRvIC0gZnJvbSkgIT09IDEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Jvb2wgc2VnbWVudCBpcyBvZiB3cm9uZyBsZW5ndGguIDEgYnl0ZXMgbG9uZyBpcyByZXF1aXJlZCB0byBzdG9yZSB0cmFuc21pdHRlZCB2YWx1ZS4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydEludGVnZXJUb0J5dGVBcnJheSh2YWx1ZSA/IDEgOiAwLCBidWZmZXIsIGZyb20sIHRvKTtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGludGVnZXIgbnVtYmVyIHZhbGlkaXR5XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pblxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGhcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUludGVnZXIodmFsdWUsIG1pbiwgbWF4LCBmcm9tLCB0bywgbGVuZ3RoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyBkYXRhIHR5cGUgaXMgcGFzc2VkIGFzIG51bWJlci4gU2hvdWxkIGJlIG9mIHR5cGUgTnVtYmVyLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlIDwgbWluKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdOdW1iZXIgc2hvdWxkIGJlIG1vcmUgb3IgZXF1YWwgdG8gJyArIG1pbiArICcuJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPiBtYXgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ051bWJlciBzaG91bGQgYmUgbGVzcyBvciBlcXVhbCB0byAnICsgbWF4ICsgJy4nKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICgodG8gLSBmcm9tKSAhPT0gbGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdOdW1iZXIgc2VnbWVudCBpcyBvZiB3cm9uZyBsZW5ndGguICcgKyBsZW5ndGggKyAnIGJ5dGVzIGxvbmcgaXMgcmVxdWlyZWQgdG8gc3RvcmUgdHJhbnNtaXR0ZWQgdmFsdWUuJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBiaXQgaW50ZWdlciBudW1iZXIgdmFsaWRpdHlcbiAgICAgKiBAcGFyYW0ge051bWJlciB8fCBTdHJpbmd9IHZhbHVlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG1pblxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBtYXhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGhcbiAgICAgKiBAcmV0dXJucyB7YmlnSW50IHx8IEJvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVCaWdJbnRlZ2VyKHZhbHVlLCBtaW4sIG1heCwgZnJvbSwgdG8sIGxlbmd0aCkge1xuICAgICAgICB2YXIgdmFsO1xuXG4gICAgICAgIGlmICghKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGRhdGEgdHlwZSBpcyBwYXNzZWQgYXMgbnVtYmVyLiBTaG91bGQgYmUgb2YgdHlwZSBOdW1iZXIgb3IgU3RyaW5nLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKCh0byAtIGZyb20pICE9PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ051bWJlciBzZWdtZW50IGlzIG9mIHdyb25nIGxlbmd0aC4gJyArIGxlbmd0aCArICcgYnl0ZXMgbG9uZyBpcyByZXF1aXJlZCB0byBzdG9yZSB0cmFuc21pdHRlZCB2YWx1ZS4nKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWwgPSBiaWdJbnQodmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAodmFsLmx0KG1pbikpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdOdW1iZXIgc2hvdWxkIGJlIG1vcmUgb3IgZXF1YWwgdG8gJyArIG1pbiArICcuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWwuZ3QobWF4KSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ051bWJlciBzaG91bGQgYmUgbGVzcyBvciBlcXVhbCB0byAnICsgbWF4ICsgJy4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGRhdGEgdHlwZSBpcyBwYXNzZWQgYXMgbnVtYmVyLiBTaG91bGQgYmUgb2YgdHlwZSBOdW1iZXIgb3IgU3RyaW5nLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaGFzaCB2YWxpZGl0eVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBoYXNoXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGJ5dGVzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVIZXhIYXNoKGhhc2gsIGJ5dGVzKSB7XG4gICAgICAgIHZhciBieXRlcyA9IGJ5dGVzIHx8IDMyO1xuXG4gICAgICAgIGlmICh0eXBlb2YgaGFzaCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGRhdGEgdHlwZSBpcyBwYXNzZWQgYXMgaGV4YWRlY2ltYWwgc3RyaW5nLiBTdHJpbmcgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChoYXNoLmxlbmd0aCAhPT0gYnl0ZXMgKiAyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIZXhhZGVjaW1hbCBzdHJpbmcgaXMgb2Ygd3JvbmcgbGVuZ3RoLiAnICsgYnl0ZXMgKiAyICsgJyBjaGFyIHN5bWJvbHMgbG9uZyBpcyByZXF1aXJlZC4gJyArIGhhc2gubGVuZ3RoICsgJyBpcyBwYXNzZWQuJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gaGFzaC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKGlzTmFOKHBhcnNlSW50KGhhc2hbaV0sIDE2KSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHN5bWJvbCBpbiBoZXhhZGVjaW1hbCBzdHJpbmcuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgYXJyYXkgb2YgOC1iaXQgaW50ZWdlcnMgdmFsaWRpdHlcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhcnJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gYnl0ZXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUJ5dGVzQXJyYXkoYXJyLCBieXRlcykge1xuICAgICAgICBpZiAoYnl0ZXMgJiYgYXJyLmxlbmd0aCAhPT0gYnl0ZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FycmF5IG9mIDgtYml0IGludGVnZXJzIHZhbGlkaXR5IGlzIG9mIHdyb25nIGxlbmd0aC4gJyArIGJ5dGVzICogMiArICcgY2hhciBzeW1ib2xzIGxvbmcgaXMgcmVxdWlyZWQuICcgKyBoYXNoLmxlbmd0aCArICcgaXMgcGFzc2VkLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcnJbaV0gIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgZGF0YSB0eXBlIGlzIHBhc3NlZCBhcyBieXRlLiBOdW1iZXIgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFycltpXSA8IDAgfHwgYXJyW2ldID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQnl0ZSBzaG91bGQgYmUgaW4gWzAuLjI1NV0gcmFuZ2UuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgYmluYXJ5IHN0cmluZyB2YWxpZGl0eVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gYml0c1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlQmluYXJ5U3RyaW5nKHN0ciwgYml0cykge1xuICAgICAgICBpZiAodHlwZW9mIGJpdHMgIT09ICd1bmRlZmluZWQnICYmIHN0ci5sZW5ndGggIT09IGJpdHMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0JpbmFyeSBzdHJpbmcgaXMgb2Ygd3JvbmcgbGVuZ3RoLicpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYml0O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYml0ID0gcGFyc2VJbnQoc3RyW2ldKTtcbiAgICAgICAgICAgIGlmIChpc05hTihiaXQpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgYml0IGlzIHBhc3NlZCBpbiBiaW5hcnkgc3RyaW5nLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYml0ID4gMSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGJpdCBpcyBwYXNzZWQgaW4gYmluYXJ5IHN0cmluZy4gQml0IHNob3VsZCBiZSAwIG9yIDEuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VyaWFsaXplIGRhdGEgaW50byBhcnJheSBvZiA4LWJpdCBpbnRlZ2VycyBhbmQgaW5zZXJ0IGludG8gYnVmZmVyXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNoaWZ0IC0gdGhlIGluZGV4IHRvIHN0YXJ0IHdyaXRlIGludG8gYnVmZmVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGFcbiAgICAgKiBAcGFyYW0gdHlwZSAtIGNhbiBiZSB7TmV3VHlwZX0gb3Igb25lIG9mIGJ1aWx0LWluIHR5cGVzXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2VyaWFsaXplKGJ1ZmZlciwgc2hpZnQsIGRhdGEsIHR5cGUpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHR5cGUuc2l6ZTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBidWZmZXJbc2hpZnQgKyBpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBmaWVsZE5hbWUgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKCFkYXRhLmhhc093blByb3BlcnR5KGZpZWxkTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpZWxkVHlwZSA9IHR5cGUuZmllbGRzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZmllbGRUeXBlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZmllbGROYW1lICsgJyBmaWVsZCB3YXMgbm90IGZvdW5kIGluIGNvbmZpZ3VyYXRpb24gb2YgdHlwZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaWVsZERhdGEgPSBkYXRhW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHNoaWZ0ICsgZmllbGRUeXBlLmZyb207XG5cbiAgICAgICAgICAgIGlmIChmaWVsZFR5cGUudHlwZSBpbnN0YW5jZW9mIE5ld1R5cGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXNGaXhlZCA9IChmdW5jdGlvbiBjaGVja0lmSXNGaXhlZChmaWVsZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgZmllbGROYW1lIGluIGZpZWxkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWVsZHMuaGFzT3duUHJvcGVydHkoZmllbGROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGRzW2ZpZWxkTmFtZV0udHlwZSBpbnN0YW5jZW9mIE5ld1R5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja0lmSXNGaXhlZChmaWVsZHNbZmllbGROYW1lXS50eXBlLmZpZWxkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkc1tmaWVsZE5hbWVdLnR5cGUgPT09IFN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9KShmaWVsZFR5cGUudHlwZS5maWVsZHMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzRml4ZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VyaWFsaXplKGJ1ZmZlciwgZnJvbSwgZmllbGREYXRhLCBmaWVsZFR5cGUudHlwZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVuZCA9IGJ1ZmZlci5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIFVpbnQzMihlbmQsIGJ1ZmZlciwgZnJvbSwgZnJvbSArIDQpO1xuICAgICAgICAgICAgICAgICAgICBzZXJpYWxpemUoYnVmZmVyLCBlbmQsIGZpZWxkRGF0YSwgZmllbGRUeXBlLnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBVaW50MzIoYnVmZmVyLmxlbmd0aCAtIGVuZCwgYnVmZmVyLCBmcm9tICsgNCwgZnJvbSArIDgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gZmllbGRUeXBlLnR5cGUoZmllbGREYXRhLCBidWZmZXIsIGZyb20sIHNoaWZ0ICsgZmllbGRUeXBlLnRvLCB0eXBlLmxpdHRsZUVuZGlhbik7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBidWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgaGV4YWRlY2ltYWwgaW50byBhcnJheSBvZiA4LWJpdCBpbnRlZ2VycyBhbmQgaW5zZXJ0IGludG8gYnVmZmVyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBmcm9tXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRvXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5zZXJ0SGV4YWRlY2ltYWxUb0FycmF5KHN0ciwgYnVmZmVyLCBmcm9tLCB0bykge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3RyLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgICAgICAgICBidWZmZXJbZnJvbV0gPSBwYXJzZUludChzdHIuc3Vic3RyKGksIDIpLCAxNik7XG4gICAgICAgICAgICBmcm9tKys7XG5cbiAgICAgICAgICAgIGlmIChmcm9tID4gdG8pIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgaW50ZWdlciBpbnRvIGFycmF5IG9mIDgtYml0IGludGVnZXJzIGFuZCBpbnNlcnQgaW50byBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbnVtYmVyXG4gICAgICogQHBhcmFtIHtBcnJheX0gYnVmZmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGZyb21cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gdG9cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGxpdHRsZUVuZGlhblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluc2VydEludGVnZXJUb0J5dGVBcnJheShudW1iZXIsIGJ1ZmZlciwgZnJvbSwgdG8sIGxpdHRsZUVuZGlhbikge1xuICAgICAgICB2YXIgc3RyID0gbnVtYmVyLnRvU3RyaW5nKDE2KTtcblxuICAgICAgICBpbnNlcnROdW1iZXJJbkhleFRvQnl0ZUFycmF5KHN0ciwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGJpZyBpbnRlZ2VyIGludG8gYXJyYXkgb2YgOC1iaXQgaW50ZWdlcnMgYW5kIGluc2VydCBpbnRvIGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7YmlnSW50fSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gbGl0dGxlRW5kaWFuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5zZXJ0QmlnSW50ZWdlclRvQnl0ZUFycmF5KG51bWJlciwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIHZhciBzdHIgPSBudW1iZXIudG9TdHJpbmcoMTYpO1xuXG4gICAgICAgIGluc2VydE51bWJlckluSGV4VG9CeXRlQXJyYXkoc3RyLCBidWZmZXIsIGZyb20sIHRvLCBsaXR0bGVFbmRpYW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluc2VydCBudW1iZXIgaW4gaGV4IGludG8gYnVmZmVyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG51bWJlclxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBmcm9tXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHRvXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBsaXR0bGVFbmRpYW5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpbnNlcnROdW1iZXJJbkhleFRvQnl0ZUFycmF5KG51bWJlciwgYnVmZmVyLCBmcm9tLCB0bywgbGl0dGxlRW5kaWFuKSB7XG4gICAgICAgIGlmIChsaXR0bGVFbmRpYW4gPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIHN0b3JlIE51bWJlciBhcyBsaXR0bGUtZW5kaWFuXG4gICAgICAgICAgICBpZiAobnVtYmVyLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgICAgICBidWZmZXJbZnJvbV0gPSBwYXJzZUludChudW1iZXIsIDE2KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IG51bWJlci5sZW5ndGg7IGkgPiAwOyBpIC09IDIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyW2Zyb21dID0gcGFyc2VJbnQobnVtYmVyLnN1YnN0cihpIC0gMiwgMiksIDE2KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJbZnJvbV0gPSBwYXJzZUludChudW1iZXIuc3Vic3RyKDAsIDEpLCAxNik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnJvbSsrO1xuXG4gICAgICAgICAgICAgICAgaWYgKGZyb20gPj0gdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3RvcmUgTnVtYmVyIGFzIGJpZy1lbmRpYW5cbiAgICAgICAgICAgIGlmIChudW1iZXIubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlclt0byAtIDFdID0gcGFyc2VJbnQobnVtYmVyLCAxNik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBudW1iZXIubGVuZ3RoOyBpID4gMDsgaSAtPSAyKSB7XG4gICAgICAgICAgICAgICAgdG8tLTtcblxuICAgICAgICAgICAgICAgIGlmIChpID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJbdG9dID0gcGFyc2VJbnQobnVtYmVyLnN1YnN0cihpIC0gMiwgMiksIDE2KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJbdG9dID0gcGFyc2VJbnQobnVtYmVyLnN1YnN0cigwLCAxKSwgMTYpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0byA8PSBmcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgU3RyaW5nIGludG8gYXJyYXkgb2YgOC1iaXQgaW50ZWdlcnMgYW5kIGluc2VydCBpbnRvIGJ1ZmZlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZnJvbVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0b1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGluc2VydFN0cmluZ1RvQnl0ZUFycmF5KHN0ciwgYnVmZmVyLCBmcm9tLCB0bykge1xuICAgICAgICB2YXIgc3RyQnVmZmVyID0gc3RyLnNwbGl0KCcnKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHN0ckJ1ZmZlci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgYnVmZmVyW2Zyb21dID0gc3RyW2ldLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICBmcm9tKys7XG5cbiAgICAgICAgICAgIGlmIChmcm9tID4gdG8pIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgaGV4YWRlY2ltYWwgc3RyaW5nIGludG8gYXJyYXkgb2YgOC1iaXQgaW50ZWdlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAgICogIGhleGFkZWNpbWFsXG4gICAgICogQHJldHVybnMge1VpbnQ4QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGV4YWRlY2ltYWxUb1VpbnQ4QXJyYXkoc3RyKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgZGF0YSB0eXBlIG9mIGhleGFkZWNpbWFsIHN0cmluZycpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KFtdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhcnJheSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc3RyLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhcnNlSW50KHN0ci5zdWJzdHIoaSwgMiksIDE2KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgaGV4YWRlY2ltYWwgc3RyaW5nIGludG8gYXJyYXkgb2YgOC1iaXQgaW50ZWdlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICAgICogIGhleGFkZWNpbWFsXG4gICAgICogQHJldHVybnMge1N0cmluZ31cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoZXhhZGVjaW1hbFRvQmluYXJ5U3RyaW5nKHN0cikge1xuICAgICAgICB2YXIgYmluYXJ5U3RyID0gJyc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzdHIubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGJpbmFyeVN0ciArPSBwYXJzZUludChzdHIuc3Vic3RyKGksIDIpLCAxNikudG9TdHJpbmcoMik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpbmFyeVN0cjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGFycmF5IG9mIDgtYml0IGludGVnZXJzIGludG8gaGV4YWRlY2ltYWwgc3RyaW5nXG4gICAgICogQHBhcmFtIHtVaW50OEFycmF5fSB1aW50OGFyclxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gdWludDhBcnJheVRvSGV4YWRlY2ltYWwodWludDhhcnIpIHtcbiAgICAgICAgaWYgKCEodWludDhhcnIgaW5zdGFuY2VvZiBVaW50OEFycmF5KSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3JvbmcgZGF0YSB0eXBlIG9mIGFycmF5IG9mIDgtYml0IGludGVnZXJzJyk7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB1aW50OGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGhleCA9ICh1aW50OGFycltpXSkudG9TdHJpbmcoMTYpO1xuICAgICAgICAgICAgaGV4ID0gKGhleC5sZW5ndGggPT09IDEpID8gJzAnICsgaGV4IDogaGV4O1xuICAgICAgICAgICAgc3RyICs9IGhleDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGJpbmFyeSBzdHJpbmcgaW50byBhcnJheSBvZiA4LWJpdCBpbnRlZ2Vyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBiaW5hcnlTdHJcbiAgICAgKiBAcmV0dXJucyB7VWludDhBcnJheX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBiaW5hcnlTdHJpbmdUb1VpbnQ4QXJyYXkoYmluYXJ5U3RyKSB7XG4gICAgICAgIHZhciBhcnJheSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYmluYXJ5U3RyLmxlbmd0aDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgICAgICAgICBhcnJheS5wdXNoKHBhcnNlSW50KGJpbmFyeVN0ci5zdWJzdHIoaSwgOCksIDIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShhcnJheSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBiaW5hcnkgc3RyaW5nIGludG8gaGV4YWRlY2ltYWwgc3RyaW5nXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGJpbmFyeVN0clxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9IZXhhZGVjaW1hbChiaW5hcnlTdHIpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYmluYXJ5U3RyLmxlbmd0aDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgICAgICAgICB2YXIgaGV4ID0gKHBhcnNlSW50KGJpbmFyeVN0ci5zdWJzdHIoaSwgOCksIDIpKS50b1N0cmluZygxNik7XG4gICAgICAgICAgICBoZXggPSAoaGV4Lmxlbmd0aCA9PT0gMSkgPyAnMCcgKyBoZXggOiBoZXg7XG4gICAgICAgICAgICBzdHIgKz0gaGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGVsZW1lbnQgaXMgb2YgdHlwZSB7T2JqZWN0fVxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIG9iaiAhPT0gbnVsbCAmJiAhKG9iaiBpbnN0YW5jZW9mIERhdGUpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbGVuZ3RoIG9mIG9iamVjdFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE9iamVjdExlbmd0aChvYmopIHtcbiAgICAgICAgdmFyIGwgPSAwO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgICAgICAgIGwrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0hBMjU2IGhhc2hcbiAgICAgKiBNZXRob2Qgd2l0aCBvdmVybG9hZGluZy4gQWNjZXB0IHR3byBjb21iaW5hdGlvbnMgb2YgYXJndW1lbnRzOlxuICAgICAqIDEpIHtPYmplY3R9IGRhdGEsIHtOZXdUeXBlfSB0eXBlXG4gICAgICogMikge0FycmF5fSBidWZmZXJcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzaChkYXRhLCB0eXBlKSB7XG4gICAgICAgIHZhciBidWZmZXI7XG4gICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgTmV3VHlwZSkge1xuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gdHlwZS5zZXJpYWxpemUoZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBidWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgZGF0YSBwYXJhbWV0ZXIuIEluc3RhbmNlIG9mIE5ld1R5cGUgaXMgZXhwZWN0ZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIHR5cGUgb2YgZGF0YS4gU2hvdWxkIGJlIG9iamVjdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIE5ld01lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHR5cGUuc2VyaWFsaXplKGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGEgcGFyYW1ldGVyLiBJbnN0YW5jZSBvZiBOZXdNZXNzYWdlIGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyB0eXBlIG9mIGRhdGEuIFNob3VsZCBiZSBvYmplY3QuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgICAgICBidWZmZXIgPSBkYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCB0eXBlIHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzaGEoJ3NoYTI1NicpLnVwZGF0ZShidWZmZXIsICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgRUQyNTUxOSBzaWduYXR1cmVcbiAgICAgKiBNZXRob2Qgd2l0aCBvdmVybG9hZGluZy4gQWNjZXB0IHR3byBjb21iaW5hdGlvbnMgb2YgYXJndW1lbnRzOlxuICAgICAqIDEpIHtPYmplY3R9IGRhdGEsIHtOZXdUeXBlIHx8IE5ld01lc3NhZ2V9IHR5cGUsIHtTdHJpbmd9IHNlY3JldEtleVxuICAgICAqIDIpIHtBcnJheX0gYnVmZmVyLCB7U3RyaW5nfSBzZWNyZXRLZXlcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2lnbihkYXRhLCB0eXBlLCBzZWNyZXRLZXkpIHtcbiAgICAgICAgdmFyIGJ1ZmZlcjtcbiAgICAgICAgdmFyIHNlY3JldEtleSA9IHNlY3JldEtleTtcbiAgICAgICAgdmFyIHNpZ25hdHVyZTtcblxuICAgICAgICBpZiAodHlwZW9mIHNlY3JldEtleSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgTmV3VHlwZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHR5cGUuc2VyaWFsaXplKGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGEgcGFyYW1ldGVyLiBJbnN0YW5jZSBvZiBOZXdUeXBlIGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgTmV3TWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHR5cGUuc2VyaWFsaXplKGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGEgcGFyYW1ldGVyLiBJbnN0YW5jZSBvZiBOZXdNZXNzYWdlIGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHR5cGUgcGFyYW1ldGVyLicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghdmFsaWRhdGVCeXRlc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBkYXRhIHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJ1ZmZlciA9IGRhdGE7XG4gICAgICAgICAgICBzZWNyZXRLZXkgPSB0eXBlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2goc2VjcmV0S2V5LCA2NCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgc2VjcmV0S2V5IHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIHNlY3JldEtleSA9IGhleGFkZWNpbWFsVG9VaW50OEFycmF5KHNlY3JldEtleSk7XG4gICAgICAgIHNpZ25hdHVyZSA9IG5hY2wuc2lnbi5kZXRhY2hlZChidWZmZXIsIHNlY3JldEtleSk7XG5cbiAgICAgICAgcmV0dXJuIHVpbnQ4QXJyYXlUb0hleGFkZWNpbWFsKHNpZ25hdHVyZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVmVyaWZpZXMgRUQyNTUxOSBzaWduYXR1cmVcbiAgICAgKiBNZXRob2Qgd2l0aCBvdmVybG9hZGluZy4gQWNjZXB0IHR3byBjb21iaW5hdGlvbnMgb2YgYXJndW1lbnRzOlxuICAgICAqIDEpIHtPYmplY3R9IGRhdGEsIHtOZXdUeXBlIHx8IE5ld01lc3NhZ2V9IHR5cGUsIHtTdHJpbmd9IHNpZ25hdHVyZSwge1N0cmluZ30gcHVibGljS2V5XG4gICAgICogMikge0FycmF5fSBidWZmZXIsIHtTdHJpbmd9IHNpZ25hdHVyZSwge1N0cmluZ30gcHVibGljS2V5XG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB2ZXJpZnlTaWduYXR1cmUoZGF0YSwgdHlwZSwgc2lnbmF0dXJlLCBwdWJsaWNLZXkpIHtcbiAgICAgICAgdmFyIGJ1ZmZlcjtcbiAgICAgICAgdmFyIHNpZ25hdHVyZSA9IHNpZ25hdHVyZTtcbiAgICAgICAgdmFyIHB1YmxpY0tleSA9IHB1YmxpY0tleTtcblxuICAgICAgICBpZiAodHlwZW9mIHB1YmxpY0tleSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgTmV3VHlwZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHR5cGUuc2VyaWFsaXplKGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGEgcGFyYW1ldGVyLiBJbnN0YW5jZSBvZiBOZXdUeXBlIGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgTmV3TWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHR5cGUuc2VyaWFsaXplKGRhdGEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnVmZmVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGRhdGEgcGFyYW1ldGVyLiBJbnN0YW5jZSBvZiBOZXdNZXNzYWdlIGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHR5cGUgcGFyYW1ldGVyLicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghdmFsaWRhdGVCeXRlc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBkYXRhIHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJ1ZmZlciA9IGRhdGE7XG4gICAgICAgICAgICBwdWJsaWNLZXkgPSBzaWduYXR1cmU7XG4gICAgICAgICAgICBzaWduYXR1cmUgPSB0eXBlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2gocHVibGljS2V5KSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBwdWJsaWNLZXkgcGFyYW1ldGVyLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKCF2YWxpZGF0ZUhleEhhc2goc2lnbmF0dXJlLCA2NCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgc2lnbmF0dXJlIHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgICAgIHNpZ25hdHVyZSA9IGhleGFkZWNpbWFsVG9VaW50OEFycmF5KHNpZ25hdHVyZSk7XG4gICAgICAgIHB1YmxpY0tleSA9IGhleGFkZWNpbWFsVG9VaW50OEFycmF5KHB1YmxpY0tleSk7XG5cbiAgICAgICAgcmV0dXJuIG5hY2wuc2lnbi5kZXRhY2hlZC52ZXJpZnkoYnVmZmVyLCBzaWduYXR1cmUsIHB1YmxpY0tleSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgTWVya2xlIHRyZWUgcHJvb2YgYW5kIHJldHVybiBhcnJheSBvZiBlbGVtZW50c1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByb290SGFzaFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm9vZk5vZGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByYW5nZVxuICAgICAqIEBwYXJhbSB7TmV3VHlwZX0gdHlwZSAob3B0aW9uYWwpXG4gICAgICogQHJldHVybiB7QXJyYXl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gbWVya2xlUHJvb2Yocm9vdEhhc2gsIGNvdW50LCBwcm9vZk5vZGUsIHJhbmdlLCB0eXBlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgdmFsdWUgZnJvbSBub2RlLCBpbnNlcnQgaW50byBlbGVtZW50cyBhcnJheSBhbmQgcmV0dXJuIGl0cyBoYXNoXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aFxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICAgICAgICogQHJldHVybnMge1N0cmluZ31cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldE5vZGVWYWx1ZShkYXRhLCBkZXB0aCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBlbGVtZW50O1xuICAgICAgICAgICAgdmFyIGJ1ZmZlcjtcbiAgICAgICAgICAgIHZhciBlbGVtZW50c0hhc2g7XG5cbiAgICAgICAgICAgIGlmICgoZGVwdGggKyAxKSAhPT0gaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVmFsdWUgbm9kZSBpcyBvbiB3cm9uZyBoZWlnaHQgaW4gdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCBzdGFydCB8fCBpbmRleCA+IGVuZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGluZGV4IG9mIHZhbHVlIG5vZGUuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKChzdGFydCArIGVsZW1lbnRzLmxlbmd0aCkgIT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVmFsdWUgbm9kZSBpcyBvbiB3cm9uZyBwb3NpdGlvbiBpbiB0cmVlLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHR5cGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRlQnl0ZXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGRhdGEuc2xpY2UoMCk7IC8vIGNsb25lIGFycmF5IG9mIDgtYml0IGludGVnZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBhcnJheSBvZiA4LWJpdCBpbnRlZ2VycyBpbiB0cmVlLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHZhbHVlIG9mIHR5cGUgcGFyYW1ldGVyLiBBcnJheSBvZiA4LWJpdCBpbnRlZ2VycyBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChOZXdUeXBlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBvYmplY3RBc3NpZ24oZGF0YSk7IC8vIGRlZXAgY29weVxuICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0eXBlLnNlcmlhbGl6ZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBidWZmZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgdmFsdWUgbm9kZSBpbiB0cmVlLiBPYmplY3QgZXhwZWN0ZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHR5cGUgb2YgdHlwZSBwYXJhbWV0ZXIuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cbiAgICAgICAgICAgIGVsZW1lbnRzSGFzaCA9IGhhc2goYnVmZmVyKTtcblxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRzSGFzaCB8fCBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlY3Vyc2l2ZSB0cmVlIHRyYXZlcnNhbCBmdW5jdGlvblxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gZGVwdGhcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gICAgICAgICAqIEByZXR1cm5zIHtudWxsfVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gcmVjdXJzaXZlKG5vZGUsIGRlcHRoLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIGhhc2hMZWZ0O1xuICAgICAgICAgICAgdmFyIGhhc2hSaWdodDtcbiAgICAgICAgICAgIHZhciBzdW1taW5nQnVmZmVyO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUubGVmdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUubGVmdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2gobm9kZS5sZWZ0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaGFzaExlZnQgPSBub2RlLmxlZnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChub2RlLmxlZnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5sZWZ0LnZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc2hMZWZ0ID0gZ2V0Tm9kZVZhbHVlKG5vZGUubGVmdC52YWwsIGRlcHRoLCBpbmRleCAqIDIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzaExlZnQgPSByZWN1cnNpdmUobm9kZS5sZWZ0LCBkZXB0aCArIDEsIGluZGV4ICogMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc2hMZWZ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgdHlwZSBvZiBsZWZ0IG5vZGUuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTGVmdCBub2RlIGlzIG1pc3NlZC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcm9vdEJyYW5jaCA9ICdyaWdodCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZS5yaWdodCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUucmlnaHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsaWRhdGVIZXhIYXNoKG5vZGUucmlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBoYXNoUmlnaHQgPSBub2RlLnJpZ2h0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qobm9kZS5yaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlLnJpZ2h0LnZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc2hSaWdodCA9IGdldE5vZGVWYWx1ZShub2RlLnJpZ2h0LnZhbCwgZGVwdGgsIGluZGV4ICogMiArIDEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzaFJpZ2h0ID0gcmVjdXJzaXZlKG5vZGUucmlnaHQsIGRlcHRoICsgMSwgaW5kZXggKiAyICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc2hSaWdodCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHR5cGUgb2YgcmlnaHQgbm9kZS4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc3VtbWluZ0J1ZmZlciA9IG5ldyBVaW50OEFycmF5KDY0KTtcbiAgICAgICAgICAgICAgICBzdW1taW5nQnVmZmVyLnNldChoZXhhZGVjaW1hbFRvVWludDhBcnJheShoYXNoTGVmdCkpO1xuICAgICAgICAgICAgICAgIHN1bW1pbmdCdWZmZXIuc2V0KGhleGFkZWNpbWFsVG9VaW50OEFycmF5KGhhc2hSaWdodCksIDMyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVwdGggPT09IDAgfHwgcm9vdEJyYW5jaCA9PT0gJ2xlZnQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignUmlnaHQgbGVhZiBpcyBtaXNzZWQgaW4gbGVmdCBicmFuY2ggb2YgdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VtbWluZ0J1ZmZlciA9IGhleGFkZWNpbWFsVG9VaW50OEFycmF5KGhhc2hMZWZ0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGhhc2goc3VtbWluZ0J1ZmZlcikgfHwgbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlbGVtZW50cyA9IFtdO1xuICAgICAgICB2YXIgcm9vdEJyYW5jaCA9ICdsZWZ0JztcblxuICAgICAgICAvLyB2YWxpZGF0ZSBwYXJhbWV0ZXJzXG4gICAgICAgIGlmICghdmFsaWRhdGVIZXhIYXNoKHJvb3RIYXNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgY291bnQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHZhbHVlIGlzIHBhc3NlZCBhcyBjb3VudCBwYXJhbWV0ZXIuIE51bWJlciBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzT2JqZWN0KHByb29mTm9kZSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgdHlwZSBvZiBwcm9vZk5vZGUgcGFyYW1ldGVyLiBPYmplY3QgZXhwZWN0ZWQuJyk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKCFBcnJheS5pc0FycmF5KHJhbmdlKSB8fCByYW5nZS5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgdHlwZSBvZiByYW5nZSBwYXJhbWV0ZXIuIEFycmF5IG9mIHR3byBlbGVtZW50cyBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJhbmdlWzBdICE9PSAnbnVtYmVyJyB8fCB0eXBlb2YgcmFuZ2VbMV0gIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHZhbHVlIGlzIHBhc3NlZCBhcyByYW5nZSBwYXJhbWV0ZXIuIE51bWJlciBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmFuZ2VbMF0gPiByYW5nZVsxXSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCByYW5nZSBwYXJhbWV0ZXIuIFN0YXJ0IGluZGV4IGNhblxcJ3QgYmUgb3V0IG9mIHJhbmdlLicpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyYW5nZVswXSA+IChjb3VudCAtIDEpKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaGVpZ2h0ID0gTWF0aC5jZWlsKE1hdGgubG9nMihjb3VudCkpO1xuICAgICAgICB2YXIgc3RhcnQgPSByYW5nZVswXTtcbiAgICAgICAgdmFyIGVuZCA9IChyYW5nZVsxXSA8IGNvdW50KSA/IHJhbmdlWzFdIDogKGNvdW50IC0gMSk7XG4gICAgICAgIHZhciBhY3R1YWxIYXNoID0gcmVjdXJzaXZlKHByb29mTm9kZSwgMCwgMCk7XG5cbiAgICAgICAgaWYgKGFjdHVhbEhhc2ggPT09IG51bGwpIHsgLy8gdHJlZSBpcyBpbnZhbGlkXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKHJvb3RIYXNoLnRvTG93ZXJDYXNlKCkgIT09IGFjdHVhbEhhc2gpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3Jvb3RIYXNoIHBhcmFtZXRlciBpcyBub3QgZXF1YWwgdG8gYWN0dWFsIGhhc2guJyk7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnRzLmxlbmd0aCAhPT0gKChzdGFydCA9PT0gZW5kKSA/IDEgOiAoZW5kIC0gc3RhcnQgKyAxKSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FjdHVhbCBlbGVtZW50cyBpbiB0cmVlIGFtb3VudCBpcyBub3QgZXF1YWwgdG8gcmVxdWVzdGVkLicpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbGVtZW50cztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBNZXJrbGUgUGF0cmljaWEgdHJlZSBwcm9vZiBhbmQgcmV0dXJuIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcm9vdEhhc2hcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvb2ZOb2RlXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqIEBwYXJhbSB7TmV3VHlwZX0gdHlwZSAob3B0aW9uYWwpXG4gICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1lcmtsZVBhdHJpY2lhUHJvb2Yocm9vdEhhc2gsIHByb29mTm9kZSwga2V5LCB0eXBlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgdmFsdWUgZnJvbSBub2RlXG4gICAgICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICAgICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldE5vZGVWYWx1ZShkYXRhKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZGF0ZUJ5dGVzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEuc2xpY2UoMCk7IC8vIGNsb25lIGFycmF5IG9mIDgtYml0IGludGVnZXJzXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RBc3NpZ24oZGF0YSk7IC8vIGRlZXAgY29weVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHZhbHVlIG5vZGUgaW4gdHJlZS4gT2JqZWN0IGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGVpdGhlciBzdWZmaXggaXMgYSBwYXJ0IG9mIHNlYXJjaCBrZXlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHByZWZpeFxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gc3VmZml4XG4gICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gaXNQYXJ0T2ZTZWFyY2hLZXkocHJlZml4LCBzdWZmaXgpIHtcbiAgICAgICAgICAgIHZhciBkaWZmID0ga2V5QmluYXJ5LnN1YnN0cihwcmVmaXgubGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBkaWZmWzBdID09PSBzdWZmaXhbMF07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVjdXJzaXZlIHRyZWUgdHJhdmVyc2FsIGZ1bmN0aW9uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXlQcmVmaXhcbiAgICAgICAgICogQHJldHVybnMge251bGx9XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiByZWN1cnNpdmUobm9kZSwga2V5UHJlZml4KSB7XG4gICAgICAgICAgICBpZiAoZ2V0T2JqZWN0TGVuZ3RoKG5vZGUpICE9PSAyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBudW1iZXIgb2YgY2hpbGRyZW4gaW4gdGhlIHRyZWUgbm9kZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxldmVsRGF0YSA9IHt9O1xuXG4gICAgICAgICAgICBmb3IgKHZhciBrZXlTdWZmaXggaW4gbm9kZSkge1xuICAgICAgICAgICAgICAgIGlmICghbm9kZS5oYXNPd25Qcm9wZXJ0eShrZXlTdWZmaXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRlIGtleVxuICAgICAgICAgICAgICAgIGlmICghdmFsaWRhdGVCaW5hcnlTdHJpbmcoa2V5U3VmZml4KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgYnJhbmNoVmFsdWVIYXNoO1xuICAgICAgICAgICAgICAgIHZhciBmdWxsS2V5ID0ga2V5UHJlZml4ICsga2V5U3VmZml4O1xuICAgICAgICAgICAgICAgIHZhciBub2RlVmFsdWUgPSBub2RlW2tleVN1ZmZpeF07XG4gICAgICAgICAgICAgICAgdmFyIGJyYW5jaFR5cGU7XG4gICAgICAgICAgICAgICAgdmFyIGJyYW5jaEtleTtcbiAgICAgICAgICAgICAgICB2YXIgYnJhbmNoS2V5SGFzaDtcblxuICAgICAgICAgICAgICAgIGlmIChmdWxsS2V5Lmxlbmd0aCA9PT0gQ09OU1QuTUVSS0xFX1BBVFJJQ0lBX0tFWV9MRU5HVEggKiA4KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWxpZGF0ZUhleEhhc2gobm9kZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoVmFsdWVIYXNoID0gbm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoVHlwZSA9ICdoYXNoJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChub2RlVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGVWYWx1ZS52YWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTGVhZiB0cmVlIGNvbnRhaW5zIGludmFsaWQgZGF0YS4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGVsZW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJlZSBjYW4gbm90IGNvbnRhaW5zIG1vcmUgdGhhbiBvbmUgbm9kZSB3aXRoIHZhbHVlLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZ2V0Tm9kZVZhbHVlKG5vZGVWYWx1ZS52YWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoVmFsdWVIYXNoID0gaGFzaChlbGVtZW50LCB0eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYnJhbmNoVmFsdWVIYXNoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoVHlwZSA9ICd2YWx1ZSc7XG4gICAgICAgICAgICAgICAgICAgIH0gIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCB0eXBlIG9mIG5vZGUgaW4gdHJlZSBsZWFmLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBicmFuY2hLZXlIYXNoID0gYmluYXJ5U3RyaW5nVG9IZXhhZGVjaW1hbChmdWxsS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgYnJhbmNoS2V5ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogYnJhbmNoS2V5SGFzaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aDogMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZnVsbEtleS5sZW5ndGggPCBDT05TVC5NRVJLTEVfUEFUUklDSUFfS0VZX0xFTkdUSCAqIDgpIHsgLy8gbm9kZSBpcyBicmFuY2hcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbGlkYXRlSGV4SGFzaChub2RlVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmFuY2hWYWx1ZUhhc2ggPSBub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmFuY2hUeXBlID0gJ2hhc2gnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG5vZGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZVZhbHVlLnZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdOb2RlIHdpdGggdmFsdWUgaXMgYXQgbm9uLWxlYWYgcG9zaXRpb24gaW4gdHJlZS4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgYnJhbmNoVmFsdWVIYXNoID0gcmVjdXJzaXZlKG5vZGVWYWx1ZSwgZnVsbEtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnJhbmNoVmFsdWVIYXNoID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmFuY2hUeXBlID0gJ2JyYW5jaCc7XG4gICAgICAgICAgICAgICAgICAgIH0gIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCB0eXBlIG9mIG5vZGUgaW4gdHJlZS4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmFyeUtleUxlbmd0aCA9IGZ1bGxLZXkubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmluYXJ5S2V5ID0gZnVsbEtleTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IChDT05TVC5NRVJLTEVfUEFUUklDSUFfS0VZX0xFTkdUSCAqIDggLSBmdWxsS2V5Lmxlbmd0aCk7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmluYXJ5S2V5ICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJyYW5jaEtleUhhc2ggPSBiaW5hcnlTdHJpbmdUb0hleGFkZWNpbWFsKGJpbmFyeUtleSk7XG4gICAgICAgICAgICAgICAgICAgIGJyYW5jaEtleSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGJyYW5jaEtleUhhc2gsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IGJpbmFyeUtleUxlbmd0aFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgbGVuZ3RoIG9mIGtleSBpbiB0cmVlLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoa2V5U3VmZml4WzBdID09PSAnMCcpIHsgLy8gJzAnIGF0IHRoZSBiZWdpbm5pbmcgbWVhbnMgbGVmdCBicmFuY2gvbGVhZlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGxldmVsRGF0YS5sZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWxEYXRhLmxlZnQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzaDogYnJhbmNoVmFsdWVIYXNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleTogYnJhbmNoS2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGJyYW5jaFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VmZml4OiBrZXlTdWZmaXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZnVsbEtleS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdMZWZ0IG5vZGUgaXMgZHVwbGljYXRlZCBpbiB0cmVlLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyAnMScgYXQgdGhlIGJlZ2lubmluZyBtZWFucyByaWdodCBicmFuY2gvbGVhZlxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGxldmVsRGF0YS5yaWdodCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVsRGF0YS5yaWdodCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNoOiBicmFuY2hWYWx1ZUhhc2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBicmFuY2hLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYnJhbmNoVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWZmaXg6IGtleVN1ZmZpeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmdWxsS2V5Lmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1JpZ2h0IG5vZGUgaXMgZHVwbGljYXRlZCBpbiB0cmVlLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgobGV2ZWxEYXRhLmxlZnQudHlwZSA9PT0gJ2hhc2gnKSAmJiAobGV2ZWxEYXRhLnJpZ2h0LnR5cGUgPT09ICdoYXNoJykgJiYgKGZ1bGxLZXkubGVuZ3RoIDwgQ09OU1QuTUVSS0xFX1BBVFJJQ0lBX0tFWV9MRU5HVEggKiA4KSkge1xuICAgICAgICAgICAgICAgIGlmIChpc1BhcnRPZlNlYXJjaEtleShrZXlQcmVmaXgsIGxldmVsRGF0YS5sZWZ0LnN1ZmZpeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVHJlZSBpcyBpbnZhbGlkLiBMZWZ0IGtleSBpcyBhIHBhcnQgb2Ygc2VhcmNoIGtleSBidXQgaXRzIGJyYW5jaCBpcyBub3QgZXhwYW5kZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNQYXJ0T2ZTZWFyY2hLZXkoa2V5UHJlZml4LCBsZXZlbERhdGEucmlnaHQuc3VmZml4KSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUcmVlIGlzIGludmFsaWQuIFJpZ2h0IGtleSBpcyBhIHBhcnQgb2Ygc2VhcmNoIGtleSBidXQgaXRzIGJyYW5jaCBpcyBub3QgZXhwYW5kZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGhhc2goe1xuICAgICAgICAgICAgICAgIGxlZnRfaGFzaDogbGV2ZWxEYXRhLmxlZnQuaGFzaCxcbiAgICAgICAgICAgICAgICByaWdodF9oYXNoOiBsZXZlbERhdGEucmlnaHQuaGFzaCxcbiAgICAgICAgICAgICAgICBsZWZ0X2tleTogbGV2ZWxEYXRhLmxlZnQua2V5LFxuICAgICAgICAgICAgICAgIHJpZ2h0X2tleTogbGV2ZWxEYXRhLnJpZ2h0LmtleVxuICAgICAgICAgICAgfSwgQnJhbmNoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlbGVtZW50O1xuXG4gICAgICAgIC8vIHZhbGlkYXRlIHJvb3RIYXNoIHBhcmFtZXRlclxuICAgICAgICBpZiAoIXZhbGlkYXRlSGV4SGFzaChyb290SGFzaCkpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJvb3RIYXNoID0gcm9vdEhhc2gudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAvLyB2YWxpZGF0ZSBwcm9vZk5vZGUgcGFyYW1ldGVyXG4gICAgICAgIGlmICghaXNPYmplY3QocHJvb2ZOb2RlKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCB0eXBlIG9mIHByb29mTm9kZSBwYXJhbWV0ZXIuIE9iamVjdCBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZGF0ZSBrZXkgcGFyYW1ldGVyXG4gICAgICAgIHZhciBrZXkgPSBrZXk7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgICAgIGlmICh2YWxpZGF0ZUJ5dGVzQXJyYXkoa2V5LCBDT05TVC5NRVJLTEVfUEFUUklDSUFfS0VZX0xFTkdUSCkpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSB1aW50OEFycmF5VG9IZXhhZGVjaW1hbChrZXkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRlSGV4SGFzaChrZXksIENPTlNULk1FUktMRV9QQVRSSUNJQV9LRVlfTEVOR1RIKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHR5cGUgb2Yga2V5IHBhcmFtZXRlci4gQWFycmF5IG9mIDgtYml0IGludGVnZXJzIG9yIGhleGFkZWNpbWFsIHN0cmluZyBpcyBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleUJpbmFyeSA9IGhleGFkZWNpbWFsVG9CaW5hcnlTdHJpbmcoa2V5KTtcblxuICAgICAgICB2YXIgcHJvb2ZOb2RlUm9vdE51bWJlck9mTm9kZXMgPSBnZXRPYmplY3RMZW5ndGgocHJvb2ZOb2RlKTtcbiAgICAgICAgaWYgKHByb29mTm9kZVJvb3ROdW1iZXJPZk5vZGVzID09PSAwKSB7XG4gICAgICAgICAgICBpZiAocm9vdEhhc2ggPT09IChuZXcgVWludDhBcnJheShDT05TVC5NRVJLTEVfUEFUUklDSUFfS0VZX0xFTkdUSCAqIDIpKS5qb2luKCcnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHJvb3RIYXNoIHBhcmFtZXRlciBvZiBlbXB0eSB0cmVlLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJvb2ZOb2RlUm9vdE51bWJlck9mTm9kZXMgPT09IDEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJvb2ZOb2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFwcm9vZk5vZGUuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCF2YWxpZGF0ZUJpbmFyeVN0cmluZyhpLCAyNTYpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBwcm9vZk5vZGVbaV07XG4gICAgICAgICAgICAgICAgdmFyIG5vZGVLZXlCdWZmZXIgPSBiaW5hcnlTdHJpbmdUb1VpbnQ4QXJyYXkoaSk7XG4gICAgICAgICAgICAgICAgdmFyIG5vZGVLZXkgPSB1aW50OEFycmF5VG9IZXhhZGVjaW1hbChub2RlS2V5QnVmZmVyKTtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZUhhc2g7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsaWRhdGVIZXhIYXNoKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbm9kZUhhc2ggPSBoYXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBub2RlS2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aDogMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc2g6IGRhdGFcbiAgICAgICAgICAgICAgICAgICAgfSwgUm9vdEJyYW5jaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvb3RIYXNoID09PSBub2RlSGFzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gbm9kZUtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAvLyBlbGVtZW50IHdhcyBub3QgZm91bmQgaW4gdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIGtleSB3aXRoIGhhc2ggaXMgaW4gdGhlIHJvb3Qgb2YgcHJvb2ZOb2RlIHBhcmFtZXRlci4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcigncm9vdEhhc2ggcGFyYW1ldGVyIGlzIG5vdCBlcXVhbCB0byBhY3R1YWwgaGFzaC4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBnZXROb2RlVmFsdWUoZGF0YS52YWwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50c0hhc2ggPSBoYXNoKGVsZW1lbnQsIHR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVsZW1lbnRzSGFzaCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBub2RlSGFzaCA9IGhhc2goe1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6IG5vZGVLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuZ3RoOiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzaDogZWxlbWVudHNIYXNoXG4gICAgICAgICAgICAgICAgICAgIH0sIFJvb3RCcmFuY2gpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyb290SGFzaCA9PT0gbm9kZUhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IG5vZGVLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBrZXkgd2l0aCB2YWx1ZSBpcyBpbiB0aGUgcm9vdCBvZiBwcm9vZk5vZGUgcGFyYW1ldGVyLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ3Jvb3RIYXNoIHBhcmFtZXRlciBpcyBub3QgZXF1YWwgdG8gYWN0dWFsIGhhc2guJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCB0eXBlIG9mIHZhbHVlIGluIHRoZSByb290IG9mIHByb29mTm9kZSBwYXJhbWV0ZXIuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYWN0dWFsSGFzaCA9IHJlY3Vyc2l2ZShwcm9vZk5vZGUsICcnKTtcblxuICAgICAgICAgICAgaWYgKGFjdHVhbEhhc2ggPT09IG51bGwpIHsgLy8gdHJlZSBpcyBpbnZhbGlkXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocm9vdEhhc2ggIT09IGFjdHVhbEhhc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdyb290SGFzaCBwYXJhbWV0ZXIgaXMgbm90IGVxdWFsIHRvIGFjdHVhbCBoYXNoLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50IHx8IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWZXJpZmllcyBibG9ja1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhXG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB2ZXJpZnlCbG9jayhkYXRhKSB7XG4gICAgICAgIGlmICghaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIHR5cGUgb2YgZGF0YSBwYXJhbWV0ZXIuIE9iamVjdCBpcyBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICghaXNPYmplY3QoZGF0YS5ibG9jaykpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIHR5cGUgb2YgYmxvY2sgZmllbGQgaW4gZGF0YSBwYXJhbWV0ZXIuIE9iamVjdCBpcyBleHBlY3RlZC4nKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShkYXRhLnByZWNvbW1pdHMpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyB0eXBlIG9mIHByZWNvbW1pdHMgZmllbGQgaW4gZGF0YSBwYXJhbWV0ZXIuIEFycmF5IGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZhbGlkYXRvcnNUb3RhbE51bWJlciA9IENPTkZJRy52YWxpZGF0b3JzLmxlbmd0aDtcbiAgICAgICAgdmFyIHVuaXF1ZVZhbGlkYXRvcnMgPSBbXTtcblxuICAgICAgICB2YXIgcm91bmQ7XG4gICAgICAgIHZhciBibG9ja0hhc2ggPSBoYXNoKGRhdGEuYmxvY2ssIEJsb2NrKTtcblxuICAgICAgICBmb3IgKHZhciBpIGluIGRhdGEucHJlY29tbWl0cykge1xuICAgICAgICAgICAgaWYgKCFkYXRhLnByZWNvbW1pdHMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHByZWNvbW1pdCA9IGRhdGEucHJlY29tbWl0c1tpXTtcblxuICAgICAgICAgICAgaWYgKCFpc09iamVjdChwcmVjb21taXQuYm9keSkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyB0eXBlIG9mIHByZWNvbW1pdHMgYm9keS4gT2JqZWN0IGlzIGV4cGVjdGVkLicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXZhbGlkYXRlSGV4SGFzaChwcmVjb21taXQuc2lnbmF0dXJlLCA2NCkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyB0eXBlIG9mIHByZWNvbW1pdHMgc2lnbmF0dXJlLiBIZXhhZGVjaW1hbCBvZiA2NCBsZW5ndGggaXMgZXhwZWN0ZWQuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJlY29tbWl0LmJvZHkudmFsaWRhdG9yID49IHZhbGlkYXRvcnNUb3RhbE51bWJlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGluZGV4IHBhc3NlZC4gVmFsaWRhdG9yIGRvZXMgbm90IGV4aXN0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHVuaXF1ZVZhbGlkYXRvcnMuaW5kZXhPZihwcmVjb21taXQuYm9keS52YWxpZGF0b3IpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHVuaXF1ZVZhbGlkYXRvcnMucHVzaChwcmVjb21taXQuYm9keS52YWxpZGF0b3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJlY29tbWl0LmJvZHkuaGVpZ2h0ICE9PSBkYXRhLmJsb2NrLmhlaWdodCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1dyb25nIGhlaWdodCBvZiBibG9jayBpbiBwcmVjb21taXQuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcmVjb21taXQuYm9keS5ibG9ja19oYXNoICE9PSBibG9ja0hhc2gpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdXcm9uZyBoYXNoIG9mIGJsb2NrIGluIHByZWNvbW1pdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygcm91bmQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcm91bmQgPSBwcmVjb21taXQuYm9keS5yb3VuZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJlY29tbWl0LmJvZHkucm91bmQgIT09IHJvdW5kKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3Jvbmcgcm91bmQgaW4gcHJlY29tbWl0LicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHB1YmxpY0tleSA9IENPTkZJRy52YWxpZGF0b3JzW3ByZWNvbW1pdC5ib2R5LnZhbGlkYXRvcl0ucHVibGljS2V5O1xuXG4gICAgICAgICAgICBpZiAoIXZlcmlmeVNpZ25hdHVyZShwcmVjb21taXQuYm9keSwgUHJlY29tbWl0LCBwcmVjb21taXQuc2lnbmF0dXJlLCBwdWJsaWNLZXkpKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignV3Jvbmcgc2lnbmF0dXJlIG9mIHByZWNvbW1pdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodW5pcXVlVmFsaWRhdG9ycy5sZW5ndGggPD0gdmFsaWRhdG9yc1RvdGFsTnVtYmVyICogMiAvIDMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vdCBlbm91Z2ggcHJlY29tbWl0cyBmcm9tIHVuaXF1ZSB2YWxpZGF0b3JzLicpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgICAvLyBBUEkgbWV0aG9kc1xuICAgICAgICBuZXdUeXBlOiBjcmVhdGVOZXdUeXBlLFxuICAgICAgICBuZXdNZXNzYWdlOiBjcmVhdGVOZXdNZXNzYWdlLFxuICAgICAgICBoYXNoOiBoYXNoLFxuICAgICAgICBzaWduOiBzaWduLFxuICAgICAgICB2ZXJpZnlTaWduYXR1cmU6IHZlcmlmeVNpZ25hdHVyZSxcbiAgICAgICAgbWVya2xlUHJvb2Y6IG1lcmtsZVByb29mLFxuICAgICAgICBtZXJrbGVQYXRyaWNpYVByb29mOiBtZXJrbGVQYXRyaWNpYVByb29mLFxuICAgICAgICB2ZXJpZnlCbG9jazogdmVyaWZ5QmxvY2ssXG5cbiAgICAgICAgLy8gYnVpbHQtaW4gdHlwZXNcbiAgICAgICAgSW50ODogSW50OCxcbiAgICAgICAgSW50MTY6IEludDE2LFxuICAgICAgICBJbnQzMjogSW50MzIsXG4gICAgICAgIEludDY0OiBJbnQ2NCxcbiAgICAgICAgVWludDg6IFVpbnQ4LFxuICAgICAgICBVaW50MTY6IFVpbnQxNixcbiAgICAgICAgVWludDMyOiBVaW50MzIsXG4gICAgICAgIFVpbnQ2NDogVWludDY0LFxuICAgICAgICBTdHJpbmc6IFN0cmluZyxcbiAgICAgICAgSGFzaDogSGFzaCxcbiAgICAgICAgRGlnZXN0OiBEaWdlc3QsXG4gICAgICAgIFB1YmxpY0tleTogUHVibGljS2V5LFxuICAgICAgICBUaW1lc3BlYzogVGltZXNwZWMsXG4gICAgICAgIEJvb2w6IEJvb2xcblxuICAgIH07XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGhpbkNsaWVudDtcbiJdfQ==