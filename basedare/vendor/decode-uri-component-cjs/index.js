// Preserve the callable CommonJS API used by query-string 7.
// Node 22 and the app bundler both support the upstream synchronous ESM module.
module.exports = require("decode-uri-component-patched").default;
