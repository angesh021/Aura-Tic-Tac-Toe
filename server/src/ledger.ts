
// import { Prisma } from '@prisma/client';

export type LedgerTransactionType = 
    | 'WAGER_ANTE' 
    | 'WAGER_REFUND' 
    | 'WAGER_WIN' 
    | 'WAGER_DOUBLE'
    | 'SHOP_PURCHASE' 
    | 'DAILY_REWARD'
    | 'GIFT_SENT'
    | 'GIFT_RECEIVED'
    | 'CLAN_CREATE';

/**
 * Executes a balance change and logs an audit record.
 * Must be called within a Prisma transaction or passed the prisma client.
 */
export const recordLedger = async (
    tx: any, // Prisma.TransactionClient,
    userId: string,
    amount: number,
    type: LedgerTransactionType,
    description: string,
    metadata?: Record<string, any>
) => {
    // 1. Perform the Balance Update
    // using increment/decrement ensures atomic updates at the DB level
    const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
            coins: { increment: amount } 
        },
        select: { id: true, coins: true, displayName: true }
    });

    // 2. Generate Audit Log
    // In a full SQL implementation, this would insert into a Transaction table.
    // For this environment, we output structured logs that production monitoring services (Datadog/CloudWatch) would ingest.
    const auditRecord = {
        event: 'LEDGER_TRANSACTION',
        timestamp: new Date().toISOString(),
        transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userDisplayName: updatedUser.displayName,
        amount,
        type,
        description,
        balanceAfter: updatedUser.coins,
        metadata
    };

    console.log(JSON.stringify(auditRecord));

    return updatedUser;
};
