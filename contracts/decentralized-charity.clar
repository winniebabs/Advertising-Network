;; Decentralized Autonomous Charity

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-insufficient-funds (err u103))
(define-constant err-proposal-active (err u104))
(define-constant err-proposal-ended (err u105))
(define-constant err-already-voted (err u106))

;; Data Maps
(define-map donors
  { donor: principal }
  { total-donated: uint, voting-power: uint }
)

(define-map proposals
  { proposal-id: uint }
  {
    beneficiary: principal,
    amount: uint,
    description: (string-utf8 500),
    votes-for: uint,
    votes-against: uint,
    is-active: bool,
    is-executed: bool,
    end-block: uint
  }
)

(define-map votes
  { proposal-id: uint, voter: principal }
  { amount: uint }
)

;; Variables
(define-data-var last-proposal-id uint u0)
(define-data-var charity-balance uint u0)

;; Private Functions
(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

;; Public Functions
(define-public (donate)
  (let
    (
      (donation-amount (stx-get-balance tx-sender))
      (donor-info (default-to { total-donated: u0, voting-power: u0 } (map-get? donors { donor: tx-sender })))
    )
    (try! (stx-transfer? donation-amount tx-sender (as-contract tx-sender)))
    (var-set charity-balance (+ (var-get charity-balance) donation-amount))
    (ok (map-set donors { donor: tx-sender }
      {
        total-donated: (+ (get total-donated donor-info) donation-amount),
        voting-power: (+ (get voting-power donor-info) donation-amount)
      }))
  )
)

(define-public (create-proposal (beneficiary principal) (amount uint) (description (string-utf8 500)) (duration uint))
  (let
    (
      (new-proposal-id (+ (var-get last-proposal-id) u1))
      (end-block (+ block-height duration))
    )
    (asserts! (>= (var-get charity-balance) amount) err-insufficient-funds)
    (map-set proposals { proposal-id: new-proposal-id }
      {
        beneficiary: beneficiary,
        amount: amount,
        description: description,
        votes-for: u0,
        votes-against: u0,
        is-active: true,
        is-executed: false,
        end-block: end-block
      }
    )
    (var-set last-proposal-id new-proposal-id)
    (ok new-proposal-id)
  )
)

(define-public (vote (proposal-id uint) (vote-for bool))
  (let
    (
      (proposal (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
      (voter-info (unwrap! (map-get? donors { donor: tx-sender }) err-unauthorized))
      (voting-power (get voting-power voter-info))
    )
    (asserts! (get is-active proposal) err-proposal-ended)
    (asserts! (<= block-height (get end-block proposal)) err-proposal-ended)
    (asserts! (is-none (map-get? votes { proposal-id: proposal-id, voter: tx-sender })) err-already-voted)
    (map-set votes { proposal-id: proposal-id, voter: tx-sender } { amount: voting-power })
    (if vote-for
      (map-set proposals { proposal-id: proposal-id }
        (merge proposal { votes-for: (+ (get votes-for proposal) voting-power) }))
      (map-set proposals { proposal-id: proposal-id }
        (merge proposal { votes-against: (+ (get votes-against proposal) voting-power) }))
    )
    (ok true)
  )
)

(define-public (execute-proposal (proposal-id uint))
  (let
    (
      (proposal (unwrap! (map-get? proposals { proposal-id: proposal-id }) err-not-found))
    )
    (asserts! (not (get is-executed proposal)) err-proposal-ended)
    (asserts! (> block-height (get end-block proposal)) err-proposal-active)
    (asserts! (> (get votes-for proposal) (get votes-against proposal)) err-unauthorized)
    (asserts! (>= (var-get charity-balance) (get amount proposal)) err-insufficient-funds)
    (try! (as-contract (stx-transfer? (get amount proposal) tx-sender (get beneficiary proposal))))
    (var-set charity-balance (- (var-get charity-balance) (get amount proposal)))
    (ok (map-set proposals { proposal-id: proposal-id }
      (merge proposal { is-active: false, is-executed: true })))
  )
)

;; Read-only Functions
(define-read-only (get-donor-info (donor principal))
  (map-get? donors { donor: donor })
)

(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals { proposal-id: proposal-id })
)

(define-read-only (get-charity-balance)
  (var-get charity-balance)
)

(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? votes { proposal-id: proposal-id, voter: voter })
)

