import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract state
let advertisers = new Map();
let publishers = new Map();
let campaigns = new Map();
let adPlacements = new Map();
let advertiserIdNonce = 0;
let publisherIdNonce = 0;
let campaignIdNonce = 0;
let adPlacementIdNonce = 0;

// Mock Clarity functions
function registerAdvertiser(name: string): { type: string; value: number } {
  const newId = ++advertiserIdNonce;
  if (advertisers.has(newId)) {
    return { type: 'err', value: 102 }; // err-already-exists
  }
  advertisers.set(newId, { name, balance: 0 });
  return { type: 'ok', value: newId };
}

function registerPublisher(name: string): { type: string; value: number } {
  const newId = ++publisherIdNonce;
  if (publishers.has(newId)) {
    return { type: 'err', value: 102 }; // err-already-exists
  }
  publishers.set(newId, { name, address: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`, earnings: 0 });
  return { type: 'ok', value: newId };
}

function createCampaign(advertiserId: number, budget: number, costPerClick: number): { type: string; value: number } {
  const advertiser = advertisers.get(advertiserId);
  if (!advertiser) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (advertiser.balance < budget) {
    return { type: 'err', value: 103 }; // err-unauthorized
  }
  const newId = ++campaignIdNonce;
  campaigns.set(newId, { advertiserId, budget, remainingBudget: budget, costPerClick });
  advertiser.balance -= budget;
  return { type: 'ok', value: newId };
}

function placeAd(campaignId: number, publisherId: number): { type: string; value: number } {
  const campaign = campaigns.get(campaignId);
  const publisher = publishers.get(publisherId);
  if (!campaign || !publisher) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (campaign.remainingBudget <= 0) {
    return { type: 'err', value: 103 }; // err-unauthorized
  }
  const newId = ++adPlacementIdNonce;
  adPlacements.set(newId, { campaignId, publisherId, impressions: 0, clicks: 0 });
  return { type: 'ok', value: newId };
}

function recordImpression(adPlacementId: number): { type: string; value: boolean } {
  const adPlacement = adPlacements.get(adPlacementId);
  if (!adPlacement) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  adPlacement.impressions++;
  return { type: 'ok', value: true };
}

function recordClick(adPlacementId: number): { type: string; value: boolean } {
  const adPlacement = adPlacements.get(adPlacementId);
  if (!adPlacement) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  const campaign = campaigns.get(adPlacement.campaignId);
  const publisher = publishers.get(adPlacement.publisherId);
  if (!campaign || !publisher) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (campaign.remainingBudget < campaign.costPerClick) {
    return { type: 'err', value: 103 }; // err-unauthorized
  }
  adPlacement.clicks++;
  campaign.remainingBudget -= campaign.costPerClick;
  publisher.earnings += campaign.costPerClick;
  return { type: 'ok', value: true };
}

function withdrawEarnings(publisherId: number): { type: string; value: number } {
  const publisher = publishers.get(publisherId);
  if (!publisher) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (publisher.earnings <= 0) {
    return { type: 'err', value: 103 }; // err-unauthorized
  }
  const earnings = publisher.earnings;
  publisher.earnings = 0;
  return { type: 'ok', value: earnings };
}

describe('Decentralized Advertising Network', () => {
  beforeEach(() => {
    advertisers.clear();
    publishers.clear();
    campaigns.clear();
    adPlacements.clear();
    advertiserIdNonce = 0;
    publisherIdNonce = 0;
    campaignIdNonce = 0;
    adPlacementIdNonce = 0;
  });
  
  it('should allow advertisers to register', () => {
    const result = registerAdvertiser('Test Advertiser');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(advertisers.size).toBe(1);
    expect(advertisers.get(1)?.name).toBe('Test Advertiser');
  });
  
  it('should allow publishers to register', () => {
    const result = registerPublisher('Test Publisher');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(publishers.size).toBe(1);
    expect(publishers.get(1)?.name).toBe('Test Publisher');
  });
  
  it('should allow advertisers to create campaigns', () => {
    registerAdvertiser('Test Advertiser');
    advertisers.get(1)!.balance = 1000;
    const result = createCampaign(1, 500, 10);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(campaigns.size).toBe(1);
    expect(campaigns.get(1)?.budget).toBe(500);
    expect(advertisers.get(1)?.balance).toBe(500);
  });
  
  it('should allow ad placements', () => {
    registerAdvertiser('Test Advertiser');
    registerPublisher('Test Publisher');
    advertisers.get(1)!.balance = 1000;
    createCampaign(1, 500, 10);
    const result = placeAd(1, 1);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    expect(adPlacements.size).toBe(1);
  });
  
  it('should record impressions', () => {
    registerAdvertiser('Test Advertiser');
    registerPublisher('Test Publisher');
    advertisers.get(1)!.balance = 1000;
    createCampaign(1, 500, 10);
    placeAd(1, 1);
    const result = recordImpression(1);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(adPlacements.get(1)?.impressions).toBe(1);
  });
  
  it('should record clicks and update balances', () => {
    registerAdvertiser('Test Advertiser');
    registerPublisher('Test Publisher');
    advertisers.get(1)!.balance = 1000;
    createCampaign(1, 500, 10);
    placeAd(1, 1);
    const result = recordClick(1);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(adPlacements.get(1)?.clicks).toBe(1);
    expect(campaigns.get(1)?.remainingBudget).toBe(490);
    expect(publishers.get(1)?.earnings).toBe(10);
  });
  
  it('should not allow clicks when campaign budget is exhausted', () => {
    registerAdvertiser('Test Advertiser');
    registerPublisher('Test Publisher');
    advertisers.get(1)!.balance = 1000;
    createCampaign(1, 20, 10);
    placeAd(1, 1);
    recordClick(1);
    recordClick(1);
    const result = recordClick(1);
    expect(result.type).toBe('err');
    expect(result.value).toBe(103); // err-unauthorized
    expect(adPlacements.get(1)?.clicks).toBe(2);
    expect(campaigns.get(1)?.remainingBudget).toBe(0);
    expect(publishers.get(1)?.earnings).toBe(20);
  });
});

