;; Decentralized Advertising Network

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-unauthorized (err u103))

;; Data Maps
(define-map advertisers { id: uint } { name: (string-ascii 50), address: principal, balance: uint })
(define-map publishers { id: uint } { name: (string-ascii 50), address: principal, earnings: uint })
(define-map campaigns { id: uint } { advertiser-id: uint, budget: uint, remaining-budget: uint, cost-per-click: uint })
(define-map ad-placements { id: uint } { campaign-id: uint, publisher-id: uint, impressions: uint, clicks: uint })

;; Variables
(define-data-var advertiser-id-nonce uint u0)
(define-data-var publisher-id-nonce uint u0)
(define-data-var campaign-id-nonce uint u0)
(define-data-var ad-placement-id-nonce uint u0)

;; Private Functions
(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

;; Public Functions
(define-public (register-advertiser (name (string-ascii 50)))
  (let
    (
      (new-id (+ (var-get advertiser-id-nonce) u1))
    )
    (asserts! (is-none (map-get? advertisers { id: new-id })) err-already-exists)
    (map-set advertisers { id: new-id } { name: name, address: tx-sender, balance: u0 })
    (var-set advertiser-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (register-publisher (name (string-ascii 50)))
  (let
    (
      (new-id (+ (var-get publisher-id-nonce) u1))
    )
    (asserts! (is-none (map-get? publishers { id: new-id })) err-already-exists)
    (map-set publishers { id: new-id } { name: name, address: tx-sender, earnings: u0 })
    (var-set publisher-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (create-campaign (advertiser-id uint) (budget uint) (cost-per-click uint))
  (let
    (
      (new-id (+ (var-get campaign-id-nonce) u1))
      (advertiser (unwrap! (map-get? advertisers { id: advertiser-id }) err-not-found))
    )
    (asserts! (>= (get balance advertiser) budget) err-unauthorized)
    (map-set campaigns { id: new-id } { advertiser-id: advertiser-id, budget: budget, remaining-budget: budget, cost-per-click: cost-per-click })
    (map-set advertisers { id: advertiser-id } (merge advertiser { balance: (- (get balance advertiser) budget) }))
    (var-set campaign-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (place-ad (campaign-id uint) (publisher-id uint))
  (let
    (
      (new-id (+ (var-get ad-placement-id-nonce) u1))
      (campaign (unwrap! (map-get? campaigns { id: campaign-id }) err-not-found))
      (publisher (unwrap! (map-get? publishers { id: publisher-id }) err-not-found))
    )
    (asserts! (> (get remaining-budget campaign) u0) err-unauthorized)
    (map-set ad-placements { id: new-id } { campaign-id: campaign-id, publisher-id: publisher-id, impressions: u0, clicks: u0 })
    (var-set ad-placement-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (record-impression (ad-placement-id uint))
  (let
    (
      (ad-placement (unwrap! (map-get? ad-placements { id: ad-placement-id }) err-not-found))
    )
    (map-set ad-placements { id: ad-placement-id } (merge ad-placement { impressions: (+ (get impressions ad-placement) u1) }))
    (ok true)
  )
)

(define-public (record-click (ad-placement-id uint))
  (let
    (
      (ad-placement (unwrap! (map-get? ad-placements { id: ad-placement-id }) err-not-found))
      (campaign (unwrap! (map-get? campaigns { id: (get campaign-id ad-placement) }) err-not-found))
      (publisher (unwrap! (map-get? publishers { id: (get publisher-id ad-placement) }) err-not-found))
      (cost (get cost-per-click campaign))
    )
    (asserts! (>= (get remaining-budget campaign) cost) err-unauthorized)
    (map-set ad-placements { id: ad-placement-id } (merge ad-placement { clicks: (+ (get clicks ad-placement) u1) }))
    (map-set campaigns { id: (get campaign-id ad-placement) } (merge campaign { remaining-budget: (- (get remaining-budget campaign) cost) }))
    (map-set publishers { id: (get publisher-id ad-placement) } (merge publisher { earnings: (+ (get earnings publisher) cost) }))
    (ok true)
  )
)

(define-public (withdraw-earnings (publisher-id uint))
  (let
    (
      (publisher (unwrap! (map-get? publishers { id: publisher-id }) err-not-found))
      (earnings (get earnings publisher))
      (publisher-address (get address publisher))
    )
    (asserts! (> earnings u0) err-unauthorized)
    (try! (as-contract (stx-transfer? earnings tx-sender publisher-address)))
    (map-set publishers { id: publisher-id } (merge publisher { earnings: u0 }))
    (ok earnings)
  )
)

(define-public (refund-remaining-budget (campaign-id uint))
  (let
    (
      (campaign (unwrap! (map-get? campaigns { id: campaign-id }) err-not-found))
      (advertiser (unwrap! (map-get? advertisers { id: (get advertiser-id campaign) }) err-not-found))
      (remaining-budget (get remaining-budget campaign))
      (advertiser-address (get address advertiser))
    )
    (asserts! (> remaining-budget u0) err-unauthorized)
    (try! (as-contract (stx-transfer? remaining-budget tx-sender advertiser-address)))
    (map-set campaigns { id: campaign-id } (merge campaign { remaining-budget: u0 }))
    (map-set advertisers { id: (get advertiser-id campaign) } (merge advertiser { balance: (+ (get balance advertiser) remaining-budget) }))
    (ok remaining-budget)
  )
)

;; Read-only functions
(define-read-only (get-advertiser-info (id uint))
  (map-get? advertisers { id: id })
)

(define-read-only (get-publisher-info (id uint))
  (map-get? publishers { id: id })
)

(define-read-only (get-campaign-info (id uint))
  (map-get? campaigns { id: id })
)

(define-read-only (get-ad-placement-info (id uint))
  (map-get? ad-placements { id: id })
)

