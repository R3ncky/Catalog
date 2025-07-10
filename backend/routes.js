import express from 'express';
import { generateToken, authenticateToken, authorizeAdmin, refreshToken } from './auth.js';
import sql from 'mssql';
import  bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

/*const users = [
    {id: 1, username: 'admin', password: 'adminpass'} //Demo only (need to delete)
];*/

router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try{
        const pool = await sql.connect();
        const result = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT UserID, Username, Email, PasswordHash, isAdmin FROM Users WHERE Email = @Email');
        const user = result.recordset[0];
        if (!user){
            return res.status(401).json({message: 'Invalid credentials'});
            
        }

        const match = await bcrypt.compare(password, user.PasswordHash);
        if(!match){
            return res.status(403).json({message: 'Invalid credentials'});
        }

        const token = generateToken({id: user.UserID, username: user.Username, email: user.Email, isAdmin: user.isAdmin});
        res.json({token, username: user.Username});
    } catch(err){
        console.error('Login error', err);
        res.status(500).json({message: 'Login failed'});
    }
});

//registering
router.post('/register', async (req, res) => {
    const {username, email, password, isAdmin} = req.body;
    try{
        const pool = await sql.connect();
        
        const userCheck = await pool.request().input('Email', sql.NVarChar, email).query('SELECT * FROM Users WHERE Email = @Email');
        if(userCheck.recordset.length > 0){
            return res.status(403).json({message: 'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.request()
                        .input('Username', sql.NVarChar, username)
                        .input('Email', sql.NVarChar, email)
                        .input('PasswordHash', sql.NVarChar, hashedPassword)
                        .query(`INSERT INTO Users (Username, Email, PasswordHash, IsAdmin)
                                OUTPUT INSERTED.UserID
                                VALUES (@Username, @Email, @PasswordHash, 0)`);
        const newUserID = result.recordset[0].UserID;
        res.status(201).json({message: 'Registered user successfully', userId:newUserID});

    } catch(err){
        console.error('Error message: ', err);
        res.status(500).json({message: 'Registration failed'});
    }
});

router.post('/api/refresh-token', refreshToken);

router.get('/admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({message: `Welcome ${req.user.username}, you are authenticated.`});
});

//getting all the active categories
router.get('/categories', async(req, res) => {
    try{
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM Category WHERE IsActive = 1');
        res.json(result.recordset);
    }catch (err){
        console.error('Error fetching categories:', err);
        res.status(500).json({message: 'Failed to fetch categories'});
    }
})
//getting the products with all information
router.get('/products', async (req, res) =>{
    let token = req.headers['authorization'];
    let isLoggedIn = false;

    if(token && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
        try{
            jwt.verify(token, process.env.JWT_SECRET);
            isLoggedIn = true;
        } catch(err) {
            isLoggedIn = false;
        }
    }
    try{
        const categoryParam = req.query.category;
        const categoriesParam = req.query.categories;
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;

        const pool = await sql.connect();
        const request = pool.request();

        let query = `
            SELECT DISTINCT p.* FROM Product p
            LEFT JOIN CategoryProduct cp ON p.ProductID = cp.ProductID
            WHERE 1=1`;

        if(categoryParam){
            query += ` AND cp.CategoryID = @CategoryID`;
            request.input('CategoryID', sql.Int, categoryParam);
        }
        
        if(categoriesParam){
            const categoryIds = categoriesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if(categoryIds.length > 0){
                const placeholders = categoryIds.map((_, i) => `@cat${i}`).join(',');
                query += ` AND cp.CategoryID IN (${placeholders})`;
                categoryIds.forEach((id, i) => request.input(`cat${i}`, sql.Int, id));
                    
                }
            }

        if(minPrice){
            query += ` AND p.Price >= @MinPrice`;
            request.input('MinPrice', sql.Decimal(10, 2), minPrice);
        }

        if(maxPrice){
            query += ` AND p.Price <= @MaxPrice`;
            request.input('MaxPrice', sql.Decimal(10, 2), maxPrice);
        }
        
        const result = await request.query(query);

        const products = result.recordset.map(product => {
            if(!isLoggedIn) {
                delete product.Price;
            }
            return product;
        });
        res.json(products);
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Failed to fetch products'});
    }
});

//inserting a new product
router.post('/products', authenticateToken, authorizeAdmin, async(req, res) =>{
    const {name, description, price, imagePath, brand, stockqty, status, isFeatured, isArchived, discountPercentage, discountMinQty } = req.body;

    try{
        const pool = await sql.connect();
        const result = await pool.request().input('Name', sql.NVarChar, name)
                            .input('Description', sql.NVarChar, description)
                            .input('Price', sql.Decimal(10,2), price)
                            .input('ImagePath', sql.NVarChar, imagePath)
                            .input('Brand', sql.NVarChar, brand)
                            .input('StockQty', sql.Int, stockqty)
                            .input('Status', sql.NVarChar, status)
                            .input('IsFeatured', sql.Bit, isFeatured)
                            .input('IsArchived', sql.Bit, isArchived)
                            .input('DiscountPercentage', sql.Int, discountPercentage)
                            .input('DiscountMinQty', sql.Int, discountMinQty)
                            .query(`
                INSERT INTO Product (Name, Description, Price, ImagePath, Brand, StockQty, Status, IsFeatured, IsArchived, DiscountPercentage, DiscountMinQty)
                OUTPUT INSERTED.ProductID
                VALUES (@Name, @Description, @Price, @ImagePath, @Brand, @StockQty, @Status, @IsFeatured, @IsArchived, @DiscountPercentage, @DiscountMinQty)`);
        const newProductID = result.recordset[0].ProductID;
        res.status(201).json({message: 'Product added successfully', productId: newProductID});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Failed to add product'});
    }
});

//linking the new product with a category
router.post('/product-category', authenticateToken, authorizeAdmin, async(req, res) =>{
    const {categoryId, productId} = req.body;

    try{
        const pool = await sql.connect();
        await pool.request().input('CategoryID', sql.Int, categoryId)
                            .input('ProductID', sql.Int, productId)
                            .query('INSERT INTO CategoryProduct (CategoryID, ProductID) VALUES (@CategoryID, @ProductID)');
        res.status(201).json({message: 'CategoryProduct link created successfully'});
    } catch (err){
        console.error(err);
        res.status(500).json({message: 'Failed to create CategoryProduct link'});
    }
});

//deleting a product by ID
router.delete('/products/:id', authenticateToken, authorizeAdmin, async(req, res) =>{
    const productId = req.params.id;

    try{
        const pool = await sql.connect();
        await pool.request().input('ProductID', sql.Int ,productId).query('DELETE FROM CategoryProduct WHERE ProductID = @ProductID');
        await pool.request().input('ProductID', sql.Int, productId).query('DELETE FROM Product WHERE ProductID = @ProductID');
        
        res.json({message: 'Product deleted successfully'});
    } catch(err){
        console.error(err);
        res.status(500).json({message: 'Failed to delete product'});
    }
});

//updating a product by ID
router.put('/products/:id', authenticateToken, authorizeAdmin, async(req, res) => {
    const productId = req.params.id;
    const {name, description, price, imagePath, brand, stockqty, status, isFeatured, isArchived, discountPercentage, discountMinQty, discountStart, discountEnd} = req.body;

    try{
        const pool = await sql.connect();
        const result = await pool.request()
                .input('ProductID', sql.Int, productId)
                .input('Name', sql.NVarChar, name)
                .input('Description', sql.NVarChar, description)
                .input('Price', sql.Decimal(10, 2), price)
                .input('ImagePath', sql.NVarChar, imagePath)
                .input('Brand', sql.NVarChar, brand)
                .input('StockQty', sql.Int, stockqty)
                .input('Status', sql.NVarChar, status)
                .input('IsFeatured', sql.Bit, isFeatured)
                .input('IsArchived', sql.Bit, isArchived)
                .input('DiscountPercentage', sql.Int, discountPercentage)
                .input('DiscountMinQty', sql.Int, discountMinQty)
                .input('DiscountStart', sql.DateTime, discountStart || null) 
                .input('DiscountEnd', sql.DateTime, discountEnd || null)
                .query(`UPDATE Product SET
                            Name = @Name,
                            Description = @Description,
                            Price = @Price,
                            ImagePath = @ImagePath,
                            Brand = @Brand,
                            StockQty = @StockQty,
                            Status = @Status,
                            IsFeatured = @IsFeatured,
                            IsArchived = @IsArchived,
                            DiscountPercentage = @DiscountPercentage,
                            DiscountMinQty = @DiscountMinQty,
                            DiscountStart = @DiscountStart,
                            DiscountEnd = @DiscountEnd
                        WHERE ProductID = @ProductID`);
                
        if(result.rowsAffected[0] === 0){
            return res.status(404).json({message: 'Product not found'});
        }
        res.json({message: 'Product updated successfully'});
    } catch(err){
        console.error(err);
        res.status(500).json({message: 'Failed to update product'});
    }
});

//updating the product stock quantity
router.post('/update-stock', authenticateToken, async(req, res) => {
    const {products } = req.body;

    if(!Array.isArray(products) || products.length === 0){
        return res.status(400).json({message: 'Invalid request, products array is required'});
    }
    try{
        const pool = await sql.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        for(const item of products){
            const {ProductID, quantity} = item;
            const checkStockResult = await transaction.request()
                .input('ProductID', sql.Int, ProductID)
                .query('SELECT StockQty FROM Product WHERE ProductID = @ProductID');
            const currentStock = checkStockResult.recordset[0]?.StockQty;
            if(currentStock === undefined) {
                await transaction.rollback();
                return res.status(404).json({message: `Product with ID ${ProductID} not found`});
            }
            if(currentStock < quantity){
                await transaction.rollback();
                return res.status(400).json({message: `Insufficient stock for product ID ${ProductID}. Current stock: ${currentStock}, requested: ${quantity}`});
            }
            await transaction.request()
                .input('ProductID', sql.Int, ProductID)
                .input('Quantity', sql.Int, quantity)
                .query('UPDATE Product SET StockQty = StockQty - @Quantity WHERE ProductID = @ProductID');
        }
        await transaction.commit();
        res.json({message: 'Stock quantity updated successfully'});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: 'Failed to update stock quantity'});
    }
});

//getting the registered users
router.get('/users', authenticateToken, authorizeAdmin, async(req, res) => {
    try{
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT UserID, Username, Email, isAdmin FROM Users');
        res.json(result.recordset);
    } catch(err) {
        console.error('Error fetching users:', err);
        res.status(500).json({message: 'Failed to fetch users'});
    }
}
);
//updating a user by ID
router.put('/users/:id', authenticateToken, authorizeAdmin, async(req, res) => {
    const userId = req.params.id;
    const {username, email, isAdmin, password} = req.body;

    if(!username || !email || typeof isAdmin === 'undefined') {
        return res.status(400).json({message: 'Missing required fields: username, email, isAdmin'});
    }
    try{
        const pool = await sql.connect();
        const request = pool.request()
                .input('UserID', sql.Int, userId)
                .input('Username', sql.NVarChar, username)
                .input('Email', sql.NVarChar, email)
                .input('IsAdmin', sql.Bit, isAdmin)
            let query = `
                UPDATE Users SET
                    Username = @Username,
                    Email = @Email,
                    IsAdmin = @IsAdmin`;
            if(password && password.trim() !== '') {
                const hashedPassword = await bcrypt.hash(password, 10);
                request.input('PasswordHash', sql.NVarChar, hashedPassword);
                query += `, PasswordHash = @PasswordHash`;
            }   
            query += ` WHERE UserID = @UserID`;    
        await request.query(query);     
        res.json({message: 'User updated successfully'});
    } catch(err) {
        console.error('Error updating user:', err.message, err.stack);
        res.status(500).json({message: 'Failed to update user'});
    }
});

//deleting a user by ID
router.delete('/users/:id', authenticateToken, authorizeAdmin, async(req, res) => {
    const userId = req.params.id;

    try{
        const pool = await sql.connect();
        await pool.request().input('UserID', sql.Int, userId).query('DELETE FROM Users WHERE UserID = @UserID');
        res.json({message: 'User deleted successfully'});
    } catch(err) {
        console.error('Error deleting user:', err);
        res.status(500).json({message: 'Failed to delete user'});
    }
});

export default router;