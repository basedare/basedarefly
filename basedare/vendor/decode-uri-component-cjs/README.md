# URI decoder compatibility adapter

`query-string` 7 requires a callable CommonJS decoder. The patched upstream `decode-uri-component` 0.5.1 is ESM. This adapter exports its default function without copying or changing its algorithm. The app and CI run Node 22; webpack bundles the upstream module for browsers.

The npm override points every older decoder consumer here. Keep the upstream alias pinned and run `test:uri-decoder-security` plus wallet/provider build checks before changing it. This is not a wallet-provider upgrade.
