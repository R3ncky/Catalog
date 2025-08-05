const sql =  require('mssql');

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
setInterval(removeExpiredDiscounts, 24 * 60 * 60 * 1000); // Run every 24 hours
module.exports = removeExpiredDiscounts;
