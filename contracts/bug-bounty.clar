;; Decentralized Bug Bounty Platform

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-exists (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-invalid-status (err u105))

;; Data Maps
(define-map companies { company-id: principal } { name: (string-utf8 50), verified: bool })
(define-map bounty-programs { program-id: uint } {
  company: principal,
  title: (string-utf8 100),
  description: (string-utf8 500),
  reward: uint,
  status: (string-ascii 20)
})
(define-map bug-submissions { submission-id: uint } {
  program-id: uint,
  submitter: principal,
  description: (string-utf8 500),
  status: (string-ascii 20)
})

;; Variables
(define-data-var last-program-id uint u0)
(define-data-var last-submission-id uint u0)

;; Private Functions
(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

;; Public Functions
(define-public (register-company (name (string-utf8 50)))
  (let ((company-data { name: name, verified: false }))
    (if (is-some (map-get? companies { company-id: tx-sender }))
      err-already-exists
      (ok (map-set companies { company-id: tx-sender } company-data))
    )
  )
)

(define-public (verify-company (company principal))
  (begin
    (asserts! (is-owner) err-owner-only)
    (match (map-get? companies { company-id: company })
      company-data (ok (map-set companies { company-id: company } (merge company-data { verified: true })))
      err-not-found
    )
  )
)

(define-public (create-bounty-program (title (string-utf8 100)) (description (string-utf8 500)) (reward uint))
  (let
    (
      (company (unwrap! (map-get? companies { company-id: tx-sender }) err-unauthorized))
      (new-program-id (+ (var-get last-program-id) u1))
    )
    (asserts! (get verified company) err-unauthorized)
    (try! (stx-transfer? reward tx-sender (as-contract tx-sender)))
    (map-set bounty-programs { program-id: new-program-id } {
      company: tx-sender,
      title: title,
      description: description,
      reward: reward,
      status: "active"
    })
    (var-set last-program-id new-program-id)
    (ok new-program-id)
  )
)

(define-public (submit-bug (program-id uint) (description (string-utf8 500)))
  (let
    (
      (program (unwrap! (map-get? bounty-programs { program-id: program-id }) err-not-found))
      (new-submission-id (+ (var-get last-submission-id) u1))
    )
    (asserts! (is-eq (get status program) "active") err-invalid-status)
    (map-set bug-submissions { submission-id: new-submission-id } {
      program-id: program-id,
      submitter: tx-sender,
      description: description,
      status: "pending"
    })
    (var-set last-submission-id new-submission-id)
    (ok new-submission-id)
  )
)

(define-public (verify-bug (submission-id uint) (is-valid bool))
  (let
    (
      (submission (unwrap! (map-get? bug-submissions { submission-id: submission-id }) err-not-found))
      (program (unwrap! (map-get? bounty-programs { program-id: (get program-id submission) }) err-not-found))
    )
    (asserts! (is-eq tx-sender (get company program)) err-unauthorized)
    (asserts! (is-eq (get status submission) "pending") err-invalid-status)
    (if is-valid
      (begin
        (try! (as-contract (stx-transfer? (get reward program) tx-sender (get submitter submission))))
        (map-set bug-submissions { submission-id: submission-id }
          (merge submission { status: "verified" }))
        (map-set bounty-programs { program-id: (get program-id submission) }
          (merge program { status: "completed" }))
        (ok true)
      )
      (begin
        (map-set bug-submissions { submission-id: submission-id }
          (merge submission { status: "rejected" }))
        (ok false)
      )
    )
  )
)

;; Read-only Functions
(define-read-only (get-company-info (company-id principal))
  (map-get? companies { company-id: company-id })
)

(define-read-only (get-bounty-program (program-id uint))
  (map-get? bounty-programs { program-id: program-id })
)

(define-read-only (get-bug-submission (submission-id uint))
  (map-get? bug-submissions { submission-id: submission-id })
)

