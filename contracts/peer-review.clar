;; Decentralized Peer Review System for Scientific Papers

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-exists (err u103))
(define-constant err-invalid-state (err u104))

;; Data Maps
(define-map papers
  { paper-id: uint }
  {
    author: principal,
    title: (string-ascii 100),
    abstract: (string-ascii 500),
    status: (string-ascii 20),
    reviews-required: uint,
    reviews-submitted: uint,
    publication-fee: uint
  }
)

(define-map reviews
  { paper-id: uint, reviewer: principal }
  {
    content: (string-ascii 1000),
    rating: uint,
    status: (string-ascii 20),
    quality-score: uint
  }
)

(define-map reviewers
  { reviewer: principal }
  {
    papers-reviewed: uint,
    total-quality-score: uint,
    earnings: uint
  }
)

;; Variables
(define-data-var last-paper-id uint u0)
(define-data-var review-reward uint u100) ;; in micro-STX

;; Private Functions
(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

;; Public Functions
(define-public (submit-paper (title (string-ascii 100)) (abstract (string-ascii 500)) (reviews-required uint) (publication-fee uint))
  (let
    (
      (new-paper-id (+ (var-get last-paper-id) u1))
    )
    (map-set papers { paper-id: new-paper-id }
      {
        author: tx-sender,
        title: title,
        abstract: abstract,
        status: "submitted",
        reviews-required: reviews-required,
        reviews-submitted: u0,
        publication-fee: publication-fee
      }
    )
    (var-set last-paper-id new-paper-id)
    (ok new-paper-id)
  )
)

(define-public (submit-review (paper-id uint) (content (string-ascii 1000)) (rating uint))
  (let
    (
      (paper (unwrap! (map-get? papers { paper-id: paper-id }) err-not-found))
      (existing-review (map-get? reviews { paper-id: paper-id, reviewer: tx-sender }))
    )
    (asserts! (is-none existing-review) err-already-exists)
    (asserts! (< (get reviews-submitted paper) (get reviews-required paper)) err-invalid-state)
    (asserts! (and (>= rating u1) (<= rating u5)) err-invalid-state)
    (map-set reviews { paper-id: paper-id, reviewer: tx-sender }
      {
        content: content,
        rating: rating,
        status: "submitted",
        quality-score: u0
      }
    )
    (map-set papers { paper-id: paper-id }
      (merge paper { reviews-submitted: (+ (get reviews-submitted paper) u1) })
    )
    (ok true)
  )
)

(define-public (assess-review-quality (paper-id uint) (reviewer principal) (quality-score uint))
  (let
    (
      (paper (unwrap! (map-get? papers { paper-id: paper-id }) err-not-found))
      (review (unwrap! (map-get? reviews { paper-id: paper-id, reviewer: reviewer }) err-not-found))
    )
    (asserts! (is-eq (get author paper) tx-sender) err-unauthorized)
    (asserts! (and (>= quality-score u0) (<= quality-score u100)) err-invalid-state)
    (map-set reviews { paper-id: paper-id, reviewer: reviewer }
      (merge review { quality-score: quality-score })
    )
    (let
      (
        (reviewer-info (default-to { papers-reviewed: u0, total-quality-score: u0, earnings: u0 }
                         (map-get? reviewers { reviewer: reviewer })))
      )
      (map-set reviewers { reviewer: reviewer }
        {
          papers-reviewed: (+ (get papers-reviewed reviewer-info) u1),
          total-quality-score: (+ (get total-quality-score reviewer-info) quality-score),
          earnings: (+ (get earnings reviewer-info) (var-get review-reward))
        }
      )
    )
    (ok true)
  )
)

(define-public (publish-paper (paper-id uint))
  (let
    (
      (paper (unwrap! (map-get? papers { paper-id: paper-id }) err-not-found))
    )
    (asserts! (is-eq (get author paper) tx-sender) err-unauthorized)
    (asserts! (is-eq (get reviews-submitted paper) (get reviews-required paper)) err-invalid-state)
    (asserts! (is-eq (get status paper) "submitted") err-invalid-state)
    (try! (stx-transfer? (get publication-fee paper) tx-sender (as-contract tx-sender)))
    (map-set papers { paper-id: paper-id }
      (merge paper { status: "published" })
    )
    (ok true)
  )
)

(define-public (withdraw-earnings)
  (let
    (
      (reviewer-info (unwrap! (map-get? reviewers { reviewer: tx-sender }) err-not-found))
      (earnings (get earnings reviewer-info))
    )
    (asserts! (> earnings u0) err-invalid-state)
    (try! (as-contract (stx-transfer? earnings tx-sender tx-sender)))
    (map-set reviewers { reviewer: tx-sender }
      (merge reviewer-info { earnings: u0 })
    )
    (ok earnings)
  )
)

;; Read-only functions
(define-read-only (get-paper-info (paper-id uint))
  (map-get? papers { paper-id: paper-id })
)

(define-read-only (get-review-info (paper-id uint) (reviewer principal))
  (map-get? reviews { paper-id: paper-id, reviewer: reviewer })
)

(define-read-only (get-reviewer-info (reviewer principal))
  (map-get? reviewers { reviewer: reviewer })
)
