/* eslint-disable @typescript-eslint/no-require-imports -- Replace only request-scoped OAuth and external contract RPC; actual routes, wallet signatures and database are exercised. */
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { prisma } from '@/lib/prisma';
import { buildWalletActionMessage, buildWalletSessionMessage } from '@/lib/wallet-action-auth';
const Module=require('node:module'), originalLoad=Module._load;
Module._load=function(name:string,...args:unknown[]){
 if(name==='next-auth')return {...originalLoad.call(this,name,...args),getServerSession:async()=>null};
 if(name==='viem'){const real=originalLoad.call(this,name,...args);return {...real,createPublicClient:()=>({verifyMessage:real.verifyMessage})};}
 return originalLoad.call(this,name,...args);
};
async function main(){
 const db=await prisma.$queryRaw<Array<{name:string}>>`SELECT current_database() AS name`;
 assert.match(db[0].name,/^basedare_buyer_workspace_/, 'Disposable database required.');
 globalThis.fetch=async()=>{throw Error('External requests disabled.');};
 const accounts=Array.from({length:3},()=>privateKeyToAccount(generatePrivateKey()));
 const wallets=accounts.map(a=>a.address.toLowerCase());
 const brands=await Promise.all(wallets.slice(0,2).map((walletAddress,i)=>prisma.brand.create({data:{name:`Local buyer fixture ${i}`,walletAddress}})));
 const dares=await Promise.all(brands.map((_,i)=>prisma.dare.create({data:{title:`Local buyer evidence ${i}`,bounty:62.5,status:'VERIFIED',tag:'brand-campaign',isSimulated:false,moderatorNote:`PRIVATE_OWNER_NOTE_${i}`}})));
 const campaigns=await Promise.all(brands.map((b,i)=>prisma.campaign.create({data:{brandId:b.id,type:'PLACE',tier:'SIP_MENTION',title:`Local buyer brief ${i}`,budgetUsdc:62.5,payoutPerCreator:62.5,creatorCountTarget:1,status:'LIVE',linkedDareId:dares[i].id}})));
 const slot=await prisma.campaignSlot.create({data:{campaignId:campaigns[0].id,status:'SUBMITTED',creatorAddress:wallets[1],proofUrl:'https://example.test/private-proof',visualScore:20}});
 const brandRoute=require('../app/api/brands/route'), list=require('../app/api/campaigns/route'), detail=require('../app/api/campaigns/[id]/route'), slots=require('../app/api/campaigns/[id]/slots/route'), matches=require('../app/api/campaigns/[id]/matches/route'), creator=require('../app/api/campaigns/for-creator/route');
 async function headers(i:number,action='buyer:read',resource=wallets[i],issuedAt=new Date().toISOString()){
  return {'x-basedare-wallet':wallets[i],'x-basedare-wallet-issued-at':issuedAt,'x-basedare-wallet-signature':await accounts[i].signMessage({message:buildWalletActionMessage({walletAddress:wallets[i],action,resource,issuedAt})})};
 }
 const req=(path:string,h:Record<string,string>={},body?:unknown)=>new NextRequest('http://localhost'+path,{method:body?'POST':'GET',headers:{...h,'content-type':'application/json',origin:'http://localhost'},...(body?{body:JSON.stringify(body)}:{})});
 const params=(id=campaigns[0].id)=>({params:Promise.resolve({id})});
 const h=await headers(0);
 for(const [route,path,p] of [[brandRoute,`/api/brands?wallet=${wallets[0]}`,undefined],[list,`/api/campaigns?brand=${wallets[0]}`,undefined],[detail,`/api/campaigns/${campaigns[0].id}`,params()],[slots,`/api/campaigns/${campaigns[0].id}/slots`,params()],[matches,`/api/campaigns/${campaigns[0].id}/matches?brandWallet=${wallets[0]}`,params()]] as const){
  const denied=await route.GET(req(path),p);assert.equal(denied.status,401,path);assert.match(denied.headers.get('cache-control'),/no-store/);
  const own=await route.GET(req(path,h),p);assert.equal(own.status,200,path);assert.match(own.headers.get('cache-control'),/no-store/);
 }
 const ownList=await (await list.GET(req(`/api/campaigns?brand=${wallets[0]}`,h))).json();assert.equal(ownList.data.length,1);assert.equal(ownList.data[0].id,campaigns[0].id);assert.equal(ownList.data[0].linkedDare.isSimulated,false);
 assert.equal((await brandRoute.GET(req(`/api/brands?wallet=${wallets[1]}`,h))).status,401);
 assert.equal((await list.GET(req(`/api/campaigns?brand=${wallets[2]}`,await headers(2)))).status,404,'Unknown brand must not broaden query');
 assert.equal((await detail.GET(req('/api/campaigns/x',await headers(1)),params())).status,404);
 assert.equal((await slots.GET(req('/api/campaigns/x/slots',await headers(1)),params())).status,404);
 assert.equal((await matches.GET(req(`/api/campaigns/x/matches?brandWallet=${wallets[1]}`,await headers(1)),params())).status,403);
 assert.equal((await list.GET(req('/api/campaigns'))).status,400);
 assert.equal((await list.GET(req('/api/campaigns?forScouts=true'))).status,410);
 for(const bad of [await headers(0,'other:read'),await headers(0,'buyer:read',wallets[1]),await headers(0,'buyer:read',wallets[0],new Date(Date.now()-86400000).toISOString()),{'x-basedare-wallet':wallets[0]}])assert.equal((await list.GET(req(`/api/campaigns?brand=${wallets[0]}`,bad))).status,401);
 const issuedAt=new Date().toISOString(), sessionSignature=await accounts[0].signMessage({message:buildWalletSessionMessage({walletAddress:wallets[0],issuedAt})});
 assert.equal((await list.GET(req(`/api/campaigns?brand=${wallets[0]}`,{'x-basedare-wallet':wallets[0],'x-basedare-wallet-session-signature':sessionSignature,'x-basedare-wallet-session-issued-at':issuedAt}))).status,401,'A generic social session must not become buyer authority');
 const signedCreator=await creator.GET(req(`/api/campaigns/for-creator?wallet=${wallets[1]}`,await headers(1,'campaigns:read')));assert.equal(signedCreator.status,200);
 assert.equal((await creator.GET(req(`/api/campaigns/for-creator?wallet=${wallets[1]}`))).status,401);
 assert.equal((await brandRoute.POST(req('/api/brands',await headers(2),{name:'Local fixture only',walletAddress:wallets[2]}))).status,401);
 assert.equal((await brandRoute.POST(req('/api/brands',await headers(2,'buyer:register'),{name:'Local fixture only',walletAddress:wallets[2]}))).status,200);
 for(const path of ['submit','verify']){const r=require(`../app/api/campaigns/[id]/slots/${path}/route`);assert.equal((await r.POST(req('/api/campaigns/x/slots/'+path,{}, {slotId:slot.id,metadataPass:true,visualScore:100,creatorWallet:wallets[1]}),params())).status,410);}
 assert.equal((await slots.POST()).status,410);assert.equal((await slots.PUT()).status,410);
 const after=await prisma.campaignSlot.findUniqueOrThrow({where:{id:slot.id}});assert.equal(after.status,'SUBMITTED');assert.equal(after.visualScore,20);
 assert.equal(await prisma.scoutRakeEvent.count(),0);assert.equal(await prisma.notification.count(),0);
 const dto=await (await brandRoute.GET(req(`/api/brands?wallet=${wallets[0]}`,h))).json();assert.equal(dto.data.campaignSummary.paid,0);assert.equal(dto.data.latestCompletedSprintReceiptHref,undefined);
 console.log('Buyer workspace DB checks passed: signed owner reads, account isolation, unknown brand, private caches, forged/expired/wrong-purpose signatures, no social-session escalation, genuine signed registration, creator read, parked mutations and unchanged slot/notification records. Local fixtures are not real payment or smart-wallet acceptance.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{Module._load=originalLoad;await prisma.$disconnect();process.exit(process.exitCode||0);});
