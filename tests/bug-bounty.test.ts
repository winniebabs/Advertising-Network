import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract state
let companies = new Map<string, { name: string, verified: boolean }>();
let bountyPrograms = new Map<number, {
  company: string,
  title: string,
  description: string,
  reward: number,
  status: string
}>();
let bugSubmissions = new Map<number, {
  programId: number,
  submitter: string,
  description: string,
  status: string
}>();

let lastProgramId = 0;
let lastSubmissionId = 0;
let contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Mock Clarity functions
function registerCompany(caller: string, name: string): { type: string; value: boolean } {
  if (companies.has(caller)) {
    return { type: 'err', value: 103 }; // err-already-exists
  }
  companies.set(caller, { name, verified: false });
  return { type: 'ok', value: true };
}

function verifyCompany(caller: string, company: string): { type: string; value: boolean } {
  if (caller !== contractOwner) {
    return { type: 'err', value: 100 }; // err-owner-only
  }
  const companyData = companies.get(company);
  if (!companyData) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  companies.set(company, { ...companyData, verified: true });
  return { type: 'ok', value: true };
}

function createBountyProgram(caller: string, title: string, description: string, reward: number): { type: string; value: number } {
  const company = companies.get(caller);
  if (!company || !company.verified) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  const newProgramId = ++lastProgramId;
  bountyPrograms.set(newProgramId, {
    company: caller,
    title,
    description,
    reward,
    status: 'active'
  });
  return { type: 'ok', value: newProgramId };
}

function submitBug(caller: string, programId: number, description: string): { type: string; value: number } {
  const program = bountyPrograms.get(programId);
  if (!program) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (program.status !== 'active') {
    return { type: 'err', value: 105 }; // err-invalid-status
  }
  const newSubmissionId = ++lastSubmissionId;
  bugSubmissions.set(newSubmissionId, {
    programId,
    submitter: caller,
    description,
    status: 'pending'
  });
  return { type: 'ok', value: newSubmissionId };
}

function verifyBug(caller: string, submissionId: number, isValid: boolean): { type: string; value: boolean } {
  const submission = bugSubmissions.get(submissionId);
  if (!submission) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  const program = bountyPrograms.get(submission.programId);
  if (!program) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (caller !== program.company) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  if (submission.status !== 'pending') {
    return { type: 'err', value: 105 }; // err-invalid-status
  }
  if (isValid) {
    submission.status = 'verified';
    program.status = 'completed';
    bountyPrograms.set(submission.programId, program);
    // In a real implementation, we would transfer the reward here
  } else {
    submission.status = 'rejected';
  }
  bugSubmissions.set(submissionId, submission);
  return { type: 'ok', value: isValid };
}

describe('Decentralized Bug Bounty Platform', () => {
  beforeEach(() => {
    companies.clear();
    bountyPrograms.clear();
    bugSubmissions.clear();
    lastProgramId = 0;
    lastSubmissionId = 0;
  });
  
  it('should allow companies to register and be verified', () => {
    const company1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const company2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
    
    let result = registerCompany(company1, 'Company 1');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    
    result = registerCompany(company2, 'Company 2');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    
    result = verifyCompany(contractOwner, company1);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    
    // Try to verify a company with a non-owner account (should fail)
    result = verifyCompany(company1, company2);
    expect(result.type).toBe('err');
    expect(result.value).toBe(100); // err-owner-only
  });
  
  it('should allow verified companies to create bounty programs', () => {
    const company1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const company2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
    
    registerCompany(company1, 'Company 1');
    registerCompany(company2, 'Company 2');
    verifyCompany(contractOwner, company1);
    
    let result = createBountyProgram(company1, 'Test Program', 'Find bugs in our software', 1000000);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    
    // Try to create a bounty program with an unverified company (should fail)
    result = createBountyProgram(company2, 'Test Program 2', 'Find more bugs', 500000);
    expect(result.type).toBe('err');
    expect(result.value).toBe(102); // err-unauthorized
  });
  
  it('should allow users to submit bugs and companies to verify them', () => {
    const company1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const user1 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
    const user2 = 'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ';
    
    registerCompany(company1, 'Company 1');
    verifyCompany(contractOwner, company1);
    createBountyProgram(company1, 'Test Program', 'Find bugs in our software', 1000000);
    
    let result = submitBug(user1, 1, 'Critical vulnerability found');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    
    result = submitBug(user2, 1, 'Minor issue discovered');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(2);
    
    // Verify the first bug (valid) and reject the second one
    result = verifyBug(company1, 1, true);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    
    result = verifyBug(company1, 2, false);
    expect(result.type).toBe('ok');
    expect(result.value).toBe(false);
    
    // Check the status of the submissions
    expect(bugSubmissions.get(1)?.status).toBe('verified');
    expect(bugSubmissions.get(2)?.status).toBe('rejected');
    
    // Check the status of the bounty program
    expect(bountyPrograms.get(1)?.status).toBe('completed');
  });
});

