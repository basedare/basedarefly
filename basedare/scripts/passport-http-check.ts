import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { buildWalletActionMessage } from '../lib/wallet-action-auth';
import { ACTIVITY_SUGGESTIONS } from '../lib/home-activities';
const base = process.env.PASSPORT_TEST_URL || 'http://127.0.0.1:3293';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local disposable environment required');
const account = privateKeyToAccount(generatePrivateKey());
const wallet = account.address.toLowerCase();
async function call(method: string, action: string, body?: unknown, requested = wallet) {
  const issuedAt = new Date().toISOString();
  const signature = await account.signMessage({message:buildWalletActionMessage({walletAddress:wallet,action,resource:'community',issuedAt})});
  return fetch(base + '/api/adventures/passport?wallet=' + requested, {method,headers:{'Content-Type':'application/json','x-basedare-wallet':wallet,'x-basedare-wallet-signature':signature,'x-basedare-wallet-issued-at':issuedAt},...(body ? {body:JSON.stringify(body)} : {})});
}
async function main() {
  const guest = await fetch(base+'/api/adventures/passport?wallet='+wallet);
  assert.equal(guest.status,401);
  const activity = ACTIVITY_SUGGESTIONS[0], now = Date.now();
  const progress = {runs:[{runId:'signed-http-test',activityId:activity.id,startedAt:now-2000,completedAt:now-1000,steps:activity.steps.map((_,i)=>i),area:{lat:9.79,lng:126.15,label:'Disposable local test only'}}]};
  const saved = await call('PUT','passport:save',{wallet,revision:0,progress});
  assert.equal(saved.status,200,await saved.text());
  const read = await call('GET','passport:read');
  assert.equal(read.status,200);
  assert.equal((await read.json()).data.journal.progress.runs[0].runId,'signed-http-test');
  assert.equal((await call('GET','passport:read',undefined,'0x2222222222222222222222222222222222222222')).status,401);
  assert.equal((await call('DELETE','passport:delete',{wallet,revision:1})).status,200);
  assert.equal((await call('PUT','passport:save',{wallet,revision:1,progress})).status,409);
  console.log('PASS: real HTTP route accepts the matching EOA action signature, rejects anonymous and cross-wallet reads, saves/loads, clears and rejects stale writes. Disposable local DB only.');
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
