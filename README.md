# Mina zkApp: Medical Note
## Overview
The code in this example and smart-contract can be broken down as follows:

Doctor Registry
- We’re first creating a registry of doctors in the leaves of a Merkel-tree. These will only be mutable by a single entity, known as the CPSO (https://www.cpso.on.ca/ taken from A doctor association in Canada) and forms the foundation of our security model/assumptions.
- We don’t highlight it in the code, but the Merkel tree would be hosted publicly in practice
Verification Process
- The patient-client would pass in a Merkel Witness for the doctor that provided them with the sick note.
    - This would remain a private input
- The code/verification function checks the validity of the Merkel-Inclusion Proof by ensuring the tree root, which is currently a public state variable matches the Merkel Witness root.
- If this assertion passes, we check if the doctor’s note that is passed in was truly provided to the patient by the doctor.
    - We do this by running Verify on the signature.
The code sets up a smart contract that allows a single entity to add doctors to a list of doctors under a Merkle tree.


## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
