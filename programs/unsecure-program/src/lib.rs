use anchor_lang::prelude::*;
declare_id!("bQDQoif5fDCJEMypotuTZCgW6J2XnL9wFLQFAoBUwj2");

#[program]
pub mod unsecure_program {
    use super::*;

    pub fn initialize(ctx: Context<CreateUser>, id: u32, name: String) -> Result<()> {
        let user = &mut ctx.accounts.user;
        user.id = id;
        user.owner = *ctx.accounts.signer.key;
        user.name = name;
        user.points = 1000;
        msg!("Created new user with 1000 points and id: {}", id);
        Ok(())
    }

    pub fn transfer_points(ctx: Context<TransferPoints>, _id_sender:u32, _id_receiver:u32, amount: u16) -> Result<()> {
        let sender = &mut ctx.accounts.sender;
        let receiver = &mut ctx.accounts.receiver;
        
        if sender.points < amount {
            return err!(MyError::NotEnoughPoints);
        }
        sender.points -= amount;
        receiver.points += amount;
        msg!("Transferred {} points", amount);
        Ok(())
    }

    pub fn remove_user(_ctx: Context<TransferPoints>, id:u32) -> Result<()> {
        msg!("Account closed for user with id: {}", id);
        Ok(())
    }
}


#[instruction(id: u32)]
#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 4 + 32 + (4 + 10) + 2,
        seeds = [b"user", id.to_le_bytes().as_ref()], 
        bump
    )]
    pub user: Account<'info, User>,

    #[account(mut)]
    pub signer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[instruction(id_sender: u32, id_receiver: u32)]
#[derive(Accounts)]
pub struct TransferPoints<'info> {
    #[account(
        mut,
        seeds = [b"user", id_sender.to_le_bytes().as_ref()], 
        bump
    )]
    pub sender: Account<'info, User>,
    #[account(
        mut,
        seeds = [b"user", id_receiver.to_le_bytes().as_ref()], 
        bump
    )]
    pub receiver: Account<'info, User>,
    #[account(mut)]
    pub signer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[instruction(id: u32)]
#[derive(Accounts)]
pub struct RemoveUser<'info> {
    #[account(
        seeds = [b"user", id.to_le_bytes().as_ref()], 
        bump
    )]
    pub user: Account<'info, User>,
    #[account(mut)]
    pub signer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct User {
    pub id: u32,
    pub owner: Pubkey,
    pub name: String,
    pub points: u16,
}

#[error_code]
pub enum MyError {
    #[msg("Not enough points to transfer")]
    NotEnoughPoints
}