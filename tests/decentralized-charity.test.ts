import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract state
let donors = new Map();
let proposals = new Map();
let votes = new Map();
let lastProposalId = 0;
let charityBalance = 0;

// Mock Clarity functions
function donate(sender: string, amount: number): { type: string; value: boolean } {
  const donorInfo = donors.get(sender) || { totalDonated: 0, votingPower: 0 };
  donors.set(sender, {
    totalDonated: donorInfo.totalDonated + amount,
    votingPower: donorInfo.votingPower + amount,
  });
  charityBalance += amount;
  return { type: 'ok', value: true };
}

function createProposal(beneficiary: string, amount: number, description: string, duration: number): { type: string; value: number } {
  if (charityBalance < amount) {
    return { type: 'err', value: 103 };
  }
  const proposalId = ++lastProposalId;
  proposals.set(proposalId, {
    beneficiary,
    amount,
    description,
    votesFor: 0,
    votesAgainst: 0,
    isActive: true,
    isExecuted: false,
    endBlock: 100 + duration, // Assuming current block is 100
  });
  return { type: 'ok', value: proposalId };
}

function vote(sender: string, proposalId: number, voteFor: boolean): { type: string; value: boolean } {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    return { type: 'err', value: 101 };
  }
  if (!proposal.isActive || 100 > proposal.endBlock) {
    return { type: 'err', value: 105 };
  }
  const donorInfo = donors.get(sender);
  if (!donorInfo) {
    return { type: 'err', value: 102 };
  }
  if (votes.get(`${proposalId}-${sender}`)) {
    return { type: 'err', value: 106 };
  }
  votes.set(`${proposalId}-${sender}`, { amount: donorInfo.votingPower });
  if (voteFor) {
    proposal.votesFor += donorInfo.votingPower;
  } else {
    proposal.votesAgainst += donorInfo.votingPower;
  }
  proposals.set(proposalId, proposal);
  return { type: 'ok', value: true };
}

function executeProposal(proposalId: number): { type: string; value: boolean } {
  const proposal = proposals.get(proposalId);
  if (!proposal) {
    return { type: 'err', value: 101 };
  }
  if (proposal.isExecuted) {
    return { type: 'err', value: 105 };
  }
  if (100 <= proposal.endBlock) {
    return { type: 'err', value: 104 };
  }
  if (proposal.votesFor <= proposal.votesAgainst) {
    return { type: 'err', value: 102 };
  }
  if (charityBalance < proposal.amount) {
    return { type: 'err', value: 103 };
  }
  charityBalance -= proposal.amount;
  proposal.isActive = false;
  proposal.isExecuted = true;
  proposals.set(proposalId, proposal);
  return { type: 'ok', value: true };
}

describe('Decentralized Autonomous Charity', () => {
  beforeEach(() => {
    donors.clear();
    proposals.clear();
    votes.clear();
    lastProposalId = 0;
    charityBalance = 0;
  });
  
  it('should allow donations', () => {
    const result = donate('donor1', 1000);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(donors.get('donor1')).toEqual({ totalDonated: 1000, votingPower: 1000 });
    expect(charityBalance).toBe(1000);
  });
  
  it('should create proposals', () => {
    donate('donor1', 1000);
    const result = createProposal('beneficiary1', 500, 'Help children', 100);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    const proposal = proposals.get(1);
    expect(proposal).toBeDefined();
    expect(proposal.beneficiary).toBe('beneficiary1');
    expect(proposal.amount).toBe(500);
  });
  
  it('should not create proposals with insufficient funds', () => {
    donate('donor1', 1000);
    const result = createProposal('beneficiary1', 1500, 'Help children', 100);
    expect(result.type).toBe('err');
    expect(result.value).toBe(103);
  });
  
  it('should allow voting on proposals', () => {
    donate('donor1', 1000);
    donate('donor2', 500);
    createProposal('beneficiary1', 500, 'Help children', 100);
    const result1 = vote('donor1', 1, true);
    const result2 = vote('donor2', 1, false);
    expect(result1.type).toBe('ok');
    expect(result2.type).toBe('ok');
    const proposal = proposals.get(1);
    expect(proposal.votesFor).toBe(1000);
    expect(proposal.votesAgainst).toBe(500);
  });
  
  it('should not allow double voting', () => {
    donate('donor1', 1000);
    createProposal('beneficiary1', 500, 'Help children', 100);
    vote('donor1', 1, true);
    const result = vote('donor1', 1, false);
    expect(result.type).toBe('err');
    expect(result.value).toBe(106);
  });
});

