;; Decentralized Reputation System

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))

;; Data Maps
(define-map reputations
  { user: principal, app: (string-ascii 64) }
  { score: uint, last-updated: uint }
)

(define-map privacy-settings
  { user: principal }
  { is-public: bool }
)

;; Public Functions

(define-public (add-reputation (app (string-ascii 64)) (score uint))
  (let
    (
      (user tx-sender)
      (key { user: user, app: app })
      (current-data (default-to { score: u0, last-updated: u0 } (map-get? reputations key)))
      (new-score (+ score (get score current-data)))
    )
    (map-set reputations key { score: new-score, last-updated: block-height })
    (ok new-score)
  )
)

(define-read-only (get-reputation (user principal) (app (string-ascii 64)))
  (let
    (
      (key { user: user, app: app })
      (reputation-data (map-get? reputations key))
    )
    (if (is-some reputation-data)
      (ok (get score (unwrap-panic reputation-data)))
      err-not-found
    )
  )
)

(define-public (set-privacy (is-public bool))
  (ok (map-set privacy-settings { user: tx-sender } { is-public: is-public }))
)

(define-read-only (get-privacy (user principal))
  (default-to { is-public: true } (map-get? privacy-settings { user: user }))
)

;; Private Functions

(define-private (is-public? (user principal))
  (get is-public (get-privacy user))
)

;; Read-only function to get reputation for a specific app
(define-read-only (get-app-reputation (user principal) (app (string-ascii 64)))
  (let
    (
      (key { user: user, app: app })
      (reputation-data (map-get? reputations key))
    )
    (default-to u0 (get score reputation-data))
  )
)

