import { Add } from './Add';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  MerkleTree,
  MerkleWitness,
  Signature,
} from 'snarkyjs';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Add,
    tree: MerkleTree;

    // create a new tree
    const height = 4;
    class MerkleWitness4 extends MerkleWitness(height) {}


  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Add.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Add(zkAppAddress);
    tree = new MerkleTree(height);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
      zkApp.initState(deployerAccount, tree.getRoot());
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Doctors Note` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
    const doctorCardio = PrivateKey.random();
    const doctorNeuro = PrivateKey.random();
    const doctorDerm = PrivateKey.random();

    const witness = new MerkleWitness4(tree.getWitness(0n));

    tree.setLeaf(0n, doctorCardio.toPublicKey().x);
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.addDoctor(deployerKey, doctorCardio.toPublicKey(), witness);
    });
    await txn.prove();
    await txn.sign([deployerKey]).send();

    // check that the tree root is updated
    const currTreeRoot = zkApp.root.get();
    tree.setLeaf(0n, doctorCardio.toPublicKey().x);
    expect(currTreeRoot).toEqual(tree.getRoot());

    const witness2 = new MerkleWitness4(tree.getWitness(1n));
    const txn2 = await Mina.transaction(deployerAccount, () => {
      zkApp.addDoctor(deployerKey, doctorDerm.toPublicKey(), witness2);
    });
    await txn2.prove();
    await txn2.sign([deployerKey]).send();


    // check that the tree root is updated
    const newTreeRoot = zkApp.root.get();
    tree.setLeaf(1n, doctorDerm.toPublicKey().x);
    expect(newTreeRoot).toEqual(tree.getRoot());


    const witnessDerm = new MerkleWitness4(tree.getWitness(1n));
    const patient = PrivateKey.random();
    tree.setLeaf(0n, doctorCardio.toPublicKey().x);
    const sig = Signature.create(doctorDerm, patient.toPublicKey().toFields());

    const txn3 = await Mina.transaction(deployerAccount, () => {
      zkApp.verifySickNote(witnessDerm, doctorDerm.toPublicKey(), sig, patient.toPublicKey());
    });
    await txn3.prove();
    await txn3.sign([deployerKey]).send();

  });

  it('correctly updates the num state on the `Add` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(senderAccount, () => {
      zkApp.update();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(3));
  });
});
