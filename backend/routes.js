import express from 'express';
import { generateToken, authenticateToken } from './auth.js';
import sql from 'mssql';

const router = express.Router();

const users = [
    {id: 1, username: 'admin', password: 'adminpass'} //Demo only (need to delete)
];

router.post('/login', (req, res) => {
    const {username, password} = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if(!user) return res.status(401).json({message: 'Invalid credentials'});
    
    const token = generateToken(user);
    res.json({token});
});

router.get('/admin', authenticateToken, (req, res) => {
    res.json({message: `Welcome ${req.user.username}, you are authenticated.`});
});

//getting the products with all information
router.get('/products', authenticateToken, async (req, res) =>{
    try{
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM Product');
        res.json(result.recordset);
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Failed to fetch products'});
    }
});

//inserting a new product
router.post('/products', authenticateToken, async(req, res) =>{
    const {name, description, price, imagePath, brand, stockqty, status, isFeatured, isArchived } = req.body;

    try{
        const pool = await sql.connect();
        await pool.request().input('Name', sql.NVarChar, name).input('Description', sql.NVarChar, description)
            .input('Price', sql.Decimal(10,2), price).input('ImagePath', sql.NVarChar, imagePath).input('Brand', sql.NVarChar, brand)
            .input('StockQty', sql.Int, stockqty).input('Status', sql.NVarChar, status).input('IsFeatured', sql.Bit, isFeatured)
            .input('IsArchived', sql.Bit, isArchived).query(`
                INSERT INTO Product (
                    Name, Description, Price, ImagePath, Brand, StockQty, Status, IsFeatured, IsArchived)
                VALUES (
                    @Name, @Description, @Price, @ImagePath, @Brand, @StockQty, @Status, @IsFeatured, @IsArchived)`);
        
        res.status(201).json({message: 'Product added successfully'});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Failed to add product'});
    }
});

//deleting a product by ID
router.delete('/products/:id', authenticateToken, async(req, res) =>{
    const productId = req.params.id;

    try{
        const pool = await sql.connect();
        await pool.request().input('ProductID', sql.Int, productId).query('DELETE FROM Product WHERE ProductID = @ProductID');
        
        res.json({message: 'Product deleted successfully'});
    } catch(err){
        console.error(err);
        res.status(500).json({message: 'Failed to delete product'});
    }
});
export default router;