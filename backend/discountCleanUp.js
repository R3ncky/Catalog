import sql from 'mssql';

export function startCleanups() {
async function removeExpiredDiscounts() {
    try {
       const pool = await sql.connect();
       await pool.request()
            .query(`
                UPDATE Product
                SET DiscountPercentage = 0, 
                    DiscountMinQty = NULL,
                    DiscountStart = NULL,
                    DiscountEnd = NULL
                WHERE DiscountEnd IS NOT NULL AND DiscountEnd < GETDATE()
            `);
            console.log(`[${new Date().toISOString()}] Expired discounts removed successfully.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error removing expired discounts:`, error);
    }
}

async function purgeMonthlyExports() {
    const nowIso = new Date().toISOString();
    const pool = await sql.connect();
    const tx = new sql.Transaction(pool);
    try {
        await tx.begin();
        const req = new sql.Request(tx);
        const cutoffQuery = `
        DECLARE @Cutoff DATETIME = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);

        DELETE EP
        FROM ExportedProduct EP
        INNER JOIN ExportHistory EH ON EH.ExportID = EP.ExportID
        WHERE EH.ExportDate < @Cutoff;

        DELETE FROM ExportHistory
        WHERE ExportDate < @Cutoff;
        `;
        
        await req.query(cutoffQuery);
        await tx.commit();
        console.log(`[${nowIso}] Monthly exports purged successfully.`);
    } catch (error) {
        await tx.rollback();
        console.error(`[${nowIso}] Error purging monthly exports:`, error);
    }
}

removeExpiredDiscounts();
setInterval(removeExpiredDiscounts, 24 * 60 * 60 * 1000); // 24h interval

    setInterval(() => {
    const now = new Date();
    if(now.getDate() === 1 && now.getHours() === 3) {
        purgeMonthlyExports();
    }
    }, 60 * 60 * 1000); // Check every hour
}


