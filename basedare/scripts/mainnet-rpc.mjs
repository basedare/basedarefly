// Read-only operator transport. Never used by the signer or application runtime.
import http from 'node:http';
import https from 'node:https';
import { FetchRequest, JsonRpcProvider } from 'ethers';

const READ_METHODS = new Set([
  'eth_chainId', 'eth_call', 'eth_getCode', 'eth_getBalance',
  'eth_getTransactionCount', 'eth_getBlockByNumber', 'eth_blockNumber',
  'eth_gasPrice', 'eth_maxPriorityFeePerGas', 'eth_estimateGas',
]);

function readMethod(method) {
  if (!READ_METHODS.has(method)) throw new Error('This operator RPC only permits read-only methods.');
}

export function rpcIpFamily(value = process.env.MAINNET_RPC_IP_FAMILY ?? '0') {
  if (!['0', '4', '6'].includes(String(value))) {
    throw new Error('MAINNET_RPC_IP_FAMILY must be 0 (automatic), 4 or 6.');
  }
  return Number(value);
}

function safeFailure(error) {
  const code = typeof error?.code === 'string' && /^[A-Z_0-9]{1,40}$/.test(error.code)
    ? error.code : 'RPC_ERROR';
  // Provider errors can include credential-bearing URLs and response bodies.
  return new Error(`Read-only RPC failed (${code}). Check RPC connectivity and MAINNET_RPC_IP_FAMILY.`);
}

export class ReadOnlyRpcProvider extends JsonRpcProvider {
  #agent;
  #deadline;

  constructor(endpoint, { ipFamily = rpcIpFamily(), timeoutMs = 10_000 } = {}) {
    let url;
    try { url = new URL(endpoint); } catch { throw new Error('Set a valid HTTPS RPC URL.'); }
    const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback && !url.username && !url.password)) {
      throw new Error('RPC must use HTTPS; unauthenticated loopback HTTP is allowed only for local tests.');
    }
    if (![0, 4, 6].includes(ipFamily) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
      throw new Error('Invalid RPC address family or timeout.');
    }
    const Agent = url.protocol === 'https:' ? https.Agent : http.Agent;
    const agent = new Agent({ family: ipFamily, keepAlive: false });
    const request = new FetchRequest(url.href);
    request.timeout = timeoutMs;
    request.setThrottleParams({ maxAttempts: 1 });
    const getUrl = FetchRequest.createGetUrlFunc({ agent });
    request.getUrlFunc = async (req, signal) => {
      const response = await getUrl(req, signal);
      if (response.statusCode >= 300 && response.statusCode < 400) {
        throw Object.assign(new Error('RPC redirects are not followed.'), { code: 'NETWORK_ERROR' });
      }
      return response;
    };
    // Do not assume the chain; getNetwork must observe the actual RPC chain ID.
    super(request, undefined, { batchMaxCount: 1 });
    this.#agent = agent;
    this.#deadline = timeoutMs;
  }

  async send(method, params) {
    readMethod(method);
    return super.send(method, params);
  }

  async _send(payload) {
    const requests = Array.isArray(payload) ? payload : [payload];
    requests.forEach(request => readMethod(request.method));
    let timer;
    try {
      const responses = await Promise.race([
        super._send(payload),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = Object.assign(new Error('RPC deadline exceeded.'), { code: 'TIMEOUT' });
            reject(error);
            this.destroy();
          }, this.#deadline);
        }),
      ]);
      const ids = new Set(requests.map(request => request.id));
      if (responses.length !== requests.length || responses.some(response =>
        response.jsonrpc !== '2.0' || !ids.delete(response.id) ||
        (Object.hasOwn(response, 'result') === Object.hasOwn(response, 'error')))) {
        throw Object.assign(new Error('Invalid RPC response.'), { code: 'BAD_DATA' });
      }
      for (const response of responses) {
        if (response.error) continue;
        const method = requests.find(request => request.id === response.id).method;
        const bytes = method === 'eth_getCode' || method === 'eth_call';
        const valid = method === 'eth_getBlockByNumber'
          ? response.result === null || (typeof response.result === 'object' && !Array.isArray(response.result))
          : typeof response.result === 'string' && (bytes
            ? /^0x(?:[0-9a-f]{2})*$/i.test(response.result)
            : /^0x[0-9a-f]+$/i.test(response.result));
        if (!valid) throw Object.assign(new Error('Malformed RPC result.'), { code: 'BAD_DATA' });
      }
      return responses.map(response => response.error ? {
        jsonrpc: '2.0', id: response.id,
        error: { code: Number.isInteger(response.error.code) ? response.error.code : -32603, message: 'RPC rejected the read request.' },
      } : response);
    } catch (error) {
      throw safeFailure(error);
    } finally {
      clearTimeout(timer);
    }
  }

  destroy() {
    if (!this.destroyed) super.destroy();
    this.#agent?.destroy();
  }
}
