import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract state
let papers = new Map();
let reviews = new Map();
let reviewers = new Map();
let lastPaperId = 0;
let reviewReward = 100; // in micro-STX

// Mock Clarity functions
function submitPaper(caller: string, title: string, abstract: string, reviewsRequired: number, publicationFee: number): { type: string; value: number } {
  const newPaperId = ++lastPaperId;
  papers.set(newPaperId, {
    author: caller,
    title,
    abstract,
    status: "submitted",
    reviewsRequired,
    reviewsSubmitted: 0,
    publicationFee
  });
  return { type: 'ok', value: newPaperId };
}

function submitReview(caller: string, paperId: number, content: string, rating: number): { type: string; value: boolean } {
  const paper = papers.get(paperId);
  if (!paper) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (reviews.has(`${paperId}-${caller}`)) {
    return { type: 'err', value: 103 }; // err-already-exists
  }
  if (paper.reviewsSubmitted >= paper.reviewsRequired) {
    return { type: 'err', value: 104 }; // err-invalid-state
  }
  if (rating < 1 || rating > 5) {
    return { type: 'err', value: 104 }; // err-invalid-state
  }
  reviews.set(`${paperId}-${caller}`, {
    content,
    rating,
    status: "submitted",
    qualityScore: 0
  });
  paper.reviewsSubmitted++;
  return { type: 'ok', value: true };
}

function assessReviewQuality(caller: string, paperId: number, reviewer: string, qualityScore: number): { type: string; value: boolean } {
  const paper = papers.get(paperId);
  if (!paper) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (paper.author !== caller) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  const review = reviews.get(`${paperId}-${reviewer}`);
  if (!review) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (qualityScore < 0 || qualityScore > 100) {
    return { type: 'err', value: 104 }; // err-invalid-state
  }
  review.qualityScore = qualityScore;
  const reviewerInfo = reviewers.get(reviewer) || { papersReviewed: 0, totalQualityScore: 0, earnings: 0 };
  reviewerInfo.papersReviewed++;
  reviewerInfo.totalQualityScore += qualityScore;
  reviewerInfo.earnings += reviewReward;
  reviewers.set(reviewer, reviewerInfo);
  return { type: 'ok', value: true };
}

function publishPaper(caller: string, paperId: number): { type: string; value: boolean } {
  const paper = papers.get(paperId);
  if (!paper) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (paper.author !== caller) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  if (paper.reviewsSubmitted !== paper.reviewsRequired || paper.status !== "submitted") {
    return { type: 'err', value: 104 }; // err-invalid-state
  }
  // In a real implementation, we would handle STX transfer here
  paper.status = "published";
  return { type: 'ok', value: true };
}

function withdrawEarnings(caller: string): { type: string; value: number } {
  const reviewerInfo = reviewers.get(caller);
  if (!reviewerInfo) {
    return { type: 'err', value: 101 }; // err-not-found
  }
  if (reviewerInfo.earnings === 0) {
    return { type: 'err', value: 104 }; // err-invalid-state
  }
  const earnings = reviewerInfo.earnings;
  reviewerInfo.earnings = 0;
  return { type: 'ok', value: earnings };
}

describe('Decentralized Peer Review System', () => {
  beforeEach (() => {
    papers.clear ();
    reviews.clear ();
    reviewers.clear ();
    lastPaperId = 0;
  });
  
  it ('should allow paper submission', () => {
    const result = submitPaper ('author1', 'Test Paper', 'This is a test abstract', 3, 1000);
    expect (result.type).toBe ('ok');
    expect (result.value).toBe (1);
    const paper = papers.get (1);
    expect (paper).toBeDefined ();
    expect (paper.title).toBe ('Test Paper');
    expect (paper.status).toBe ('submitted');
  });
  
  it ('should allow review submission', () => {
    submitPaper ('author1', 'Test Paper', 'This is a test abstract', 3, 1000);
    const result = submitReview ('reviewer1', 1, 'This is a good paper', 4);
    expect (result.type).toBe ('ok');
    expect (result.value).toBe (true);
    const review = reviews.get ('1-reviewer1');
    expect (review).toBeDefined ();
    expect (review.rating).toBe (4);
  });
  
  it ('should allow review quality assessment', () => {
    submitPaper ('author1', 'Test Paper', 'This is a test abstract', 3, 1000);
    submitReview ('reviewer1', 1, 'This is a good paper', 4);
    const result = assessReviewQuality ('author1', 1, 'reviewer1', 90);
    expect (result.type).toBe ('ok');
    expect (result.value).toBe (true);
    const reviewerInfo = reviewers.get ('reviewer1');
    expect (reviewerInfo).toBeDefined ();
    expect (reviewerInfo.totalQualityScore).toBe (90);
  });
  
  it ('should allow paper publication', () => {
    submitPaper ('author1', 'Test Paper', 'This is a test abstract', 2, 1000);
    submitReview ('reviewer1', 1, 'This is a good paper', 4);
    submitReview ('reviewer2', 1, 'This is an excellent paper', 5);
    const result = publishPaper ('author1', 1);
    expect (result.type).toBe ('ok');
    expect (result.value).toBe (true);
    const paper = papers.get (1);
    expect (paper.status).toBe ('published');
  });
  
  it ('should allow earnings withdrawal', () => {
    submitPaper ('author1', 'Test Paper', 'This is a test abstract', 1, 1000);
    submitReview ('reviewer1', 1, 'This is a good paper', 4);
    assessReviewQuality ('author1', 1, 'reviewer1', 90);
    const result = withdrawEarnings ('reviewer1');
    expect (result.type).toBe ('ok');
    expect (result.value).toBe (reviewReward);
    const reviewerInfo = reviewers.get ('reviewer1');
    expect (reviewerInfo.earnings).toBe (0);
  });
})
