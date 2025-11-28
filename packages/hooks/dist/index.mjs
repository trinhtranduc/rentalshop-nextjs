// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { getAuthToken, getStoredUser, clearAuthData, storeAuthData } from "@rentalshop/utils";

// ../../node_modules/tslib/tslib.es6.mjs
var extendStatics = function(d3, b2) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d4, b3) {
    d4.__proto__ = b3;
  } || function(d4, b3) {
    for (var p2 in b3)
      if (Object.prototype.hasOwnProperty.call(b3, p2))
        d4[p2] = b3[p2];
  };
  return extendStatics(d3, b2);
};
function __extends(d3, b2) {
  if (typeof b2 !== "function" && b2 !== null)
    throw new TypeError("Class extends value " + String(b2) + " is not a constructor or null");
  extendStatics(d3, b2);
  function __() {
    this.constructor = d3;
  }
  d3.prototype = b2 === null ? Object.create(b2) : (__.prototype = b2.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t3) {
    for (var s2, i2 = 1, n3 = arguments.length; i2 < n3; i2++) {
      s2 = arguments[i2];
      for (var p2 in s2)
        if (Object.prototype.hasOwnProperty.call(s2, p2))
          t3[p2] = s2[p2];
    }
    return t3;
  };
  return __assign.apply(this, arguments);
};
function __rest(s2, e3) {
  var t3 = {};
  for (var p2 in s2)
    if (Object.prototype.hasOwnProperty.call(s2, p2) && e3.indexOf(p2) < 0)
      t3[p2] = s2[p2];
  if (s2 != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i2 = 0, p2 = Object.getOwnPropertySymbols(s2); i2 < p2.length; i2++) {
      if (e3.indexOf(p2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s2, p2[i2]))
        t3[p2[i2]] = s2[p2[i2]];
    }
  return t3;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i2 = 0, l2 = from.length, ar; i2 < l2; i2++) {
      if (ar || !(i2 in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i2);
        ar[i2] = from[i2];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
}

// ../../node_modules/@formatjs/fast-memoize/lib/index.js
function memoize(fn, options) {
  var cache = options && options.cache ? options.cache : cacheDefault;
  var serializer = options && options.serializer ? options.serializer : serializerDefault;
  var strategy = options && options.strategy ? options.strategy : strategyDefault;
  return strategy(fn, {
    cache,
    serializer
  });
}
function isPrimitive(value) {
  return value == null || typeof value === "number" || typeof value === "boolean";
}
function monadic(fn, cache, serializer, arg) {
  var cacheKey = isPrimitive(arg) ? arg : serializer(arg);
  var computedValue = cache.get(cacheKey);
  if (typeof computedValue === "undefined") {
    computedValue = fn.call(this, arg);
    cache.set(cacheKey, computedValue);
  }
  return computedValue;
}
function variadic(fn, cache, serializer) {
  var args = Array.prototype.slice.call(arguments, 3);
  var cacheKey = serializer(args);
  var computedValue = cache.get(cacheKey);
  if (typeof computedValue === "undefined") {
    computedValue = fn.apply(this, args);
    cache.set(cacheKey, computedValue);
  }
  return computedValue;
}
function assemble(fn, context, strategy, cache, serialize) {
  return strategy.bind(context, fn, cache, serialize);
}
function strategyDefault(fn, options) {
  var strategy = fn.length === 1 ? monadic : variadic;
  return assemble(fn, this, strategy, options.cache.create(), options.serializer);
}
function strategyVariadic(fn, options) {
  return assemble(fn, this, variadic, options.cache.create(), options.serializer);
}
function strategyMonadic(fn, options) {
  return assemble(fn, this, monadic, options.cache.create(), options.serializer);
}
var serializerDefault = function() {
  return JSON.stringify(arguments);
};
var ObjectWithoutPrototypeCache = (
  /** @class */
  function() {
    function ObjectWithoutPrototypeCache2() {
      this.cache = /* @__PURE__ */ Object.create(null);
    }
    ObjectWithoutPrototypeCache2.prototype.get = function(key) {
      return this.cache[key];
    };
    ObjectWithoutPrototypeCache2.prototype.set = function(key, value) {
      this.cache[key] = value;
    };
    return ObjectWithoutPrototypeCache2;
  }()
);
var cacheDefault = {
  create: function create() {
    return new ObjectWithoutPrototypeCache();
  }
};
var strategies = {
  variadic: strategyVariadic,
  monadic: strategyMonadic
};

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/error.js
var ErrorKind;
(function(ErrorKind2) {
  ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_CLOSING_BRACE"] = 1] = "EXPECT_ARGUMENT_CLOSING_BRACE";
  ErrorKind2[ErrorKind2["EMPTY_ARGUMENT"] = 2] = "EMPTY_ARGUMENT";
  ErrorKind2[ErrorKind2["MALFORMED_ARGUMENT"] = 3] = "MALFORMED_ARGUMENT";
  ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_TYPE"] = 4] = "EXPECT_ARGUMENT_TYPE";
  ErrorKind2[ErrorKind2["INVALID_ARGUMENT_TYPE"] = 5] = "INVALID_ARGUMENT_TYPE";
  ErrorKind2[ErrorKind2["EXPECT_ARGUMENT_STYLE"] = 6] = "EXPECT_ARGUMENT_STYLE";
  ErrorKind2[ErrorKind2["INVALID_NUMBER_SKELETON"] = 7] = "INVALID_NUMBER_SKELETON";
  ErrorKind2[ErrorKind2["INVALID_DATE_TIME_SKELETON"] = 8] = "INVALID_DATE_TIME_SKELETON";
  ErrorKind2[ErrorKind2["EXPECT_NUMBER_SKELETON"] = 9] = "EXPECT_NUMBER_SKELETON";
  ErrorKind2[ErrorKind2["EXPECT_DATE_TIME_SKELETON"] = 10] = "EXPECT_DATE_TIME_SKELETON";
  ErrorKind2[ErrorKind2["UNCLOSED_QUOTE_IN_ARGUMENT_STYLE"] = 11] = "UNCLOSED_QUOTE_IN_ARGUMENT_STYLE";
  ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_OPTIONS"] = 12] = "EXPECT_SELECT_ARGUMENT_OPTIONS";
  ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE"] = 13] = "EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE";
  ErrorKind2[ErrorKind2["INVALID_PLURAL_ARGUMENT_OFFSET_VALUE"] = 14] = "INVALID_PLURAL_ARGUMENT_OFFSET_VALUE";
  ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_SELECTOR"] = 15] = "EXPECT_SELECT_ARGUMENT_SELECTOR";
  ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_SELECTOR"] = 16] = "EXPECT_PLURAL_ARGUMENT_SELECTOR";
  ErrorKind2[ErrorKind2["EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT"] = 17] = "EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT";
  ErrorKind2[ErrorKind2["EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT"] = 18] = "EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT";
  ErrorKind2[ErrorKind2["INVALID_PLURAL_ARGUMENT_SELECTOR"] = 19] = "INVALID_PLURAL_ARGUMENT_SELECTOR";
  ErrorKind2[ErrorKind2["DUPLICATE_PLURAL_ARGUMENT_SELECTOR"] = 20] = "DUPLICATE_PLURAL_ARGUMENT_SELECTOR";
  ErrorKind2[ErrorKind2["DUPLICATE_SELECT_ARGUMENT_SELECTOR"] = 21] = "DUPLICATE_SELECT_ARGUMENT_SELECTOR";
  ErrorKind2[ErrorKind2["MISSING_OTHER_CLAUSE"] = 22] = "MISSING_OTHER_CLAUSE";
  ErrorKind2[ErrorKind2["INVALID_TAG"] = 23] = "INVALID_TAG";
  ErrorKind2[ErrorKind2["INVALID_TAG_NAME"] = 25] = "INVALID_TAG_NAME";
  ErrorKind2[ErrorKind2["UNMATCHED_CLOSING_TAG"] = 26] = "UNMATCHED_CLOSING_TAG";
  ErrorKind2[ErrorKind2["UNCLOSED_TAG"] = 27] = "UNCLOSED_TAG";
})(ErrorKind || (ErrorKind = {}));

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/types.js
var TYPE;
(function(TYPE2) {
  TYPE2[TYPE2["literal"] = 0] = "literal";
  TYPE2[TYPE2["argument"] = 1] = "argument";
  TYPE2[TYPE2["number"] = 2] = "number";
  TYPE2[TYPE2["date"] = 3] = "date";
  TYPE2[TYPE2["time"] = 4] = "time";
  TYPE2[TYPE2["select"] = 5] = "select";
  TYPE2[TYPE2["plural"] = 6] = "plural";
  TYPE2[TYPE2["pound"] = 7] = "pound";
  TYPE2[TYPE2["tag"] = 8] = "tag";
})(TYPE || (TYPE = {}));
var SKELETON_TYPE;
(function(SKELETON_TYPE2) {
  SKELETON_TYPE2[SKELETON_TYPE2["number"] = 0] = "number";
  SKELETON_TYPE2[SKELETON_TYPE2["dateTime"] = 1] = "dateTime";
})(SKELETON_TYPE || (SKELETON_TYPE = {}));
function isLiteralElement(el) {
  return el.type === TYPE.literal;
}
function isArgumentElement(el) {
  return el.type === TYPE.argument;
}
function isNumberElement(el) {
  return el.type === TYPE.number;
}
function isDateElement(el) {
  return el.type === TYPE.date;
}
function isTimeElement(el) {
  return el.type === TYPE.time;
}
function isSelectElement(el) {
  return el.type === TYPE.select;
}
function isPluralElement(el) {
  return el.type === TYPE.plural;
}
function isPoundElement(el) {
  return el.type === TYPE.pound;
}
function isTagElement(el) {
  return el.type === TYPE.tag;
}
function isNumberSkeleton(el) {
  return !!(el && typeof el === "object" && el.type === SKELETON_TYPE.number);
}
function isDateTimeSkeleton(el) {
  return !!(el && typeof el === "object" && el.type === SKELETON_TYPE.dateTime);
}

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/regex.generated.js
var SPACE_SEPARATOR_REGEX = /[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/;

// ../../node_modules/@formatjs/icu-skeleton-parser/lib/date-time.js
var DATE_TIME_REGEX = /(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;
function parseDateTimeSkeleton(skeleton) {
  var result = {};
  skeleton.replace(DATE_TIME_REGEX, function(match) {
    var len = match.length;
    switch (match[0]) {
      case "G":
        result.era = len === 4 ? "long" : len === 5 ? "narrow" : "short";
        break;
      case "y":
        result.year = len === 2 ? "2-digit" : "numeric";
        break;
      case "Y":
      case "u":
      case "U":
      case "r":
        throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");
      case "q":
      case "Q":
        throw new RangeError("`q/Q` (quarter) patterns are not supported");
      case "M":
      case "L":
        result.month = ["numeric", "2-digit", "short", "long", "narrow"][len - 1];
        break;
      case "w":
      case "W":
        throw new RangeError("`w/W` (week) patterns are not supported");
      case "d":
        result.day = ["numeric", "2-digit"][len - 1];
        break;
      case "D":
      case "F":
      case "g":
        throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");
      case "E":
        result.weekday = len === 4 ? "long" : len === 5 ? "narrow" : "short";
        break;
      case "e":
        if (len < 4) {
          throw new RangeError("`e..eee` (weekday) patterns are not supported");
        }
        result.weekday = ["short", "long", "narrow", "short"][len - 4];
        break;
      case "c":
        if (len < 4) {
          throw new RangeError("`c..ccc` (weekday) patterns are not supported");
        }
        result.weekday = ["short", "long", "narrow", "short"][len - 4];
        break;
      case "a":
        result.hour12 = true;
        break;
      case "b":
      case "B":
        throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");
      case "h":
        result.hourCycle = "h12";
        result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "H":
        result.hourCycle = "h23";
        result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "K":
        result.hourCycle = "h11";
        result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "k":
        result.hourCycle = "h24";
        result.hour = ["numeric", "2-digit"][len - 1];
        break;
      case "j":
      case "J":
      case "C":
        throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");
      case "m":
        result.minute = ["numeric", "2-digit"][len - 1];
        break;
      case "s":
        result.second = ["numeric", "2-digit"][len - 1];
        break;
      case "S":
      case "A":
        throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");
      case "z":
        result.timeZoneName = len < 4 ? "short" : "long";
        break;
      case "Z":
      case "O":
      case "v":
      case "V":
      case "X":
      case "x":
        throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead");
    }
    return "";
  });
  return result;
}

// ../../node_modules/@formatjs/icu-skeleton-parser/lib/regex.generated.js
var WHITE_SPACE_REGEX = /[\t-\r \x85\u200E\u200F\u2028\u2029]/i;

// ../../node_modules/@formatjs/icu-skeleton-parser/lib/number.js
function parseNumberSkeletonFromString(skeleton) {
  if (skeleton.length === 0) {
    throw new Error("Number skeleton cannot be empty");
  }
  var stringTokens = skeleton.split(WHITE_SPACE_REGEX).filter(function(x2) {
    return x2.length > 0;
  });
  var tokens = [];
  for (var _i = 0, stringTokens_1 = stringTokens; _i < stringTokens_1.length; _i++) {
    var stringToken = stringTokens_1[_i];
    var stemAndOptions = stringToken.split("/");
    if (stemAndOptions.length === 0) {
      throw new Error("Invalid number skeleton");
    }
    var stem = stemAndOptions[0], options = stemAndOptions.slice(1);
    for (var _a2 = 0, options_1 = options; _a2 < options_1.length; _a2++) {
      var option = options_1[_a2];
      if (option.length === 0) {
        throw new Error("Invalid number skeleton");
      }
    }
    tokens.push({ stem, options });
  }
  return tokens;
}
function icuUnitToEcma(unit) {
  return unit.replace(/^(.*?)-/, "");
}
var FRACTION_PRECISION_REGEX = /^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g;
var SIGNIFICANT_PRECISION_REGEX = /^(@+)?(\+|#+)?[rs]?$/g;
var INTEGER_WIDTH_REGEX = /(\*)(0+)|(#+)(0+)|(0+)/g;
var CONCISE_INTEGER_WIDTH_REGEX = /^(0+)$/;
function parseSignificantPrecision(str) {
  var result = {};
  if (str[str.length - 1] === "r") {
    result.roundingPriority = "morePrecision";
  } else if (str[str.length - 1] === "s") {
    result.roundingPriority = "lessPrecision";
  }
  str.replace(SIGNIFICANT_PRECISION_REGEX, function(_, g1, g22) {
    if (typeof g22 !== "string") {
      result.minimumSignificantDigits = g1.length;
      result.maximumSignificantDigits = g1.length;
    } else if (g22 === "+") {
      result.minimumSignificantDigits = g1.length;
    } else if (g1[0] === "#") {
      result.maximumSignificantDigits = g1.length;
    } else {
      result.minimumSignificantDigits = g1.length;
      result.maximumSignificantDigits = g1.length + (typeof g22 === "string" ? g22.length : 0);
    }
    return "";
  });
  return result;
}
function parseSign(str) {
  switch (str) {
    case "sign-auto":
      return {
        signDisplay: "auto"
      };
    case "sign-accounting":
    case "()":
      return {
        currencySign: "accounting"
      };
    case "sign-always":
    case "+!":
      return {
        signDisplay: "always"
      };
    case "sign-accounting-always":
    case "()!":
      return {
        signDisplay: "always",
        currencySign: "accounting"
      };
    case "sign-except-zero":
    case "+?":
      return {
        signDisplay: "exceptZero"
      };
    case "sign-accounting-except-zero":
    case "()?":
      return {
        signDisplay: "exceptZero",
        currencySign: "accounting"
      };
    case "sign-never":
    case "+_":
      return {
        signDisplay: "never"
      };
  }
}
function parseConciseScientificAndEngineeringStem(stem) {
  var result;
  if (stem[0] === "E" && stem[1] === "E") {
    result = {
      notation: "engineering"
    };
    stem = stem.slice(2);
  } else if (stem[0] === "E") {
    result = {
      notation: "scientific"
    };
    stem = stem.slice(1);
  }
  if (result) {
    var signDisplay = stem.slice(0, 2);
    if (signDisplay === "+!") {
      result.signDisplay = "always";
      stem = stem.slice(2);
    } else if (signDisplay === "+?") {
      result.signDisplay = "exceptZero";
      stem = stem.slice(2);
    }
    if (!CONCISE_INTEGER_WIDTH_REGEX.test(stem)) {
      throw new Error("Malformed concise eng/scientific notation");
    }
    result.minimumIntegerDigits = stem.length;
  }
  return result;
}
function parseNotationOptions(opt) {
  var result = {};
  var signOpts = parseSign(opt);
  if (signOpts) {
    return signOpts;
  }
  return result;
}
function parseNumberSkeleton(tokens) {
  var result = {};
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    switch (token.stem) {
      case "percent":
      case "%":
        result.style = "percent";
        continue;
      case "%x100":
        result.style = "percent";
        result.scale = 100;
        continue;
      case "currency":
        result.style = "currency";
        result.currency = token.options[0];
        continue;
      case "group-off":
      case ",_":
        result.useGrouping = false;
        continue;
      case "precision-integer":
      case ".":
        result.maximumFractionDigits = 0;
        continue;
      case "measure-unit":
      case "unit":
        result.style = "unit";
        result.unit = icuUnitToEcma(token.options[0]);
        continue;
      case "compact-short":
      case "K":
        result.notation = "compact";
        result.compactDisplay = "short";
        continue;
      case "compact-long":
      case "KK":
        result.notation = "compact";
        result.compactDisplay = "long";
        continue;
      case "scientific":
        result = __assign(__assign(__assign({}, result), { notation: "scientific" }), token.options.reduce(function(all, opt2) {
          return __assign(__assign({}, all), parseNotationOptions(opt2));
        }, {}));
        continue;
      case "engineering":
        result = __assign(__assign(__assign({}, result), { notation: "engineering" }), token.options.reduce(function(all, opt2) {
          return __assign(__assign({}, all), parseNotationOptions(opt2));
        }, {}));
        continue;
      case "notation-simple":
        result.notation = "standard";
        continue;
      case "unit-width-narrow":
        result.currencyDisplay = "narrowSymbol";
        result.unitDisplay = "narrow";
        continue;
      case "unit-width-short":
        result.currencyDisplay = "code";
        result.unitDisplay = "short";
        continue;
      case "unit-width-full-name":
        result.currencyDisplay = "name";
        result.unitDisplay = "long";
        continue;
      case "unit-width-iso-code":
        result.currencyDisplay = "symbol";
        continue;
      case "scale":
        result.scale = parseFloat(token.options[0]);
        continue;
      case "rounding-mode-floor":
        result.roundingMode = "floor";
        continue;
      case "rounding-mode-ceiling":
        result.roundingMode = "ceil";
        continue;
      case "rounding-mode-down":
        result.roundingMode = "trunc";
        continue;
      case "rounding-mode-up":
        result.roundingMode = "expand";
        continue;
      case "rounding-mode-half-even":
        result.roundingMode = "halfEven";
        continue;
      case "rounding-mode-half-down":
        result.roundingMode = "halfTrunc";
        continue;
      case "rounding-mode-half-up":
        result.roundingMode = "halfExpand";
        continue;
      case "integer-width":
        if (token.options.length > 1) {
          throw new RangeError("integer-width stems only accept a single optional option");
        }
        token.options[0].replace(INTEGER_WIDTH_REGEX, function(_, g1, g22, g3, g4, g5) {
          if (g1) {
            result.minimumIntegerDigits = g22.length;
          } else if (g3 && g4) {
            throw new Error("We currently do not support maximum integer digits");
          } else if (g5) {
            throw new Error("We currently do not support exact integer digits");
          }
          return "";
        });
        continue;
    }
    if (CONCISE_INTEGER_WIDTH_REGEX.test(token.stem)) {
      result.minimumIntegerDigits = token.stem.length;
      continue;
    }
    if (FRACTION_PRECISION_REGEX.test(token.stem)) {
      if (token.options.length > 1) {
        throw new RangeError("Fraction-precision stems only accept a single optional option");
      }
      token.stem.replace(FRACTION_PRECISION_REGEX, function(_, g1, g22, g3, g4, g5) {
        if (g22 === "*") {
          result.minimumFractionDigits = g1.length;
        } else if (g3 && g3[0] === "#") {
          result.maximumFractionDigits = g3.length;
        } else if (g4 && g5) {
          result.minimumFractionDigits = g4.length;
          result.maximumFractionDigits = g4.length + g5.length;
        } else {
          result.minimumFractionDigits = g1.length;
          result.maximumFractionDigits = g1.length;
        }
        return "";
      });
      var opt = token.options[0];
      if (opt === "w") {
        result = __assign(__assign({}, result), { trailingZeroDisplay: "stripIfInteger" });
      } else if (opt) {
        result = __assign(__assign({}, result), parseSignificantPrecision(opt));
      }
      continue;
    }
    if (SIGNIFICANT_PRECISION_REGEX.test(token.stem)) {
      result = __assign(__assign({}, result), parseSignificantPrecision(token.stem));
      continue;
    }
    var signOpts = parseSign(token.stem);
    if (signOpts) {
      result = __assign(__assign({}, result), signOpts);
    }
    var conciseScientificAndEngineeringOpts = parseConciseScientificAndEngineeringStem(token.stem);
    if (conciseScientificAndEngineeringOpts) {
      result = __assign(__assign({}, result), conciseScientificAndEngineeringOpts);
    }
  }
  return result;
}

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/time-data.generated.js
var timeData = {
  "001": [
    "H",
    "h"
  ],
  "419": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "AC": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "AD": [
    "H",
    "hB"
  ],
  "AE": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "AF": [
    "H",
    "hb",
    "hB",
    "h"
  ],
  "AG": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "AI": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "AL": [
    "h",
    "H",
    "hB"
  ],
  "AM": [
    "H",
    "hB"
  ],
  "AO": [
    "H",
    "hB"
  ],
  "AR": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "AS": [
    "h",
    "H"
  ],
  "AT": [
    "H",
    "hB"
  ],
  "AU": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "AW": [
    "H",
    "hB"
  ],
  "AX": [
    "H"
  ],
  "AZ": [
    "H",
    "hB",
    "h"
  ],
  "BA": [
    "H",
    "hB",
    "h"
  ],
  "BB": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "BD": [
    "h",
    "hB",
    "H"
  ],
  "BE": [
    "H",
    "hB"
  ],
  "BF": [
    "H",
    "hB"
  ],
  "BG": [
    "H",
    "hB",
    "h"
  ],
  "BH": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "BI": [
    "H",
    "h"
  ],
  "BJ": [
    "H",
    "hB"
  ],
  "BL": [
    "H",
    "hB"
  ],
  "BM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "BN": [
    "hb",
    "hB",
    "h",
    "H"
  ],
  "BO": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "BQ": [
    "H"
  ],
  "BR": [
    "H",
    "hB"
  ],
  "BS": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "BT": [
    "h",
    "H"
  ],
  "BW": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "BY": [
    "H",
    "h"
  ],
  "BZ": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "CA": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "CC": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "CD": [
    "hB",
    "H"
  ],
  "CF": [
    "H",
    "h",
    "hB"
  ],
  "CG": [
    "H",
    "hB"
  ],
  "CH": [
    "H",
    "hB",
    "h"
  ],
  "CI": [
    "H",
    "hB"
  ],
  "CK": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "CL": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "CM": [
    "H",
    "h",
    "hB"
  ],
  "CN": [
    "H",
    "hB",
    "hb",
    "h"
  ],
  "CO": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "CP": [
    "H"
  ],
  "CR": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "CU": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "CV": [
    "H",
    "hB"
  ],
  "CW": [
    "H",
    "hB"
  ],
  "CX": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "CY": [
    "h",
    "H",
    "hb",
    "hB"
  ],
  "CZ": [
    "H"
  ],
  "DE": [
    "H",
    "hB"
  ],
  "DG": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "DJ": [
    "h",
    "H"
  ],
  "DK": [
    "H"
  ],
  "DM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "DO": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "DZ": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "EA": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "EC": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "EE": [
    "H",
    "hB"
  ],
  "EG": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "EH": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "ER": [
    "h",
    "H"
  ],
  "ES": [
    "H",
    "hB",
    "h",
    "hb"
  ],
  "ET": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "FI": [
    "H"
  ],
  "FJ": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "FK": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "FM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "FO": [
    "H",
    "h"
  ],
  "FR": [
    "H",
    "hB"
  ],
  "GA": [
    "H",
    "hB"
  ],
  "GB": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "GD": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "GE": [
    "H",
    "hB",
    "h"
  ],
  "GF": [
    "H",
    "hB"
  ],
  "GG": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "GH": [
    "h",
    "H"
  ],
  "GI": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "GL": [
    "H",
    "h"
  ],
  "GM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "GN": [
    "H",
    "hB"
  ],
  "GP": [
    "H",
    "hB"
  ],
  "GQ": [
    "H",
    "hB",
    "h",
    "hb"
  ],
  "GR": [
    "h",
    "H",
    "hb",
    "hB"
  ],
  "GT": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "GU": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "GW": [
    "H",
    "hB"
  ],
  "GY": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "HK": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "HN": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "HR": [
    "H",
    "hB"
  ],
  "HU": [
    "H",
    "h"
  ],
  "IC": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "ID": [
    "H"
  ],
  "IE": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "IL": [
    "H",
    "hB"
  ],
  "IM": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "IN": [
    "h",
    "H"
  ],
  "IO": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "IQ": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "IR": [
    "hB",
    "H"
  ],
  "IS": [
    "H"
  ],
  "IT": [
    "H",
    "hB"
  ],
  "JE": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "JM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "JO": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "JP": [
    "H",
    "K",
    "h"
  ],
  "KE": [
    "hB",
    "hb",
    "H",
    "h"
  ],
  "KG": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "KH": [
    "hB",
    "h",
    "H",
    "hb"
  ],
  "KI": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "KM": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "KN": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "KP": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "KR": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "KW": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "KY": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "KZ": [
    "H",
    "hB"
  ],
  "LA": [
    "H",
    "hb",
    "hB",
    "h"
  ],
  "LB": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "LC": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "LI": [
    "H",
    "hB",
    "h"
  ],
  "LK": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "LR": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "LS": [
    "h",
    "H"
  ],
  "LT": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "LU": [
    "H",
    "h",
    "hB"
  ],
  "LV": [
    "H",
    "hB",
    "hb",
    "h"
  ],
  "LY": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "MA": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "MC": [
    "H",
    "hB"
  ],
  "MD": [
    "H",
    "hB"
  ],
  "ME": [
    "H",
    "hB",
    "h"
  ],
  "MF": [
    "H",
    "hB"
  ],
  "MG": [
    "H",
    "h"
  ],
  "MH": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "MK": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "ML": [
    "H"
  ],
  "MM": [
    "hB",
    "hb",
    "H",
    "h"
  ],
  "MN": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "MO": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "MP": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "MQ": [
    "H",
    "hB"
  ],
  "MR": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "MS": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "MT": [
    "H",
    "h"
  ],
  "MU": [
    "H",
    "h"
  ],
  "MV": [
    "H",
    "h"
  ],
  "MW": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "MX": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "MY": [
    "hb",
    "hB",
    "h",
    "H"
  ],
  "MZ": [
    "H",
    "hB"
  ],
  "NA": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "NC": [
    "H",
    "hB"
  ],
  "NE": [
    "H"
  ],
  "NF": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "NG": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "NI": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "NL": [
    "H",
    "hB"
  ],
  "NO": [
    "H",
    "h"
  ],
  "NP": [
    "H",
    "h",
    "hB"
  ],
  "NR": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "NU": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "NZ": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "OM": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "PA": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "PE": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "PF": [
    "H",
    "h",
    "hB"
  ],
  "PG": [
    "h",
    "H"
  ],
  "PH": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "PK": [
    "h",
    "hB",
    "H"
  ],
  "PL": [
    "H",
    "h"
  ],
  "PM": [
    "H",
    "hB"
  ],
  "PN": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "PR": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "PS": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "PT": [
    "H",
    "hB"
  ],
  "PW": [
    "h",
    "H"
  ],
  "PY": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "QA": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "RE": [
    "H",
    "hB"
  ],
  "RO": [
    "H",
    "hB"
  ],
  "RS": [
    "H",
    "hB",
    "h"
  ],
  "RU": [
    "H"
  ],
  "RW": [
    "H",
    "h"
  ],
  "SA": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "SB": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "SC": [
    "H",
    "h",
    "hB"
  ],
  "SD": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "SE": [
    "H"
  ],
  "SG": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "SH": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "SI": [
    "H",
    "hB"
  ],
  "SJ": [
    "H"
  ],
  "SK": [
    "H"
  ],
  "SL": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "SM": [
    "H",
    "h",
    "hB"
  ],
  "SN": [
    "H",
    "h",
    "hB"
  ],
  "SO": [
    "h",
    "H"
  ],
  "SR": [
    "H",
    "hB"
  ],
  "SS": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "ST": [
    "H",
    "hB"
  ],
  "SV": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "SX": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "SY": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "SZ": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "TA": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "TC": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "TD": [
    "h",
    "H",
    "hB"
  ],
  "TF": [
    "H",
    "h",
    "hB"
  ],
  "TG": [
    "H",
    "hB"
  ],
  "TH": [
    "H",
    "h"
  ],
  "TJ": [
    "H",
    "h"
  ],
  "TL": [
    "H",
    "hB",
    "hb",
    "h"
  ],
  "TM": [
    "H",
    "h"
  ],
  "TN": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "TO": [
    "h",
    "H"
  ],
  "TR": [
    "H",
    "hB"
  ],
  "TT": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "TW": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "TZ": [
    "hB",
    "hb",
    "H",
    "h"
  ],
  "UA": [
    "H",
    "hB",
    "h"
  ],
  "UG": [
    "hB",
    "hb",
    "H",
    "h"
  ],
  "UM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "US": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "UY": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "UZ": [
    "H",
    "hB",
    "h"
  ],
  "VA": [
    "H",
    "h",
    "hB"
  ],
  "VC": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "VE": [
    "h",
    "H",
    "hB",
    "hb"
  ],
  "VG": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "VI": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "VN": [
    "H",
    "h"
  ],
  "VU": [
    "h",
    "H"
  ],
  "WF": [
    "H",
    "hB"
  ],
  "WS": [
    "h",
    "H"
  ],
  "XK": [
    "H",
    "hB",
    "h"
  ],
  "YE": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "YT": [
    "H",
    "hB"
  ],
  "ZA": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "ZM": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "ZW": [
    "H",
    "h"
  ],
  "af-ZA": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "ar-001": [
    "h",
    "hB",
    "hb",
    "H"
  ],
  "ca-ES": [
    "H",
    "h",
    "hB"
  ],
  "en-001": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-HK": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "en-IL": [
    "H",
    "h",
    "hb",
    "hB"
  ],
  "en-MY": [
    "h",
    "hb",
    "H",
    "hB"
  ],
  "es-BR": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-ES": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "es-GQ": [
    "H",
    "h",
    "hB",
    "hb"
  ],
  "fr-CA": [
    "H",
    "h",
    "hB"
  ],
  "gl-ES": [
    "H",
    "h",
    "hB"
  ],
  "gu-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "hi-IN": [
    "hB",
    "h",
    "H"
  ],
  "it-CH": [
    "H",
    "h",
    "hB"
  ],
  "it-IT": [
    "H",
    "h",
    "hB"
  ],
  "kn-IN": [
    "hB",
    "h",
    "H"
  ],
  "ml-IN": [
    "hB",
    "h",
    "H"
  ],
  "mr-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "pa-IN": [
    "hB",
    "hb",
    "h",
    "H"
  ],
  "ta-IN": [
    "hB",
    "h",
    "hb",
    "H"
  ],
  "te-IN": [
    "hB",
    "h",
    "H"
  ],
  "zu-ZA": [
    "H",
    "hB",
    "hb",
    "h"
  ]
};

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/date-time-pattern-generator.js
function getBestPattern(skeleton, locale) {
  var skeletonCopy = "";
  for (var patternPos = 0; patternPos < skeleton.length; patternPos++) {
    var patternChar = skeleton.charAt(patternPos);
    if (patternChar === "j") {
      var extraLength = 0;
      while (patternPos + 1 < skeleton.length && skeleton.charAt(patternPos + 1) === patternChar) {
        extraLength++;
        patternPos++;
      }
      var hourLen = 1 + (extraLength & 1);
      var dayPeriodLen = extraLength < 2 ? 1 : 3 + (extraLength >> 1);
      var dayPeriodChar = "a";
      var hourChar = getDefaultHourSymbolFromLocale(locale);
      if (hourChar == "H" || hourChar == "k") {
        dayPeriodLen = 0;
      }
      while (dayPeriodLen-- > 0) {
        skeletonCopy += dayPeriodChar;
      }
      while (hourLen-- > 0) {
        skeletonCopy = hourChar + skeletonCopy;
      }
    } else if (patternChar === "J") {
      skeletonCopy += "H";
    } else {
      skeletonCopy += patternChar;
    }
  }
  return skeletonCopy;
}
function getDefaultHourSymbolFromLocale(locale) {
  var hourCycle = locale.hourCycle;
  if (hourCycle === void 0 && // @ts-ignore hourCycle(s) is not identified yet
  locale.hourCycles && // @ts-ignore
  locale.hourCycles.length) {
    hourCycle = locale.hourCycles[0];
  }
  if (hourCycle) {
    switch (hourCycle) {
      case "h24":
        return "k";
      case "h23":
        return "H";
      case "h12":
        return "h";
      case "h11":
        return "K";
      default:
        throw new Error("Invalid hourCycle");
    }
  }
  var languageTag = locale.language;
  var regionTag;
  if (languageTag !== "root") {
    regionTag = locale.maximize().region;
  }
  var hourCycles = timeData[regionTag || ""] || timeData[languageTag || ""] || timeData["".concat(languageTag, "-001")] || timeData["001"];
  return hourCycles[0];
}

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/parser.js
var _a;
var SPACE_SEPARATOR_START_REGEX = new RegExp("^".concat(SPACE_SEPARATOR_REGEX.source, "*"));
var SPACE_SEPARATOR_END_REGEX = new RegExp("".concat(SPACE_SEPARATOR_REGEX.source, "*$"));
function createLocation(start, end) {
  return { start, end };
}
var hasNativeStartsWith = !!String.prototype.startsWith && "_a".startsWith("a", 1);
var hasNativeFromCodePoint = !!String.fromCodePoint;
var hasNativeFromEntries = !!Object.fromEntries;
var hasNativeCodePointAt = !!String.prototype.codePointAt;
var hasTrimStart = !!String.prototype.trimStart;
var hasTrimEnd = !!String.prototype.trimEnd;
var hasNativeIsSafeInteger = !!Number.isSafeInteger;
var isSafeInteger = hasNativeIsSafeInteger ? Number.isSafeInteger : function(n3) {
  return typeof n3 === "number" && isFinite(n3) && Math.floor(n3) === n3 && Math.abs(n3) <= 9007199254740991;
};
var REGEX_SUPPORTS_U_AND_Y = true;
try {
  re = RE("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu");
  REGEX_SUPPORTS_U_AND_Y = ((_a = re.exec("a")) === null || _a === void 0 ? void 0 : _a[0]) === "a";
} catch (_) {
  REGEX_SUPPORTS_U_AND_Y = false;
}
var re;
var startsWith = hasNativeStartsWith ? (
  // Native
  function startsWith2(s2, search, position) {
    return s2.startsWith(search, position);
  }
) : (
  // For IE11
  function startsWith3(s2, search, position) {
    return s2.slice(position, position + search.length) === search;
  }
);
var fromCodePoint = hasNativeFromCodePoint ? String.fromCodePoint : (
  // IE11
  function fromCodePoint2() {
    var codePoints = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      codePoints[_i] = arguments[_i];
    }
    var elements = "";
    var length = codePoints.length;
    var i2 = 0;
    var code;
    while (length > i2) {
      code = codePoints[i2++];
      if (code > 1114111)
        throw RangeError(code + " is not a valid code point");
      elements += code < 65536 ? String.fromCharCode(code) : String.fromCharCode(((code -= 65536) >> 10) + 55296, code % 1024 + 56320);
    }
    return elements;
  }
);
var fromEntries = (
  // native
  hasNativeFromEntries ? Object.fromEntries : (
    // Ponyfill
    function fromEntries2(entries) {
      var obj = {};
      for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var _a2 = entries_1[_i], k = _a2[0], v2 = _a2[1];
        obj[k] = v2;
      }
      return obj;
    }
  )
);
var codePointAt = hasNativeCodePointAt ? (
  // Native
  function codePointAt2(s2, index) {
    return s2.codePointAt(index);
  }
) : (
  // IE 11
  function codePointAt3(s2, index) {
    var size = s2.length;
    if (index < 0 || index >= size) {
      return void 0;
    }
    var first = s2.charCodeAt(index);
    var second;
    return first < 55296 || first > 56319 || index + 1 === size || (second = s2.charCodeAt(index + 1)) < 56320 || second > 57343 ? first : (first - 55296 << 10) + (second - 56320) + 65536;
  }
);
var trimStart = hasTrimStart ? (
  // Native
  function trimStart2(s2) {
    return s2.trimStart();
  }
) : (
  // Ponyfill
  function trimStart3(s2) {
    return s2.replace(SPACE_SEPARATOR_START_REGEX, "");
  }
);
var trimEnd = hasTrimEnd ? (
  // Native
  function trimEnd2(s2) {
    return s2.trimEnd();
  }
) : (
  // Ponyfill
  function trimEnd3(s2) {
    return s2.replace(SPACE_SEPARATOR_END_REGEX, "");
  }
);
function RE(s2, flag) {
  return new RegExp(s2, flag);
}
var matchIdentifierAtIndex;
if (REGEX_SUPPORTS_U_AND_Y) {
  IDENTIFIER_PREFIX_RE_1 = RE("([^\\p{White_Space}\\p{Pattern_Syntax}]*)", "yu");
  matchIdentifierAtIndex = function matchIdentifierAtIndex2(s2, index) {
    var _a2;
    IDENTIFIER_PREFIX_RE_1.lastIndex = index;
    var match = IDENTIFIER_PREFIX_RE_1.exec(s2);
    return (_a2 = match[1]) !== null && _a2 !== void 0 ? _a2 : "";
  };
} else {
  matchIdentifierAtIndex = function matchIdentifierAtIndex2(s2, index) {
    var match = [];
    while (true) {
      var c2 = codePointAt(s2, index);
      if (c2 === void 0 || _isWhiteSpace(c2) || _isPatternSyntax(c2)) {
        break;
      }
      match.push(c2);
      index += c2 >= 65536 ? 2 : 1;
    }
    return fromCodePoint.apply(void 0, match);
  };
}
var IDENTIFIER_PREFIX_RE_1;
var Parser = (
  /** @class */
  function() {
    function Parser2(message, options) {
      if (options === void 0) {
        options = {};
      }
      this.message = message;
      this.position = { offset: 0, line: 1, column: 1 };
      this.ignoreTag = !!options.ignoreTag;
      this.locale = options.locale;
      this.requiresOtherClause = !!options.requiresOtherClause;
      this.shouldParseSkeletons = !!options.shouldParseSkeletons;
    }
    Parser2.prototype.parse = function() {
      if (this.offset() !== 0) {
        throw Error("parser can only be used once");
      }
      return this.parseMessage(0, "", false);
    };
    Parser2.prototype.parseMessage = function(nestingLevel, parentArgType, expectingCloseTag) {
      var elements = [];
      while (!this.isEOF()) {
        var char = this.char();
        if (char === 123) {
          var result = this.parseArgument(nestingLevel, expectingCloseTag);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        } else if (char === 125 && nestingLevel > 0) {
          break;
        } else if (char === 35 && (parentArgType === "plural" || parentArgType === "selectordinal")) {
          var position = this.clonePosition();
          this.bump();
          elements.push({
            type: TYPE.pound,
            location: createLocation(position, this.clonePosition())
          });
        } else if (char === 60 && !this.ignoreTag && this.peek() === 47) {
          if (expectingCloseTag) {
            break;
          } else {
            return this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(this.clonePosition(), this.clonePosition()));
          }
        } else if (char === 60 && !this.ignoreTag && _isAlpha(this.peek() || 0)) {
          var result = this.parseTag(nestingLevel, parentArgType);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        } else {
          var result = this.parseLiteral(nestingLevel, parentArgType);
          if (result.err) {
            return result;
          }
          elements.push(result.val);
        }
      }
      return { val: elements, err: null };
    };
    Parser2.prototype.parseTag = function(nestingLevel, parentArgType) {
      var startPosition = this.clonePosition();
      this.bump();
      var tagName = this.parseTagName();
      this.bumpSpace();
      if (this.bumpIf("/>")) {
        return {
          val: {
            type: TYPE.literal,
            value: "<".concat(tagName, "/>"),
            location: createLocation(startPosition, this.clonePosition())
          },
          err: null
        };
      } else if (this.bumpIf(">")) {
        var childrenResult = this.parseMessage(nestingLevel + 1, parentArgType, true);
        if (childrenResult.err) {
          return childrenResult;
        }
        var children = childrenResult.val;
        var endTagStartPosition = this.clonePosition();
        if (this.bumpIf("</")) {
          if (this.isEOF() || !_isAlpha(this.char())) {
            return this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition()));
          }
          var closingTagNameStartPosition = this.clonePosition();
          var closingTagName = this.parseTagName();
          if (tagName !== closingTagName) {
            return this.error(ErrorKind.UNMATCHED_CLOSING_TAG, createLocation(closingTagNameStartPosition, this.clonePosition()));
          }
          this.bumpSpace();
          if (!this.bumpIf(">")) {
            return this.error(ErrorKind.INVALID_TAG, createLocation(endTagStartPosition, this.clonePosition()));
          }
          return {
            val: {
              type: TYPE.tag,
              value: tagName,
              children,
              location: createLocation(startPosition, this.clonePosition())
            },
            err: null
          };
        } else {
          return this.error(ErrorKind.UNCLOSED_TAG, createLocation(startPosition, this.clonePosition()));
        }
      } else {
        return this.error(ErrorKind.INVALID_TAG, createLocation(startPosition, this.clonePosition()));
      }
    };
    Parser2.prototype.parseTagName = function() {
      var startOffset = this.offset();
      this.bump();
      while (!this.isEOF() && _isPotentialElementNameChar(this.char())) {
        this.bump();
      }
      return this.message.slice(startOffset, this.offset());
    };
    Parser2.prototype.parseLiteral = function(nestingLevel, parentArgType) {
      var start = this.clonePosition();
      var value = "";
      while (true) {
        var parseQuoteResult = this.tryParseQuote(parentArgType);
        if (parseQuoteResult) {
          value += parseQuoteResult;
          continue;
        }
        var parseUnquotedResult = this.tryParseUnquoted(nestingLevel, parentArgType);
        if (parseUnquotedResult) {
          value += parseUnquotedResult;
          continue;
        }
        var parseLeftAngleResult = this.tryParseLeftAngleBracket();
        if (parseLeftAngleResult) {
          value += parseLeftAngleResult;
          continue;
        }
        break;
      }
      var location = createLocation(start, this.clonePosition());
      return {
        val: { type: TYPE.literal, value, location },
        err: null
      };
    };
    Parser2.prototype.tryParseLeftAngleBracket = function() {
      if (!this.isEOF() && this.char() === 60 && (this.ignoreTag || // If at the opening tag or closing tag position, bail.
      !_isAlphaOrSlash(this.peek() || 0))) {
        this.bump();
        return "<";
      }
      return null;
    };
    Parser2.prototype.tryParseQuote = function(parentArgType) {
      if (this.isEOF() || this.char() !== 39) {
        return null;
      }
      switch (this.peek()) {
        case 39:
          this.bump();
          this.bump();
          return "'";
        case 123:
        case 60:
        case 62:
        case 125:
          break;
        case 35:
          if (parentArgType === "plural" || parentArgType === "selectordinal") {
            break;
          }
          return null;
        default:
          return null;
      }
      this.bump();
      var codePoints = [this.char()];
      this.bump();
      while (!this.isEOF()) {
        var ch = this.char();
        if (ch === 39) {
          if (this.peek() === 39) {
            codePoints.push(39);
            this.bump();
          } else {
            this.bump();
            break;
          }
        } else {
          codePoints.push(ch);
        }
        this.bump();
      }
      return fromCodePoint.apply(void 0, codePoints);
    };
    Parser2.prototype.tryParseUnquoted = function(nestingLevel, parentArgType) {
      if (this.isEOF()) {
        return null;
      }
      var ch = this.char();
      if (ch === 60 || ch === 123 || ch === 35 && (parentArgType === "plural" || parentArgType === "selectordinal") || ch === 125 && nestingLevel > 0) {
        return null;
      } else {
        this.bump();
        return fromCodePoint(ch);
      }
    };
    Parser2.prototype.parseArgument = function(nestingLevel, expectingCloseTag) {
      var openingBracePosition = this.clonePosition();
      this.bump();
      this.bumpSpace();
      if (this.isEOF()) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      if (this.char() === 125) {
        this.bump();
        return this.error(ErrorKind.EMPTY_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
      var value = this.parseIdentifierIfPossible().value;
      if (!value) {
        return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
      this.bumpSpace();
      if (this.isEOF()) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      switch (this.char()) {
        case 125: {
          this.bump();
          return {
            val: {
              type: TYPE.argument,
              // value does not include the opening and closing braces.
              value,
              location: createLocation(openingBracePosition, this.clonePosition())
            },
            err: null
          };
        }
        case 44: {
          this.bump();
          this.bumpSpace();
          if (this.isEOF()) {
            return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
          }
          return this.parseArgumentOptions(nestingLevel, expectingCloseTag, value, openingBracePosition);
        }
        default:
          return this.error(ErrorKind.MALFORMED_ARGUMENT, createLocation(openingBracePosition, this.clonePosition()));
      }
    };
    Parser2.prototype.parseIdentifierIfPossible = function() {
      var startingPosition = this.clonePosition();
      var startOffset = this.offset();
      var value = matchIdentifierAtIndex(this.message, startOffset);
      var endOffset = startOffset + value.length;
      this.bumpTo(endOffset);
      var endPosition = this.clonePosition();
      var location = createLocation(startingPosition, endPosition);
      return { value, location };
    };
    Parser2.prototype.parseArgumentOptions = function(nestingLevel, expectingCloseTag, value, openingBracePosition) {
      var _a2;
      var typeStartPosition = this.clonePosition();
      var argType = this.parseIdentifierIfPossible().value;
      var typeEndPosition = this.clonePosition();
      switch (argType) {
        case "":
          return this.error(ErrorKind.EXPECT_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
        case "number":
        case "date":
        case "time": {
          this.bumpSpace();
          var styleAndLocation = null;
          if (this.bumpIf(",")) {
            this.bumpSpace();
            var styleStartPosition = this.clonePosition();
            var result = this.parseSimpleArgStyleIfPossible();
            if (result.err) {
              return result;
            }
            var style = trimEnd(result.val);
            if (style.length === 0) {
              return this.error(ErrorKind.EXPECT_ARGUMENT_STYLE, createLocation(this.clonePosition(), this.clonePosition()));
            }
            var styleLocation = createLocation(styleStartPosition, this.clonePosition());
            styleAndLocation = { style, styleLocation };
          }
          var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err) {
            return argCloseResult;
          }
          var location_1 = createLocation(openingBracePosition, this.clonePosition());
          if (styleAndLocation && startsWith(styleAndLocation === null || styleAndLocation === void 0 ? void 0 : styleAndLocation.style, "::", 0)) {
            var skeleton = trimStart(styleAndLocation.style.slice(2));
            if (argType === "number") {
              var result = this.parseNumberSkeletonFromString(skeleton, styleAndLocation.styleLocation);
              if (result.err) {
                return result;
              }
              return {
                val: { type: TYPE.number, value, location: location_1, style: result.val },
                err: null
              };
            } else {
              if (skeleton.length === 0) {
                return this.error(ErrorKind.EXPECT_DATE_TIME_SKELETON, location_1);
              }
              var dateTimePattern = skeleton;
              if (this.locale) {
                dateTimePattern = getBestPattern(skeleton, this.locale);
              }
              var style = {
                type: SKELETON_TYPE.dateTime,
                pattern: dateTimePattern,
                location: styleAndLocation.styleLocation,
                parsedOptions: this.shouldParseSkeletons ? parseDateTimeSkeleton(dateTimePattern) : {}
              };
              var type = argType === "date" ? TYPE.date : TYPE.time;
              return {
                val: { type, value, location: location_1, style },
                err: null
              };
            }
          }
          return {
            val: {
              type: argType === "number" ? TYPE.number : argType === "date" ? TYPE.date : TYPE.time,
              value,
              location: location_1,
              style: (_a2 = styleAndLocation === null || styleAndLocation === void 0 ? void 0 : styleAndLocation.style) !== null && _a2 !== void 0 ? _a2 : null
            },
            err: null
          };
        }
        case "plural":
        case "selectordinal":
        case "select": {
          var typeEndPosition_1 = this.clonePosition();
          this.bumpSpace();
          if (!this.bumpIf(",")) {
            return this.error(ErrorKind.EXPECT_SELECT_ARGUMENT_OPTIONS, createLocation(typeEndPosition_1, __assign({}, typeEndPosition_1)));
          }
          this.bumpSpace();
          var identifierAndLocation = this.parseIdentifierIfPossible();
          var pluralOffset = 0;
          if (argType !== "select" && identifierAndLocation.value === "offset") {
            if (!this.bumpIf(":")) {
              return this.error(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, createLocation(this.clonePosition(), this.clonePosition()));
            }
            this.bumpSpace();
            var result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE, ErrorKind.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);
            if (result.err) {
              return result;
            }
            this.bumpSpace();
            identifierAndLocation = this.parseIdentifierIfPossible();
            pluralOffset = result.val;
          }
          var optionsResult = this.tryParsePluralOrSelectOptions(nestingLevel, argType, expectingCloseTag, identifierAndLocation);
          if (optionsResult.err) {
            return optionsResult;
          }
          var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
          if (argCloseResult.err) {
            return argCloseResult;
          }
          var location_2 = createLocation(openingBracePosition, this.clonePosition());
          if (argType === "select") {
            return {
              val: {
                type: TYPE.select,
                value,
                options: fromEntries(optionsResult.val),
                location: location_2
              },
              err: null
            };
          } else {
            return {
              val: {
                type: TYPE.plural,
                value,
                options: fromEntries(optionsResult.val),
                offset: pluralOffset,
                pluralType: argType === "plural" ? "cardinal" : "ordinal",
                location: location_2
              },
              err: null
            };
          }
        }
        default:
          return this.error(ErrorKind.INVALID_ARGUMENT_TYPE, createLocation(typeStartPosition, typeEndPosition));
      }
    };
    Parser2.prototype.tryParseArgumentClose = function(openingBracePosition) {
      if (this.isEOF() || this.char() !== 125) {
        return this.error(ErrorKind.EXPECT_ARGUMENT_CLOSING_BRACE, createLocation(openingBracePosition, this.clonePosition()));
      }
      this.bump();
      return { val: true, err: null };
    };
    Parser2.prototype.parseSimpleArgStyleIfPossible = function() {
      var nestedBraces = 0;
      var startPosition = this.clonePosition();
      while (!this.isEOF()) {
        var ch = this.char();
        switch (ch) {
          case 39: {
            this.bump();
            var apostrophePosition = this.clonePosition();
            if (!this.bumpUntil("'")) {
              return this.error(ErrorKind.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE, createLocation(apostrophePosition, this.clonePosition()));
            }
            this.bump();
            break;
          }
          case 123: {
            nestedBraces += 1;
            this.bump();
            break;
          }
          case 125: {
            if (nestedBraces > 0) {
              nestedBraces -= 1;
            } else {
              return {
                val: this.message.slice(startPosition.offset, this.offset()),
                err: null
              };
            }
            break;
          }
          default:
            this.bump();
            break;
        }
      }
      return {
        val: this.message.slice(startPosition.offset, this.offset()),
        err: null
      };
    };
    Parser2.prototype.parseNumberSkeletonFromString = function(skeleton, location) {
      var tokens = [];
      try {
        tokens = parseNumberSkeletonFromString(skeleton);
      } catch (e3) {
        return this.error(ErrorKind.INVALID_NUMBER_SKELETON, location);
      }
      return {
        val: {
          type: SKELETON_TYPE.number,
          tokens,
          location,
          parsedOptions: this.shouldParseSkeletons ? parseNumberSkeleton(tokens) : {}
        },
        err: null
      };
    };
    Parser2.prototype.tryParsePluralOrSelectOptions = function(nestingLevel, parentArgType, expectCloseTag, parsedFirstIdentifier) {
      var _a2;
      var hasOtherClause = false;
      var options = [];
      var parsedSelectors = /* @__PURE__ */ new Set();
      var selector = parsedFirstIdentifier.value, selectorLocation = parsedFirstIdentifier.location;
      while (true) {
        if (selector.length === 0) {
          var startPosition = this.clonePosition();
          if (parentArgType !== "select" && this.bumpIf("=")) {
            var result = this.tryParseDecimalInteger(ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, ErrorKind.INVALID_PLURAL_ARGUMENT_SELECTOR);
            if (result.err) {
              return result;
            }
            selectorLocation = createLocation(startPosition, this.clonePosition());
            selector = this.message.slice(startPosition.offset, this.offset());
          } else {
            break;
          }
        }
        if (parsedSelectors.has(selector)) {
          return this.error(parentArgType === "select" ? ErrorKind.DUPLICATE_SELECT_ARGUMENT_SELECTOR : ErrorKind.DUPLICATE_PLURAL_ARGUMENT_SELECTOR, selectorLocation);
        }
        if (selector === "other") {
          hasOtherClause = true;
        }
        this.bumpSpace();
        var openingBracePosition = this.clonePosition();
        if (!this.bumpIf("{")) {
          return this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT, createLocation(this.clonePosition(), this.clonePosition()));
        }
        var fragmentResult = this.parseMessage(nestingLevel + 1, parentArgType, expectCloseTag);
        if (fragmentResult.err) {
          return fragmentResult;
        }
        var argCloseResult = this.tryParseArgumentClose(openingBracePosition);
        if (argCloseResult.err) {
          return argCloseResult;
        }
        options.push([
          selector,
          {
            value: fragmentResult.val,
            location: createLocation(openingBracePosition, this.clonePosition())
          }
        ]);
        parsedSelectors.add(selector);
        this.bumpSpace();
        _a2 = this.parseIdentifierIfPossible(), selector = _a2.value, selectorLocation = _a2.location;
      }
      if (options.length === 0) {
        return this.error(parentArgType === "select" ? ErrorKind.EXPECT_SELECT_ARGUMENT_SELECTOR : ErrorKind.EXPECT_PLURAL_ARGUMENT_SELECTOR, createLocation(this.clonePosition(), this.clonePosition()));
      }
      if (this.requiresOtherClause && !hasOtherClause) {
        return this.error(ErrorKind.MISSING_OTHER_CLAUSE, createLocation(this.clonePosition(), this.clonePosition()));
      }
      return { val: options, err: null };
    };
    Parser2.prototype.tryParseDecimalInteger = function(expectNumberError, invalidNumberError) {
      var sign = 1;
      var startingPosition = this.clonePosition();
      if (this.bumpIf("+")) {
      } else if (this.bumpIf("-")) {
        sign = -1;
      }
      var hasDigits = false;
      var decimal = 0;
      while (!this.isEOF()) {
        var ch = this.char();
        if (ch >= 48 && ch <= 57) {
          hasDigits = true;
          decimal = decimal * 10 + (ch - 48);
          this.bump();
        } else {
          break;
        }
      }
      var location = createLocation(startingPosition, this.clonePosition());
      if (!hasDigits) {
        return this.error(expectNumberError, location);
      }
      decimal *= sign;
      if (!isSafeInteger(decimal)) {
        return this.error(invalidNumberError, location);
      }
      return { val: decimal, err: null };
    };
    Parser2.prototype.offset = function() {
      return this.position.offset;
    };
    Parser2.prototype.isEOF = function() {
      return this.offset() === this.message.length;
    };
    Parser2.prototype.clonePosition = function() {
      return {
        offset: this.position.offset,
        line: this.position.line,
        column: this.position.column
      };
    };
    Parser2.prototype.char = function() {
      var offset = this.position.offset;
      if (offset >= this.message.length) {
        throw Error("out of bound");
      }
      var code = codePointAt(this.message, offset);
      if (code === void 0) {
        throw Error("Offset ".concat(offset, " is at invalid UTF-16 code unit boundary"));
      }
      return code;
    };
    Parser2.prototype.error = function(kind, location) {
      return {
        val: null,
        err: {
          kind,
          message: this.message,
          location
        }
      };
    };
    Parser2.prototype.bump = function() {
      if (this.isEOF()) {
        return;
      }
      var code = this.char();
      if (code === 10) {
        this.position.line += 1;
        this.position.column = 1;
        this.position.offset += 1;
      } else {
        this.position.column += 1;
        this.position.offset += code < 65536 ? 1 : 2;
      }
    };
    Parser2.prototype.bumpIf = function(prefix) {
      if (startsWith(this.message, prefix, this.offset())) {
        for (var i2 = 0; i2 < prefix.length; i2++) {
          this.bump();
        }
        return true;
      }
      return false;
    };
    Parser2.prototype.bumpUntil = function(pattern) {
      var currentOffset = this.offset();
      var index = this.message.indexOf(pattern, currentOffset);
      if (index >= 0) {
        this.bumpTo(index);
        return true;
      } else {
        this.bumpTo(this.message.length);
        return false;
      }
    };
    Parser2.prototype.bumpTo = function(targetOffset) {
      if (this.offset() > targetOffset) {
        throw Error("targetOffset ".concat(targetOffset, " must be greater than or equal to the current offset ").concat(this.offset()));
      }
      targetOffset = Math.min(targetOffset, this.message.length);
      while (true) {
        var offset = this.offset();
        if (offset === targetOffset) {
          break;
        }
        if (offset > targetOffset) {
          throw Error("targetOffset ".concat(targetOffset, " is at invalid UTF-16 code unit boundary"));
        }
        this.bump();
        if (this.isEOF()) {
          break;
        }
      }
    };
    Parser2.prototype.bumpSpace = function() {
      while (!this.isEOF() && _isWhiteSpace(this.char())) {
        this.bump();
      }
    };
    Parser2.prototype.peek = function() {
      if (this.isEOF()) {
        return null;
      }
      var code = this.char();
      var offset = this.offset();
      var nextCode = this.message.charCodeAt(offset + (code >= 65536 ? 2 : 1));
      return nextCode !== null && nextCode !== void 0 ? nextCode : null;
    };
    return Parser2;
  }()
);
function _isAlpha(codepoint) {
  return codepoint >= 97 && codepoint <= 122 || codepoint >= 65 && codepoint <= 90;
}
function _isAlphaOrSlash(codepoint) {
  return _isAlpha(codepoint) || codepoint === 47;
}
function _isPotentialElementNameChar(c2) {
  return c2 === 45 || c2 === 46 || c2 >= 48 && c2 <= 57 || c2 === 95 || c2 >= 97 && c2 <= 122 || c2 >= 65 && c2 <= 90 || c2 == 183 || c2 >= 192 && c2 <= 214 || c2 >= 216 && c2 <= 246 || c2 >= 248 && c2 <= 893 || c2 >= 895 && c2 <= 8191 || c2 >= 8204 && c2 <= 8205 || c2 >= 8255 && c2 <= 8256 || c2 >= 8304 && c2 <= 8591 || c2 >= 11264 && c2 <= 12271 || c2 >= 12289 && c2 <= 55295 || c2 >= 63744 && c2 <= 64975 || c2 >= 65008 && c2 <= 65533 || c2 >= 65536 && c2 <= 983039;
}
function _isWhiteSpace(c2) {
  return c2 >= 9 && c2 <= 13 || c2 === 32 || c2 === 133 || c2 >= 8206 && c2 <= 8207 || c2 === 8232 || c2 === 8233;
}
function _isPatternSyntax(c2) {
  return c2 >= 33 && c2 <= 35 || c2 === 36 || c2 >= 37 && c2 <= 39 || c2 === 40 || c2 === 41 || c2 === 42 || c2 === 43 || c2 === 44 || c2 === 45 || c2 >= 46 && c2 <= 47 || c2 >= 58 && c2 <= 59 || c2 >= 60 && c2 <= 62 || c2 >= 63 && c2 <= 64 || c2 === 91 || c2 === 92 || c2 === 93 || c2 === 94 || c2 === 96 || c2 === 123 || c2 === 124 || c2 === 125 || c2 === 126 || c2 === 161 || c2 >= 162 && c2 <= 165 || c2 === 166 || c2 === 167 || c2 === 169 || c2 === 171 || c2 === 172 || c2 === 174 || c2 === 176 || c2 === 177 || c2 === 182 || c2 === 187 || c2 === 191 || c2 === 215 || c2 === 247 || c2 >= 8208 && c2 <= 8213 || c2 >= 8214 && c2 <= 8215 || c2 === 8216 || c2 === 8217 || c2 === 8218 || c2 >= 8219 && c2 <= 8220 || c2 === 8221 || c2 === 8222 || c2 === 8223 || c2 >= 8224 && c2 <= 8231 || c2 >= 8240 && c2 <= 8248 || c2 === 8249 || c2 === 8250 || c2 >= 8251 && c2 <= 8254 || c2 >= 8257 && c2 <= 8259 || c2 === 8260 || c2 === 8261 || c2 === 8262 || c2 >= 8263 && c2 <= 8273 || c2 === 8274 || c2 === 8275 || c2 >= 8277 && c2 <= 8286 || c2 >= 8592 && c2 <= 8596 || c2 >= 8597 && c2 <= 8601 || c2 >= 8602 && c2 <= 8603 || c2 >= 8604 && c2 <= 8607 || c2 === 8608 || c2 >= 8609 && c2 <= 8610 || c2 === 8611 || c2 >= 8612 && c2 <= 8613 || c2 === 8614 || c2 >= 8615 && c2 <= 8621 || c2 === 8622 || c2 >= 8623 && c2 <= 8653 || c2 >= 8654 && c2 <= 8655 || c2 >= 8656 && c2 <= 8657 || c2 === 8658 || c2 === 8659 || c2 === 8660 || c2 >= 8661 && c2 <= 8691 || c2 >= 8692 && c2 <= 8959 || c2 >= 8960 && c2 <= 8967 || c2 === 8968 || c2 === 8969 || c2 === 8970 || c2 === 8971 || c2 >= 8972 && c2 <= 8991 || c2 >= 8992 && c2 <= 8993 || c2 >= 8994 && c2 <= 9e3 || c2 === 9001 || c2 === 9002 || c2 >= 9003 && c2 <= 9083 || c2 === 9084 || c2 >= 9085 && c2 <= 9114 || c2 >= 9115 && c2 <= 9139 || c2 >= 9140 && c2 <= 9179 || c2 >= 9180 && c2 <= 9185 || c2 >= 9186 && c2 <= 9254 || c2 >= 9255 && c2 <= 9279 || c2 >= 9280 && c2 <= 9290 || c2 >= 9291 && c2 <= 9311 || c2 >= 9472 && c2 <= 9654 || c2 === 9655 || c2 >= 9656 && c2 <= 9664 || c2 === 9665 || c2 >= 9666 && c2 <= 9719 || c2 >= 9720 && c2 <= 9727 || c2 >= 9728 && c2 <= 9838 || c2 === 9839 || c2 >= 9840 && c2 <= 10087 || c2 === 10088 || c2 === 10089 || c2 === 10090 || c2 === 10091 || c2 === 10092 || c2 === 10093 || c2 === 10094 || c2 === 10095 || c2 === 10096 || c2 === 10097 || c2 === 10098 || c2 === 10099 || c2 === 10100 || c2 === 10101 || c2 >= 10132 && c2 <= 10175 || c2 >= 10176 && c2 <= 10180 || c2 === 10181 || c2 === 10182 || c2 >= 10183 && c2 <= 10213 || c2 === 10214 || c2 === 10215 || c2 === 10216 || c2 === 10217 || c2 === 10218 || c2 === 10219 || c2 === 10220 || c2 === 10221 || c2 === 10222 || c2 === 10223 || c2 >= 10224 && c2 <= 10239 || c2 >= 10240 && c2 <= 10495 || c2 >= 10496 && c2 <= 10626 || c2 === 10627 || c2 === 10628 || c2 === 10629 || c2 === 10630 || c2 === 10631 || c2 === 10632 || c2 === 10633 || c2 === 10634 || c2 === 10635 || c2 === 10636 || c2 === 10637 || c2 === 10638 || c2 === 10639 || c2 === 10640 || c2 === 10641 || c2 === 10642 || c2 === 10643 || c2 === 10644 || c2 === 10645 || c2 === 10646 || c2 === 10647 || c2 === 10648 || c2 >= 10649 && c2 <= 10711 || c2 === 10712 || c2 === 10713 || c2 === 10714 || c2 === 10715 || c2 >= 10716 && c2 <= 10747 || c2 === 10748 || c2 === 10749 || c2 >= 10750 && c2 <= 11007 || c2 >= 11008 && c2 <= 11055 || c2 >= 11056 && c2 <= 11076 || c2 >= 11077 && c2 <= 11078 || c2 >= 11079 && c2 <= 11084 || c2 >= 11085 && c2 <= 11123 || c2 >= 11124 && c2 <= 11125 || c2 >= 11126 && c2 <= 11157 || c2 === 11158 || c2 >= 11159 && c2 <= 11263 || c2 >= 11776 && c2 <= 11777 || c2 === 11778 || c2 === 11779 || c2 === 11780 || c2 === 11781 || c2 >= 11782 && c2 <= 11784 || c2 === 11785 || c2 === 11786 || c2 === 11787 || c2 === 11788 || c2 === 11789 || c2 >= 11790 && c2 <= 11798 || c2 === 11799 || c2 >= 11800 && c2 <= 11801 || c2 === 11802 || c2 === 11803 || c2 === 11804 || c2 === 11805 || c2 >= 11806 && c2 <= 11807 || c2 === 11808 || c2 === 11809 || c2 === 11810 || c2 === 11811 || c2 === 11812 || c2 === 11813 || c2 === 11814 || c2 === 11815 || c2 === 11816 || c2 === 11817 || c2 >= 11818 && c2 <= 11822 || c2 === 11823 || c2 >= 11824 && c2 <= 11833 || c2 >= 11834 && c2 <= 11835 || c2 >= 11836 && c2 <= 11839 || c2 === 11840 || c2 === 11841 || c2 === 11842 || c2 >= 11843 && c2 <= 11855 || c2 >= 11856 && c2 <= 11857 || c2 === 11858 || c2 >= 11859 && c2 <= 11903 || c2 >= 12289 && c2 <= 12291 || c2 === 12296 || c2 === 12297 || c2 === 12298 || c2 === 12299 || c2 === 12300 || c2 === 12301 || c2 === 12302 || c2 === 12303 || c2 === 12304 || c2 === 12305 || c2 >= 12306 && c2 <= 12307 || c2 === 12308 || c2 === 12309 || c2 === 12310 || c2 === 12311 || c2 === 12312 || c2 === 12313 || c2 === 12314 || c2 === 12315 || c2 === 12316 || c2 === 12317 || c2 >= 12318 && c2 <= 12319 || c2 === 12320 || c2 === 12336 || c2 === 64830 || c2 === 64831 || c2 >= 65093 && c2 <= 65094;
}

// ../../node_modules/@formatjs/icu-messageformat-parser/lib/index.js
function pruneLocation(els) {
  els.forEach(function(el) {
    delete el.location;
    if (isSelectElement(el) || isPluralElement(el)) {
      for (var k in el.options) {
        delete el.options[k].location;
        pruneLocation(el.options[k].value);
      }
    } else if (isNumberElement(el) && isNumberSkeleton(el.style)) {
      delete el.style.location;
    } else if ((isDateElement(el) || isTimeElement(el)) && isDateTimeSkeleton(el.style)) {
      delete el.style.location;
    } else if (isTagElement(el)) {
      pruneLocation(el.children);
    }
  });
}
function parse(message, opts) {
  if (opts === void 0) {
    opts = {};
  }
  opts = __assign({ shouldParseSkeletons: true, requiresOtherClause: true }, opts);
  var result = new Parser(message, opts).parse();
  if (result.err) {
    var error = SyntaxError(ErrorKind[result.err.kind]);
    error.location = result.err.location;
    error.originalMessage = result.err.message;
    throw error;
  }
  if (!(opts === null || opts === void 0 ? void 0 : opts.captureLocation)) {
    pruneLocation(result.val);
  }
  return result.val;
}

// ../../node_modules/intl-messageformat/lib/src/error.js
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2["MISSING_VALUE"] = "MISSING_VALUE";
  ErrorCode2["INVALID_VALUE"] = "INVALID_VALUE";
  ErrorCode2["MISSING_INTL_API"] = "MISSING_INTL_API";
})(ErrorCode || (ErrorCode = {}));
var FormatError = (
  /** @class */
  function(_super) {
    __extends(FormatError2, _super);
    function FormatError2(msg, code, originalMessage) {
      var _this = _super.call(this, msg) || this;
      _this.code = code;
      _this.originalMessage = originalMessage;
      return _this;
    }
    FormatError2.prototype.toString = function() {
      return "[formatjs Error: ".concat(this.code, "] ").concat(this.message);
    };
    return FormatError2;
  }(Error)
);
var InvalidValueError = (
  /** @class */
  function(_super) {
    __extends(InvalidValueError2, _super);
    function InvalidValueError2(variableId, value, options, originalMessage) {
      return _super.call(this, 'Invalid values for "'.concat(variableId, '": "').concat(value, '". Options are "').concat(Object.keys(options).join('", "'), '"'), ErrorCode.INVALID_VALUE, originalMessage) || this;
    }
    return InvalidValueError2;
  }(FormatError)
);
var InvalidValueTypeError = (
  /** @class */
  function(_super) {
    __extends(InvalidValueTypeError2, _super);
    function InvalidValueTypeError2(value, type, originalMessage) {
      return _super.call(this, 'Value for "'.concat(value, '" must be of type ').concat(type), ErrorCode.INVALID_VALUE, originalMessage) || this;
    }
    return InvalidValueTypeError2;
  }(FormatError)
);
var MissingValueError = (
  /** @class */
  function(_super) {
    __extends(MissingValueError2, _super);
    function MissingValueError2(variableId, originalMessage) {
      return _super.call(this, 'The intl string context variable "'.concat(variableId, '" was not provided to the string "').concat(originalMessage, '"'), ErrorCode.MISSING_VALUE, originalMessage) || this;
    }
    return MissingValueError2;
  }(FormatError)
);

// ../../node_modules/intl-messageformat/lib/src/formatters.js
var PART_TYPE;
(function(PART_TYPE2) {
  PART_TYPE2[PART_TYPE2["literal"] = 0] = "literal";
  PART_TYPE2[PART_TYPE2["object"] = 1] = "object";
})(PART_TYPE || (PART_TYPE = {}));
function mergeLiteral(parts) {
  if (parts.length < 2) {
    return parts;
  }
  return parts.reduce(function(all, part) {
    var lastPart = all[all.length - 1];
    if (!lastPart || lastPart.type !== PART_TYPE.literal || part.type !== PART_TYPE.literal) {
      all.push(part);
    } else {
      lastPart.value += part.value;
    }
    return all;
  }, []);
}
function isFormatXMLElementFn(el) {
  return typeof el === "function";
}
function formatToParts(els, locales, formatters, formats, values, currentPluralValue, originalMessage) {
  if (els.length === 1 && isLiteralElement(els[0])) {
    return [
      {
        type: PART_TYPE.literal,
        value: els[0].value
      }
    ];
  }
  var result = [];
  for (var _i = 0, els_1 = els; _i < els_1.length; _i++) {
    var el = els_1[_i];
    if (isLiteralElement(el)) {
      result.push({
        type: PART_TYPE.literal,
        value: el.value
      });
      continue;
    }
    if (isPoundElement(el)) {
      if (typeof currentPluralValue === "number") {
        result.push({
          type: PART_TYPE.literal,
          value: formatters.getNumberFormat(locales).format(currentPluralValue)
        });
      }
      continue;
    }
    var varName = el.value;
    if (!(values && varName in values)) {
      throw new MissingValueError(varName, originalMessage);
    }
    var value = values[varName];
    if (isArgumentElement(el)) {
      if (!value || typeof value === "string" || typeof value === "number") {
        value = typeof value === "string" || typeof value === "number" ? String(value) : "";
      }
      result.push({
        type: typeof value === "string" ? PART_TYPE.literal : PART_TYPE.object,
        value
      });
      continue;
    }
    if (isDateElement(el)) {
      var style = typeof el.style === "string" ? formats.date[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : void 0;
      result.push({
        type: PART_TYPE.literal,
        value: formatters.getDateTimeFormat(locales, style).format(value)
      });
      continue;
    }
    if (isTimeElement(el)) {
      var style = typeof el.style === "string" ? formats.time[el.style] : isDateTimeSkeleton(el.style) ? el.style.parsedOptions : formats.time.medium;
      result.push({
        type: PART_TYPE.literal,
        value: formatters.getDateTimeFormat(locales, style).format(value)
      });
      continue;
    }
    if (isNumberElement(el)) {
      var style = typeof el.style === "string" ? formats.number[el.style] : isNumberSkeleton(el.style) ? el.style.parsedOptions : void 0;
      if (style && style.scale) {
        value = value * (style.scale || 1);
      }
      result.push({
        type: PART_TYPE.literal,
        value: formatters.getNumberFormat(locales, style).format(value)
      });
      continue;
    }
    if (isTagElement(el)) {
      var children = el.children, value_1 = el.value;
      var formatFn = values[value_1];
      if (!isFormatXMLElementFn(formatFn)) {
        throw new InvalidValueTypeError(value_1, "function", originalMessage);
      }
      var parts = formatToParts(children, locales, formatters, formats, values, currentPluralValue);
      var chunks = formatFn(parts.map(function(p2) {
        return p2.value;
      }));
      if (!Array.isArray(chunks)) {
        chunks = [chunks];
      }
      result.push.apply(result, chunks.map(function(c2) {
        return {
          type: typeof c2 === "string" ? PART_TYPE.literal : PART_TYPE.object,
          value: c2
        };
      }));
    }
    if (isSelectElement(el)) {
      var opt = el.options[value] || el.options.other;
      if (!opt) {
        throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
      }
      result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values));
      continue;
    }
    if (isPluralElement(el)) {
      var opt = el.options["=".concat(value)];
      if (!opt) {
        if (!Intl.PluralRules) {
          throw new FormatError('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n', ErrorCode.MISSING_INTL_API, originalMessage);
        }
        var rule = formatters.getPluralRules(locales, { type: el.pluralType }).select(value - (el.offset || 0));
        opt = el.options[rule] || el.options.other;
      }
      if (!opt) {
        throw new InvalidValueError(el.value, value, Object.keys(el.options), originalMessage);
      }
      result.push.apply(result, formatToParts(opt.value, locales, formatters, formats, values, value - (el.offset || 0)));
      continue;
    }
  }
  return mergeLiteral(result);
}

// ../../node_modules/intl-messageformat/lib/src/core.js
function mergeConfig(c1, c2) {
  if (!c2) {
    return c1;
  }
  return __assign(__assign(__assign({}, c1 || {}), c2 || {}), Object.keys(c1).reduce(function(all, k) {
    all[k] = __assign(__assign({}, c1[k]), c2[k] || {});
    return all;
  }, {}));
}
function mergeConfigs(defaultConfig, configs) {
  if (!configs) {
    return defaultConfig;
  }
  return Object.keys(defaultConfig).reduce(function(all, k) {
    all[k] = mergeConfig(defaultConfig[k], configs[k]);
    return all;
  }, __assign({}, defaultConfig));
}
function createFastMemoizeCache(store) {
  return {
    create: function() {
      return {
        get: function(key) {
          return store[key];
        },
        set: function(key, value) {
          store[key] = value;
        }
      };
    }
  };
}
function createDefaultFormatters(cache) {
  if (cache === void 0) {
    cache = {
      number: {},
      dateTime: {},
      pluralRules: {}
    };
  }
  return {
    getNumberFormat: memoize(function() {
      var _a2;
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return new ((_a2 = Intl.NumberFormat).bind.apply(_a2, __spreadArray([void 0], args, false)))();
    }, {
      cache: createFastMemoizeCache(cache.number),
      strategy: strategies.variadic
    }),
    getDateTimeFormat: memoize(function() {
      var _a2;
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return new ((_a2 = Intl.DateTimeFormat).bind.apply(_a2, __spreadArray([void 0], args, false)))();
    }, {
      cache: createFastMemoizeCache(cache.dateTime),
      strategy: strategies.variadic
    }),
    getPluralRules: memoize(function() {
      var _a2;
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return new ((_a2 = Intl.PluralRules).bind.apply(_a2, __spreadArray([void 0], args, false)))();
    }, {
      cache: createFastMemoizeCache(cache.pluralRules),
      strategy: strategies.variadic
    })
  };
}
var IntlMessageFormat = (
  /** @class */
  function() {
    function IntlMessageFormat2(message, locales, overrideFormats, opts) {
      if (locales === void 0) {
        locales = IntlMessageFormat2.defaultLocale;
      }
      var _this = this;
      this.formatterCache = {
        number: {},
        dateTime: {},
        pluralRules: {}
      };
      this.format = function(values) {
        var parts = _this.formatToParts(values);
        if (parts.length === 1) {
          return parts[0].value;
        }
        var result = parts.reduce(function(all, part) {
          if (!all.length || part.type !== PART_TYPE.literal || typeof all[all.length - 1] !== "string") {
            all.push(part.value);
          } else {
            all[all.length - 1] += part.value;
          }
          return all;
        }, []);
        if (result.length <= 1) {
          return result[0] || "";
        }
        return result;
      };
      this.formatToParts = function(values) {
        return formatToParts(_this.ast, _this.locales, _this.formatters, _this.formats, values, void 0, _this.message);
      };
      this.resolvedOptions = function() {
        var _a3;
        return {
          locale: ((_a3 = _this.resolvedLocale) === null || _a3 === void 0 ? void 0 : _a3.toString()) || Intl.NumberFormat.supportedLocalesOf(_this.locales)[0]
        };
      };
      this.getAst = function() {
        return _this.ast;
      };
      this.locales = locales;
      this.resolvedLocale = IntlMessageFormat2.resolveLocale(locales);
      if (typeof message === "string") {
        this.message = message;
        if (!IntlMessageFormat2.__parse) {
          throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");
        }
        var _a2 = opts || {}, formatters = _a2.formatters, parseOpts = __rest(_a2, ["formatters"]);
        this.ast = IntlMessageFormat2.__parse(message, __assign(__assign({}, parseOpts), { locale: this.resolvedLocale }));
      } else {
        this.ast = message;
      }
      if (!Array.isArray(this.ast)) {
        throw new TypeError("A message must be provided as a String or AST.");
      }
      this.formats = mergeConfigs(IntlMessageFormat2.formats, overrideFormats);
      this.formatters = opts && opts.formatters || createDefaultFormatters(this.formatterCache);
    }
    Object.defineProperty(IntlMessageFormat2, "defaultLocale", {
      get: function() {
        if (!IntlMessageFormat2.memoizedDefaultLocale) {
          IntlMessageFormat2.memoizedDefaultLocale = new Intl.NumberFormat().resolvedOptions().locale;
        }
        return IntlMessageFormat2.memoizedDefaultLocale;
      },
      enumerable: false,
      configurable: true
    });
    IntlMessageFormat2.memoizedDefaultLocale = null;
    IntlMessageFormat2.resolveLocale = function(locales) {
      if (typeof Intl.Locale === "undefined") {
        return;
      }
      var supportedLocales = Intl.NumberFormat.supportedLocalesOf(locales);
      if (supportedLocales.length > 0) {
        return new Intl.Locale(supportedLocales[0]);
      }
      return new Intl.Locale(typeof locales === "string" ? locales : locales[0]);
    };
    IntlMessageFormat2.__parse = parse;
    IntlMessageFormat2.formats = {
      number: {
        integer: {
          maximumFractionDigits: 0
        },
        currency: {
          style: "currency"
        },
        percent: {
          style: "percent"
        }
      },
      date: {
        short: {
          month: "numeric",
          day: "numeric",
          year: "2-digit"
        },
        medium: {
          month: "short",
          day: "numeric",
          year: "numeric"
        },
        long: {
          month: "long",
          day: "numeric",
          year: "numeric"
        },
        full: {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        }
      },
      time: {
        short: {
          hour: "numeric",
          minute: "numeric"
        },
        medium: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric"
        },
        long: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short"
        },
        full: {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          timeZoneName: "short"
        }
      }
    };
    return IntlMessageFormat2;
  }()
);

// ../../node_modules/use-intl/dist/esm/production/initializeConfig-CzP0yD8_.js
import { isValidElement as t, cloneElement as r } from "react";
var a = class extends Error {
  constructor(e3, t3) {
    let r3 = e3;
    t3 && (r3 += ": " + t3), super(r3), this.code = e3, t3 && (this.originalMessage = t3);
  }
};
var s = function(e3) {
  return e3.MISSING_MESSAGE = "MISSING_MESSAGE", e3.MISSING_FORMAT = "MISSING_FORMAT", e3.ENVIRONMENT_FALLBACK = "ENVIRONMENT_FALLBACK", e3.INSUFFICIENT_PATH = "INSUFFICIENT_PATH", e3.INVALID_MESSAGE = "INVALID_MESSAGE", e3.INVALID_KEY = "INVALID_KEY", e3.FORMATTING_ERROR = "FORMATTING_ERROR", e3;
}(s || {});
function i(...e3) {
  return e3.filter(Boolean).join(".");
}
function u(e3) {
  return i(e3.namespace, e3.key);
}
function c(e3) {
  console.error(e3);
}
function m() {
  return { dateTime: {}, number: {}, message: {}, relativeTime: {}, pluralRules: {}, list: {}, displayNames: {} };
}
function f(e3, t3) {
  return memoize(e3, { cache: (r3 = t3, { create: () => ({ get: (e4) => r3[e4], set(e4, t4) {
    r3[e4] = t4;
  } }) }), strategy: strategies.variadic });
  var r3;
}
function l(e3, t3) {
  return f((...t4) => new e3(...t4), t3);
}
function g(e3) {
  return { getDateTimeFormat: l(Intl.DateTimeFormat, e3.dateTime), getNumberFormat: l(Intl.NumberFormat, e3.number), getPluralRules: l(Intl.PluralRules, e3.pluralRules), getRelativeTimeFormat: l(Intl.RelativeTimeFormat, e3.relativeTime), getListFormat: l(Intl.ListFormat, e3.list), getDisplayNames: l(Intl.DisplayNames, e3.displayNames) };
}
function I(e3, t3, r3, n3) {
  const o3 = i(n3, r3);
  if (!t3)
    throw new Error(o3);
  let a2 = t3;
  return r3.split(".").forEach((t4) => {
    const r4 = a2[t4];
    if (null == t4 || null == r4)
      throw new Error(o3 + ` (${e3})`);
    a2 = r4;
  }), a2;
}
function E(n3) {
  const o3 = function(e3, t3, r3) {
    try {
      if (!t3)
        throw new Error(void 0);
      const n4 = r3 ? I(e3, t3, r3) : t3;
      if (!n4)
        throw new Error(r3);
      return n4;
    } catch (e4) {
      return new a(s.MISSING_MESSAGE, e4.message);
    }
  }(n3.locale, n3.messages, n3.namespace);
  return function({ cache: n4, formats: o4, formatters: i2, getMessageFallback: c2 = u, locale: m2, messagesOrError: l2, namespace: g3, onError: E3, timeZone: S2 }) {
    const T2 = l2 instanceof a;
    function N2(e3, t3, r3, n5) {
      const o5 = new a(t3, r3);
      return E3(o5), n5 ?? c2({ error: o5, key: e3, namespace: g3 });
    }
    function y2(a2, u2, y3, A3) {
      const M3 = A3;
      let F3, R2;
      if (T2) {
        if (!M3)
          return E3(l2), c2({ error: l2, key: a2, namespace: g3 });
        F3 = M3;
      } else {
        const e3 = l2;
        try {
          F3 = I(m2, e3, a2, g3);
        } catch (e4) {
          if (!M3)
            return N2(a2, s.MISSING_MESSAGE, e4.message, M3);
          F3 = M3;
        }
      }
      if ("object" == typeof F3) {
        let e3, t3;
        return e3 = Array.isArray(F3) ? s.INVALID_MESSAGE : s.INSUFFICIENT_PATH, N2(a2, e3, t3);
      }
      const d3 = function(e3, t3) {
        return t3 || /'[{}]/.test(e3) ? void 0 : e3;
      }(F3, u2);
      if (d3)
        return d3;
      i2.getMessageFormat || (i2.getMessageFormat = function(t3, r3) {
        return f((...t4) => new IntlMessageFormat(t4[0], t4[1], t4[2], { formatters: r3, ...t4[3] }), t3.message);
      }(n4, i2));
      try {
        R2 = i2.getMessageFormat(F3, m2, function(t3, r3, n5) {
          const o5 = IntlMessageFormat.formats.date, a3 = IntlMessageFormat.formats.time, s2 = { ...t3?.dateTime, ...r3?.dateTime }, i3 = { date: { ...o5, ...s2 }, time: { ...a3, ...s2 }, number: { ...t3?.number, ...r3?.number } };
          return n5 && ["date", "time"].forEach((e3) => {
            const t4 = i3[e3];
            for (const [e4, r4] of Object.entries(t4))
              t4[e4] = { timeZone: n5, ...r4 };
          }), i3;
        }(o4, y3, S2), { formatters: { ...i2, getDateTimeFormat: (e3, t3) => i2.getDateTimeFormat(e3, { timeZone: S2, ...t3 }) } });
      } catch (e3) {
        const t3 = e3;
        return N2(a2, s.INVALID_MESSAGE, t3.message, M3);
      }
      try {
        const e3 = R2.format(u2 ? function(e4) {
          const n5 = {};
          return Object.keys(e4).forEach((o5) => {
            let a3 = 0;
            const s2 = e4[o5];
            let i3;
            i3 = "function" == typeof s2 ? (e5) => {
              const n6 = s2(e5);
              return t(n6) ? r(n6, { key: o5 + a3++ }) : n6;
            } : s2, n5[o5] = i3;
          }), n5;
        }(u2) : u2);
        if (null == e3)
          throw new Error(void 0);
        return t(e3) || Array.isArray(e3) || "string" == typeof e3 ? e3 : String(e3);
      } catch (e3) {
        return N2(a2, s.FORMATTING_ERROR, e3.message, M3);
      }
    }
    function A2(e3, t3, r3, n5) {
      const o5 = y2(e3, t3, r3, n5);
      return "string" != typeof o5 ? N2(e3, s.INVALID_MESSAGE, void 0) : o5;
    }
    return A2.rich = y2, A2.markup = (e3, t3, r3, n5) => y2(e3, t3, r3, n5), A2.raw = (e3) => {
      if (T2)
        return E3(l2), c2({ error: l2, key: e3, namespace: g3 });
      const t3 = l2;
      try {
        return I(m2, t3, e3, g3);
      } catch (t4) {
        return N2(e3, s.MISSING_MESSAGE, t4.message);
      }
    }, A2.has = (e3) => {
      if (T2)
        return false;
      try {
        return I(m2, l2, e3, g3), true;
      } catch {
        return false;
      }
    }, A2;
  }({ ...n3, messagesOrError: o3 });
}
function S(e3, t3) {
  return e3 === t3 ? void 0 : e3.slice((t3 + ".").length);
}
var T = 3600;
var N = 86400;
var y = 7 * N;
var A = 2628e3;
var M = 7884e3;
var F = 365 * N;
var R = { second: 1, seconds: 1, minute: 60, minutes: 60, hour: T, hours: T, day: N, days: N, week: y, weeks: y, month: A, months: A, quarter: M, quarters: M, year: F, years: F };
function d(e3) {
  const { _cache: t3 = m(), _formatters: r3 = g(t3), formats: n3, locale: o3, onError: i2 = c, timeZone: u2 } = e3;
  function f2(e4) {
    return e4?.timeZone || (u2 ? e4 = { ...e4, timeZone: u2 } : i2(new a(s.ENVIRONMENT_FALLBACK, void 0))), e4;
  }
  function l2(e4, t4, r4, n4, o4) {
    let u3;
    try {
      u3 = function(e5, t5, r5) {
        let n5;
        if ("string" == typeof t5) {
          const r6 = t5;
          if (n5 = e5?.[r6], !n5) {
            const e6 = new a(s.MISSING_FORMAT, void 0);
            throw i2(e6), e6;
          }
        } else
          n5 = t5;
        return r5 && (n5 = { ...n5, ...r5 }), n5;
      }(r4, e4, t4);
    } catch {
      return o4();
    }
    try {
      return n4(u3);
    } catch (e5) {
      return i2(new a(s.FORMATTING_ERROR, e5.message)), o4();
    }
  }
  function I3(e4, t4, a2) {
    return l2(t4, a2, n3?.dateTime, (t5) => (t5 = f2(t5), r3.getDateTimeFormat(o3, t5).format(e4)), () => String(e4));
  }
  function E3() {
    return e3.now ? e3.now : (i2(new a(s.ENVIRONMENT_FALLBACK, void 0)), /* @__PURE__ */ new Date());
  }
  return { dateTime: I3, number: function(e4, t4, a2) {
    return l2(t4, a2, n3?.number, (t5) => r3.getNumberFormat(o3, t5).format(e4), () => String(e4));
  }, relativeTime: function(e4, t4) {
    try {
      let n4, a2;
      const s2 = {};
      t4 instanceof Date || "number" == typeof t4 ? n4 = new Date(t4) : t4 && (n4 = null != t4.now ? new Date(t4.now) : E3(), a2 = t4.unit, s2.style = t4.style, s2.numberingSystem = t4.numberingSystem), n4 || (n4 = E3());
      const i3 = (new Date(e4).getTime() - n4.getTime()) / 1e3;
      a2 || (a2 = function(e5) {
        const t5 = Math.abs(e5);
        return t5 < 60 ? "second" : t5 < T ? "minute" : t5 < N ? "hour" : t5 < y ? "day" : t5 < A ? "week" : t5 < F ? "month" : "year";
      }(i3)), s2.numeric = "second" === a2 ? "auto" : "always";
      const u3 = function(e5, t5) {
        return Math.round(e5 / R[t5]);
      }(i3, a2);
      return r3.getRelativeTimeFormat(o3, s2).format(u3, a2);
    } catch (t5) {
      return i2(new a(s.FORMATTING_ERROR, t5.message)), String(e4);
    }
  }, list: function(e4, t4, a2) {
    const s2 = [], i3 = /* @__PURE__ */ new Map();
    let u3 = 0;
    for (const t5 of e4) {
      let e5;
      "object" == typeof t5 ? (e5 = String(u3), i3.set(e5, t5)) : e5 = String(t5), s2.push(e5), u3++;
    }
    return l2(t4, a2, n3?.list, (e5) => {
      const t5 = r3.getListFormat(o3, e5).formatToParts(s2).map((e6) => "literal" === e6.type ? e6.value : i3.get(e6.value) || e6.value);
      return i3.size > 0 ? t5 : t5.join("");
    }, () => String(e4));
  }, dateTimeRange: function(e4, t4, a2, s2) {
    return l2(a2, s2, n3?.dateTime, (n4) => (n4 = f2(n4), r3.getDateTimeFormat(o3, n4).formatRange(e4, t4)), () => [I3(e4), I3(t4)].join("\u2009\u2013\u2009"));
  } };
}

// ../../node_modules/use-intl/dist/esm/production/react.js
import { createContext as e, useContext as r2, useMemo as t2, useState as o, useEffect as n } from "react";
import { jsx as g2 } from "react/jsx-runtime";
var d2 = e(void 0);
function w() {
  const e3 = r2(d2);
  if (!e3)
    throw new Error(void 0);
  return e3;
}
var h2 = false;
var p = "undefined" == typeof window;
function E2(e3) {
  return function(e4, r3, o3) {
    const { cache: n3, formats: a2, formatters: s2, getMessageFallback: c2, locale: l2, onError: g3, timeZone: d3 } = w(), v2 = e4[o3], E3 = S(r3, o3);
    return d3 || h2 || !p || (h2 = true, g3(new a(s.ENVIRONMENT_FALLBACK, void 0))), t2(() => E({ cache: n3, formatters: s2, getMessageFallback: c2, messages: v2, namespace: E3, onError: g3, formats: a2, locale: l2, timeZone: d3 }), [n3, s2, c2, v2, E3, g3, a2, l2, d3]);
  }({ "!": w().messages }, e3 ? `!.${e3}` : "!", "!");
}
function Z() {
  return w().locale;
}
function I2() {
  const { formats: e3, formatters: r3, locale: o3, now: n3, onError: a2, timeZone: s2 } = w();
  return t2(() => d({ formats: e3, locale: o3, now: n3, onError: a2, timeZone: s2, _formatters: r3 }), [e3, r3, n3, o3, a2, s2]);
}

// ../../node_modules/next-intl/dist/esm/production/react-client/index.js
function o2(r3, t3) {
  return (...r4) => {
    try {
      return t3(...r4);
    } catch {
      throw new Error(void 0);
    }
  };
}
var n2 = o2(0, E2);
var e2 = o2(0, I2);

// src/hooks/useTranslation.ts
function useCommonTranslations() {
  return n2("common");
}
function useAuthTranslations() {
  return n2("auth");
}
function useDashboardTranslations() {
  return n2("dashboard");
}
function useOrderTranslations() {
  return n2("orders");
}
function useProductTranslations() {
  return n2("products");
}
function useCustomerTranslations() {
  return n2("customers");
}
function useSettingsTranslations() {
  return n2("settings");
}
function useValidationTranslations() {
  return n2("validation");
}
function useUsersTranslations() {
  return n2("users");
}
function useOutletsTranslations() {
  return n2("outlets");
}
function useCategoriesTranslations() {
  return n2("categories");
}
function useCalendarTranslations() {
  return n2("calendar");
}
function usePlansTranslations() {
  return n2("plans");
}
function useSubscriptionTranslations() {
  return n2("subscription");
}
function useErrorTranslations() {
  return n2("errors");
}

// src/hooks/useAuth.ts
function useAuth() {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null
  });
  const t3 = useErrorTranslations();
  const translateError = useCallback((errorData) => {
    if (errorData?.code) {
      const translated = t3(errorData.code);
      if (translated !== errorData.code) {
        return translated;
      }
    }
    if (errorData?.message) {
      if (typeof errorData.message === "string" && /^[A-Z_]+$/.test(errorData.message)) {
        const translated = t3(errorData.message);
        if (translated !== errorData.message) {
          return translated;
        }
      }
      return errorData.message;
    }
    return t3("UNKNOWN_ERROR");
  }, [t3]);
  const login = useCallback(async (email, password) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { apiUrls: apiUrls2 } = await import("@rentalshop/utils");
      const urls = apiUrls2;
      console.log("\u{1F50D} LOGIN: Using API URL:", urls.auth.login);
      console.log("\u{1F50D} LOGIN: API Base URL:", urls.base);
      console.log("\u{1F50D} LOGIN: NEXT_PUBLIC_API_URL:", typeof window !== "undefined" ? window.__NEXT_PUBLIC_API_URL__ || "NOT SET IN WINDOW" : "SERVER SIDE");
      const response = await fetch(urls.auth.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const errorData = await response.json();
        const translatedError = translateError(errorData);
        setState((prev) => ({
          ...prev,
          error: translatedError,
          loading: false
        }));
        return false;
      }
      const data = await response.json();
      if (data.success && data.data?.token) {
        storeAuthData(data.data.token, data.data.user);
        const { getAuthToken: getAuthToken2 } = await import("@rentalshop/utils");
        await new Promise((resolve) => setTimeout(resolve, 10));
        const storedToken = getAuthToken2();
        if (!storedToken) {
          console.error("\u274C Login: Token was not stored properly, retrying...");
          storeAuthData(data.data.token, data.data.user);
          await new Promise((resolve) => setTimeout(resolve, 10));
          const retryToken = getAuthToken2();
          if (!retryToken) {
            console.error("\u274C Login: Failed to store token after retry");
            setState((prev) => ({
              ...prev,
              error: "Failed to store authentication token",
              loading: false
            }));
            return false;
          }
        }
        console.log("\u2705 Login: Token verified and stored successfully");
        setState((prev) => ({
          ...prev,
          user: data.data.user,
          loading: false,
          error: null
        }));
        return true;
      } else {
        const translatedError = translateError(data);
        setState((prev) => ({
          ...prev,
          error: translatedError,
          loading: false
        }));
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t3("UNKNOWN_ERROR");
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));
      return false;
    }
  }, [translateError, t3]);
  const logout = useCallback(() => {
    clearAuthData();
    setState({
      user: null,
      loading: false,
      error: null
    });
  }, []);
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setState((prev) => ({ ...prev, user: null, loading: false }));
        return;
      }
      const { apiUrls: apiUrls2, authenticatedFetch: authenticatedFetch2 } = await import("@rentalshop/utils");
      const response = await authenticatedFetch2(apiUrls2.settings.user);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          localStorage.setItem("user", JSON.stringify(data.data));
          setState((prev) => ({
            ...prev,
            user: data.data,
            loading: false
          }));
        }
      } else if (response.status === 401) {
        logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [logout]);
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setState((prev) => ({
        ...prev,
        user: storedUser,
        loading: false
      }));
    } else {
      setState((prev) => ({ ...prev, user: null, loading: false }));
    }
  }, []);
  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    refreshUser,
    clearError
  };
}

// src/hooks/useAuthErrorHandler.ts
import { useCallback as useCallback2 } from "react";
import { clearAuthData as clearAuthData2 } from "@rentalshop/utils";
var useAuthErrorHandler = () => {
  const handleAuthError = useCallback2((error) => {
    console.error("Authentication error detected:", error);
    if (error?.message?.includes("Authentication required") || error?.message?.includes("Unauthorized") || error?.message?.includes("Invalid token") || error?.message?.includes("Token expired") || error?.status === 401) {
      console.log("\u{1F504} Authentication error detected, logging out user");
      clearAuthData2();
      if (typeof window !== "undefined") {
      }
    }
  }, []);
  return { handleAuthError };
};

// src/hooks/useCanPerform.ts
import { useCallback as useCallback4 } from "react";

// src/hooks/useSubscriptionStatusInfo.ts
import { useState as useState2, useEffect as useEffect2, useCallback as useCallback3 } from "react";
function useSubscriptionStatusInfo(options = {}) {
  const { checkInterval = 5 * 60 * 1e3 } = options;
  const { user } = useAuth();
  const [loading, setLoading] = useState2(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState2(false);
  const [isExpired, setIsExpired] = useState2(false);
  const [isExpiringSoon, setIsExpiringSoon] = useState2(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState2(null);
  const [subscriptionType, setSubscriptionType] = useState2(null);
  const [hasSubscription, setHasSubscription] = useState2(false);
  const [subscription, setSubscription] = useState2(null);
  const [status, setStatus] = useState2("");
  const [isTrial, setIsTrial] = useState2(false);
  const [isActive, setIsActive] = useState2(false);
  const [planName, setPlanName] = useState2("");
  const [error, setError] = useState2(null);
  const fetchSubscriptionStatus = useCallback3(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { subscriptionsApi: subscriptionsApi2 } = await import("@rentalshop/utils");
      const response = await subscriptionsApi2.getCurrentUserSubscriptionStatus();
      if (response.success && response.data) {
        const data = response.data;
        const computedStatus = data.status || "UNKNOWN";
        const apiHasAccess = data.hasAccess ?? false;
        const apiDaysRemaining = data.daysRemaining ?? null;
        const apiIsExpiringSoon = data.isExpiringSoon ?? false;
        const isActive2 = computedStatus === "ACTIVE";
        const isExpired2 = computedStatus === "EXPIRED";
        const isTrial2 = computedStatus === "TRIAL";
        const isCanceled = computedStatus === "CANCELED";
        const isPastDue = computedStatus === "PAST_DUE";
        const isPaused = computedStatus === "PAUSED";
        const hasActive = apiHasAccess;
        setHasActiveSubscription(hasActive);
        setIsExpired(isExpired2);
        setIsExpiringSoon(apiIsExpiringSoon);
        setDaysUntilExpiry(apiDaysRemaining);
        setSubscriptionType(data.planName || computedStatus);
        setHasSubscription(true);
        setSubscription(data);
        setStatus(computedStatus);
        setIsTrial(isTrial2);
        setIsActive(isActive2);
        setPlanName(data.planName || "Unknown Plan");
        setError(null);
        console.log("\u2705 Subscription status mapped:", {
          computedStatus,
          hasAccess: apiHasAccess,
          daysRemaining: apiDaysRemaining,
          isExpiringSoon: apiIsExpiringSoon,
          statusReason: data.statusReason
        });
      } else {
        setHasActiveSubscription(false);
        setIsExpired(true);
        setIsExpiringSoon(false);
        setDaysUntilExpiry(null);
        setSubscriptionType(null);
        setHasSubscription(false);
        setSubscription(null);
        setStatus("NO_SUBSCRIPTION");
        setIsTrial(false);
        setIsActive(false);
        setPlanName("");
        setError("No subscription found");
      }
    } catch (error2) {
      console.error("Error fetching subscription status:", error2);
      setHasActiveSubscription(false);
      setIsExpired(true);
      setIsExpiringSoon(false);
      setDaysUntilExpiry(null);
      setSubscriptionType(null);
      setHasSubscription(false);
      setSubscription(null);
      setStatus("ERROR");
      setIsTrial(false);
      setIsActive(false);
      setPlanName("");
      setError(error2 instanceof Error ? error2.message : "Failed to fetch subscription");
    } finally {
      setLoading(false);
    }
  }, [user]);
  const canAccessFeature = useCallback3((feature) => {
    if (!hasActiveSubscription || isExpired) {
      return false;
    }
    return true;
  }, [hasActiveSubscription, isExpired]);
  const refreshStatus = useCallback3(async () => {
    await fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  useEffect2(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);
  useEffect2(() => {
    if (!user)
      return;
    const interval = setInterval(fetchSubscriptionStatus, checkInterval);
    return () => clearInterval(interval);
  }, [user, fetchSubscriptionStatus, checkInterval]);
  const statusMessage = subscription?.statusReason || (isExpired ? "Subscription expired" : isExpiringSoon ? `Expires in ${daysUntilExpiry} days` : isTrial ? `Trial (${daysUntilExpiry} days left)` : isActive ? "Active subscription" : "No subscription");
  const statusColor = status === "EXPIRED" ? "red" : status === "CANCELED" ? "red" : status === "PAST_DUE" ? "orange" : status === "PAUSED" ? "yellow" : isExpiringSoon ? "orange" : status === "TRIAL" ? "yellow" : status === "ACTIVE" ? "green" : "gray";
  const hasAccess = subscription?.hasAccess ?? (hasActiveSubscription && !isExpired);
  const accessLevel = status === "EXPIRED" || status === "CANCELED" ? "denied" : status === "PAST_DUE" ? "readonly" : status === "PAUSED" ? "readonly" : status === "TRIAL" ? "limited" : status === "ACTIVE" ? "full" : "denied";
  const requiresPayment = status === "EXPIRED" || status === "PAST_DUE" || isExpiringSoon;
  const upgradeRequired = status === "EXPIRED" || status === "CANCELED";
  const gracePeriodEnds = isExpiringSoon && daysUntilExpiry ? new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1e3) : null;
  const canExportData = hasAccess;
  const isRestricted = !hasAccess || status === "TRIAL" || status === "PAUSED";
  const isReadOnly = status === "EXPIRED" || status === "PAST_DUE" || status === "PAUSED";
  const isLimited = status === "TRIAL";
  const isDenied = status === "EXPIRED" || status === "CANCELED" || !hasActiveSubscription;
  return {
    // Original interface
    loading,
    hasActiveSubscription,
    isExpired,
    isExpiringSoon,
    daysUntilExpiry,
    subscriptionType,
    canAccessFeature,
    refreshStatus,
    // Extended interface for UI components
    hasSubscription,
    subscription,
    status,
    isTrial,
    isActive,
    planName,
    error,
    // Additional properties for other components
    statusMessage,
    statusColor,
    hasAccess,
    accessLevel,
    requiresPayment,
    upgradeRequired,
    gracePeriodEnds,
    canExportData,
    isRestricted,
    isReadOnly,
    isLimited,
    isDenied
  };
}

// src/hooks/useCanPerform.ts
function useCanPerform(action) {
  const { user } = useAuth();
  const { hasActiveSubscription, isExpired, canAccessFeature } = useSubscriptionStatusInfo();
  const checkPermission = useCallback4((action2) => {
    if (!user) {
      return false;
    }
    const actionPermissions = {
      // Order actions
      "create_order": {
        action: "create_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      "edit_order": {
        action: "edit_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      "delete_order": {
        action: "delete_order",
        requiresSubscription: true,
        requiredFeatures: ["orders"]
      },
      // Customer actions
      "create_customer": {
        action: "create_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      "edit_customer": {
        action: "edit_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      "delete_customer": {
        action: "delete_customer",
        requiresSubscription: true,
        requiredFeatures: ["customers"]
      },
      // Product actions
      "create_product": {
        action: "create_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      "edit_product": {
        action: "edit_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      "delete_product": {
        action: "delete_product",
        requiresSubscription: true,
        requiredFeatures: ["products"]
      },
      // Analytics and reporting
      "view_analytics": {
        action: "view_analytics",
        requiresSubscription: true,
        requiredFeatures: ["analytics"]
      },
      "export_data": {
        action: "export_data",
        requiresSubscription: true,
        requiredFeatures: ["analytics", "export"]
      },
      // User management
      "manage_users": {
        action: "manage_users",
        requiresSubscription: true,
        requiredRole: ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]
      },
      // Settings
      "manage_settings": {
        action: "manage_settings",
        requiresSubscription: true,
        requiredRole: ["ADMIN", "MERCHANT"]
      },
      // Bulk operations
      "bulk_operations": {
        action: "bulk_operations",
        requiresSubscription: true,
        requiredFeatures: ["bulk_operations"]
      }
    };
    const permission = actionPermissions[action2];
    if (!permission) {
      return true;
    }
    if (permission.requiresSubscription) {
      if (!hasActiveSubscription || isExpired) {
        return false;
      }
    }
    if (permission.requiredFeatures) {
      for (const feature of permission.requiredFeatures) {
        if (!canAccessFeature(feature)) {
          return false;
        }
      }
    }
    if (permission.requiredRole) {
      if (!permission.requiredRole.includes(user.role)) {
        return false;
      }
    }
    if (permission.customCheck) {
      return permission.customCheck(user, { hasActiveSubscription, isExpired });
    }
    return true;
  }, [user, hasActiveSubscription, isExpired, canAccessFeature]);
  return checkPermission(action);
}

// src/hooks/useCurrency.tsx
import { createContext, useContext, useState as useState3, useCallback as useCallback5, useEffect as useEffect3 } from "react";
import {
  DEFAULT_CURRENCY_SETTINGS,
  getCurrency,
  getCurrentCurrency
} from "@rentalshop/utils";
var CurrencyContext = createContext(void 0);
function CurrencyProvider({
  children,
  initialSettings = {}
}) {
  const [settings, setSettings] = useState3({
    ...DEFAULT_CURRENCY_SETTINGS,
    ...initialSettings
  });
  const currentCurrency = getCurrentCurrency(settings);
  const setCurrency = useCallback5((currencyCode) => {
    setSettings((prev) => ({
      ...prev,
      currentCurrency: currencyCode
    }));
    localStorage.setItem("rentalshop-currency", currencyCode);
  }, []);
  const toggleSymbol = useCallback5(() => {
    setSettings((prev) => ({
      ...prev,
      showSymbol: !prev.showSymbol
    }));
    localStorage.setItem("rentalshop-show-symbol", (!settings.showSymbol).toString());
  }, [settings.showSymbol]);
  const toggleCode = useCallback5(() => {
    setSettings((prev) => ({
      ...prev,
      showCode: !prev.showCode
    }));
    localStorage.setItem("rentalshop-show-code", (!settings.showCode).toString());
  }, [settings.showCode]);
  const getCurrencyByCode = useCallback5((code) => {
    return getCurrency(code);
  }, []);
  const convertAmount = useCallback5((amount, from, to) => {
    if (from === to)
      return amount;
    const fromCurrency = getCurrency(from);
    const toCurrency = getCurrency(to);
    if (!fromCurrency || !toCurrency) {
      throw new Error(`Invalid currency code: ${from} or ${to}`);
    }
    const amountInUSD = amount / fromCurrency.exchangeRate;
    return amountInUSD * toCurrency.exchangeRate;
  }, []);
  useEffect3(() => {
    try {
      const savedCurrency = localStorage.getItem("rentalshop-currency");
      const savedShowSymbol = localStorage.getItem("rentalshop-show-symbol");
      const savedShowCode = localStorage.getItem("rentalshop-show-code");
      if (savedCurrency && isValidCurrencyCode(savedCurrency)) {
        setSettings((prev) => ({ ...prev, currentCurrency: savedCurrency }));
      }
      if (savedShowSymbol !== null) {
        setSettings((prev) => ({ ...prev, showSymbol: savedShowSymbol === "true" }));
      }
      if (savedShowCode !== null) {
        setSettings((prev) => ({ ...prev, showCode: savedShowCode === "true" }));
      }
    } catch (error) {
      console.warn("Failed to load currency settings from localStorage:", error);
    }
  }, []);
  const contextValue = {
    settings,
    currentCurrency,
    setCurrency,
    toggleSymbol,
    toggleCode,
    getCurrencyByCode,
    convertAmount
  };
  return /* @__PURE__ */ React.createElement(CurrencyContext.Provider, { value: contextValue }, children);
}
function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === void 0) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
function isValidCurrencyCode(code) {
  return ["USD", "VND"].includes(code);
}

// src/utils/useDedupedApi.ts
import { useState as useState4, useEffect as useEffect4, useRef, useCallback as useCallback6, useMemo } from "react";
var requestCache = /* @__PURE__ */ new Map();
var dataCache = /* @__PURE__ */ new Map();
function useDedupedApi(options) {
  const {
    filters,
    fetchFn,
    enabled = true,
    staleTime = 3e4,
    // 30 seconds
    cacheTime = 3e5,
    // 5 minutes
    refetchOnWindowFocus = false,
    refetchOnMount = false
    // Default to false to prevent infinite loops
  } = options;
  const [data, setData] = useState4(null);
  const [loading, setLoading] = useState4(true);
  const [error, setError] = useState4(null);
  const [isStale, setIsStale] = useState4(false);
  const [refetchKey, setRefetchKey] = useState4(0);
  const fetchIdRef = useRef(0);
  const filtersRef = useRef("");
  const fetchFnRef = useRef(fetchFn);
  const isMountedRef = useRef(true);
  fetchFnRef.current = fetchFn;
  useEffect4(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const cacheKey = useMemo(() => {
    const normalized = {};
    Object.keys(filters).sort().forEach((key) => {
      const value = filters[key];
      if (value !== void 0 && value !== null && value !== "") {
        normalized[key] = value;
      }
    });
    return JSON.stringify(normalized);
  }, [filters]);
  useEffect4(() => {
    if (!enabled || !isMountedRef.current) {
      if (!enabled)
        setLoading(false);
      return;
    }
    const isManualRefetch = refetchKey > 0;
    if (cacheKey === filtersRef.current && !isManualRefetch) {
      console.log("\u{1F50D} useDedupedApi: Filters unchanged, skipping fetch");
      return;
    }
    filtersRef.current = cacheKey;
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;
    console.log(`\u{1F50D} Fetch #${currentFetchId}: Starting...`);
    const cached = dataCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      const isCacheStale = now - cached.timestamp > cached.staleTime;
      if (!isCacheStale) {
        if (refetchOnMount) {
          console.log(`\u2705 Fetch #${currentFetchId}: Cache HIT (fresh) - but refetchOnMount=true, showing cache and fetching new data`);
          if (isMountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
            setIsStale(false);
          }
        } else {
          console.log(`\u2705 Fetch #${currentFetchId}: Cache HIT (fresh) - refetchOnMount=false, using cache`);
          if (isMountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
            setIsStale(false);
          }
          return;
        }
      } else {
        console.log(`\u23F0 Fetch #${currentFetchId}: Cache HIT (stale) - showing stale data`);
        if (isMountedRef.current) {
          setData(cached.data);
          setIsStale(true);
        }
      }
    }
    const existingRequest = requestCache.get(cacheKey);
    if (existingRequest) {
      console.log(`\u{1F504} Fetch #${currentFetchId}: DEDUPLICATION - waiting for existing request`);
      existingRequest.then((result) => {
        if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
          setData(result);
          setLoading(false);
          setError(null);
          setIsStale(false);
          console.log(`\u2705 Fetch #${currentFetchId}: Got deduplicated result`);
        } else {
          console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring`);
        }
      }).catch((err) => {
        if (currentFetchId === fetchIdRef.current && isMountedRef.current) {
          const error2 = err instanceof Error ? err : new Error("Unknown error");
          setError(error2);
          setLoading(false);
          console.error(`\u274C Fetch #${currentFetchId}: Dedup ERROR:`, error2);
        }
      });
      return;
    }
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    const requestPromise = fetchFnRef.current(filters);
    requestCache.set(cacheKey, requestPromise);
    requestPromise.then((result) => {
      if (currentFetchId !== fetchIdRef.current) {
        console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring result`);
        return;
      }
      console.log(`\u2705 Fetch #${currentFetchId}: SUCCESS - caching data`);
      dataCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        staleTime
      });
      const now = Date.now();
      for (const [key, cached2] of dataCache.entries()) {
        if (now - cached2.timestamp > cacheTime) {
          dataCache.delete(key);
          console.log(`\u{1F9F9} Cleaned up old cache entry: ${key}`);
        }
      }
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setIsStale(false);
        setLoading(false);
      }
    }).catch((err) => {
      if (currentFetchId !== fetchIdRef.current) {
        console.log(`\u23ED\uFE0F Fetch #${currentFetchId}: Stale, ignoring error`);
        return;
      }
      const error2 = err instanceof Error ? err : new Error("Unknown error");
      if (isMountedRef.current) {
        setError(error2);
        setLoading(false);
      }
      console.error(`\u274C Fetch #${currentFetchId}: ERROR:`, error2);
    }).finally(() => {
      requestCache.delete(cacheKey);
    });
  }, [cacheKey, enabled, staleTime, cacheTime, refetchKey]);
  useEffect4(() => {
    if (refetchKey > 0 && !loading) {
      const timer = setTimeout(() => {
        setRefetchKey(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [refetchKey, loading]);
  useEffect4(() => {
    if (!refetchOnWindowFocus || !enabled)
      return;
    const handleFocus = () => {
      const cached = dataCache.get(cacheKey);
      if (!cached)
        return;
      const now = Date.now();
      const isCacheStale = now - cached.timestamp > cached.staleTime;
      if (isCacheStale) {
        console.log("\u{1F504} Window focus: Refetching stale data");
        filtersRef.current = "";
        fetchIdRef.current += 1;
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchOnWindowFocus, enabled, cacheKey, staleTime]);
  const refetch = useCallback6(async () => {
    if (!enabled)
      return;
    console.log("\u{1F504} Manual refetch triggered");
    dataCache.delete(cacheKey);
    filtersRef.current = "";
    fetchIdRef.current += 1;
    setRefetchKey((prev) => prev + 1);
  }, [enabled, cacheKey]);
  return {
    data,
    loading,
    error,
    refetch,
    isStale
  };
}
function clearApiCache() {
  requestCache.clear();
  dataCache.clear();
  console.log("\u{1F9F9} API Cache cleared");
}
function getApiCacheStats() {
  return {
    requestCacheSize: requestCache.size,
    dataCacheSize: dataCache.size,
    cacheKeys: Array.from(dataCache.keys())
  };
}

// src/hooks/useCustomersData.ts
import { customersApi } from "@rentalshop/utils";
function useCustomersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F465} useCustomersData: Fetching with filters:", filters2);
      const response = await customersApi.searchCustomers(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch customers");
      }
      const apiData = response.data;
      const transformed = {
        customers: apiData.customers || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useCustomersData: Success:", {
        customersCount: transformed.customers.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useMerchantsData.ts
import { authenticatedFetch, parseApiResponse } from "@rentalshop/utils";
import { apiUrls } from "@rentalshop/utils";
function useMerchantsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F3E2} useMerchantsData: Fetching with filters:", filters2);
      const limit = filters2.limit || 10;
      const page = filters2.page || 1;
      const queryParams = new URLSearchParams();
      queryParams.set("page", page.toString());
      queryParams.set("limit", limit.toString());
      if (filters2.search)
        queryParams.set("q", filters2.search);
      if (filters2.status && filters2.status !== "all")
        queryParams.set("status", filters2.status);
      if (filters2.plan && filters2.plan !== "all")
        queryParams.set("plan", filters2.plan);
      if (filters2.sortBy)
        queryParams.set("sortBy", filters2.sortBy);
      if (filters2.sortOrder)
        queryParams.set("sortOrder", filters2.sortOrder);
      const url = queryParams.toString() ? `${apiUrls.merchants.list}?${queryParams.toString()}` : apiUrls.merchants.list;
      const response = await authenticatedFetch(url);
      const result2 = await parseApiResponse(response);
      if (!result2.success || !result2.data) {
        throw new Error("Failed to fetch merchants");
      }
      const apiData = result2.data;
      console.log("\u{1F3E2} useMerchantsData - API Response:", {
        hasData: !!apiData,
        merchantsCount: apiData.merchants?.length || 0,
        total: apiData.total,
        totalPages: apiData.totalPages,
        currentPage: apiData.currentPage,
        limit: apiData.limit
      });
      const responsePage = apiData.page || apiData.currentPage || page;
      const responseLimit = apiData.limit || limit;
      const totalPages = apiData.totalPages || 1;
      const total = apiData.total || 0;
      const transformed = {
        merchants: apiData.merchants || [],
        total,
        page: responsePage,
        currentPage: responsePage,
        limit: responseLimit,
        hasMore: apiData.hasMore !== void 0 ? apiData.hasMore : responsePage < totalPages,
        totalPages
      };
      console.log("\u2705 useMerchantsData: Success:", {
        merchantsCount: transformed.merchants.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useOrdersData.ts
import { ordersApi } from "@rentalshop/utils";
function useOrdersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4E6} useOrdersData: Fetching with filters:", filters2);
      const response = await ordersApi.searchOrders(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch orders");
      }
      const apiData = response.data;
      const transformed = {
        orders: apiData.orders || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useOrdersData: Success:", {
        ordersCount: transformed.orders.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/usePagination.ts
import { useState as useState5, useCallback as useCallback7 } from "react";
import { PAGINATION } from "@rentalshop/constants";
function usePagination(config = {}) {
  const { initialLimit = PAGINATION.DEFAULT_PAGE_SIZE, initialOffset = 0 } = config;
  const [pagination, setPaginationState] = useState5({
    total: 0,
    limit: initialLimit,
    offset: initialOffset,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });
  const setPagination = useCallback7((newPagination) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
      currentPage: Math.floor((newPagination.offset ?? prev.offset) / (newPagination.limit ?? prev.limit)) + 1,
      totalPages: Math.ceil((newPagination.total ?? prev.total) / (newPagination.limit ?? prev.limit))
    }));
  }, []);
  const handlePageChange = useCallback7((page) => {
    const newOffset = (page - 1) * pagination.limit;
    setPagination({
      offset: newOffset,
      currentPage: page
    });
  }, [pagination.limit, setPagination]);
  const resetPagination = useCallback7(() => {
    setPagination({
      total: 0,
      offset: initialOffset,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    });
  }, [initialOffset, setPagination]);
  const updatePaginationFromResponse = useCallback7((response) => {
    setPagination({
      total: response.total,
      limit: response.limit,
      offset: response.offset,
      hasMore: response.hasMore ?? response.offset + response.limit < response.total,
      currentPage: Math.floor(response.offset / response.limit) + 1,
      totalPages: Math.ceil(response.total / response.limit)
    });
  }, [setPagination]);
  return {
    pagination,
    setPagination,
    handlePageChange,
    resetPagination,
    updatePaginationFromResponse
  };
}

// src/hooks/usePaymentsData.ts
import { paymentsApi } from "@rentalshop/utils";
function usePaymentsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4B0} usePaymentsData: Fetching with filters:", filters2);
      const response = await paymentsApi.getPayments();
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch payments");
      }
      const apiData = response.data;
      const paymentsArray = Array.isArray(apiData) ? apiData : apiData.payments || [];
      console.log("\u{1F4B0} usePaymentsData - API Response:", {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        paymentsCount: paymentsArray.length,
        firstPayment: paymentsArray[0]
      });
      let filteredPayments = paymentsArray;
      if (filters2.search) {
        const searchLower = filters2.search.toLowerCase();
        filteredPayments = filteredPayments.filter(
          (p2) => p2.subscription?.merchant?.name?.toLowerCase().includes(searchLower) || p2.invoiceNumber?.toLowerCase().includes(searchLower) || p2.transactionId?.toLowerCase().includes(searchLower)
        );
      }
      if (filters2.status && filters2.status !== "all") {
        filteredPayments = filteredPayments.filter(
          (p2) => p2.status?.toLowerCase() === filters2.status?.toLowerCase()
        );
      }
      if (filters2.dateFilter && filters2.dateFilter !== "all") {
        const now = /* @__PURE__ */ new Date();
        filteredPayments = filteredPayments.filter((p2) => {
          const paymentDate = new Date(p2.createdAt);
          if (filters2.dateFilter === "today") {
            return now.toDateString() === paymentDate.toDateString();
          } else if (filters2.dateFilter === "this_month") {
            return now.getMonth() === paymentDate.getMonth() && now.getFullYear() === paymentDate.getFullYear();
          } else if (filters2.dateFilter === "this_year") {
            return now.getFullYear() === paymentDate.getFullYear();
          }
          return true;
        });
      }
      if (filters2.sortBy) {
        filteredPayments.sort((a2, b2) => {
          const aVal = a2[filters2.sortBy];
          const bVal = b2[filters2.sortBy];
          const order = filters2.sortOrder === "desc" ? -1 : 1;
          return (aVal > bVal ? 1 : -1) * order;
        });
      }
      const page = filters2.page || 1;
      const limit = filters2.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
      const total = filteredPayments.length;
      const totalPages = Math.ceil(total / limit);
      const transformed = {
        payments: paginatedPayments,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: endIndex < total,
        totalPages
      };
      console.log("\u2705 usePaymentsData: Success:", {
        paymentsCount: transformed.payments.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/usePlansData.ts
import { plansApi } from "@rentalshop/utils";
function usePlansData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4CB} usePlansData: Fetching with filters:", filters2);
      const response = await plansApi.getPlans({
        page: filters2.page,
        limit: filters2.limit,
        search: filters2.search,
        isActive: filters2.status === "active" ? true : filters2.status === "inactive" ? false : void 0
      });
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch plans");
      }
      const apiData = response.data;
      const plansArray = Array.isArray(apiData) ? apiData : apiData.plans || [];
      console.log("\u{1F4CB} usePlansData - API Response:", {
        hasData: !!apiData,
        isArray: Array.isArray(apiData),
        plansCount: plansArray.length,
        total: apiData.total,
        page: apiData.page,
        totalPages: apiData.totalPages
      });
      const page = apiData.page || filters2.page || 1;
      const limit = apiData.limit || filters2.limit || 10;
      const total = apiData.total || plansArray.length;
      const totalPages = apiData.totalPages || Math.ceil(total / limit);
      const transformed = {
        plans: plansArray,
        total,
        page,
        currentPage: page,
        limit,
        hasMore: apiData.hasMore !== void 0 ? apiData.hasMore : page < totalPages,
        totalPages
      };
      console.log("\u2705 usePlansData: Success:", {
        plansCount: transformed.plans.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useProductAvailability.ts
import { useCallback as useCallback8 } from "react";
import { getUTCDateKey } from "@rentalshop/utils";
function useProductAvailability() {
  const calculateAvailability = useCallback8((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const pickup = new Date(pickupDate);
    const return_ = new Date(returnDate);
    if (pickup >= return_) {
      return {
        available: false,
        availableQuantity: 0,
        conflicts: [],
        message: "Return date must be after pickup date"
      };
    }
    const conflicts = existingOrders.filter((order) => {
      if (order.orderType !== "RENT")
        return false;
      const activeStatuses = ["RESERVED", "PICKUPED"];
      if (!activeStatuses.includes(order.status))
        return false;
      const hasProduct = order.orderItems.some((item) => item.productId === product.id);
      if (!hasProduct)
        return false;
      const orderPickup = new Date(order.pickupPlanAt);
      const orderReturn = new Date(order.returnPlanAt);
      return pickup <= orderReturn && return_ >= orderPickup || orderPickup <= return_ && orderReturn >= pickup;
    });
    const conflictingQuantity = conflicts.reduce((total, order) => {
      const orderItem = order.orderItems.find((item) => item.productId === product.id);
      return total + (orderItem?.quantity || 0);
    }, 0);
    const availableQuantity = Math.max(0, product.available - conflictingQuantity);
    const available = availableQuantity >= requestedQuantity;
    let message = "";
    if (available) {
      message = `Available: ${availableQuantity} units`;
    } else {
      message = `Only ${availableQuantity} units available (requested: ${requestedQuantity})`;
    }
    return {
      available,
      availableQuantity,
      conflicts,
      message
    };
  }, []);
  const isProductAvailable = useCallback8((product, pickupDate, returnDate, requestedQuantity, existingOrders = []) => {
    const status = calculateAvailability(product, pickupDate, returnDate, requestedQuantity, existingOrders);
    return status.available;
  }, [calculateAvailability]);
  const getAvailabilityForDateRange = useCallback8((product, startDate, endDate, existingOrders = []) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = getUTCDateKey(date);
      const status = calculateAvailability(
        product,
        dateStr,
        dateStr,
        1,
        existingOrders
      );
      results.push({
        date: dateStr,
        available: status.availableQuantity,
        conflicts: status.conflicts
      });
    }
    return results;
  }, [calculateAvailability]);
  return {
    calculateAvailability,
    isProductAvailable,
    getAvailabilityForDateRange
  };
}

// src/hooks/useProductsData.ts
import { productsApi } from "@rentalshop/utils";
function useProductsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4E6} useProductsData: Fetching with filters:", filters2);
      const response = await productsApi.searchProducts(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch products");
      }
      const apiData = response.data;
      const transformed = {
        products: apiData.products || [],
        total: apiData.total || 0,
        page: apiData.page || 1,
        currentPage: apiData.page || 1,
        // Alias for compatibility
        limit: apiData.limit || 25,
        hasMore: apiData.hasMore || false,
        totalPages: apiData.totalPages || 1
      };
      console.log("\u2705 useProductsData: Success:", {
        productsCount: transformed.products.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useSubscriptionsData.ts
import { subscriptionsApi } from "@rentalshop/utils";
function useSubscriptionsData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F4B3} useSubscriptionsData: Fetching with filters:", filters2);
      const limit = filters2.limit || 20;
      const page = filters2.page || 1;
      const searchFilters = {
        limit,
        page,
        search: filters2.search,
        status: filters2.status,
        merchantId: filters2.merchant ? parseInt(filters2.merchant) : void 0,
        planId: filters2.plan ? parseInt(filters2.plan) : void 0
      };
      const response = await subscriptionsApi.search(searchFilters);
      if (!response.success) {
        throw new Error("Failed to fetch subscriptions");
      }
      const responseData = response;
      let subscriptionsArray = [];
      let total = 0;
      let totalPages = 1;
      if (Array.isArray(responseData.data)) {
        subscriptionsArray = responseData.data;
      } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
        subscriptionsArray = responseData.data.data;
      } else if (responseData.data?.subscriptions && Array.isArray(responseData.data.subscriptions)) {
        subscriptionsArray = responseData.data.subscriptions;
      } else {
        subscriptionsArray = [];
      }
      let responsePage = page;
      let responseLimit = limit;
      if (responseData.pagination) {
        total = responseData.pagination.total || subscriptionsArray.length;
        responsePage = responseData.pagination.page || page;
        responseLimit = responseData.pagination.limit || limit;
        totalPages = responseData.pagination.totalPages || Math.ceil(total / responseLimit);
      } else if (responseData.data?.pagination) {
        total = responseData.data.pagination.total || subscriptionsArray.length;
        responsePage = responseData.data.pagination.page || page;
        responseLimit = responseData.data.pagination.limit || limit;
        totalPages = responseData.data.pagination.totalPages || Math.ceil(total / responseLimit);
      } else if (responseData.data?.total !== void 0) {
        total = responseData.data.total || subscriptionsArray.length;
        responsePage = responseData.data.page || page;
        responseLimit = responseData.data.limit || limit;
        totalPages = responseData.data.totalPages || Math.ceil(total / responseLimit);
      } else {
        total = subscriptionsArray.length;
        totalPages = Math.ceil(total / limit);
      }
      console.log("\u{1F4B3} useSubscriptionsData - Parsed pagination:", {
        total,
        responsePage,
        responseLimit,
        totalPages,
        subscriptionsCount: subscriptionsArray.length
      });
      const transformed = {
        subscriptions: subscriptionsArray,
        total,
        page: responsePage,
        currentPage: responsePage,
        limit: responseLimit,
        hasMore: responsePage < totalPages,
        totalPages
      };
      console.log("\u2705 useSubscriptionsData: Success:", {
        subscriptionsCount: transformed.subscriptions.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useSubscriptionError.ts
import { useState as useState6, useCallback as useCallback9 } from "react";
import { useToasts } from "@rentalshop/ui";
function useSubscriptionError() {
  const [error, setError] = useState6(null);
  const { addToast } = useToasts();
  const handleSubscriptionError = useCallback9((error2) => {
    console.error("Subscription error:", error2);
    if (error2?.error === "SUBSCRIPTION_ERROR" || error2?.code === "SUBSCRIPTION_REQUIRED") {
      const subscriptionError = {
        message: error2.message || "Subscription error occurred",
        subscriptionStatus: error2.subscriptionStatus,
        merchantStatus: error2.merchantStatus,
        code: error2.code
      };
      setError(subscriptionError);
      showSubscriptionError(subscriptionError);
    } else {
      addToast("error", "Error", error2?.message || "An error occurred");
    }
  }, [addToast]);
  const showSubscriptionError = useCallback9((error2) => {
    const { subscriptionStatus, merchantStatus } = error2;
    let message = error2.message;
    let action = "";
    if (subscriptionStatus === "paused") {
      message = "Your subscription is paused. Some features may be limited.";
      action = "Resume your subscription to access all features.";
    } else if (subscriptionStatus === "expired") {
      message = "Your subscription has expired. Please renew to continue.";
      action = "Choose a new plan to continue using the service.";
    } else if (subscriptionStatus === "cancelled") {
      message = "Your subscription has been cancelled.";
      action = "Choose a new plan to reactivate your account.";
    } else if (subscriptionStatus === "past_due") {
      message = "Payment is past due. Please update your payment method.";
      action = "Update your payment information to avoid service interruption.";
    } else if (merchantStatus && !["active"].includes(merchantStatus)) {
      message = `Your merchant account is ${merchantStatus}. Please contact support.`;
      action = "Contact support to resolve account issues.";
    }
    addToast("error", "Subscription Error", action ? `${message}

${action}` : message, 8e3);
  }, [addToast]);
  const clearError = useCallback9(() => {
    setError(null);
  }, []);
  return {
    handleSubscriptionError,
    showSubscriptionError,
    clearError,
    error
  };
}

// src/hooks/useThrottledSearch.ts
import { useState as useState7, useEffect as useEffect5, useCallback as useCallback10, useRef as useRef2 } from "react";
function useThrottledSearch(options) {
  const { delay, minLength, onSearch } = options;
  const [query, setQuery] = useState7("");
  const [isSearching, setIsSearching] = useState7(false);
  const timeoutRef = useRef2(null);
  const isSearchingRef = useRef2(false);
  const isInitialRender = useRef2(true);
  const onSearchRef = useRef2(onSearch);
  useEffect5(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);
  const handleSearchChange = useCallback10((value) => {
    console.log("\u{1F50D} useThrottledSearch: handleSearchChange called with:", value);
    setQuery(value);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (value.length >= minLength) {
      console.log("\u{1F50D} useThrottledSearch: Query meets minLength, setting up timeout");
      setIsSearching(true);
      isSearchingRef.current = true;
      timeoutRef.current = setTimeout(() => {
        console.log("\u{1F50D} useThrottledSearch: Timeout executing, calling onSearch with:", value);
        onSearchRef.current(value);
        setIsSearching(false);
        isSearchingRef.current = false;
      }, delay);
    } else if (value.length === 0) {
      console.log("\u{1F50D} useThrottledSearch: Query is empty, clearing search");
      setIsSearching(false);
      isSearchingRef.current = false;
      if (!isInitialRender.current) {
        onSearchRef.current("");
      }
    } else {
      console.log("\u{1F50D} useThrottledSearch: Query too short, not searching");
      setIsSearching(false);
      isSearchingRef.current = false;
    }
  }, [delay, minLength]);
  const clearSearch = useCallback10(() => {
    setQuery("");
    setIsSearching(false);
    isSearchingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!isInitialRender.current) {
      onSearchRef.current("");
    }
  }, []);
  const cleanup = useCallback10(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  useEffect5(() => {
    isInitialRender.current = false;
    return cleanup;
  }, [cleanup]);
  return {
    query,
    isSearching,
    handleSearchChange,
    clearSearch,
    cleanup,
    setQuery
  };
}

// src/hooks/useToast.ts
import { useState as useState8, useCallback as useCallback11 } from "react";
import {
  analyzeError,
  withErrorHandlingForUI,
  getToastType
} from "@rentalshop/utils";
import { useToasts as useToasts2 } from "@rentalshop/ui";
var useErrorHandler = (options = {}) => {
  const {
    onLogin,
    onRetry,
    onDismiss,
    autoHandleAuth = true
  } = options;
  const [isLoading, setIsLoading] = useState8(false);
  const { addToast } = useToasts2();
  const handleError = useCallback11((error) => {
    const errorInfo = analyzeError(error);
    return errorInfo;
  }, []);
  const showErrorToast = useCallback11((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
  }, [addToast]);
  const handleApiCall = useCallback11(async (apiCall) => {
    setIsLoading(true);
    try {
      const result = await withErrorHandlingForUI(apiCall);
      if (result.error) {
        showErrorToast(result.error);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);
  const retry = useCallback11(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);
  const login = useCallback11(() => {
    if (onLogin) {
      onLogin();
    } else if (typeof window !== "undefined") {
    }
  }, [onLogin]);
  return {
    isLoading,
    handleError,
    handleApiCall,
    retry,
    login,
    showErrorToast
  };
};
var useSimpleErrorHandler = () => {
  const { addToast } = useToasts2();
  const handleError = useCallback11((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);
  return {
    handleError
  };
};
var useToastHandler = () => {
  const { addToast } = useToasts2();
  const showError = useCallback11((title, message) => {
    addToast("error", title, message, 0);
  }, [addToast]);
  const showSuccess = useCallback11((title, message) => {
    addToast("success", title, message, 5e3);
  }, [addToast]);
  const showWarning = useCallback11((title, message) => {
    addToast("warning", title, message, 5e3);
  }, [addToast]);
  const showInfo = useCallback11((title, message) => {
    addToast("info", title, message, 5e3);
  }, [addToast]);
  const handleError = useCallback11((error) => {
    const errorInfo = analyzeError(error);
    const toastType = getToastType(errorInfo.type);
    let toastMessage = errorInfo.message;
    if (errorInfo.showLoginButton) {
      if (errorInfo.type === "auth") {
        toastMessage += " Click to log in again.";
      } else if (errorInfo.type === "permission") {
        toastMessage += " Click to log in with a different account.";
      } else if (errorInfo.type === "subscription") {
        toastMessage += " Click to log in and upgrade your plan.";
      } else {
        toastMessage += " Click to log in.";
      }
    }
    addToast(toastType, errorInfo.title, toastMessage, 0);
    return errorInfo;
  }, [addToast]);
  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    handleError
  };
};

// src/hooks/useLocale.ts
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
function useLocale() {
  const locale = Z();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const setLocale = (newLocale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };
  return {
    locale,
    setLocale,
    isPending
  };
}

// src/hooks/useUserRole.ts
function useUserRole() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isAdmin: role === "ADMIN",
    isMerchant: role === "MERCHANT",
    isOutletAdmin: role === "OUTLET_ADMIN",
    isOutletStaff: role === "OUTLET_STAFF",
    // Permission checks
    canManageUsers: role === "ADMIN" || role === "MERCHANT" || role === "OUTLET_ADMIN",
    canManageProducts: role === "ADMIN" || role === "MERCHANT" || role === "OUTLET_ADMIN",
    canManageCategories: role === "ADMIN" || role === "MERCHANT",
    canManageOutlets: role === "ADMIN" || role === "MERCHANT",
    canManageSubscriptions: role === "ADMIN" || role === "MERCHANT",
    canViewBilling: role === "ADMIN" || role === "MERCHANT",
    canExportData: role === "ADMIN" || role === "MERCHANT"
  };
}
function useCanManageProducts() {
  const { canManageProducts } = useUserRole();
  return canManageProducts;
}
function useCanManageCategories() {
  const { canManageCategories } = useUserRole();
  return canManageCategories;
}
function useCanManageUsers() {
  const { canManageUsers } = useUserRole();
  return canManageUsers;
}
function useCanManageOutlets() {
  const { canManageOutlets } = useUserRole();
  return canManageOutlets;
}
function useCanManageSubscriptions() {
  const { canManageSubscriptions } = useUserRole();
  return canManageSubscriptions;
}
function useCanViewBilling() {
  const { canViewBilling } = useUserRole();
  return canViewBilling;
}
function useCanExportData() {
  const { canExportData } = useUserRole();
  return canExportData;
}

// src/hooks/useUsersData.ts
import { usersApi } from "@rentalshop/utils";
function useUsersData(options) {
  const { filters, enabled = true } = options;
  const result = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F464} useUsersData: Fetching with filters:", filters2);
      const response = await usersApi.searchUsers(filters2);
      if (!response.success || !response.data) {
        throw new Error("Failed to fetch users");
      }
      const apiData = response.data;
      let usersData;
      let total;
      let page;
      let limit;
      let hasMore;
      let totalPages;
      if (Array.isArray(apiData)) {
        const pagination = response.pagination || {};
        usersData = apiData;
        total = pagination.total || apiData.length;
        page = pagination.page || 1;
        limit = pagination.limit || 25;
        totalPages = Math.ceil(total / limit);
        hasMore = pagination.hasMore !== void 0 ? pagination.hasMore : page < totalPages;
      } else {
        usersData = apiData.users || [];
        total = apiData.total || 0;
        page = apiData.page || 1;
        limit = apiData.limit || 25;
        totalPages = apiData.totalPages || Math.ceil(total / limit);
        hasMore = apiData.hasMore !== void 0 ? apiData.hasMore : page < totalPages;
      }
      const transformed = {
        users: usersData,
        total,
        page,
        currentPage: page,
        // Alias for compatibility
        limit,
        hasMore,
        totalPages
      };
      console.log("\u2705 useUsersData: Success:", {
        usersCount: transformed.users.length,
        total: transformed.total,
        page: transformed.page
      });
      return transformed;
    },
    enabled,
    staleTime: 3e4,
    // 30 seconds cache
    cacheTime: 3e5,
    // 5 minutes
    refetchOnWindowFocus: false
  });
  return result;
}

// src/hooks/useOptimisticNavigation.ts
import { useState as useState9, useCallback as useCallback12, useEffect as useEffect6, useTransition as useTransition2 } from "react";
import { usePathname as usePathname2, useRouter as useRouter2 } from "next/navigation";
function useOptimisticNavigation() {
  const [navigatingTo, setNavigatingTo] = useState9(null);
  const [isPending, startTransition] = useTransition2();
  const pathname = usePathname2();
  const router = useRouter2();
  useEffect6(() => {
    if (navigatingTo && pathname === navigatingTo) {
      const timer = setTimeout(() => {
        setNavigatingTo(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, navigatingTo]);
  const navigate = useCallback12((path) => {
    setNavigatingTo(path);
    router.push(path, { scroll: false });
  }, [router]);
  const prefetch = useCallback12((path) => {
    router.prefetch(path);
  }, [router]);
  return {
    navigate,
    navigatingTo,
    isPending,
    prefetch
  };
}

// src/hooks/useApiError.ts
function useApiError() {
  const t3 = useErrorTranslations();
  const translateError = (response) => {
    if (response?.response?.data) {
      return translateError(response.response.data);
    }
    if (response?.code) {
      const translated = t3(response.code);
      if (translated === response.code && response.message) {
        return response.message;
      }
      return translated;
    }
    if (response?.message) {
      return response.message;
    }
    if (typeof response === "string") {
      return response;
    }
    return t3("UNKNOWN_ERROR");
  };
  const translateSuccess = (response) => {
    if (response?.code) {
      const translated = t3(response.code);
      if (translated === response.code && response.message) {
        return response.message;
      }
      return translated;
    }
    if (response?.message) {
      return response.message;
    }
    return t3("UNKNOWN_ERROR");
  };
  const translateResponse = (response) => {
    if (response?.success === false) {
      return translateError(response);
    }
    return translateSuccess(response);
  };
  const isError = (response) => {
    return response?.success === false || !!response?.error || !!response?.response?.data?.error;
  };
  const getErrorCode = (response) => {
    if (response?.response?.data?.code) {
      return response.response.data.code;
    }
    if (response?.code) {
      return response.code;
    }
    return null;
  };
  return {
    translateError,
    translateSuccess,
    translateResponse,
    isError,
    getErrorCode
  };
}
function extractErrorMessage(error) {
  if (error?.response?.data) {
    const data = error.response.data;
    return data.message || data.error || "An error occurred";
  }
  if (error?.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}
function extractErrorCode(error) {
  if (error?.response?.data?.code) {
    return error.response.data.code;
  }
  if (error?.code) {
    return error.code;
  }
  return null;
}
function isErrorCode(error, code) {
  return extractErrorCode(error) === code;
}
var ErrorCheckers = {
  isUnauthorized: (error) => isErrorCode(error, "UNAUTHORIZED") || isErrorCode(error, "INVALID_TOKEN"),
  isForbidden: (error) => isErrorCode(error, "FORBIDDEN"),
  isNotFound: (error) => isErrorCode(error, "NOT_FOUND") || extractErrorCode(error)?.includes("_NOT_FOUND"),
  isValidationError: (error) => isErrorCode(error, "VALIDATION_ERROR"),
  isDuplicateEntry: (error) => isErrorCode(error, "DUPLICATE_ENTRY") || extractErrorCode(error)?.includes("_EXISTS"),
  isNetworkError: (error) => isErrorCode(error, "NETWORK_ERROR") || error?.message?.includes("Network")
};

// src/hooks/useFiltersData.ts
import { outletsApi, categoriesApi } from "@rentalshop/utils";
function useOutletsData() {
  const { data, loading, error } = useDedupedApi({
    filters: {},
    // No filters needed for outlets
    fetchFn: async () => {
      console.log("\u{1F50D} useOutletsData: Fetching outlets...");
      const response = await outletsApi.getOutlets();
      if (response.success && response.data) {
        const outletsData = response.data.outlets || [];
        console.log("\u2705 useOutletsData: Transformed data:", {
          isArray: Array.isArray(outletsData),
          count: outletsData.length
        });
        return { outlets: outletsData };
      }
      throw new Error("Failed to fetch outlets");
    },
    enabled: true,
    staleTime: 3e5,
    // 5 minutes - outlets don't change often
    cacheTime: 6e5,
    // 10 minutes
    refetchOnMount: false,
    // Don't refetch on every mount
    refetchOnWindowFocus: false
  });
  return {
    outlets: data?.outlets || [],
    loading,
    error
  };
}
function useCategoriesData() {
  const { data, loading, error } = useDedupedApi({
    filters: {},
    // No filters needed for categories
    fetchFn: async () => {
      console.log("\u{1F50D} useCategoriesData: Fetching categories...");
      const response = await categoriesApi.getCategories();
      if (response.success && response.data) {
        const categoriesData = response.data;
        console.log("\u2705 useCategoriesData: API response data:", {
          isArray: Array.isArray(categoriesData),
          count: categoriesData.length
        });
        return categoriesData;
      }
      throw new Error("Failed to fetch categories");
    },
    enabled: true,
    staleTime: 3e5,
    // 5 minutes - categories don't change often
    cacheTime: 6e5,
    // 10 minutes
    refetchOnMount: false,
    // Don't refetch on every mount
    refetchOnWindowFocus: false
  });
  console.log("\u{1F50D} useCategoriesData return:", {
    data,
    isArray: Array.isArray(data),
    type: typeof data,
    length: data?.length
  });
  const categories = Array.isArray(data) ? data : [];
  return {
    categories,
    loading,
    error
  };
}
function useOutletsWithFilters(options) {
  const { filters, enabled = true, debounceSearch = true, debounceMs = 500 } = options;
  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F50D} useOutletsWithFilters: Fetching with filters:", filters2);
      const response = await outletsApi.getOutlets(filters2);
      if (response.success && response.data) {
        const apiData = response.data;
        return {
          outlets: apiData.outlets || [],
          total: apiData.total || 0,
          totalPages: apiData.totalPages || 1,
          currentPage: apiData.page || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      throw new Error("Failed to fetch outlets");
    },
    enabled,
    staleTime: debounceSearch ? 5e3 : 3e4,
    cacheTime: 3e5,
    refetchOnMount: false,
    // ✅ Changed to false to prevent unnecessary refetches
    refetchOnWindowFocus: false
  });
  return {
    data,
    loading,
    error,
    refetch
  };
}
function useCategoriesWithFilters(options) {
  const { filters, enabled = true, debounceSearch = false, debounceMs = 0 } = options;
  const { data, loading, error, refetch } = useDedupedApi({
    filters,
    fetchFn: async (filters2) => {
      console.log("\u{1F50D} useCategoriesWithFilters: Fetching with filters:", filters2);
      const response = await categoriesApi.searchCategories(filters2);
      if (response.success && response.data) {
        const apiData = response.data;
        return {
          categories: apiData.categories || [],
          total: apiData.total || 0,
          currentPage: apiData.page || 1,
          totalPages: apiData.totalPages || 1,
          limit: apiData.limit || 25,
          hasMore: apiData.hasMore || false
        };
      }
      throw new Error("Failed to fetch categories");
    },
    enabled,
    staleTime: debounceSearch ? 5e3 : 3e4,
    cacheTime: 3e5,
    refetchOnMount: false,
    // ✅ Changed to false to prevent unnecessary refetches
    refetchOnWindowFocus: false
  });
  return {
    data,
    loading,
    error,
    refetch
  };
}
export {
  CurrencyProvider,
  ErrorCheckers,
  clearApiCache,
  extractErrorCode,
  extractErrorMessage,
  getApiCacheStats,
  isErrorCode,
  useApiError,
  useAuth,
  useAuthErrorHandler,
  useAuthTranslations,
  useCalendarTranslations,
  useCanExportData,
  useCanManageCategories,
  useCanManageOutlets,
  useCanManageProducts,
  useCanManageSubscriptions,
  useCanManageUsers,
  useCanPerform,
  useCanViewBilling,
  useCategoriesData,
  useCategoriesTranslations,
  useCategoriesWithFilters,
  useCommonTranslations,
  useCurrency,
  useCustomerTranslations,
  useCustomersData,
  useDashboardTranslations,
  useDedupedApi,
  useErrorHandler,
  useErrorTranslations,
  useLocale,
  useMerchantsData,
  useOptimisticNavigation,
  useOrderTranslations,
  useOrdersData,
  useOutletsData,
  useOutletsTranslations,
  useOutletsWithFilters,
  usePagination,
  usePaymentsData,
  usePlansData,
  usePlansTranslations,
  useProductAvailability,
  useProductTranslations,
  useProductsData,
  useSettingsTranslations,
  useSimpleErrorHandler,
  useSubscriptionError,
  useSubscriptionStatusInfo,
  useSubscriptionTranslations,
  useSubscriptionsData,
  useThrottledSearch,
  useToastHandler,
  useUserRole,
  useUsersData,
  useUsersTranslations,
  useValidationTranslations
};
//# sourceMappingURL=index.mjs.map