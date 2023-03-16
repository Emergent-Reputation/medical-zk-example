import { Field, SmartContract, state, State, method, MerkleWitness, Circuit, Struct, PublicKey, PrivateKey, Signature} from 'snarkyjs';
import { Witness } from 'snarkyjs/dist/node/lib/merkle_tree';


// Constraints
// - You have a list of doctors with specializations.
// - We want to prove medical ailment to your employer without revealing the ailment.
// - Classical signatures schemes reveal ailments because they leak the speicalization of the doctor.


// Setting Tree height to size of 4 for testing purposes
class MerkleWitness4 extends MerkleWitness(4) {}

export class Doctor extends Struct({pubKey: PublicKey, index: Field}) {}

// Ring Signature of Doctors
export class Add extends SmartContract {
  @state(Field) num = State<Field>();
  @state(Field) nextIndex = State<Field>();

  // Ontario Assosiation of Medical Doctors (Canada)
  @state(PublicKey) cpsoPublicKey = State<PublicKey>();

  // We use a Field instead of an Int64 because there's a limit on the range of values allowable in Snarky. It has to do with the circuit that's generated at compile-time.
  @state(Field) root = State<Field>();

  init() {
    super.init();
    this.num.set(Field(1));
  }

  @method initState(cpsoPublicKey: PublicKey, initRoot: Field) {
    this.cpsoPublicKey.set(cpsoPublicKey);
    this.root.set(initRoot);
    this.nextIndex.set(Field(0));
  }
  
  @method addDoctor(cpsoPrivateKey: PrivateKey, doctor: PublicKey, leafWitness: MerkleWitness4): Doctor {
    // Circuit Assertion
    const commitedPublicKey = this.cpsoPublicKey.get();
    this.cpsoPublicKey.assertEquals(commitedPublicKey);

    // Check that the public key is the same as the one commited to the contract
    commitedPublicKey.assertEquals(cpsoPrivateKey.toPublicKey());

    const initialRoot = this.root.get();
    this.root.assertEquals(initialRoot);

    this.nextIndex.assertEquals(leafWitness.calculateIndex());

    const newRoot = leafWitness.calculateRoot(doctor.x);
    this.root.set(newRoot);

    // Set new Index
    const currIndex = this.nextIndex.get();
    this.nextIndex.assertEquals(currIndex);
    this.nextIndex.set(currIndex.add(Field(1)));

    // Return new Doctor
    return new Doctor({pubKey: doctor, index: currIndex});
  }


  @method verifySickNote(doctorWitness: MerkleWitness4, doctorPubKey: PublicKey, signature: Signature, patientPubKey: PublicKey) {
    // Verify that the doctor is in the list of doctors
    this.root.assertEquals(doctorWitness.calculateRoot(doctorPubKey.x));

    const ok = signature.verify(doctorPubKey, patientPubKey.toFields())
    ok.assertTrue();

  }

  @method update() {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    this.num.set(newState);
  }
}
