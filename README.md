# Blockchain-powered Decentralized Advertising Network

This project implements a decentralized advertising network using Clarity smart contracts on the Stacks blockchain. It enables direct interactions between advertisers and publishers, with smart contracts managing ad placements and payments.

## Features

- Advertiser and publisher registration
- Campaign creation and management
- Ad placement
- Impression and click tracking
- Automated payments based on clicks
- Earnings withdrawal for publishers
- Remaining budget refund for advertisers

## Smart Contract Functions

1. `register-advertiser`: Register a new advertiser
2. `register-publisher`: Register a new publisher
3. `create-campaign`: Create a new advertising campaign
4. `place-ad`: Place an ad for a campaign on a publisher's platform
5. `record-impression`: Record an ad impression
6. `record-click`: Record an ad click and process payment
7. `withdraw-earnings`: Allow publishers to withdraw their earnings
8. `refund-remaining-budget`: Refund remaining budget to advertisers

## Usage

To interact with this smart contract, you'll need to use a Stacks wallet and a compatible dApp. Here's a general workflow:

1. Deploy the smart contract to the Stacks blockchain
2. Advertisers register using `register-advertiser`
3. Publishers register using `register-publisher`
4. Advertisers create campaigns using `create-campaign`
5. Publishers place ads using `place-ad`
6. Record impressions and clicks using `record-impression` and `record-click`
7. Publishers withdraw earnings using `withdraw-earnings`
8. Advertisers can refund remaining budget using `refund-remaining-budget`

## Development

This project is developed using Clarity, the smart contract language for the Stacks blockchain. To set up a development environment, follow these steps:

1. Install [Clarinet](https://github.com/hirosystems/clarinet)
2. Clone this repository
3. Run `clarinet check` to verify the contract
4. Run `clarinet test` to execute the test suite

## Testing

The project includes a comprehensive test suite using Vitest. To run the tests:

1. Ensure you have Node.js installed
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

