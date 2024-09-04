import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { UnsecureProgram } from "../target/types/unsecure_program";
import type { UnsecureProgram } from "../target/types/unsecure_program";

describe("Unsecure Program Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.UnsecureProgram as anchor.Program<UnsecureProgram>;
  
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.UnsecureProgram as Program<UnsecureProgram>;
  let userPDA: PublicKey, receiverPDA: PublicKey, maliciousPDA: PublicKey, bump: number;
  const userID = 1;
  const receiverID = 2;
  const maliciousID = 3;
  const initialPointsAlice = 2000; // Ensure Alice has enough points for the transfer
  const initialPointsBob = 1000;

  // Helper function to fetch user account data
  const fetchUser = async (pda: PublicKey) => {
    try {
      return await program.account.user.fetch(pda);
    } catch (error) {
      return null;
    }
  };

  // Function to initialize or adjust user points safely
  const initializeOrAdjustUser = async (pda: PublicKey, id: number, name: string, points: number) => {
    let user = await fetchUser(pda);
    if (!user) {
      console.log(`ℹ️ User with PDA ${pda.toString()} is not initialized, proceeding with initialization.`);
      try {
        await program.methods
          .initialize(id, name)
          .accounts({
            user: pda,
            signer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        user = await fetchUser(pda);
      } catch (initError) {
        console.error(`❌ Error during initialization: ${initError}`);
        throw initError;
      }
    } else {
      console.log(`ℹ️ User with PDA ${pda.toString()} is already initialized with ${user.points} points.`);
    }
  };

  beforeEach(async () => {
    // Calculate PDAs for user, receiver, and malicious accounts
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

  it("Exploits transfer points vulnerability by transferring 1 point", async () => {
    try {
      await initializeOrAdjustUser(userPDA, userID, "Alice", initialPointsAlice);
      await initializeOrAdjustUser(receiverPDA, receiverID, "Bob", initialPointsBob);

      const senderData = await fetchUser(userPDA);
      const receiverData = await fetchUser(receiverPDA);
      const transferAmount = 1; // Transfer only 1 point to simulate the bypass

      console.log(`📤 Attempting to exploit transfer points vulnerability by transferring 1 point...`);

      await program.methods
        .transferPoints(userID, receiverID, transferAmount)
        .accounts({
          sender: userPDA,
          receiver: receiverPDA,
          signer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const updatedSenderData = await fetchUser(userPDA);
      const updatedReceiverData = await fetchUser(receiverPDA);

      console.log(`✅ Exploit successful: Alice now has ${updatedSenderData.points} points.`);
      console.log(`✅ Exploit successful: Bob now has ${updatedReceiverData.points} points.`);

      assert.equal(
        updatedSenderData.points,
        senderData.points - transferAmount,
        `Alice's points should decrease by ${transferAmount}`
      );

      assert.equal(
        updatedReceiverData.points,
        receiverData.points + transferAmount,
        `Receiver's points should increase by ${transferAmount}`
      );

    } catch (error) {
      console.error("❌ Error exploiting transfer points:", error);
      if (error.logs) console.error("📝 Transaction logs:", error.logs);
      throw error;
    }
  });

});
