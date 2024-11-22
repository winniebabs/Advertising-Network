import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract state
let reputations = new Map<string, Map<string, number>>();
let privacySettings = new Map<string, boolean>();

// Mock Clarity functions
function addReputation(user: string, app: string, score: number): { type: string; value: number } {
  if (!reputations.has(user)) {
    reputations.set(user, new Map());
  }
  const userReputations = reputations.get(user)!;
  const currentScore = userReputations.get(app) || 0;
  const newScore = currentScore + score;
  userReputations.set(app, newScore);
  return { type: 'ok', value: newScore };
}

function getReputation(user: string, app: string): { type: string; value: number | string } {
  const userReputations = reputations.get(user);
  if (!userReputations) {
    return { type: 'err', value: 'u101' }; // err-not-found
  }
  const score = userReputations.get(app);
  if (score === undefined) {
    return { type: 'err', value: 'u101' }; // err-not-found
  }
  return { type: 'ok', value: score };
}

function setPrivacy(user: string, isPublic: boolean): { type: string; value: boolean } {
  privacySettings.set(user, isPublic);
  return { type: 'ok', value: isPublic };
}

function getPrivacy(user: string): { type: string; value: boolean } {
  return { type: 'ok', value: privacySettings.get(user) ?? true };
}

function getTotalReputation(user: string): { type: string; value: number } {
  const userReputations = reputations.get(user);
  if (!userReputations) {
    return { type: 'ok', value: 0 };
  }
  const total = Array.from(userReputations.values()).reduce((sum, score) => sum + score, 0);
  return { type: 'ok', value: total };
}

describe('Reputation Contract', () => {
  beforeEach(() => {
    reputations.clear();
    privacySettings.clear();
  });
  
  it('should add reputation and retrieve it', () => {
    const addResult = addReputation('user1', 'app1', 10);
    expect(addResult.type).toBe('ok');
    expect(addResult.value).toBe(10);
    
    const getResult = getReputation('user1', 'app1');
    expect(getResult.type).toBe('ok');
    expect(getResult.value).toBe(10);
  });
  
  it('should accumulate reputation for the same app', () => {
    addReputation('user1', 'app1', 10);
    const addResult = addReputation('user1', 'app1', 5);
    expect(addResult.type).toBe('ok');
    expect(addResult.value).toBe(15);
    
    const getResult = getReputation('user1', 'app1');
    expect(getResult.type).toBe('ok');
    expect(getResult.value).toBe(15);
  });
  
  it('should handle reputation for multiple apps', () => {
    addReputation('user1', 'app1', 10);
    addReputation('user1', 'app2', 20);
    
    const getResult1 = getReputation('user1', 'app1');
    expect(getResult1.type).toBe('ok');
    expect(getResult1.value).toBe(10);
    
    const getResult2 = getReputation('user1', 'app2');
    expect(getResult2.type).toBe('ok');
    expect(getResult2.value).toBe(20);
  });
  
  it('should return not found for non-existent reputation', () => {
    const getResult = getReputation('user2', 'app1');
    expect(getResult.type).toBe('err');
    expect(getResult.value).toBe('u101');
  });
  
  it('should set and get privacy settings', () => {
    const setResult = setPrivacy('user1', false);
    expect(setResult.type).toBe('ok');
    expect(setResult.value).toBe(false);
    
    const getResult = getPrivacy('user1');
    expect(getResult.type).toBe('ok');
    expect(getResult.value).toBe(false);
  });
  
  it('should return default privacy setting if not set', () => {
    const getResult = getPrivacy('user2');
    expect(getResult.type).toBe('ok');
    expect(getResult.value).toBe(true);
  });
  
  it('should calculate total reputation across all apps', () => {
    addReputation('user1', 'app1', 10);
    addReputation('user1', 'app2', 20);
    addReputation('user1', 'app3', 15);
    
    const totalResult = getTotalReputation('user1');
    expect(totalResult.type).toBe('ok');
    expect(totalResult.value).toBe(45);
  });
  
  it('should return zero total reputation for new users', () => {
    const totalResult = getTotalReputation('newUser');
    expect(totalResult.type).toBe('ok');
    expect(totalResult.value).toBe(0);
  });
});

