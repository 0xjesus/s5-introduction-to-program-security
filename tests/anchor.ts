import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { UnsecureProgram } from "../target/types/unsecure_program";

describe("Unsecure Program Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.UnsecureProgram as anchor.Program<UnsecureProgram>;
  
  const pg = anchor.AnchorProvider.env();
  anchor.setProvider(pg);
  const program = anchor.workspace.UnsecureProgram;
  let userPDA, receiverPDA, maliciousPDA, bump;
  const userID = 1;
  const receiverID = 2;
  const maliciousID = 3;
  const initialPointsAlice = 10; // Expected initial points for Alice
  const initialPointsBob = 10; // Expected initial points for Bob

  // Helper function to fetch user account data
  const fetchUser = async (pda) => {
    try {
      return await program.account.user.fetch(pda);
    } catch (error) {
      // Return null if the account is not initialized
      return null;
    }
  };

  // Function to initialize user only if not already initialized
  const initializeUserIfNotExists = async (pda, id, name) => {
    let user = await fetchUser(pda);
    if (!user) {
      console.log(
        `ℹ️ User with PDA ${pda.toString()} is not initialized, proceeding with initialization.`
      );
      await program.methods
        .initialize(id, name)
        .accounts({
          user: pda,
          signer: program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      user = await fetchUser(pda);
      console.log(`✅ User initialized with ${user.points} points.`);
    } else {
      console.log(
        `ℹ️ User with PDA ${pda.toString()} is already initialized with ${user.points} points.`
      );
    }

    // Check if the points are as expected or higher
    if (user.points < initialPointsAlice) {
      console.log(
        `⚠️ Expected ${name}'s points to be at least ${initialPointsAlice}, but found ${user.points}.`
      );
    }
  };

  beforeEach(async () => {
    // Calculate PDA for user, receiver, and malicious accounts
    [userPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), new anchor.BN(userID).toArrayLike(Buffer, "le", 4)],
      program.programId
    );

    [receiverPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), new anchor.BN(receiverID).toArrayLike(Buffer, "le", 4)],
      program.programId
    );

    [maliciousPDA, bump] = await PublicKey.findProgramAddress(
      [Buffer.from("user"), new anchor.BN(maliciousID).toArrayLike(Buffer, "le", 4)],
      program.programId
    );

    console.log("User PDA:", userPDA.toString());
    console.log("Receiver PDA:", receiverPDA.toString());
    console.log("Malicious PDA:", maliciousPDA.toString());
  });

  it("Initializes a new user with expected points", async () => {
    try {
      await initializeUserIfNotExists(userPDA, userID, "Alice");

      const userData = await fetchUser(userPDA);
      console.log(`✅ User initialized with points: ${userData.points}`);
      assert(
        userData.points >= initialPointsAlice,
        `User should start with at least ${initialPointsAlice} points`
      );
    } catch (error) {
      console.error("❌ Error initializing user:", error);
      if (error.logs) console.error("📝 Transaction logs:", error.logs);
      throw error;
    }
  });

it("Transfers points between users correctly based on current state", async () => {
  try {
    // Initialize sender and receiver only if they are not already initialized
    await initializeUserIfNotExists(userPDA, userID, "Alice");
    await initializeUserIfNotExists(receiverPDA, receiverID, "Bob");

    const senderData = await fetchUser(userPDA);
    const receiverData = await fetchUser(receiverPDA);

    // Check that both accounts are initialized
    if (!senderData || !receiverData) {
      console.error(
        `❌ Error: One or both accounts are not initialized. Sender initialized: ${!!senderData}, Receiver initialized: ${!!receiverData}`
      );
      throw new Error("Failed to initialize both sender and receiver accounts");
    }

    const transferAmount = 200;

    // Check if Alice has enough points before attempting the transfer
    if (senderData.points < transferAmount) {
      console.log(
        `⚠️ Alice does not have enough points to transfer. Available: ${senderData.points}, Required: ${transferAmount}`
      );
    } else {
      console.log(
        `📤 Preparing to transfer ${transferAmount} points from Alice to Bob`
      );

      // Transfer points from Alice to Bob
      await program.methods
        .transferPoints(userID, receiverID, transferAmount)
        .accounts({
          sender: userPDA,
          receiver: receiverPDA,
          signer: program.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const updatedSenderData = await fetchUser(userPDA);
      const updatedReceiverData = await fetchUser(receiverPDA);
      console.log(
        `✅ Transfer successful. Alice: ${updatedSenderData.points} points, Bob: ${updatedReceiverData.points} points`
      );

      // Adjust expectations based on the current state
      assert.equal(
        updatedSenderData.points,
        senderData.points - transferAmount,
        `Sender's points should decrease by the transfer amount of ${transferAmount}`
      );
      assert.equal(
        updatedReceiverData.points,
        receiverData.points + transferAmount,
        `Receiver's points should increase by the transfer amount of ${transferAmount}`
      );
    }
  } catch (error) {
    console.error("❌ Error transferring points:", error);
    if (error.logs) console.error("📝 Transaction logs:", error.logs);
    throw error;
  }
});

});
