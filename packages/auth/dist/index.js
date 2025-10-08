"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/next/dist/shared/lib/i18n/detect-domain-locale.js
var require_detect_domain_locale = __commonJS({
  "../../node_modules/next/dist/shared/lib/i18n/detect-domain-locale.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "detectDomainLocale", {
      enumerable: true,
      get: function() {
        return detectDomainLocale;
      }
    });
    function detectDomainLocale(domainItems, hostname, detectedLocale) {
      if (!domainItems)
        return;
      if (detectedLocale) {
        detectedLocale = detectedLocale.toLowerCase();
      }
      for (const item of domainItems) {
        var _item_domain, _item_locales;
        const domainHostname = (_item_domain = item.domain) == null ? void 0 : _item_domain.split(":", 1)[0].toLowerCase();
        if (hostname === domainHostname || detectedLocale === item.defaultLocale.toLowerCase() || ((_item_locales = item.locales) == null ? void 0 : _item_locales.some((locale) => locale.toLowerCase() === detectedLocale))) {
          return item;
        }
      }
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/remove-trailing-slash.js
var require_remove_trailing_slash = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/remove-trailing-slash.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "removeTrailingSlash", {
      enumerable: true,
      get: function() {
        return removeTrailingSlash;
      }
    });
    function removeTrailingSlash(route) {
      return route.replace(/\/$/, "") || "/";
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/parse-path.js
var require_parse_path = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/parse-path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "parsePath", {
      enumerable: true,
      get: function() {
        return parsePath;
      }
    });
    function parsePath(path) {
      const hashIndex = path.indexOf("#");
      const queryIndex = path.indexOf("?");
      const hasQuery = queryIndex > -1 && (hashIndex < 0 || queryIndex < hashIndex);
      if (hasQuery || hashIndex > -1) {
        return {
          pathname: path.substring(0, hasQuery ? queryIndex : hashIndex),
          query: hasQuery ? path.substring(queryIndex, hashIndex > -1 ? hashIndex : void 0) : "",
          hash: hashIndex > -1 ? path.slice(hashIndex) : ""
        };
      }
      return {
        pathname: path,
        query: "",
        hash: ""
      };
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/add-path-prefix.js
var require_add_path_prefix = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/add-path-prefix.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "addPathPrefix", {
      enumerable: true,
      get: function() {
        return addPathPrefix;
      }
    });
    var _parsepath = require_parse_path();
    function addPathPrefix(path, prefix) {
      if (!path.startsWith("/") || !prefix) {
        return path;
      }
      const { pathname, query, hash: hash2 } = (0, _parsepath.parsePath)(path);
      return "" + prefix + pathname + query + hash2;
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/add-path-suffix.js
var require_add_path_suffix = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/add-path-suffix.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "addPathSuffix", {
      enumerable: true,
      get: function() {
        return addPathSuffix;
      }
    });
    var _parsepath = require_parse_path();
    function addPathSuffix(path, suffix) {
      if (!path.startsWith("/") || !suffix) {
        return path;
      }
      const { pathname, query, hash: hash2 } = (0, _parsepath.parsePath)(path);
      return "" + pathname + suffix + query + hash2;
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/path-has-prefix.js
var require_path_has_prefix = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/path-has-prefix.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "pathHasPrefix", {
      enumerable: true,
      get: function() {
        return pathHasPrefix;
      }
    });
    var _parsepath = require_parse_path();
    function pathHasPrefix(path, prefix) {
      if (typeof path !== "string") {
        return false;
      }
      const { pathname } = (0, _parsepath.parsePath)(path);
      return pathname === prefix || pathname.startsWith(prefix + "/");
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/add-locale.js
var require_add_locale = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/add-locale.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "addLocale", {
      enumerable: true,
      get: function() {
        return addLocale;
      }
    });
    var _addpathprefix = require_add_path_prefix();
    var _pathhasprefix = require_path_has_prefix();
    function addLocale(path, locale, defaultLocale, ignorePrefix) {
      if (!locale || locale === defaultLocale)
        return path;
      const lower = path.toLowerCase();
      if (!ignorePrefix) {
        if ((0, _pathhasprefix.pathHasPrefix)(lower, "/api"))
          return path;
        if ((0, _pathhasprefix.pathHasPrefix)(lower, "/" + locale.toLowerCase()))
          return path;
      }
      return (0, _addpathprefix.addPathPrefix)(path, "/" + locale);
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/format-next-pathname-info.js
var require_format_next_pathname_info = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/format-next-pathname-info.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "formatNextPathnameInfo", {
      enumerable: true,
      get: function() {
        return formatNextPathnameInfo;
      }
    });
    var _removetrailingslash = require_remove_trailing_slash();
    var _addpathprefix = require_add_path_prefix();
    var _addpathsuffix = require_add_path_suffix();
    var _addlocale = require_add_locale();
    function formatNextPathnameInfo(info) {
      let pathname = (0, _addlocale.addLocale)(info.pathname, info.locale, info.buildId ? void 0 : info.defaultLocale, info.ignorePrefix);
      if (info.buildId || !info.trailingSlash) {
        pathname = (0, _removetrailingslash.removeTrailingSlash)(pathname);
      }
      if (info.buildId) {
        pathname = (0, _addpathsuffix.addPathSuffix)((0, _addpathprefix.addPathPrefix)(pathname, "/_next/data/" + info.buildId), info.pathname === "/" ? "index.json" : ".json");
      }
      pathname = (0, _addpathprefix.addPathPrefix)(pathname, info.basePath);
      return !info.buildId && info.trailingSlash ? !pathname.endsWith("/") ? (0, _addpathsuffix.addPathSuffix)(pathname, "/") : pathname : (0, _removetrailingslash.removeTrailingSlash)(pathname);
    }
  }
});

// ../../node_modules/next/dist/shared/lib/get-hostname.js
var require_get_hostname = __commonJS({
  "../../node_modules/next/dist/shared/lib/get-hostname.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "getHostname", {
      enumerable: true,
      get: function() {
        return getHostname;
      }
    });
    function getHostname(parsed, headers) {
      let hostname;
      if ((headers == null ? void 0 : headers.host) && !Array.isArray(headers.host)) {
        hostname = headers.host.toString().split(":", 1)[0];
      } else if (parsed.hostname) {
        hostname = parsed.hostname;
      } else
        return;
      return hostname.toLowerCase();
    }
  }
});

// ../../node_modules/next/dist/shared/lib/i18n/normalize-locale-path.js
var require_normalize_locale_path = __commonJS({
  "../../node_modules/next/dist/shared/lib/i18n/normalize-locale-path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "normalizeLocalePath", {
      enumerable: true,
      get: function() {
        return normalizeLocalePath;
      }
    });
    function normalizeLocalePath(pathname, locales) {
      let detectedLocale;
      const pathnameParts = pathname.split("/");
      (locales || []).some((locale) => {
        if (pathnameParts[1] && pathnameParts[1].toLowerCase() === locale.toLowerCase()) {
          detectedLocale = locale;
          pathnameParts.splice(1, 1);
          pathname = pathnameParts.join("/") || "/";
          return true;
        }
        return false;
      });
      return {
        pathname,
        detectedLocale
      };
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/remove-path-prefix.js
var require_remove_path_prefix = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/remove-path-prefix.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "removePathPrefix", {
      enumerable: true,
      get: function() {
        return removePathPrefix;
      }
    });
    var _pathhasprefix = require_path_has_prefix();
    function removePathPrefix(path, prefix) {
      if (!(0, _pathhasprefix.pathHasPrefix)(path, prefix)) {
        return path;
      }
      const withoutPrefix = path.slice(prefix.length);
      if (withoutPrefix.startsWith("/")) {
        return withoutPrefix;
      }
      return "/" + withoutPrefix;
    }
  }
});

// ../../node_modules/next/dist/shared/lib/router/utils/get-next-pathname-info.js
var require_get_next_pathname_info = __commonJS({
  "../../node_modules/next/dist/shared/lib/router/utils/get-next-pathname-info.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "getNextPathnameInfo", {
      enumerable: true,
      get: function() {
        return getNextPathnameInfo;
      }
    });
    var _normalizelocalepath = require_normalize_locale_path();
    var _removepathprefix = require_remove_path_prefix();
    var _pathhasprefix = require_path_has_prefix();
    function getNextPathnameInfo(pathname, options) {
      var _options_nextConfig;
      const { basePath, i18n, trailingSlash } = (_options_nextConfig = options.nextConfig) != null ? _options_nextConfig : {};
      const info = {
        pathname,
        trailingSlash: pathname !== "/" ? pathname.endsWith("/") : trailingSlash
      };
      if (basePath && (0, _pathhasprefix.pathHasPrefix)(info.pathname, basePath)) {
        info.pathname = (0, _removepathprefix.removePathPrefix)(info.pathname, basePath);
        info.basePath = basePath;
      }
      let pathnameNoDataPrefix = info.pathname;
      if (info.pathname.startsWith("/_next/data/") && info.pathname.endsWith(".json")) {
        const paths = info.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
        const buildId = paths[0];
        info.buildId = buildId;
        pathnameNoDataPrefix = paths[1] !== "index" ? "/" + paths.slice(1).join("/") : "/";
        if (options.parseData === true) {
          info.pathname = pathnameNoDataPrefix;
        }
      }
      if (i18n) {
        let result = options.i18nProvider ? options.i18nProvider.analyze(info.pathname) : (0, _normalizelocalepath.normalizeLocalePath)(info.pathname, i18n.locales);
        info.locale = result.detectedLocale;
        var _result_pathname;
        info.pathname = (_result_pathname = result.pathname) != null ? _result_pathname : info.pathname;
        if (!result.detectedLocale && info.buildId) {
          result = options.i18nProvider ? options.i18nProvider.analyze(pathnameNoDataPrefix) : (0, _normalizelocalepath.normalizeLocalePath)(pathnameNoDataPrefix, i18n.locales);
          if (result.detectedLocale) {
            info.locale = result.detectedLocale;
          }
        }
      }
      return info;
    }
  }
});

// ../../node_modules/next/dist/server/web/next-url.js
var require_next_url = __commonJS({
  "../../node_modules/next/dist/server/web/next-url.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "NextURL", {
      enumerable: true,
      get: function() {
        return NextURL;
      }
    });
    var _detectdomainlocale = require_detect_domain_locale();
    var _formatnextpathnameinfo = require_format_next_pathname_info();
    var _gethostname = require_get_hostname();
    var _getnextpathnameinfo = require_get_next_pathname_info();
    var REGEX_LOCALHOST_HOSTNAME = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
    function parseURL(url, base) {
      return new URL(String(url).replace(REGEX_LOCALHOST_HOSTNAME, "localhost"), base && String(base).replace(REGEX_LOCALHOST_HOSTNAME, "localhost"));
    }
    var Internal = Symbol("NextURLInternal");
    var NextURL = class _NextURL {
      constructor(input, baseOrOpts, opts) {
        let base;
        let options;
        if (typeof baseOrOpts === "object" && "pathname" in baseOrOpts || typeof baseOrOpts === "string") {
          base = baseOrOpts;
          options = opts || {};
        } else {
          options = opts || baseOrOpts || {};
        }
        this[Internal] = {
          url: parseURL(input, base ?? options.base),
          options,
          basePath: ""
        };
        this.analyze();
      }
      analyze() {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig, _this_Internal_domainLocale, _this_Internal_options_nextConfig_i18n1, _this_Internal_options_nextConfig1;
        const info = (0, _getnextpathnameinfo.getNextPathnameInfo)(this[Internal].url.pathname, {
          nextConfig: this[Internal].options.nextConfig,
          parseData: !process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE,
          i18nProvider: this[Internal].options.i18nProvider
        });
        const hostname = (0, _gethostname.getHostname)(this[Internal].url, this[Internal].options.headers);
        this[Internal].domainLocale = this[Internal].options.i18nProvider ? this[Internal].options.i18nProvider.detectDomainLocale(hostname) : (0, _detectdomainlocale.detectDomainLocale)((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.domains, hostname);
        const defaultLocale = ((_this_Internal_domainLocale = this[Internal].domainLocale) == null ? void 0 : _this_Internal_domainLocale.defaultLocale) || ((_this_Internal_options_nextConfig1 = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n1 = _this_Internal_options_nextConfig1.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n1.defaultLocale);
        this[Internal].url.pathname = info.pathname;
        this[Internal].defaultLocale = defaultLocale;
        this[Internal].basePath = info.basePath ?? "";
        this[Internal].buildId = info.buildId;
        this[Internal].locale = info.locale ?? defaultLocale;
        this[Internal].trailingSlash = info.trailingSlash;
      }
      formatPathname() {
        return (0, _formatnextpathnameinfo.formatNextPathnameInfo)({
          basePath: this[Internal].basePath,
          buildId: this[Internal].buildId,
          defaultLocale: !this[Internal].options.forceLocale ? this[Internal].defaultLocale : void 0,
          locale: this[Internal].locale,
          pathname: this[Internal].url.pathname,
          trailingSlash: this[Internal].trailingSlash
        });
      }
      formatSearch() {
        return this[Internal].url.search;
      }
      get buildId() {
        return this[Internal].buildId;
      }
      set buildId(buildId) {
        this[Internal].buildId = buildId;
      }
      get locale() {
        return this[Internal].locale ?? "";
      }
      set locale(locale) {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig;
        if (!this[Internal].locale || !((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.locales.includes(locale))) {
          throw new TypeError(`The NextURL configuration includes no locale "${locale}"`);
        }
        this[Internal].locale = locale;
      }
      get defaultLocale() {
        return this[Internal].defaultLocale;
      }
      get domainLocale() {
        return this[Internal].domainLocale;
      }
      get searchParams() {
        return this[Internal].url.searchParams;
      }
      get host() {
        return this[Internal].url.host;
      }
      set host(value) {
        this[Internal].url.host = value;
      }
      get hostname() {
        return this[Internal].url.hostname;
      }
      set hostname(value) {
        this[Internal].url.hostname = value;
      }
      get port() {
        return this[Internal].url.port;
      }
      set port(value) {
        this[Internal].url.port = value;
      }
      get protocol() {
        return this[Internal].url.protocol;
      }
      set protocol(value) {
        this[Internal].url.protocol = value;
      }
      get href() {
        const pathname = this.formatPathname();
        const search = this.formatSearch();
        return `${this.protocol}//${this.host}${pathname}${search}${this.hash}`;
      }
      set href(url) {
        this[Internal].url = parseURL(url);
        this.analyze();
      }
      get origin() {
        return this[Internal].url.origin;
      }
      get pathname() {
        return this[Internal].url.pathname;
      }
      set pathname(value) {
        this[Internal].url.pathname = value;
      }
      get hash() {
        return this[Internal].url.hash;
      }
      set hash(value) {
        this[Internal].url.hash = value;
      }
      get search() {
        return this[Internal].url.search;
      }
      set search(value) {
        this[Internal].url.search = value;
      }
      get password() {
        return this[Internal].url.password;
      }
      set password(value) {
        this[Internal].url.password = value;
      }
      get username() {
        return this[Internal].url.username;
      }
      set username(value) {
        this[Internal].url.username = value;
      }
      get basePath() {
        return this[Internal].basePath;
      }
      set basePath(value) {
        this[Internal].basePath = value.startsWith("/") ? value : `/${value}`;
      }
      toString() {
        return this.href;
      }
      toJSON() {
        return this.href;
      }
      [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
          href: this.href,
          origin: this.origin,
          protocol: this.protocol,
          username: this.username,
          password: this.password,
          host: this.host,
          hostname: this.hostname,
          port: this.port,
          pathname: this.pathname,
          search: this.search,
          searchParams: this.searchParams,
          hash: this.hash
        };
      }
      clone() {
        return new _NextURL(String(this), this[Internal].options);
      }
    };
  }
});

// ../../node_modules/next/dist/lib/constants.js
var require_constants = __commonJS({
  "../../node_modules/next/dist/lib/constants.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      ACTION_SUFFIX: function() {
        return ACTION_SUFFIX;
      },
      APP_DIR_ALIAS: function() {
        return APP_DIR_ALIAS;
      },
      CACHE_ONE_YEAR: function() {
        return CACHE_ONE_YEAR;
      },
      DOT_NEXT_ALIAS: function() {
        return DOT_NEXT_ALIAS;
      },
      ESLINT_DEFAULT_DIRS: function() {
        return ESLINT_DEFAULT_DIRS;
      },
      GSP_NO_RETURNED_VALUE: function() {
        return GSP_NO_RETURNED_VALUE;
      },
      GSSP_COMPONENT_MEMBER_ERROR: function() {
        return GSSP_COMPONENT_MEMBER_ERROR;
      },
      GSSP_NO_RETURNED_VALUE: function() {
        return GSSP_NO_RETURNED_VALUE;
      },
      INSTRUMENTATION_HOOK_FILENAME: function() {
        return INSTRUMENTATION_HOOK_FILENAME;
      },
      MIDDLEWARE_FILENAME: function() {
        return MIDDLEWARE_FILENAME;
      },
      MIDDLEWARE_LOCATION_REGEXP: function() {
        return MIDDLEWARE_LOCATION_REGEXP;
      },
      NEXT_BODY_SUFFIX: function() {
        return NEXT_BODY_SUFFIX;
      },
      NEXT_CACHE_IMPLICIT_TAG_ID: function() {
        return NEXT_CACHE_IMPLICIT_TAG_ID;
      },
      NEXT_CACHE_REVALIDATED_TAGS_HEADER: function() {
        return NEXT_CACHE_REVALIDATED_TAGS_HEADER;
      },
      NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER: function() {
        return NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER;
      },
      NEXT_CACHE_SOFT_TAGS_HEADER: function() {
        return NEXT_CACHE_SOFT_TAGS_HEADER;
      },
      NEXT_CACHE_SOFT_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_SOFT_TAG_MAX_LENGTH;
      },
      NEXT_CACHE_TAGS_HEADER: function() {
        return NEXT_CACHE_TAGS_HEADER;
      },
      NEXT_CACHE_TAG_MAX_ITEMS: function() {
        return NEXT_CACHE_TAG_MAX_ITEMS;
      },
      NEXT_CACHE_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_TAG_MAX_LENGTH;
      },
      NEXT_DATA_SUFFIX: function() {
        return NEXT_DATA_SUFFIX;
      },
      NEXT_INTERCEPTION_MARKER_PREFIX: function() {
        return NEXT_INTERCEPTION_MARKER_PREFIX;
      },
      NEXT_META_SUFFIX: function() {
        return NEXT_META_SUFFIX;
      },
      NEXT_QUERY_PARAM_PREFIX: function() {
        return NEXT_QUERY_PARAM_PREFIX;
      },
      NON_STANDARD_NODE_ENV: function() {
        return NON_STANDARD_NODE_ENV;
      },
      PAGES_DIR_ALIAS: function() {
        return PAGES_DIR_ALIAS;
      },
      PRERENDER_REVALIDATE_HEADER: function() {
        return PRERENDER_REVALIDATE_HEADER;
      },
      PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER: function() {
        return PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER;
      },
      PUBLIC_DIR_MIDDLEWARE_CONFLICT: function() {
        return PUBLIC_DIR_MIDDLEWARE_CONFLICT;
      },
      ROOT_DIR_ALIAS: function() {
        return ROOT_DIR_ALIAS;
      },
      RSC_ACTION_CLIENT_WRAPPER_ALIAS: function() {
        return RSC_ACTION_CLIENT_WRAPPER_ALIAS;
      },
      RSC_ACTION_ENCRYPTION_ALIAS: function() {
        return RSC_ACTION_ENCRYPTION_ALIAS;
      },
      RSC_ACTION_PROXY_ALIAS: function() {
        return RSC_ACTION_PROXY_ALIAS;
      },
      RSC_ACTION_VALIDATE_ALIAS: function() {
        return RSC_ACTION_VALIDATE_ALIAS;
      },
      RSC_MOD_REF_PROXY_ALIAS: function() {
        return RSC_MOD_REF_PROXY_ALIAS;
      },
      RSC_PREFETCH_SUFFIX: function() {
        return RSC_PREFETCH_SUFFIX;
      },
      RSC_SUFFIX: function() {
        return RSC_SUFFIX;
      },
      SERVER_PROPS_EXPORT_ERROR: function() {
        return SERVER_PROPS_EXPORT_ERROR;
      },
      SERVER_PROPS_GET_INIT_PROPS_CONFLICT: function() {
        return SERVER_PROPS_GET_INIT_PROPS_CONFLICT;
      },
      SERVER_PROPS_SSG_CONFLICT: function() {
        return SERVER_PROPS_SSG_CONFLICT;
      },
      SERVER_RUNTIME: function() {
        return SERVER_RUNTIME;
      },
      SSG_FALLBACK_EXPORT_ERROR: function() {
        return SSG_FALLBACK_EXPORT_ERROR;
      },
      SSG_GET_INITIAL_PROPS_CONFLICT: function() {
        return SSG_GET_INITIAL_PROPS_CONFLICT;
      },
      STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR: function() {
        return STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR;
      },
      UNSTABLE_REVALIDATE_RENAME_ERROR: function() {
        return UNSTABLE_REVALIDATE_RENAME_ERROR;
      },
      WEBPACK_LAYERS: function() {
        return WEBPACK_LAYERS;
      },
      WEBPACK_RESOURCE_QUERIES: function() {
        return WEBPACK_RESOURCE_QUERIES;
      }
    });
    var NEXT_QUERY_PARAM_PREFIX = "nxtP";
    var NEXT_INTERCEPTION_MARKER_PREFIX = "nxtI";
    var PRERENDER_REVALIDATE_HEADER = "x-prerender-revalidate";
    var PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER = "x-prerender-revalidate-if-generated";
    var RSC_PREFETCH_SUFFIX = ".prefetch.rsc";
    var RSC_SUFFIX = ".rsc";
    var ACTION_SUFFIX = ".action";
    var NEXT_DATA_SUFFIX = ".json";
    var NEXT_META_SUFFIX = ".meta";
    var NEXT_BODY_SUFFIX = ".body";
    var NEXT_CACHE_TAGS_HEADER = "x-next-cache-tags";
    var NEXT_CACHE_SOFT_TAGS_HEADER = "x-next-cache-soft-tags";
    var NEXT_CACHE_REVALIDATED_TAGS_HEADER = "x-next-revalidated-tags";
    var NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER = "x-next-revalidate-tag-token";
    var NEXT_CACHE_TAG_MAX_ITEMS = 128;
    var NEXT_CACHE_TAG_MAX_LENGTH = 256;
    var NEXT_CACHE_SOFT_TAG_MAX_LENGTH = 1024;
    var NEXT_CACHE_IMPLICIT_TAG_ID = "_N_T_";
    var CACHE_ONE_YEAR = 31536e3;
    var MIDDLEWARE_FILENAME = "middleware";
    var MIDDLEWARE_LOCATION_REGEXP = `(?:src/)?${MIDDLEWARE_FILENAME}`;
    var INSTRUMENTATION_HOOK_FILENAME = "instrumentation";
    var PAGES_DIR_ALIAS = "private-next-pages";
    var DOT_NEXT_ALIAS = "private-dot-next";
    var ROOT_DIR_ALIAS = "private-next-root-dir";
    var APP_DIR_ALIAS = "private-next-app-dir";
    var RSC_MOD_REF_PROXY_ALIAS = "private-next-rsc-mod-ref-proxy";
    var RSC_ACTION_VALIDATE_ALIAS = "private-next-rsc-action-validate";
    var RSC_ACTION_PROXY_ALIAS = "private-next-rsc-server-reference";
    var RSC_ACTION_ENCRYPTION_ALIAS = "private-next-rsc-action-encryption";
    var RSC_ACTION_CLIENT_WRAPPER_ALIAS = "private-next-rsc-action-client-wrapper";
    var PUBLIC_DIR_MIDDLEWARE_CONFLICT = `You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://nextjs.org/docs/messages/public-next-folder-conflict`;
    var SSG_GET_INITIAL_PROPS_CONFLICT = `You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`;
    var SERVER_PROPS_GET_INIT_PROPS_CONFLICT = `You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`;
    var SERVER_PROPS_SSG_CONFLICT = `You can not use getStaticProps or getStaticPaths with getServerSideProps. To use SSG, please remove getServerSideProps`;
    var STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR = `can not have getInitialProps/getServerSideProps, https://nextjs.org/docs/messages/404-get-initial-props`;
    var SERVER_PROPS_EXPORT_ERROR = `pages with \`getServerSideProps\` can not be exported. See more info here: https://nextjs.org/docs/messages/gssp-export`;
    var GSP_NO_RETURNED_VALUE = "Your `getStaticProps` function did not return an object. Did you forget to add a `return`?";
    var GSSP_NO_RETURNED_VALUE = "Your `getServerSideProps` function did not return an object. Did you forget to add a `return`?";
    var UNSTABLE_REVALIDATE_RENAME_ERROR = "The `unstable_revalidate` property is available for general use.\nPlease use `revalidate` instead.";
    var GSSP_COMPONENT_MEMBER_ERROR = `can not be attached to a page's component and must be exported from the page. See more info here: https://nextjs.org/docs/messages/gssp-component-member`;
    var NON_STANDARD_NODE_ENV = `You are using a non-standard "NODE_ENV" value in your environment. This creates inconsistencies in the project and is strongly advised against. Read more: https://nextjs.org/docs/messages/non-standard-node-env`;
    var SSG_FALLBACK_EXPORT_ERROR = `Pages with \`fallback\` enabled in \`getStaticPaths\` can not be exported. See more info here: https://nextjs.org/docs/messages/ssg-fallback-true-export`;
    var ESLINT_DEFAULT_DIRS = [
      "app",
      "pages",
      "components",
      "lib",
      "src"
    ];
    var SERVER_RUNTIME = {
      edge: "edge",
      experimentalEdge: "experimental-edge",
      nodejs: "nodejs"
    };
    var WEBPACK_LAYERS_NAMES = {
      /**
      * The layer for the shared code between the client and server bundles.
      */
      shared: "shared",
      /**
      * React Server Components layer (rsc).
      */
      reactServerComponents: "rsc",
      /**
      * Server Side Rendering layer for app (ssr).
      */
      serverSideRendering: "ssr",
      /**
      * The browser client bundle layer for actions.
      */
      actionBrowser: "action-browser",
      /**
      * The layer for the API routes.
      */
      api: "api",
      /**
      * The layer for the middleware code.
      */
      middleware: "middleware",
      /**
      * The layer for the instrumentation hooks.
      */
      instrument: "instrument",
      /**
      * The layer for assets on the edge.
      */
      edgeAsset: "edge-asset",
      /**
      * The browser client bundle layer for App directory.
      */
      appPagesBrowser: "app-pages-browser",
      /**
      * The server bundle layer for metadata routes.
      */
      appMetadataRoute: "app-metadata-route",
      /**
      * The layer for the server bundle for App Route handlers.
      */
      appRouteHandler: "app-route-handler"
    };
    var WEBPACK_LAYERS = {
      ...WEBPACK_LAYERS_NAMES,
      GROUP: {
        serverOnly: [
          WEBPACK_LAYERS_NAMES.reactServerComponents,
          WEBPACK_LAYERS_NAMES.actionBrowser,
          WEBPACK_LAYERS_NAMES.appMetadataRoute,
          WEBPACK_LAYERS_NAMES.appRouteHandler,
          WEBPACK_LAYERS_NAMES.instrument
        ],
        clientOnly: [
          WEBPACK_LAYERS_NAMES.serverSideRendering,
          WEBPACK_LAYERS_NAMES.appPagesBrowser
        ],
        nonClientServerTarget: [
          // middleware and pages api
          WEBPACK_LAYERS_NAMES.middleware,
          WEBPACK_LAYERS_NAMES.api
        ],
        app: [
          WEBPACK_LAYERS_NAMES.reactServerComponents,
          WEBPACK_LAYERS_NAMES.actionBrowser,
          WEBPACK_LAYERS_NAMES.appMetadataRoute,
          WEBPACK_LAYERS_NAMES.appRouteHandler,
          WEBPACK_LAYERS_NAMES.serverSideRendering,
          WEBPACK_LAYERS_NAMES.appPagesBrowser,
          WEBPACK_LAYERS_NAMES.shared,
          WEBPACK_LAYERS_NAMES.instrument
        ]
      }
    };
    var WEBPACK_RESOURCE_QUERIES = {
      edgeSSREntry: "__next_edge_ssr_entry__",
      metadata: "__next_metadata__",
      metadataRoute: "__next_metadata_route__",
      metadataImageMeta: "__next_metadata_image_meta__"
    };
  }
});

// ../../node_modules/next/dist/server/web/utils.js
var require_utils = __commonJS({
  "../../node_modules/next/dist/server/web/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      fromNodeOutgoingHttpHeaders: function() {
        return fromNodeOutgoingHttpHeaders;
      },
      normalizeNextQueryParam: function() {
        return normalizeNextQueryParam;
      },
      splitCookiesString: function() {
        return splitCookiesString;
      },
      toNodeOutgoingHttpHeaders: function() {
        return toNodeOutgoingHttpHeaders;
      },
      validateURL: function() {
        return validateURL;
      }
    });
    var _constants = require_constants();
    function fromNodeOutgoingHttpHeaders(nodeHeaders) {
      const headers = new Headers();
      for (let [key, value] of Object.entries(nodeHeaders)) {
        const values = Array.isArray(value) ? value : [
          value
        ];
        for (let v of values) {
          if (typeof v === "undefined")
            continue;
          if (typeof v === "number") {
            v = v.toString();
          }
          headers.append(key, v);
        }
      }
      return headers;
    }
    function splitCookiesString(cookiesString) {
      var cookiesStrings = [];
      var pos = 0;
      var start;
      var ch;
      var lastComma;
      var nextStart;
      var cookiesSeparatorFound;
      function skipWhitespace() {
        while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
          pos += 1;
        }
        return pos < cookiesString.length;
      }
      function notSpecialChar() {
        ch = cookiesString.charAt(pos);
        return ch !== "=" && ch !== ";" && ch !== ",";
      }
      while (pos < cookiesString.length) {
        start = pos;
        cookiesSeparatorFound = false;
        while (skipWhitespace()) {
          ch = cookiesString.charAt(pos);
          if (ch === ",") {
            lastComma = pos;
            pos += 1;
            skipWhitespace();
            nextStart = pos;
            while (pos < cookiesString.length && notSpecialChar()) {
              pos += 1;
            }
            if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
              cookiesSeparatorFound = true;
              pos = nextStart;
              cookiesStrings.push(cookiesString.substring(start, lastComma));
              start = pos;
            } else {
              pos = lastComma + 1;
            }
          } else {
            pos += 1;
          }
        }
        if (!cookiesSeparatorFound || pos >= cookiesString.length) {
          cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
        }
      }
      return cookiesStrings;
    }
    function toNodeOutgoingHttpHeaders(headers) {
      const nodeHeaders = {};
      const cookies = [];
      if (headers) {
        for (const [key, value] of headers.entries()) {
          if (key.toLowerCase() === "set-cookie") {
            cookies.push(...splitCookiesString(value));
            nodeHeaders[key] = cookies.length === 1 ? cookies[0] : cookies;
          } else {
            nodeHeaders[key] = value;
          }
        }
      }
      return nodeHeaders;
    }
    function validateURL(url) {
      try {
        return String(new URL(String(url)));
      } catch (error) {
        throw new Error(`URL is malformed "${String(url)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, {
          cause: error
        });
      }
    }
    function normalizeNextQueryParam(key, onKeyNormalized) {
      const prefixes = [
        _constants.NEXT_QUERY_PARAM_PREFIX,
        _constants.NEXT_INTERCEPTION_MARKER_PREFIX
      ];
      for (const prefix of prefixes) {
        if (key !== prefix && key.startsWith(prefix)) {
          const normalizedKey = key.substring(prefix.length);
          onKeyNormalized(normalizedKey);
        }
      }
    }
  }
});

// ../../node_modules/next/dist/server/web/error.js
var require_error = __commonJS({
  "../../node_modules/next/dist/server/web/error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      PageSignatureError: function() {
        return PageSignatureError;
      },
      RemovedPageError: function() {
        return RemovedPageError;
      },
      RemovedUAError: function() {
        return RemovedUAError;
      }
    });
    var PageSignatureError = class extends Error {
      constructor({ page }) {
        super(`The middleware "${page}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
      }
    };
    var RemovedPageError = class extends Error {
      constructor() {
        super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
      }
    };
    var RemovedUAError = class extends Error {
      constructor() {
        super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
      }
    };
  }
});

// ../../node_modules/next/dist/compiled/@edge-runtime/cookies/index.js
var require_cookies = __commonJS({
  "../../node_modules/next/dist/compiled/@edge-runtime/cookies/index.js"(exports2, module2) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var src_exports2 = {};
    __export2(src_exports2, {
      RequestCookies: () => RequestCookies,
      ResponseCookies: () => ResponseCookies,
      parseCookie: () => parseCookie,
      parseSetCookie: () => parseSetCookie,
      stringifyCookie: () => stringifyCookie
    });
    module2.exports = __toCommonJS2(src_exports2);
    function stringifyCookie(c) {
      var _a;
      const attrs = [
        "path" in c && c.path && `Path=${c.path}`,
        "expires" in c && (c.expires || c.expires === 0) && `Expires=${(typeof c.expires === "number" ? new Date(c.expires) : c.expires).toUTCString()}`,
        "maxAge" in c && typeof c.maxAge === "number" && `Max-Age=${c.maxAge}`,
        "domain" in c && c.domain && `Domain=${c.domain}`,
        "secure" in c && c.secure && "Secure",
        "httpOnly" in c && c.httpOnly && "HttpOnly",
        "sameSite" in c && c.sameSite && `SameSite=${c.sameSite}`,
        "partitioned" in c && c.partitioned && "Partitioned",
        "priority" in c && c.priority && `Priority=${c.priority}`
      ].filter(Boolean);
      const stringified = `${c.name}=${encodeURIComponent((_a = c.value) != null ? _a : "")}`;
      return attrs.length === 0 ? stringified : `${stringified}; ${attrs.join("; ")}`;
    }
    function parseCookie(cookie) {
      const map = /* @__PURE__ */ new Map();
      for (const pair of cookie.split(/; */)) {
        if (!pair)
          continue;
        const splitAt = pair.indexOf("=");
        if (splitAt === -1) {
          map.set(pair, "true");
          continue;
        }
        const [key, value] = [pair.slice(0, splitAt), pair.slice(splitAt + 1)];
        try {
          map.set(key, decodeURIComponent(value != null ? value : "true"));
        } catch {
        }
      }
      return map;
    }
    function parseSetCookie(setCookie) {
      if (!setCookie) {
        return void 0;
      }
      const [[name, value], ...attributes] = parseCookie(setCookie);
      const {
        domain,
        expires,
        httponly,
        maxage,
        path,
        samesite,
        secure,
        partitioned,
        priority
      } = Object.fromEntries(
        attributes.map(([key, value2]) => [key.toLowerCase(), value2])
      );
      const cookie = {
        name,
        value: decodeURIComponent(value),
        domain,
        ...expires && { expires: new Date(expires) },
        ...httponly && { httpOnly: true },
        ...typeof maxage === "string" && { maxAge: Number(maxage) },
        path,
        ...samesite && { sameSite: parseSameSite(samesite) },
        ...secure && { secure: true },
        ...priority && { priority: parsePriority(priority) },
        ...partitioned && { partitioned: true }
      };
      return compact(cookie);
    }
    function compact(t) {
      const newT = {};
      for (const key in t) {
        if (t[key]) {
          newT[key] = t[key];
        }
      }
      return newT;
    }
    var SAME_SITE = ["strict", "lax", "none"];
    function parseSameSite(string) {
      string = string.toLowerCase();
      return SAME_SITE.includes(string) ? string : void 0;
    }
    var PRIORITY = ["low", "medium", "high"];
    function parsePriority(string) {
      string = string.toLowerCase();
      return PRIORITY.includes(string) ? string : void 0;
    }
    function splitCookiesString(cookiesString) {
      if (!cookiesString)
        return [];
      var cookiesStrings = [];
      var pos = 0;
      var start;
      var ch;
      var lastComma;
      var nextStart;
      var cookiesSeparatorFound;
      function skipWhitespace() {
        while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
          pos += 1;
        }
        return pos < cookiesString.length;
      }
      function notSpecialChar() {
        ch = cookiesString.charAt(pos);
        return ch !== "=" && ch !== ";" && ch !== ",";
      }
      while (pos < cookiesString.length) {
        start = pos;
        cookiesSeparatorFound = false;
        while (skipWhitespace()) {
          ch = cookiesString.charAt(pos);
          if (ch === ",") {
            lastComma = pos;
            pos += 1;
            skipWhitespace();
            nextStart = pos;
            while (pos < cookiesString.length && notSpecialChar()) {
              pos += 1;
            }
            if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
              cookiesSeparatorFound = true;
              pos = nextStart;
              cookiesStrings.push(cookiesString.substring(start, lastComma));
              start = pos;
            } else {
              pos = lastComma + 1;
            }
          } else {
            pos += 1;
          }
        }
        if (!cookiesSeparatorFound || pos >= cookiesString.length) {
          cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
        }
      }
      return cookiesStrings;
    }
    var RequestCookies = class {
      constructor(requestHeaders) {
        this._parsed = /* @__PURE__ */ new Map();
        this._headers = requestHeaders;
        const header = requestHeaders.get("cookie");
        if (header) {
          const parsed = parseCookie(header);
          for (const [name, value] of parsed) {
            this._parsed.set(name, { name, value });
          }
        }
      }
      [Symbol.iterator]() {
        return this._parsed[Symbol.iterator]();
      }
      /**
       * The amount of cookies received from the client
       */
      get size() {
        return this._parsed.size;
      }
      get(...args) {
        const name = typeof args[0] === "string" ? args[0] : args[0].name;
        return this._parsed.get(name);
      }
      getAll(...args) {
        var _a;
        const all = Array.from(this._parsed);
        if (!args.length) {
          return all.map(([_, value]) => value);
        }
        const name = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
        return all.filter(([n]) => n === name).map(([_, value]) => value);
      }
      has(name) {
        return this._parsed.has(name);
      }
      set(...args) {
        const [name, value] = args.length === 1 ? [args[0].name, args[0].value] : args;
        const map = this._parsed;
        map.set(name, { name, value });
        this._headers.set(
          "cookie",
          Array.from(map).map(([_, value2]) => stringifyCookie(value2)).join("; ")
        );
        return this;
      }
      /**
       * Delete the cookies matching the passed name or names in the request.
       */
      delete(names) {
        const map = this._parsed;
        const result = !Array.isArray(names) ? map.delete(names) : names.map((name) => map.delete(name));
        this._headers.set(
          "cookie",
          Array.from(map).map(([_, value]) => stringifyCookie(value)).join("; ")
        );
        return result;
      }
      /**
       * Delete all the cookies in the cookies in the request.
       */
      clear() {
        this.delete(Array.from(this._parsed.keys()));
        return this;
      }
      /**
       * Format the cookies in the request as a string for logging
       */
      [Symbol.for("edge-runtime.inspect.custom")]() {
        return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
      }
      toString() {
        return [...this._parsed.values()].map((v) => `${v.name}=${encodeURIComponent(v.value)}`).join("; ");
      }
    };
    var ResponseCookies = class {
      constructor(responseHeaders) {
        this._parsed = /* @__PURE__ */ new Map();
        var _a, _b, _c;
        this._headers = responseHeaders;
        const setCookie = (_c = (_b = (_a = responseHeaders.getSetCookie) == null ? void 0 : _a.call(responseHeaders)) != null ? _b : responseHeaders.get("set-cookie")) != null ? _c : [];
        const cookieStrings = Array.isArray(setCookie) ? setCookie : splitCookiesString(setCookie);
        for (const cookieString of cookieStrings) {
          const parsed = parseSetCookie(cookieString);
          if (parsed)
            this._parsed.set(parsed.name, parsed);
        }
      }
      /**
       * {@link https://wicg.github.io/cookie-store/#CookieStore-get CookieStore#get} without the Promise.
       */
      get(...args) {
        const key = typeof args[0] === "string" ? args[0] : args[0].name;
        return this._parsed.get(key);
      }
      /**
       * {@link https://wicg.github.io/cookie-store/#CookieStore-getAll CookieStore#getAll} without the Promise.
       */
      getAll(...args) {
        var _a;
        const all = Array.from(this._parsed.values());
        if (!args.length) {
          return all;
        }
        const key = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
        return all.filter((c) => c.name === key);
      }
      has(name) {
        return this._parsed.has(name);
      }
      /**
       * {@link https://wicg.github.io/cookie-store/#CookieStore-set CookieStore#set} without the Promise.
       */
      set(...args) {
        const [name, value, cookie] = args.length === 1 ? [args[0].name, args[0].value, args[0]] : args;
        const map = this._parsed;
        map.set(name, normalizeCookie({ name, value, ...cookie }));
        replace(map, this._headers);
        return this;
      }
      /**
       * {@link https://wicg.github.io/cookie-store/#CookieStore-delete CookieStore#delete} without the Promise.
       */
      delete(...args) {
        const [name, path, domain] = typeof args[0] === "string" ? [args[0]] : [args[0].name, args[0].path, args[0].domain];
        return this.set({ name, path, domain, value: "", expires: /* @__PURE__ */ new Date(0) });
      }
      [Symbol.for("edge-runtime.inspect.custom")]() {
        return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
      }
      toString() {
        return [...this._parsed.values()].map(stringifyCookie).join("; ");
      }
    };
    function replace(bag, headers) {
      headers.delete("set-cookie");
      for (const [, value] of bag) {
        const serialized = stringifyCookie(value);
        headers.append("set-cookie", serialized);
      }
    }
    function normalizeCookie(cookie = { name: "", value: "" }) {
      if (typeof cookie.expires === "number") {
        cookie.expires = new Date(cookie.expires);
      }
      if (cookie.maxAge) {
        cookie.expires = new Date(Date.now() + cookie.maxAge * 1e3);
      }
      if (cookie.path === null || cookie.path === void 0) {
        cookie.path = "/";
      }
      return cookie;
    }
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/cookies.js
var require_cookies2 = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/cookies.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      RequestCookies: function() {
        return _cookies.RequestCookies;
      },
      ResponseCookies: function() {
        return _cookies.ResponseCookies;
      },
      stringifyCookie: function() {
        return _cookies.stringifyCookie;
      }
    });
    var _cookies = require_cookies();
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/request.js
var require_request = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/request.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      INTERNALS: function() {
        return INTERNALS;
      },
      NextRequest: function() {
        return NextRequest3;
      }
    });
    var _nexturl = require_next_url();
    var _utils = require_utils();
    var _error = require_error();
    var _cookies = require_cookies2();
    var INTERNALS = Symbol("internal request");
    var NextRequest3 = class extends Request {
      constructor(input, init = {}) {
        const url = typeof input !== "string" && "url" in input ? input.url : String(input);
        (0, _utils.validateURL)(url);
        if (input instanceof Request)
          super(input, init);
        else
          super(url, init);
        const nextUrl = new _nexturl.NextURL(url, {
          headers: (0, _utils.toNodeOutgoingHttpHeaders)(this.headers),
          nextConfig: init.nextConfig
        });
        this[INTERNALS] = {
          cookies: new _cookies.RequestCookies(this.headers),
          geo: init.geo || {},
          ip: init.ip,
          nextUrl,
          url: process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE ? url : nextUrl.toString()
        };
      }
      [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
          cookies: this.cookies,
          geo: this.geo,
          ip: this.ip,
          nextUrl: this.nextUrl,
          url: this.url,
          // rest of props come from Request
          bodyUsed: this.bodyUsed,
          cache: this.cache,
          credentials: this.credentials,
          destination: this.destination,
          headers: Object.fromEntries(this.headers),
          integrity: this.integrity,
          keepalive: this.keepalive,
          method: this.method,
          mode: this.mode,
          redirect: this.redirect,
          referrer: this.referrer,
          referrerPolicy: this.referrerPolicy,
          signal: this.signal
        };
      }
      get cookies() {
        return this[INTERNALS].cookies;
      }
      get geo() {
        return this[INTERNALS].geo;
      }
      get ip() {
        return this[INTERNALS].ip;
      }
      get nextUrl() {
        return this[INTERNALS].nextUrl;
      }
      /**
      * @deprecated
      * `page` has been deprecated in favour of `URLPattern`.
      * Read more: https://nextjs.org/docs/messages/middleware-request-page
      */
      get page() {
        throw new _error.RemovedPageError();
      }
      /**
      * @deprecated
      * `ua` has been removed in favour of \`userAgent\` function.
      * Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
      */
      get ua() {
        throw new _error.RemovedUAError();
      }
      get url() {
        return this[INTERNALS].url;
      }
    };
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/adapters/reflect.js
var require_reflect = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/adapters/reflect.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "ReflectAdapter", {
      enumerable: true,
      get: function() {
        return ReflectAdapter;
      }
    });
    var ReflectAdapter = class {
      static get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return value.bind(target);
        }
        return value;
      }
      static set(target, prop, value, receiver) {
        return Reflect.set(target, prop, value, receiver);
      }
      static has(target, prop) {
        return Reflect.has(target, prop);
      }
      static deleteProperty(target, prop) {
        return Reflect.deleteProperty(target, prop);
      }
    };
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/response.js
var require_response = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/response.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "NextResponse", {
      enumerable: true,
      get: function() {
        return NextResponse3;
      }
    });
    var _cookies = require_cookies2();
    var _nexturl = require_next_url();
    var _utils = require_utils();
    var _reflect = require_reflect();
    var _cookies1 = require_cookies2();
    var INTERNALS = Symbol("internal response");
    var REDIRECTS = /* @__PURE__ */ new Set([
      301,
      302,
      303,
      307,
      308
    ]);
    function handleMiddlewareField(init, headers) {
      var _init_request;
      if (init == null ? void 0 : (_init_request = init.request) == null ? void 0 : _init_request.headers) {
        if (!(init.request.headers instanceof Headers)) {
          throw new Error("request.headers must be an instance of Headers");
        }
        const keys = [];
        for (const [key, value] of init.request.headers) {
          headers.set("x-middleware-request-" + key, value);
          keys.push(key);
        }
        headers.set("x-middleware-override-headers", keys.join(","));
      }
    }
    var NextResponse3 = class _NextResponse extends Response {
      constructor(body, init = {}) {
        super(body, init);
        const headers = this.headers;
        const cookies = new _cookies1.ResponseCookies(headers);
        const cookiesProxy = new Proxy(cookies, {
          get(target, prop, receiver) {
            switch (prop) {
              case "delete":
              case "set": {
                return (...args) => {
                  const result = Reflect.apply(target[prop], target, args);
                  const newHeaders = new Headers(headers);
                  if (result instanceof _cookies1.ResponseCookies) {
                    headers.set("x-middleware-set-cookie", result.getAll().map((cookie) => (0, _cookies.stringifyCookie)(cookie)).join(","));
                  }
                  handleMiddlewareField(init, newHeaders);
                  return result;
                };
              }
              default:
                return _reflect.ReflectAdapter.get(target, prop, receiver);
            }
          }
        });
        this[INTERNALS] = {
          cookies: cookiesProxy,
          url: init.url ? new _nexturl.NextURL(init.url, {
            headers: (0, _utils.toNodeOutgoingHttpHeaders)(headers),
            nextConfig: init.nextConfig
          }) : void 0
        };
      }
      [Symbol.for("edge-runtime.inspect.custom")]() {
        return {
          cookies: this.cookies,
          url: this.url,
          // rest of props come from Response
          body: this.body,
          bodyUsed: this.bodyUsed,
          headers: Object.fromEntries(this.headers),
          ok: this.ok,
          redirected: this.redirected,
          status: this.status,
          statusText: this.statusText,
          type: this.type
        };
      }
      get cookies() {
        return this[INTERNALS].cookies;
      }
      static json(body, init) {
        const response = Response.json(body, init);
        return new _NextResponse(response.body, response);
      }
      static redirect(url, init) {
        const status = typeof init === "number" ? init : (init == null ? void 0 : init.status) ?? 307;
        if (!REDIRECTS.has(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        const initObj = typeof init === "object" ? init : {};
        const headers = new Headers(initObj == null ? void 0 : initObj.headers);
        headers.set("Location", (0, _utils.validateURL)(url));
        return new _NextResponse(null, {
          ...initObj,
          headers,
          status
        });
      }
      static rewrite(destination, init) {
        const headers = new Headers(init == null ? void 0 : init.headers);
        headers.set("x-middleware-rewrite", (0, _utils.validateURL)(destination));
        handleMiddlewareField(init, headers);
        return new _NextResponse(null, {
          ...init,
          headers
        });
      }
      static next(init) {
        const headers = new Headers(init == null ? void 0 : init.headers);
        headers.set("x-middleware-next", "1");
        handleMiddlewareField(init, headers);
        return new _NextResponse(null, {
          ...init,
          headers
        });
      }
    };
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/image-response.js
var require_image_response = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/image-response.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "ImageResponse", {
      enumerable: true,
      get: function() {
        return ImageResponse;
      }
    });
    function ImageResponse() {
      throw new Error('ImageResponse moved from "next/server" to "next/og" since Next.js 14, please import from "next/og" instead');
    }
  }
});

// ../../node_modules/next/dist/compiled/ua-parser-js/ua-parser.js
var require_ua_parser = __commonJS({
  "../../node_modules/next/dist/compiled/ua-parser-js/ua-parser.js"(exports2, module2) {
    "use strict";
    (() => {
      var i = { 226: function(i2, e2) {
        (function(o2, a) {
          "use strict";
          var r = "1.0.35", t = "", n = "?", s = "function", b = "undefined", w = "object", l = "string", d = "major", c = "model", u = "name", p = "type", m = "vendor", f = "version", h = "architecture", v = "console", g = "mobile", k = "tablet", x = "smarttv", _ = "wearable", y = "embedded", q = 350;
          var T = "Amazon", S = "Apple", z = "ASUS", N = "BlackBerry", A = "Browser", C = "Chrome", E = "Edge", O = "Firefox", U = "Google", j = "Huawei", P = "LG", R = "Microsoft", M = "Motorola", B = "Opera", V = "Samsung", D = "Sharp", I = "Sony", W = "Viera", F = "Xiaomi", G = "Zebra", H = "Facebook", L = "Chromium OS", Z = "Mac OS";
          var extend = function(i3, e3) {
            var o3 = {};
            for (var a2 in i3) {
              if (e3[a2] && e3[a2].length % 2 === 0) {
                o3[a2] = e3[a2].concat(i3[a2]);
              } else {
                o3[a2] = i3[a2];
              }
            }
            return o3;
          }, enumerize = function(i3) {
            var e3 = {};
            for (var o3 = 0; o3 < i3.length; o3++) {
              e3[i3[o3].toUpperCase()] = i3[o3];
            }
            return e3;
          }, has = function(i3, e3) {
            return typeof i3 === l ? lowerize(e3).indexOf(lowerize(i3)) !== -1 : false;
          }, lowerize = function(i3) {
            return i3.toLowerCase();
          }, majorize = function(i3) {
            return typeof i3 === l ? i3.replace(/[^\d\.]/g, t).split(".")[0] : a;
          }, trim = function(i3, e3) {
            if (typeof i3 === l) {
              i3 = i3.replace(/^\s\s*/, t);
              return typeof e3 === b ? i3 : i3.substring(0, q);
            }
          };
          var rgxMapper = function(i3, e3) {
            var o3 = 0, r2, t2, n2, b2, l2, d2;
            while (o3 < e3.length && !l2) {
              var c2 = e3[o3], u2 = e3[o3 + 1];
              r2 = t2 = 0;
              while (r2 < c2.length && !l2) {
                if (!c2[r2]) {
                  break;
                }
                l2 = c2[r2++].exec(i3);
                if (!!l2) {
                  for (n2 = 0; n2 < u2.length; n2++) {
                    d2 = l2[++t2];
                    b2 = u2[n2];
                    if (typeof b2 === w && b2.length > 0) {
                      if (b2.length === 2) {
                        if (typeof b2[1] == s) {
                          this[b2[0]] = b2[1].call(this, d2);
                        } else {
                          this[b2[0]] = b2[1];
                        }
                      } else if (b2.length === 3) {
                        if (typeof b2[1] === s && !(b2[1].exec && b2[1].test)) {
                          this[b2[0]] = d2 ? b2[1].call(this, d2, b2[2]) : a;
                        } else {
                          this[b2[0]] = d2 ? d2.replace(b2[1], b2[2]) : a;
                        }
                      } else if (b2.length === 4) {
                        this[b2[0]] = d2 ? b2[3].call(this, d2.replace(b2[1], b2[2])) : a;
                      }
                    } else {
                      this[b2] = d2 ? d2 : a;
                    }
                  }
                }
              }
              o3 += 2;
            }
          }, strMapper = function(i3, e3) {
            for (var o3 in e3) {
              if (typeof e3[o3] === w && e3[o3].length > 0) {
                for (var r2 = 0; r2 < e3[o3].length; r2++) {
                  if (has(e3[o3][r2], i3)) {
                    return o3 === n ? a : o3;
                  }
                }
              } else if (has(e3[o3], i3)) {
                return o3 === n ? a : o3;
              }
            }
            return i3;
          };
          var $ = { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }, X = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" };
          var K = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [f, [u, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [f, [u, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [u, f], [/opios[\/ ]+([\w\.]+)/i], [f, [u, B + " Mini"]], [/\bopr\/([\w\.]+)/i], [f, [u, B]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [u, f], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [f, [u, "UC" + A]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [f, [u, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [f, [u, "WeChat"]], [/konqueror\/([\w\.]+)/i], [f, [u, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [f, [u, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [f, [u, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[u, /(.+)/, "$1 Secure " + A], f], [/\bfocus\/([\w\.]+)/i], [f, [u, O + " Focus"]], [/\bopt\/([\w\.]+)/i], [f, [u, B + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [f, [u, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [f, [u, "Dolphin"]], [/coast\/([\w\.]+)/i], [f, [u, B + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [f, [u, "MIUI " + A]], [/fxios\/([-\w\.]+)/i], [f, [u, O]], [/\bqihu|(qi?ho?o?|360)browser/i], [[u, "360 " + A]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[u, /(.+)/, "$1 " + A], f], [/(comodo_dragon)\/([\w\.]+)/i], [[u, /_/g, " "], f], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [u, f], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [u], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[u, H], f], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [u, f], [/\bgsa\/([\w\.]+) .*safari\//i], [f, [u, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [f, [u, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [f, [u, C + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[u, C + " WebView"], f], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [f, [u, "Android " + A]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [u, f], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [f, [u, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [f, u], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [u, [f, strMapper, $]], [/(webkit|khtml)\/([\w\.]+)/i], [u, f], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[u, "Netscape"], f], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [f, [u, O + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [u, f], [/(cobalt)\/([\w\.]+)/i], [u, [f, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[h, "amd64"]], [/(ia32(?=;))/i], [[h, lowerize]], [/((?:i[346]|x)86)[;\)]/i], [[h, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[h, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[h, "armhf"]], [/windows (ce|mobile); ppc;/i], [[h, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[h, /ower/, t, lowerize]], [/(sun4\w)[;\)]/i], [[h, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[h, lowerize]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [c, [m, V], [p, k]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [c, [m, V], [p, g]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [c, [m, S], [p, g]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [c, [m, S], [p, k]], [/(macintosh);/i], [c, [m, S]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [c, [m, D], [p, g]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [c, [m, j], [p, k]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [c, [m, j], [p, g]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[c, /_/g, " "], [m, F], [p, g]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[c, /_/g, " "], [m, F], [p, k]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [c, [m, "OPPO"], [p, g]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [c, [m, "Vivo"], [p, g]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [c, [m, "Realme"], [p, g]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [c, [m, M], [p, g]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [c, [m, M], [p, k]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [c, [m, P], [p, k]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [c, [m, P], [p, g]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [c, [m, "Lenovo"], [p, k]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[c, /_/g, " "], [m, "Nokia"], [p, g]], [/(pixel c)\b/i], [c, [m, U], [p, k]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [c, [m, U], [p, g]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [c, [m, I], [p, g]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[c, "Xperia Tablet"], [m, I], [p, k]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [c, [m, "OnePlus"], [p, g]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [c, [m, T], [p, k]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[c, /(.+)/g, "Fire Phone $1"], [m, T], [p, g]], [/(playbook);[-\w\),; ]+(rim)/i], [c, m, [p, k]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [c, [m, N], [p, g]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [c, [m, z], [p, k]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [c, [m, z], [p, g]], [/(nexus 9)/i], [c, [m, "HTC"], [p, k]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [m, [c, /_/g, " "], [p, g]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [c, [m, "Acer"], [p, k]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [c, [m, "Meizu"], [p, g]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [m, c, [p, g]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [m, c, [p, k]], [/(surface duo)/i], [c, [m, R], [p, k]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [c, [m, "Fairphone"], [p, g]], [/(u304aa)/i], [c, [m, "AT&T"], [p, g]], [/\bsie-(\w*)/i], [c, [m, "Siemens"], [p, g]], [/\b(rct\w+) b/i], [c, [m, "RCA"], [p, k]], [/\b(venue[\d ]{2,7}) b/i], [c, [m, "Dell"], [p, k]], [/\b(q(?:mv|ta)\w+) b/i], [c, [m, "Verizon"], [p, k]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [c, [m, "Barnes & Noble"], [p, k]], [/\b(tm\d{3}\w+) b/i], [c, [m, "NuVision"], [p, k]], [/\b(k88) b/i], [c, [m, "ZTE"], [p, k]], [/\b(nx\d{3}j) b/i], [c, [m, "ZTE"], [p, g]], [/\b(gen\d{3}) b.+49h/i], [c, [m, "Swiss"], [p, g]], [/\b(zur\d{3}) b/i], [c, [m, "Swiss"], [p, k]], [/\b((zeki)?tb.*\b) b/i], [c, [m, "Zeki"], [p, k]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[m, "Dragon Touch"], c, [p, k]], [/\b(ns-?\w{0,9}) b/i], [c, [m, "Insignia"], [p, k]], [/\b((nxa|next)-?\w{0,9}) b/i], [c, [m, "NextBook"], [p, k]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[m, "Voice"], c, [p, g]], [/\b(lvtel\-)?(v1[12]) b/i], [[m, "LvTel"], c, [p, g]], [/\b(ph-1) /i], [c, [m, "Essential"], [p, g]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [c, [m, "Envizen"], [p, k]], [/\b(trio[-\w\. ]+) b/i], [c, [m, "MachSpeed"], [p, k]], [/\btu_(1491) b/i], [c, [m, "Rotor"], [p, k]], [/(shield[\w ]+) b/i], [c, [m, "Nvidia"], [p, k]], [/(sprint) (\w+)/i], [m, c, [p, g]], [/(kin\.[onetw]{3})/i], [[c, /\./g, " "], [m, R], [p, g]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [c, [m, G], [p, k]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [c, [m, G], [p, g]], [/smart-tv.+(samsung)/i], [m, [p, x]], [/hbbtv.+maple;(\d+)/i], [[c, /^/, "SmartTV"], [m, V], [p, x]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[m, P], [p, x]], [/(apple) ?tv/i], [m, [c, S + " TV"], [p, x]], [/crkey/i], [[c, C + "cast"], [m, U], [p, x]], [/droid.+aft(\w)( bui|\))/i], [c, [m, T], [p, x]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [c, [m, D], [p, x]], [/(bravia[\w ]+)( bui|\))/i], [c, [m, I], [p, x]], [/(mitv-\w{5}) bui/i], [c, [m, F], [p, x]], [/Hbbtv.*(technisat) (.*);/i], [m, c, [p, x]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[m, trim], [c, trim], [p, x]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[p, x]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [m, c, [p, v]], [/droid.+; (shield) bui/i], [c, [m, "Nvidia"], [p, v]], [/(playstation [345portablevi]+)/i], [c, [m, I], [p, v]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [c, [m, R], [p, v]], [/((pebble))app/i], [m, c, [p, _]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [c, [m, S], [p, _]], [/droid.+; (glass) \d/i], [c, [m, U], [p, _]], [/droid.+; (wt63?0{2,3})\)/i], [c, [m, G], [p, _]], [/(quest( 2| pro)?)/i], [c, [m, H], [p, _]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [m, [p, y]], [/(aeobc)\b/i], [c, [m, T], [p, y]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [c, [p, g]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [c, [p, k]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[p, k]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[p, g]], [/(android[-\w\. ]{0,9});.+buil/i], [c, [m, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [f, [u, E + "HTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [f, [u, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [u, f], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [f, u]], os: [[/microsoft (windows) (vista|xp)/i], [u, f], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [u, [f, strMapper, X]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[u, "Windows"], [f, strMapper, X]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[f, /_/g, "."], [u, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[u, Z], [f, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [f, u], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [u, f], [/\(bb(10);/i], [f, [u, N]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [f, [u, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [f, [u, O + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [f, [u, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [f, [u, "watchOS"]], [/crkey\/([\d\.]+)/i], [f, [u, C + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[u, L], f], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [u, f], [/(sunos) ?([\w\.\d]*)/i], [[u, "Solaris"], f], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [u, f]] };
          var UAParser = function(i3, e3) {
            if (typeof i3 === w) {
              e3 = i3;
              i3 = a;
            }
            if (!(this instanceof UAParser)) {
              return new UAParser(i3, e3).getResult();
            }
            var r2 = typeof o2 !== b && o2.navigator ? o2.navigator : a;
            var n2 = i3 || (r2 && r2.userAgent ? r2.userAgent : t);
            var v2 = r2 && r2.userAgentData ? r2.userAgentData : a;
            var x2 = e3 ? extend(K, e3) : K;
            var _2 = r2 && r2.userAgent == n2;
            this.getBrowser = function() {
              var i4 = {};
              i4[u] = a;
              i4[f] = a;
              rgxMapper.call(i4, n2, x2.browser);
              i4[d] = majorize(i4[f]);
              if (_2 && r2 && r2.brave && typeof r2.brave.isBrave == s) {
                i4[u] = "Brave";
              }
              return i4;
            };
            this.getCPU = function() {
              var i4 = {};
              i4[h] = a;
              rgxMapper.call(i4, n2, x2.cpu);
              return i4;
            };
            this.getDevice = function() {
              var i4 = {};
              i4[m] = a;
              i4[c] = a;
              i4[p] = a;
              rgxMapper.call(i4, n2, x2.device);
              if (_2 && !i4[p] && v2 && v2.mobile) {
                i4[p] = g;
              }
              if (_2 && i4[c] == "Macintosh" && r2 && typeof r2.standalone !== b && r2.maxTouchPoints && r2.maxTouchPoints > 2) {
                i4[c] = "iPad";
                i4[p] = k;
              }
              return i4;
            };
            this.getEngine = function() {
              var i4 = {};
              i4[u] = a;
              i4[f] = a;
              rgxMapper.call(i4, n2, x2.engine);
              return i4;
            };
            this.getOS = function() {
              var i4 = {};
              i4[u] = a;
              i4[f] = a;
              rgxMapper.call(i4, n2, x2.os);
              if (_2 && !i4[u] && v2 && v2.platform != "Unknown") {
                i4[u] = v2.platform.replace(/chrome os/i, L).replace(/macos/i, Z);
              }
              return i4;
            };
            this.getResult = function() {
              return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
            };
            this.getUA = function() {
              return n2;
            };
            this.setUA = function(i4) {
              n2 = typeof i4 === l && i4.length > q ? trim(i4, q) : i4;
              return this;
            };
            this.setUA(n2);
            return this;
          };
          UAParser.VERSION = r;
          UAParser.BROWSER = enumerize([u, f, d]);
          UAParser.CPU = enumerize([h]);
          UAParser.DEVICE = enumerize([c, m, p, v, g, x, k, _, y]);
          UAParser.ENGINE = UAParser.OS = enumerize([u, f]);
          if (typeof e2 !== b) {
            if ("object" !== b && i2.exports) {
              e2 = i2.exports = UAParser;
            }
            e2.UAParser = UAParser;
          } else {
            if (typeof define === s && define.amd) {
              define(function() {
                return UAParser;
              });
            } else if (typeof o2 !== b) {
              o2.UAParser = UAParser;
            }
          }
          var Q = typeof o2 !== b && (o2.jQuery || o2.Zepto);
          if (Q && !Q.ua) {
            var Y = new UAParser();
            Q.ua = Y.getResult();
            Q.ua.get = function() {
              return Y.getUA();
            };
            Q.ua.set = function(i3) {
              Y.setUA(i3);
              var e3 = Y.getResult();
              for (var o3 in e3) {
                Q.ua[o3] = e3[o3];
              }
            };
          }
        })(typeof window === "object" ? window : this);
      } };
      var e = {};
      function __nccwpck_require__(o2) {
        var a = e[o2];
        if (a !== void 0) {
          return a.exports;
        }
        var r = e[o2] = { exports: {} };
        var t = true;
        try {
          i[o2].call(r.exports, r, r.exports, __nccwpck_require__);
          t = false;
        } finally {
          if (t)
            delete e[o2];
        }
        return r.exports;
      }
      if (typeof __nccwpck_require__ !== "undefined")
        __nccwpck_require__.ab = __dirname + "/";
      var o = __nccwpck_require__(226);
      module2.exports = o;
    })();
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/user-agent.js
var require_user_agent = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/user-agent.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    function _export(target, all) {
      for (var name in all)
        Object.defineProperty(target, name, {
          enumerable: true,
          get: all[name]
        });
    }
    _export(exports2, {
      isBot: function() {
        return isBot;
      },
      userAgent: function() {
        return userAgent;
      },
      userAgentFromString: function() {
        return userAgentFromString;
      }
    });
    var _uaparserjs = /* @__PURE__ */ _interop_require_default(require_ua_parser());
    function _interop_require_default(obj) {
      return obj && obj.__esModule ? obj : {
        default: obj
      };
    }
    function isBot(input) {
      return /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Google-InspectionTool|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver/i.test(input);
    }
    function userAgentFromString(input) {
      return {
        ...(0, _uaparserjs.default)(input),
        isBot: input === void 0 ? false : isBot(input)
      };
    }
    function userAgent({ headers }) {
      return userAgentFromString(headers.get("user-agent") || void 0);
    }
  }
});

// ../../node_modules/next/dist/server/web/spec-extension/url-pattern.js
var require_url_pattern = __commonJS({
  "../../node_modules/next/dist/server/web/spec-extension/url-pattern.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "URLPattern", {
      enumerable: true,
      get: function() {
        return GlobalURLPattern;
      }
    });
    var GlobalURLPattern = (
      // @ts-expect-error: URLPattern is not available in Node.js
      typeof URLPattern === "undefined" ? void 0 : URLPattern
    );
  }
});

// ../../node_modules/next/server.js
var require_server = __commonJS({
  "../../node_modules/next/server.js"(exports2, module2) {
    "use strict";
    var serverExports = {
      NextRequest: require_request().NextRequest,
      NextResponse: require_response().NextResponse,
      ImageResponse: require_image_response().ImageResponse,
      userAgentFromString: require_user_agent().userAgentFromString,
      userAgent: require_user_agent().userAgent,
      URLPattern: require_url_pattern().URLPattern
    };
    module2.exports = serverExports;
    exports2.NextRequest = serverExports.NextRequest;
    exports2.NextResponse = serverExports.NextResponse;
    exports2.ImageResponse = serverExports.ImageResponse;
    exports2.userAgentFromString = serverExports.userAgentFromString;
    exports2.userAgent = serverExports.userAgent;
    exports2.URLPattern = serverExports.URLPattern;
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  assertAnyRole: () => assertAnyRole,
  authenticateRequest: () => authenticateRequest,
  authorizeRequest: () => authorizeRequest,
  buildSecureWhereClause: () => buildSecureWhereClause,
  canAccessResource: () => canAccessResource,
  canAccessUserManagement: () => canAccessUserManagement,
  canCreateOrders: () => canCreateOrders,
  canDeleteOrders: () => canDeleteOrders,
  canExportCustomers: () => canExportCustomers,
  canExportOrders: () => canExportOrders,
  canExportProducts: () => canExportProducts,
  canManageOrders: () => canManageOrders,
  canManageOutlets: () => canManageOutlets,
  canManageProducts: () => canManageProducts,
  canManageUsers: () => canManageUsers,
  canUpdateOrders: () => canUpdateOrders,
  canViewOrders: () => canViewOrders,
  comparePassword: () => comparePassword,
  createAuthError: () => createAuthError,
  createPermissionError: () => createPermissionError,
  createScopeError: () => createScopeError,
  generateToken: () => generateToken,
  getCurrentUserClient: () => getCurrentUserClient,
  getUserScope: () => getUserScope,
  getUserScopeFromRequest: () => getUserScopeFromRequest,
  hasAllPermissions: () => hasAllPermissions,
  hasAnyPermission: () => hasAnyPermission,
  hasAnyRole: () => hasAnyRole,
  hasPermission: () => hasPermission,
  hashPassword: () => hashPassword,
  isAuthenticatedAdmin: () => import_utils5.isAuthenticated,
  isAuthenticatedClient: () => import_utils3.isAuthenticated,
  isAuthenticatedWithVerificationAdmin: () => isAuthenticatedWithVerification2,
  isAuthenticatedWithVerificationClient: () => isAuthenticatedWithVerification,
  isMerchantLevel: () => isMerchantLevel,
  isOutletTeam: () => isOutletTeam,
  loginUser: () => loginUser,
  loginUserClient: () => loginUserClient,
  logoutUserClient: () => logoutUserClient,
  optionalAuth: () => optionalAuth,
  registerUser: () => registerUser,
  validateResourceBelongsToUser: () => validateResourceBelongsToUser,
  validateScope: () => validateScope,
  verifyToken: () => verifyToken,
  verifyTokenSimple: () => verifyTokenSimple,
  verifyTokenWithServerAdmin: () => verifyTokenWithServer2,
  verifyTokenWithServerClient: () => verifyTokenWithServer,
  withAdminAuth: () => withAdminAuth,
  withAnyAuth: () => withAnyAuth,
  withAuth: () => withAuth,
  withAuthAndAuthz: () => withAuthAndAuthz,
  withAuthRoles: () => withAuthRoles,
  withBillingManagementAuth: () => withBillingManagementAuth,
  withCustomerExportAuth: () => withCustomerExportAuth,
  withCustomerManagementAuth: () => withCustomerManagementAuth,
  withManagementAuth: () => withManagementAuth,
  withMerchantAuth: () => withMerchantAuth,
  withMerchantScope: () => withMerchantScope,
  withOrderCreateAuth: () => withOrderCreateAuth,
  withOrderDeleteAuth: () => withOrderDeleteAuth,
  withOrderExportAuth: () => withOrderExportAuth,
  withOrderManagementAuth: () => withOrderManagementAuth,
  withOrderUpdateAuth: () => withOrderUpdateAuth,
  withOrderViewAuth: () => withOrderViewAuth,
  withOutletScope: () => withOutletScope,
  withProductExportAuth: () => withProductExportAuth,
  withProductManagementAuth: () => withProductManagementAuth,
  withUserManagementAuth: () => withUserManagementAuth,
  withViewAuth: () => withViewAuth
});
module.exports = __toCommonJS(src_exports);

// src/auth.ts
var import_database = require("@rentalshop/database");

// src/password.ts
var bcrypt = __toESM(require("bcryptjs"));
var hashPassword = async (password) => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};
var comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// src/jwt.ts
var jwt = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_LOCAL || "local-jwt-secret-key-change-this";
var generateToken = (payload) => {
  console.log("\u{1F50D} JWT GENERATE: Creating token with payload:", JSON.stringify(payload, null, 2));
  console.log("\u{1F50D} JWT GENERATE: Using JWT_SECRET:", JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : "UNDEFINED");
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  console.log("\u{1F50D} JWT GENERATE: Generated token:", token ? `${token.substring(0, 20)}...` : "FAILED");
  return token;
};
var verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
var verifyTokenSimple = async (token) => {
  try {
    console.log("\u{1F50D} JWT: verifyTokenSimple called with token:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
    const payload = verifyToken(token);
    console.log("\u{1F50D} JWT: Token payload:", payload);
    console.log("\u2705 JWT: Token verification successful");
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      merchantId: payload.merchantId,
      outletId: payload.outletId
    };
  } catch (error) {
    console.error("\u274C JWT: Token verification failed:", error);
    return null;
  }
};

// src/auth.ts
var import_utils = require("@rentalshop/utils");
var loginUser = async (credentials) => {
  const user = await import_database.prisma.user.findUnique({
    where: { email: credentials.email },
    include: {
      merchant: true,
      outlet: true
    }
  });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const isValidPassword = await comparePassword(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }
  const subscriptionError = await (0, import_utils.getSubscriptionError)({
    role: user.role,
    merchant: user.merchant
  });
  if (subscriptionError) {
    console.log("\u{1F50D} LOGIN: Subscription check failed:", subscriptionError.message);
    throw subscriptionError;
  }
  const token = generateToken({
    userId: user.id,
    // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role
  });
  return {
    user: {
      id: user.id,
      // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || void 0,
      merchantId: user.merchantId ? Number(user.merchantId) : void 0,
      outletId: user.outletId ? Number(user.outletId) : void 0,
      merchant: user.merchant ? {
        id: user.merchant.id,
        // Return merchant id to frontend (number)
        name: user.merchant.name,
        description: user.merchant.description || void 0
      } : void 0,
      outlet: user.outlet ? {
        id: user.outlet.id,
        // Return outlet id to frontend (number)
        name: user.outlet.name,
        address: user.outlet.address || void 0
      } : void 0
    },
    token
  };
};
var registerUser = async (data) => {
  const existingUser = await import_database.prisma.user.findUnique({
    where: { email: data.email }
  });
  if (existingUser) {
    throw new Error("User already exists");
  }
  const hashedPassword = await hashPassword(data.password);
  const user = await import_database.prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || data.name?.split(" ")[0] || "",
      lastName: data.lastName || data.name?.split(" ").slice(1).join(" ") || "",
      phone: data.phone,
      role: data.role || "OUTLET_STAFF"
    }
  });
  const token = generateToken({
    userId: user.id,
    // Use id (number) for JWT token consistency
    email: user.email,
    role: user.role
  });
  return {
    user: {
      id: user.id,
      // Return id to frontend (number)
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      phone: user.phone || void 0,
      merchantId: user.merchantId ? Number(user.merchantId) : void 0,
      outletId: user.outletId ? Number(user.outletId) : void 0
    },
    token
  };
};

// src/core.ts
var import_server = __toESM(require_server());
var import_utils2 = require("@rentalshop/utils");

// ../constants/src/validation.ts
var VALIDATION = {
  // Rental Rules
  MIN_RENTAL_DAYS: 1,
  MAX_RENTAL_DAYS: 365,
  // Stock and Inventory
  LOW_STOCK_THRESHOLD: 2,
  CRITICAL_STOCK_THRESHOLD: 0,
  MAX_STOCK_QUANTITY: 9999,
  // User Input
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_EMAIL_LENGTH: 255,
  // Order Rules
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 999999.99,
  MAX_ORDER_ITEMS: 50,
  // Financial
  MIN_DEPOSIT_AMOUNT: 0,
  MAX_DEPOSIT_AMOUNT: 99999.99,
  MIN_DISCOUNT_AMOUNT: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  // File Uploads
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"]
};

// ../constants/src/environment.ts
var ENVIRONMENT = {
  // API Configuration
  API_TIMEOUT: process.env.NODE_ENV === "production" ? 1e4 : 3e4,
  API_RETRY_ATTEMPTS: process.env.NODE_ENV === "production" ? 3 : 1,
  // Search and Pagination (Production vs Development)
  SEARCH_LIMIT: process.env.NODE_ENV === "production" ? 50 : 20,
  DASHBOARD_ITEMS: process.env.NODE_ENV === "production" ? 20 : 10,
  // Caching
  CACHE_TTL: process.env.NODE_ENV === "production" ? 300 : 60,
  // seconds
  CACHE_MAX_SIZE: process.env.NODE_ENV === "production" ? 1e3 : 100,
  // Logging
  LOG_LEVEL: process.env.NODE_ENV === "production" ? "error" : "debug",
  LOG_RETENTION: process.env.NODE_ENV === "production" ? 30 : 7,
  // days
  // Performance
  DEBOUNCE_DELAY: process.env.NODE_ENV === "production" ? 500 : 300,
  THROTTLE_DELAY: process.env.NODE_ENV === "production" ? 200 : 100,
  // Security
  SESSION_TIMEOUT: process.env.NODE_ENV === "production" ? 3600 : 7200,
  // seconds
  MAX_LOGIN_ATTEMPTS: process.env.NODE_ENV === "production" ? 5 : 10,
  // Feature Flags
  ENABLE_ANALYTICS: process.env.NODE_ENV === "production",
  ENABLE_DEBUG_MODE: process.env.NODE_ENV !== "production",
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === "production"
};

// ../constants/src/api.ts
var API = {
  // HTTP Status Codes
  STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    // For subscription errors (expired, paused, etc.)
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  // HTTP Methods
  METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    PATCH: "PATCH",
    DELETE: "DELETE"
  },
  // Content Types
  CONTENT_TYPES: {
    JSON: "application/json",
    FORM_DATA: "multipart/form-data",
    TEXT: "text/plain",
    HTML: "text/html"
  },
  // Headers
  HEADERS: {
    AUTHORIZATION: "Authorization",
    CONTENT_TYPE: "Content-Type",
    ACCEPT: "Accept",
    USER_AGENT: "User-Agent",
    CACHE_CONTROL: "Cache-Control"
  },
  // Rate Limiting
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1e3,
    BURST_LIMIT: 10
  },
  // Timeouts
  TIMEOUTS: {
    CONNECT: 5e3,
    READ: 3e4,
    WRITE: 3e4,
    IDLE: 6e4
  },
  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1e3,
    MAX_DELAY: 1e4,
    BACKOFF_MULTIPLIER: 2
  },
  // Cache Headers
  CACHE: {
    NO_CACHE: "no-cache",
    NO_STORE: "no-store",
    MUST_REVALIDATE: "must-revalidate",
    PRIVATE: "private",
    PUBLIC: "public"
  },
  // Error Codes
  ERROR_CODES: {
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
    SUBSCRIPTION_ERROR: "SUBSCRIPTION_ERROR",
    NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
    CONFLICT_ERROR: "CONFLICT_ERROR",
    SERVER_ERROR: "SERVER_ERROR"
  }
};

// ../constants/src/status.ts
var SUBSCRIPTION_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELLED: "CANCELLED",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED"
};

// src/core.ts
var ROLE_PERMISSIONS = {
  "ADMIN": [
    "system.manage",
    "system.view",
    "merchant.manage",
    "merchant.view",
    "outlet.manage",
    "outlet.view",
    "users.manage",
    "users.view",
    "products.manage",
    "products.view",
    "products.export",
    "orders.create",
    "orders.view",
    "orders.update",
    "orders.delete",
    "orders.export",
    "orders.manage",
    "customers.manage",
    "customers.view",
    "customers.export",
    "analytics.view",
    "billing.manage",
    "billing.view"
  ],
  "MERCHANT": [
    "merchant.view",
    "outlet.manage",
    "outlet.view",
    "users.manage",
    "users.view",
    "products.manage",
    "products.view",
    "products.export",
    "orders.create",
    "orders.view",
    "orders.update",
    "orders.delete",
    "orders.export",
    "orders.manage",
    "customers.manage",
    "customers.view",
    "customers.export",
    "analytics.view",
    "billing.view"
  ],
  "OUTLET_ADMIN": [
    "outlet.view",
    "users.view",
    "products.manage",
    "products.view",
    "products.export",
    "orders.create",
    "orders.view",
    "orders.update",
    "orders.delete",
    "orders.export",
    "orders.manage",
    "customers.manage",
    "customers.view",
    "customers.export",
    "analytics.view"
  ],
  "OUTLET_STAFF": [
    "outlet.view",
    "products.view",
    // ❌ NO products.export
    "orders.create",
    "orders.view",
    "orders.update",
    // ❌ NO orders.delete, orders.export
    "customers.view",
    "customers.manage"
    // ❌ NO customers.export
  ]
};
async function authenticateRequest(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return {
        success: false,
        response: import_server.NextResponse.json(
          { success: false, message: "Access token required" },
          { status: 401 }
        )
      };
    }
    let user;
    try {
      user = await verifyTokenSimple(token);
    } catch (error) {
      if (error instanceof import_utils2.PlanLimitError) {
        return {
          success: false,
          response: import_server.NextResponse.json(
            {
              success: false,
              message: error.message,
              errorCode: "SUBSCRIPTION_ERROR"
            },
            { status: 402 }
            // Payment Required for subscription issues
          )
        };
      }
      return {
        success: false,
        response: import_server.NextResponse.json(
          { success: false, message: "Invalid token" },
          { status: 401 }
        )
      };
    }
    if (!user) {
      return {
        success: false,
        response: import_server.NextResponse.json(
          { success: false, message: "Invalid token" },
          { status: 401 }
        )
      };
    }
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: "",
      // Will be populated from database in API routes
      lastName: "",
      // Will be populated from database in API routes
      name: user.email,
      // Use email as fallback name
      role: user.role,
      phone: void 0,
      // Will be populated from database in API routes
      merchantId: user.merchantId,
      outletId: user.outletId,
      merchant: void 0,
      // Will be populated from database in API routes
      outlet: void 0
      // Will be populated from database in API routes
    };
    return {
      success: true,
      user: transformedUser
    };
  } catch (error) {
    console.error("Authentication error:", error);
    if (error instanceof Error && error.message.includes("subscription")) {
      return {
        success: false,
        response: import_server.NextResponse.json(
          {
            success: false,
            message: error.message,
            code: "SUBSCRIPTION_ERROR"
          },
          { status: API.STATUS.FORBIDDEN }
        )
      };
    }
    return {
      success: false,
      response: import_server.NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 401 }
      )
    };
  }
}
function getUserScope(user) {
  const merchantId = user.merchantId || user.merchant?.id;
  const outletId = user.outletId || user.outlet?.id;
  console.log("\u{1F50D} getUserScope - User merchant info:", {
    "user.merchantId": user.merchantId,
    "user.merchant?.id": user.merchant?.id,
    "user.outletId": user.outletId,
    "user.outlet?.id": user.outlet?.id,
    "resolved merchantId": merchantId,
    "resolved outletId": outletId,
    "user.role": user.role
  });
  return {
    merchantId,
    outletId,
    canAccessSystem: user.role === "ADMIN"
  };
}
function hasPermission(user, permission) {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}
function hasAnyPermission(user, permissions) {
  return permissions.some((permission) => hasPermission(user, permission));
}
function hasAllPermissions(user, permissions) {
  return permissions.every((permission) => hasPermission(user, permission));
}
function canAccessResource(user, resource, action = "view") {
  const permission = `${resource}.${action}`;
  return hasPermission(user, permission);
}
function normalizeRole(role) {
  if (!role)
    return null;
  const upper = role.toUpperCase();
  if (upper === "ADMIN")
    return "ADMIN";
  if (upper === "MERCHANT")
    return "MERCHANT";
  if (upper === "OUTLET_ADMIN")
    return "OUTLET_ADMIN";
  if (upper === "OUTLET_STAFF")
    return "OUTLET_STAFF";
  return null;
}
function hasAnyRole(user, allowed) {
  const r = normalizeRole(user.role);
  return !!r && allowed.includes(r);
}
function isMerchantLevel(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT"]);
}
function isOutletTeam(user) {
  return hasAnyRole(user, ["OUTLET_ADMIN", "OUTLET_STAFF"]);
}
function canManageUsers(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function assertAnyRole(user, allowed) {
  if (!hasAnyRole(user, allowed)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowed.join(", ")}`);
  }
}
function canManageOutlets(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT"]);
}
function canManageProducts(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canAccessUserManagement(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canCreateOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]);
}
function canViewOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]);
}
function canUpdateOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN", "OUTLET_STAFF"]);
}
function canDeleteOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canManageOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canExportOrders(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canExportProducts(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function canExportCustomers(user) {
  return hasAnyRole(user, ["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
}
function validateScope(userScope, requiredScope) {
  if (userScope.canAccessSystem) {
    return { valid: true };
  }
  if (requiredScope.merchantId && userScope.merchantId !== requiredScope.merchantId) {
    return {
      valid: false,
      error: import_server.NextResponse.json(
        {
          success: false,
          message: "Access denied: Cannot access data from other merchants",
          code: "SCOPE_VIOLATION"
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }
  if (requiredScope.outletId && userScope.outletId !== requiredScope.outletId) {
    return {
      valid: false,
      error: import_server.NextResponse.json(
        {
          success: false,
          message: "Access denied: Cannot access data from other outlets",
          code: "SCOPE_VIOLATION"
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }
  return { valid: true };
}
function createAuthError(message, code = "AUTHORIZATION_ERROR", status = 403) {
  return import_server.NextResponse.json(
    {
      success: false,
      message,
      code,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    { status }
  );
}
function createScopeError(message = "Access denied: Resource not in user scope") {
  return createAuthError(message, "SCOPE_VIOLATION", 403);
}
function createPermissionError(requiredPermission) {
  return createAuthError(
    `Insufficient permissions. Required: ${requiredPermission}`,
    "INSUFFICIENT_PERMISSIONS",
    403
  );
}

// src/middleware.ts
function withAuth(handler) {
  return async (request, ...args) => {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(request, authResult.user, ...args);
  };
}
async function optionalAuth(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return null;
    }
    const authResult = await authenticateRequest(request);
    return authResult.success ? authResult.user : null;
  } catch (error) {
    console.error("Optional authentication error:", error);
    return null;
  }
}
function authorizeRequest(user, options = {}) {
  const userScope = getUserScope(user);
  if (options.permission && !hasPermission(user, options.permission)) {
    return {
      authorized: false,
      error: createPermissionError(options.permission),
      userScope
    };
  }
  if (options.resource && !canAccessResource(user, options.resource, options.action || "view")) {
    return {
      authorized: false,
      error: createPermissionError(`${options.resource}.${options.action || "view"}`),
      userScope
    };
  }
  if (options.scope) {
    const scopeCheck = validateScope(userScope, options.scope);
    if (!scopeCheck.valid) {
      return {
        authorized: false,
        error: scopeCheck.error,
        userScope
      };
    }
  }
  return { authorized: true, userScope };
}
function withAuthAndAuthz(options = {}, handler) {
  return async (request, ...args) => {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const authzResult = authorizeRequest(authResult.user, options);
    if (!authzResult.authorized) {
      return authzResult.error;
    }
    const authorizedRequest = {
      request,
      user: authResult.user,
      userScope: authzResult.userScope
    };
    return handler(authorizedRequest, ...args);
  };
}
var withAdminAuth = withAuthAndAuthz.bind(null, { permission: "system.manage" });
var withUserManagementAuth = withAuthAndAuthz.bind(null, { permission: "users.manage" });
var withProductManagementAuth = withAuthAndAuthz.bind(null, { permission: "products.manage" });
var withProductExportAuth = withAuthAndAuthz.bind(null, { permission: "products.export" });
var withOrderManagementAuth = withAuthAndAuthz.bind(null, { permission: "orders.manage" });
var withOrderCreateAuth = withAuthAndAuthz.bind(null, { permission: "orders.create" });
var withOrderViewAuth = withAuthAndAuthz.bind(null, { permission: "orders.view" });
var withOrderUpdateAuth = withAuthAndAuthz.bind(null, { permission: "orders.update" });
var withOrderDeleteAuth = withAuthAndAuthz.bind(null, { permission: "orders.delete" });
var withOrderExportAuth = withAuthAndAuthz.bind(null, { permission: "orders.export" });
var withCustomerManagementAuth = withAuthAndAuthz.bind(null, { permission: "customers.manage" });
var withCustomerExportAuth = withAuthAndAuthz.bind(null, { permission: "customers.export" });
var withBillingManagementAuth = withAuthAndAuthz.bind(null, { permission: "billing.manage" });
var withViewAuth = withAuthAndAuthz.bind(null, { action: "view" });
function withMerchantScope(merchantId) {
  return withAuthAndAuthz.bind(null, {
    scope: { merchantId },
    resource: "merchant",
    action: "view"
  });
}
function withOutletScope(outletId) {
  return withAuthAndAuthz.bind(null, {
    scope: { outletId },
    resource: "outlet",
    action: "view"
  });
}
function getUserScopeFromRequest(authorizedRequest) {
  return authorizedRequest.userScope;
}
function buildSecureWhereClause(authorizedRequest, additionalWhere = {}) {
  const { userScope } = authorizedRequest;
  if (userScope.canAccessSystem) {
    return additionalWhere;
  }
  const where = { ...additionalWhere };
  if (userScope.merchantId) {
    where.merchantId = userScope.merchantId;
  }
  if (userScope.outletId) {
    where.outletId = userScope.outletId;
  }
  return where;
}
async function validateResourceBelongsToUser(authorizedRequest, resourceType, resourceId) {
  const { userScope } = authorizedRequest;
  if (userScope.canAccessSystem) {
    return { valid: true };
  }
  return { valid: true };
}

// src/unified-auth.ts
var import_server2 = __toESM(require_server());
var import_database2 = require("@rentalshop/database");
async function checkSubscriptionStatus(user) {
  if (user.role === "ADMIN") {
    return { success: true };
  }
  const merchantId = user.merchantId || user.merchant?.id;
  if (!merchantId) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        { success: false, message: "No merchant associated with user", code: "NO_MERCHANT" },
        { status: 403 }
      )
    };
  }
  const merchant = await import_database2.db.merchants.findById(merchantId);
  if (!merchant) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        { success: false, message: "Merchant not found", code: "MERCHANT_NOT_FOUND" },
        { status: 404 }
      )
    };
  }
  const subscription = merchant.subscription;
  if (!subscription) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        {
          success: false,
          message: "No active subscription found. Please subscribe to continue.",
          code: "NO_SUBSCRIPTION",
          details: {
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }
  const subscriptionStatus = subscription.status;
  if (subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        {
          success: false,
          message: "Your subscription is paused. Please contact support to reactivate.",
          code: "SUBSCRIPTION_PAUSED",
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }
  if (subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        {
          success: false,
          message: "Your subscription has been cancelled. Please contact support to reactivate.",
          code: "SUBSCRIPTION_CANCELLED",
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name,
            canceledAt: subscription.canceledAt
          }
        },
        { status: 403 }
      )
    };
  }
  if (subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        {
          success: false,
          message: "Your subscription has expired. Please renew to continue using the service.",
          code: "SUBSCRIPTION_EXPIRED",
          details: {
            status: subscriptionStatus,
            expiredAt: subscription.currentPeriodEnd,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }
  if (subscriptionStatus === SUBSCRIPTION_STATUS.PAST_DUE) {
    return {
      success: false,
      response: import_server2.NextResponse.json(
        {
          success: false,
          message: "Your subscription payment is past due. Please update your payment method.",
          code: "SUBSCRIPTION_PAST_DUE",
          details: {
            status: subscriptionStatus,
            merchantId: merchant.id,
            merchantName: merchant.name
          }
        },
        { status: 403 }
      )
    };
  }
  if (subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE && subscription.currentPeriodEnd) {
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (periodEnd < now) {
      return {
        success: false,
        response: import_server2.NextResponse.json(
          {
            success: false,
            message: "Your subscription period has ended. Please renew to continue.",
            code: "SUBSCRIPTION_PERIOD_ENDED",
            details: {
              expiredAt: subscription.currentPeriodEnd,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }
  }
  if (subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL && subscription.trialEnd) {
    const now = /* @__PURE__ */ new Date();
    const trialEnd = new Date(subscription.trialEnd);
    if (trialEnd < now) {
      return {
        success: false,
        response: import_server2.NextResponse.json(
          {
            success: false,
            message: "Your trial period has ended. Please upgrade to a paid plan to continue.",
            code: "TRIAL_EXPIRED",
            details: {
              trialEndedAt: subscription.trialEnd,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }
  }
  return { success: true };
}
function withAuthRoles(allowedRoles, options) {
  const requireSubscription = options?.requireActiveSubscription !== false;
  return function(handler) {
    return async function(request) {
      console.log(`\u{1F510} Auth check for ${request.method} ${request.url}`);
      try {
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          console.log("\u274C Authentication failed");
          return authResult.response;
        }
        const user = authResult.user;
        console.log(`\u2705 User authenticated: ${user.email} (${user.role})`);
        if (allowedRoles && allowedRoles.length > 0) {
          if (!hasAnyRole(user, allowedRoles)) {
            console.log(`\u274C Insufficient permissions: ${user.role} not in [${allowedRoles.join(", ")}]`);
            return import_server2.NextResponse.json(
              {
                error: "Insufficient permissions",
                required: allowedRoles,
                current: user.role
              },
              { status: 403 }
            );
          }
          console.log(`\u2705 Role authorized: ${user.role}`);
        }
        if (requireSubscription) {
          console.log("\u{1F50D} Checking subscription status...");
          const subscriptionCheck = await checkSubscriptionStatus(user);
          if (!subscriptionCheck.success && subscriptionCheck.response) {
            console.log("\u274C Subscription check failed");
            return subscriptionCheck.response;
          }
          console.log("\u2705 Subscription is active");
        }
        const userScope = getUserScope(user);
        const context = { user, userScope };
        return await handler(request, context);
      } catch (error) {
        console.error("\u{1F6A8} Auth wrapper error:", error);
        return import_server2.NextResponse.json(
          { error: "Authentication error" },
          { status: 500 }
        );
      }
    };
  };
}
var withAdminAuth2 = withAuthRoles(["ADMIN"]);
var withMerchantAuth = withAuthRoles(["ADMIN", "MERCHANT"]);
var withManagementAuth = withAuthRoles(["ADMIN", "MERCHANT", "OUTLET_ADMIN"]);
var withAnyAuth = withAuthRoles();

// src/client/index.ts
var import_utils3 = require("@rentalshop/utils");
var import_utils4 = require("@rentalshop/utils");
var loginUser2 = import_utils4.authApi.login;
var logoutUser = import_utils4.authApi.logout;
var verifyTokenWithServer = import_utils4.authApi.verifyToken;
var loginUserClient = import_utils4.authApi.login;
var logoutUserClient = import_utils4.authApi.logout;
var getCurrentUserClient = import_utils4.getCurrentUser;
var isAuthenticatedWithVerification = async () => {
  const { isAuthenticated: isAuthenticated3 } = await import("@rentalshop/utils");
  if (!isAuthenticated3())
    return false;
  try {
    const result = await import_utils4.authApi.verifyToken();
    return result.success === true;
  } catch (error) {
    return false;
  }
};

// src/admin/index.ts
var import_utils5 = require("@rentalshop/utils");
var import_utils6 = require("@rentalshop/utils");
var loginUser3 = import_utils6.authApi.login;
var logoutUser2 = import_utils6.authApi.logout;
var verifyTokenWithServer2 = import_utils6.authApi.verifyToken;
var isAuthenticatedWithVerification2 = async () => {
  const { isAuthenticated: isAuthenticated3 } = await import("@rentalshop/utils");
  if (!isAuthenticated3())
    return false;
  try {
    const result = await import_utils6.authApi.verifyToken();
    return result.success === true;
  } catch (error) {
    return false;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertAnyRole,
  authenticateRequest,
  authorizeRequest,
  buildSecureWhereClause,
  canAccessResource,
  canAccessUserManagement,
  canCreateOrders,
  canDeleteOrders,
  canExportCustomers,
  canExportOrders,
  canExportProducts,
  canManageOrders,
  canManageOutlets,
  canManageProducts,
  canManageUsers,
  canUpdateOrders,
  canViewOrders,
  comparePassword,
  createAuthError,
  createPermissionError,
  createScopeError,
  generateToken,
  getCurrentUserClient,
  getUserScope,
  getUserScopeFromRequest,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hashPassword,
  isAuthenticatedAdmin,
  isAuthenticatedClient,
  isAuthenticatedWithVerificationAdmin,
  isAuthenticatedWithVerificationClient,
  isMerchantLevel,
  isOutletTeam,
  loginUser,
  loginUserClient,
  logoutUserClient,
  optionalAuth,
  registerUser,
  validateResourceBelongsToUser,
  validateScope,
  verifyToken,
  verifyTokenSimple,
  verifyTokenWithServerAdmin,
  verifyTokenWithServerClient,
  withAdminAuth,
  withAnyAuth,
  withAuth,
  withAuthAndAuthz,
  withAuthRoles,
  withBillingManagementAuth,
  withCustomerExportAuth,
  withCustomerManagementAuth,
  withManagementAuth,
  withMerchantAuth,
  withMerchantScope,
  withOrderCreateAuth,
  withOrderDeleteAuth,
  withOrderExportAuth,
  withOrderManagementAuth,
  withOrderUpdateAuth,
  withOrderViewAuth,
  withOutletScope,
  withProductExportAuth,
  withProductManagementAuth,
  withUserManagementAuth,
  withViewAuth
});
//# sourceMappingURL=index.js.map