/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any -- Isolate provider/DB boundaries before loading the real route. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

const Module = require('node:module');
const originalLoad = Module._load;
const wallet = '0x' + '1'.repeat(40);
const cid = 'bafy' + 'a'.repeat(50);
const makeState = () => ({ authorized: true, rights: true, funder: false, funded: true, issue: 0, attach: 0, list: 0, wrongTicket: false, changed: false, duplicate: false, record: null as any, row: { id:'dare-1', title:'Dance', streamerHandle:'@open', status:'PENDING', bounty:10, isSimulated:false, txHash:'0x'+'1'.repeat(64), onChainDareId:'1', expiresAt:new Date(Date.now()+3600000), videoUrl:null as string|null, proofCid:null as string|null, claimedBy:wallet, targetWalletAddress:null, stakerAddress:'0x'+'2'.repeat(40), outcomeContractSnapshot:null } });
let state = makeState();
const tx = {
  dare: { findFirst: async () => state.duplicate ? { id:'other' } : null, updateMany: async ({ data, where }: any) => { assert.equal(where.claimedBy,wallet); assert.equal(where.status,'PENDING'); assert.equal(where.proofCid,null); if(state.changed) return {count:0}; Object.assign(state.row,data); state.attach++; return {count:1}; } },
  founderEvent:{ updateMany: async ({ data }: any) => { Object.assign(state.record,data); return {count:1}; } },
};
class Storage {
  upload = { public: { createSignedURL: async (options: any) => { state.issue++; assert.equal(options.maxFileSize,1024); assert.equal(options.mimeTypes[0],'video/mp4'); return 'https://uploads.pinata.cloud/v3/files?fixture=signed'; } } };
  files = {public:{list:()=>({cid:()=>({keyvalues:()=>({limit:async()=>{state.list++;return {files:[{id:'file-1',cid,size:1024,number_of_files:1,mime_type:'video/mp4',keyvalues:{basedareDare:state.row.id,basedareTicket:state.wrongTicket?'other':state.record.metadataJson.ticket}}]}}})})})}};
}
Module._load = function(name: string, ...args: any[]) {
  if (name === '@/lib/prisma') return {prisma:{dare:{findUnique:async()=>state.row},founderEvent:{create:async({data}:any)=>{state.record={id:'event-1',...data};return state.record},findUnique:async()=>state.record},$transaction:async(fn:any)=>fn(tx)}};
  if (name === '@/lib/proof-submit-auth-server') return {getAuthorizedProofSubmitterWallet:async(_request:any,input:any)=>{assert.deepEqual(input.authorizedWallets,[wallet]);return state.authorized&&!state.funder?wallet:null;}};
  if (name === '@/lib/content-rights-server') return {hasContentRightsAcceptance:async()=>state.rights};
  if (name === '@/lib/rate-limit') return {checkRateLimit:()=>({allowed:true})};
  if (name === 'pinata') return {PinataSDK:Storage};
  return originalLoad.call(this,name,...args);
};
const { POST } = require('../app/api/upload/dare-proof/route');
Module._load=originalLoad;
process.env.PINATA_JWT='fixture-only'; process.env.PINATA_GATEWAY='fixture.pinata.cloud';

const preparation={action:'prepare',dareId:'dare-1',name:'phone.mp4',size:1024,mime:'video/mp4',sha256:'a'.repeat(64),consent:{processing:true,publication:false,rightsConfirmed:true}};
const request=(body:unknown)=>new NextRequest('https://fixture.invalid/api/upload/dare-proof',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
async function prepare(){const res=await POST(request(preparation));assert.equal(res.status,200);return await res.json()}
async function complete(ticket:string){return POST(request({action:'complete',dareId:'dare-1',ticket,cid}))}

test('assigned participant prepares signed upload, completes once and safely resumes',async()=>{
  state=makeState();const ticket=await prepare();assert.equal(state.issue,1);assert.equal(state.attach,0);
  const res=await complete(ticket.ticket);assert.equal(res.status,200);const body=await res.json();assert.equal(body.url,`https://fixture.pinata.cloud/ipfs/${cid}`);assert.equal(state.record.status,'ATTACHED');assert.equal(state.row.status,'PENDING');assert.equal(state.attach,1);
  const retry=await complete(ticket.ticket);assert.equal(retry.status,200);assert.equal((await retry.json()).existingProof,true);assert.equal(state.attach,1);
});
test('paid participant authority, real funding and existing rights gates precede storage',async()=>{
  for(const reason of ['unauthorized','funder','unfunded','rights','expired']){
    state=makeState();if(reason==='unauthorized')state.authorized=false;if(reason==='funder')state.funder=true;if(reason==='unfunded')state.row.txHash='';if(reason==='rights')state.rights=false;if(reason==='expired')state.row.expiresAt=new Date(Date.now()-1000);
    const response=await POST(request(preparation));assert.ok([401,409].includes(response.status),reason);assert.equal(state.issue,0);assert.equal(state.attach,0);
  }
});
test('mismatched receipt, duplicate evidence, expired ticket or concurrent dare change never attaches',async()=>{
  for(const reason of ['metadata','duplicate','expired','changed']){
    state=makeState();const {ticket}=await prepare();if(reason==='metadata')state.wrongTicket=true;if(reason==='duplicate')state.duplicate=true;if(reason==='expired')state.record.metadataJson.expiresAt=new Date(Date.now()-1000).toISOString();if(reason==='changed')state.changed=true;
    const response=await complete(ticket);assert.equal(response.status,409,reason);assert.equal(state.attach,0);assert.equal(state.row.proofCid,null);assert.equal(state.record.status,'ISSUED');
  }
});
