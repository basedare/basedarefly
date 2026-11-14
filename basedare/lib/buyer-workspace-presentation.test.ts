import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Campaign } from '../app/brands/portal/activation-packages';
import { getBuyerCampaignState, hasRecordedBuyerFunding, hasRecordedBuyerPayment, buyerWorkspaceMetrics } from './buyer-workspace-presentation';
const base = { id:'fixture',shortId:'fixture',type:'PLACE',tier:'SIP_MENTION',title:'Local fixture only',description:null,budgetUsdc:62.5,creatorCountTarget:1,payoutPerCreator:62.5,status:'LIVE',syncTime:null,createdAt:'2026-11-14T00:00:00Z',slotCounts:{total:1,open:1,claimed:0,assigned:0,completed:0} } satisfies Campaign;
const mission = (dare: Campaign['linkedDare']) => ({...base,linkedDare:dare});
test('campaign LIVE and planned budgets cannot establish funding or paid work',()=>{
 const c=mission({id:'d',shortId:'d',status:'PENDING'});
 assert.equal(getBuyerCampaignState(c).label,'Funding unconfirmed');
 assert.deepEqual(buyerWorkspaceMetrics([c]),{total:1,inReview:0,payments:0,funding:0});
 assert.equal(hasRecordedBuyerFunding({...c,linkedDare:{...c.linkedDare!,bounty:62.5,isSimulated:false,txHash:'0x'+'a'.repeat(64),onChainDareId:'0'}}),false);
});
test('approved, queued, recorded and simulated settlement remain distinct',()=>{
 for(const [status,label] of [['VERIFIED','Evidence approved'],['PENDING_PAYOUT','Payment pending'],['PENDING_REVIEW','Evidence in review']]) assert.equal(getBuyerCampaignState(mission({id:'d',shortId:'d',status})).label,label);
 const c=mission({id:'d',shortId:'d',status:'VERIFIED',isSimulated:false,verifyTxHash:'0x'+'b'.repeat(64),txHash:'0x'+'a'.repeat(64),bounty:62.5,onChainDareId:'11'});
 assert.equal(hasRecordedBuyerPayment(c),true);assert.equal(hasRecordedBuyerFunding(c),true);
 assert.equal(getBuyerCampaignState(c).label,'Payment recorded');assert.equal(buyerWorkspaceMetrics([c]).funding,62.5);
 const sim={...c,linkedDare:{...c.linkedDare!,isSimulated:true}};
 assert.equal(getBuyerCampaignState(sim).label,'Test record');assert.equal(hasRecordedBuyerPayment(sim),false);assert.equal(hasRecordedBuyerFunding(sim),false);
});
test('closed, expired and dormant records do not advertise available work',()=>{
 assert.equal(getBuyerCampaignState({...base,type:'CREATOR'}).label,'Routing paused');
 assert.equal(getBuyerCampaignState({...base,status:'CANCELLED'}).label,'Closed');
 assert.equal(getBuyerCampaignState(mission({id:'d',shortId:'d',status:'FAILED'})).label,'Review closed');
 assert.equal(getBuyerCampaignState(mission({id:'d',shortId:'d',status:'PENDING',expiresAt:'2020-01-01T00:00:00Z'})).label,'Expired');
});
