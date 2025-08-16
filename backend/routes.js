import express from 'express';
import { generateToken, authenticateToken, authorizeAdmin, refreshToken } from './auth.js';
import sql from 'mssql';
import  bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';

const router = express.Router();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function calculateUnitPrice(p) {
  const hasDiscount = p.DiscountPercentage > 0 && p.quantity >= p.DiscountMinQty;
  return hasDiscount ? p.Price * (1 - p.DiscountPercentage / 100) : p.Price;
}

router.post('/login', async (req, res) => {
    const {email, password, rememberMe} = req.body;
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 minutes expiration for 2FA code
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
        const code = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit code
        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .input('Code', sql.NVarChar(6), code.toString())
            .input('ExpiresAt', sql.DateTime, expiresAt) // Code valid for 5 minutes
            .query('INSERT INTO TwoFactorCodes (UserID, Code, ExpiresAt) VALUES (@UserID, @Code, @ExpiresAt)');
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your 2FA Code',
            text: `Your verification code is ${code}. It is valid for 5 minutes.`
        });
        console.log(code);
        res.json({twoFactorRequired: true, userId: user.UserID, rememberMe});
    } catch(err){
        console.error('Login error', err);
        res.status(500).json({message: 'Login failed'});
    }
});

//verifying the 2FA code
router.post('/verify-2fa', async (req, res) => {
    const {userId, code, rememberMe} = req.body;
    try{
        const pool = await sql.connect();
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .input('Code', sql.NVarChar, code.toString().trim())
            .query(`SELECT * FROM TwoFactorCodes WHERE UserID = @UserID AND Code = @Code AND ExpiresAt > GETUTCDATE()`);
        if(result.recordset.length === 0){
            return res.status(400).json({message: 'Invalid or expired code'});
        }
        await pool.request()
            .input('UserID', sql.Int, userId)
            .query('DELETE FROM TwoFactorCodes WHERE UserID = @UserID'); // Remove the used code
        const userRes = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT UserID, Username, Email, isAdmin FROM Users WHERE UserID = @UserID');
        const user = userRes.recordset[0];
        if(!user) {
            return res.status(404).json({message: 'User not found'});
        }
        const expiresIn = rememberMe ? '30d' : '1h'; // Set token expiration based on rememberMe
        const token = generateToken({id: user.UserID, username: user.Username, email: user.Email, isAdmin: user.isAdmin}, expiresIn);
        res.json({token, username: user.Username});
    } catch(err){
        console.error('2FA verification error:', err);
        res.status(500).json({message: '2FA verification failed'});
    }
});
//registering
router.post('/register', async (req, res) => {
    const {username, email, password, isAdmin} = req.body;
    const plainPassword = password; 

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

    // Send credentials (don't fail the request if email fails)
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your account credentials',
            text:
            `Hi ${username},

            Your account has been created.

            Email: ${email}
            Password: ${plainPassword}

            You can log in at http://localhost:5000/login`,
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.5">
                    <h2>Hi ${username},</h2>
                    <p>Your account has been created.</p>
                    <p><strong>Email:</strong> ${email}<br/>
                    <strong>Password:</strong> ${plainPassword}</p>
                    <p>Login: <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
                </div>`
        });
    } catch (mailErr) {
      console.error('Welcome email failed:', mailErr);
    }

    res.status(201).json({ message: 'Registered user successfully', userId: newUserID });

    } catch(err){
        console.error('Error message: ', err);
        res.status(500).json({message: 'Registration failed'});
    }
});

router.post('/api/refresh-token', refreshToken);

router.get('/admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({message: `Welcome ${req.user.username}, you are authenticated.`});
});

//get all the ClientCompanies
router.get('/client-companies', authenticateToken, async(req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT ClientCompanyID, Name, Email FROM ClientCompany');
        res.json(result.recordset);
    } catch(err) {
        console.error("Error fetching client companies: ", err);
        res.status(500).json({ message: 'Failed to fetch client companies'});
    }
});

//sending the exported info / text
router.post('/send-export-email', authenticateToken, async (req, res) => {
  const { clientCompanyId, productList, totalPrice, totalWithTax } = req.body;

  // вземи userId от токена (ако middleware-а ти вече сетва req.user, това ще е валидно)
  const userId = req.user?.id || (() => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      return payload.id || payload.userId || null;
    } catch { return null; }
  })();

  if (!userId) {
    console.error('No userId found in token');
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const pool = await sql.connect();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 1) Вземи клиент
    const client = (await new sql.Request(tx)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .query('SELECT Name, Email FROM ClientCompany WHERE ClientCompanyID = @ClientCompanyID')
    ).recordset[0];

    if (!client) {
      await tx.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // 2) Създай Order (Submitted, защото експорт = подадена заявка)
    const orderIns = await new sql.Request(tx)
      .input('UserID', sql.Int, userId)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .input('Status', sql.VarChar, 'Submitted')
      .input('TotalPrice', sql.Decimal(18, 2), totalPrice)
      .input('TotalWithTax', sql.Decimal(18, 2), totalWithTax)
      .query(`
        INSERT INTO Orders (UserID, ClientCompanyID, Status, TotalPrice, TotalWithTax, SubmittedAt)
        OUTPUT INSERTED.OrderID
        VALUES (@UserID, @ClientCompanyID, @Status, @TotalPrice, @TotalWithTax, SYSUTCDATETIME())
      `);
    const orderId = orderIns.recordset[0].OrderID;

    // 3) Добави редове (OrderItem) – същата логика за отстъпки като при HTML
    for (const product of productList) {
      const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
      const unitPrice = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;

      await new sql.Request(tx)
        .input('OrderID', sql.Int, orderId)
        .input('ProductID', sql.Int, product.ProductID)
        .input('Quantity', sql.Int, product.quantity)
        .input('UnitPrice', sql.Decimal(18, 2), unitPrice)
        .input('DiscountPercentage', sql.Int, product.DiscountPercentage || 0)
        .query(`
          INSERT INTO OrderItem (OrderID, ProductID, Quantity, UnitPrice, DiscountPercentage)
          VALUES (@OrderID, @ProductID, @Quantity, @UnitPrice, @DiscountPercentage)
        `);
    }

    // 4) Построй HTML (остави си твоята текуща логика без промени)
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <h2 style="color: #2d89ef;">Hello ${client.Name},</h2>
        <p>The order was made at: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <p>Here is your exported product list:</p>
        <ul style="padding-left: 0; list-style: none;">`;

    for (const product of productList) {
      const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
      const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
      const total = (pricePerUnit * product.quantity).toFixed(2);

      htmlContent += `
        <li style="margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #ccc;">
          <strong>${product.Name}</strong><br/>
          Quantity: ${product.quantity}<br/>
          Price per unit: $${pricePerUnit.toFixed(2)}<br/>
          ${hasDiscount ? `<span style="color: green;">Discount: ${product.DiscountPercentage}%</span><br/>` : ''}
          Total: <strong>$${total}</strong>
        </li>`;
    }

    htmlContent += `
        </ul>
        <p><strong>Total (no tax):</strong> $${Number(totalPrice).toFixed(2)}</p>
        <p><strong>Total (with tax 20%):</strong> $${Number(totalWithTax).toFixed(2)}</p>
        <p style="margin-top: 30px;">Thank you for your business,<br/><strong>Your Company Team</strong></p>
      </div>`;

    // 5) Направи TXT съдържание (еднократно, без помощни функции)
    const line = '-'.repeat(78);
    let txtContent = '';
    txtContent += `ORDER ID: ${orderId}\n`;
    txtContent += `ORDER FOR: ${client.Name}  <${client.Email || 'n/a'}>\n`;
    txtContent += `DATE: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    txtContent += `${line}\n`;
    txtContent += `Product                                 Qty       Unit      Disc%        Total\n`;
    txtContent += `${line}\n`;

    for (const p of productList) {
      const hasDiscount = p.DiscountPercentage > 0 && p.quantity >= p.DiscountMinQty;
      const unit = hasDiscount ? p.Price * (1 - p.DiscountPercentage / 100) : p.Price;
      const total = unit * p.quantity;

      const nameCol = (p.Name || '').toString().padEnd(38).slice(0, 38);
      const qtyCol = String(p.quantity).padStart(5);
      const unitCol = (`$${Number(unit).toFixed(2)}`).padStart(12);
      const discCol = (hasDiscount ? `${p.DiscountPercentage}%` : '-').padStart(8);
      const totalCol = (`$${total.toFixed(2)}`).padStart(12);

      txtContent += `${nameCol} ${qtyCol} ${unitCol} ${discCol} ${totalCol}\n`;
    }

    txtContent += `${line}\n`;
    txtContent += `${'Total (no tax):'.padEnd(66)} ${`$${Number(totalPrice).toFixed(2)}`.padStart(12)}\n`;
    txtContent += `${'Total (with tax 20%):'.padEnd(66)} ${`$${Number(totalWithTax).toFixed(2)}`.padStart(12)}\n`;

    // 6) ExportHistory (с OrderID)
    const exportedResult = await new sql.Request(tx)
      .input('UserID', sql.Int, userId)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .input('TotalPrice', sql.Decimal(10, 2), totalPrice)
      .input('TotalWithTax', sql.Decimal(10, 2), totalWithTax)
      .input('OrderID', sql.Int, orderId)
      .query(`
        INSERT INTO ExportHistory (UserID, ClientCompanyID, TotalPrice, TotalWithTax, OrderID)
        OUTPUT INSERTED.ExportID
        VALUES (@UserID, @ClientCompanyID, @TotalPrice, @TotalWithTax, @OrderID)
      `);
    const exportId = exportedResult.recordset[0].ExportID;

    // 7) (по избор) ако държиш и в ExportedProduct копие – остави твоя код тук
    //    ... INSERT INTO ExportedProduct (ExportID, ProductID, Quantity, PricePerUnit, DiscountPercentage) ...

    await tx.commit();

    // 8) Изпрати имейла (HTML + TXT като text + прикачен .txt)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: client.Email,
      subject: `Your order from Lotus (Export #${exportId}, Order #${orderId})`,
      html: htmlContent,
      text: txtContent,
      attachments: [
        {
          filename: `Order_${orderId}.txt`,
          content: txtContent,
          contentType: 'text/plain; charset=utf-8'
        }
      ]
    });

    res.status(200).json({ message: 'Export email sent to client', orderId, exportId });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    console.error('Error sending export email: ', err);
    res.status(500).json({ message: 'Failed to send export email' });
  }
});


router.post('/send-export-excel', authenticateToken, async (req, res) => {
  const { clientCompanyId, productList, totalPrice, totalWithTax } = req.body;

  // userId от токена (fallback, ако middleware не сетва req.user)
  const userId = req.user?.id || (() => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      return payload.id || payload.userId || null;
    } catch { return null; }
  })();

  if (!userId) {
    console.error('No userId found in token');
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    const pool = await sql.connect();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    // 1) Клиент
    const clientRes = await new sql.Request(tx)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .query('SELECT Name, Email FROM ClientCompany WHERE ClientCompanyID = @ClientCompanyID');

    const client = clientRes.recordset[0];
    if (!client) {
      await tx.rollback();
      return res.status(404).json({ message: 'Client not found' });
    }

    // 2) Създай Order (Submitted веднага, защото експорт = подадена заявка)
    const orderIns = await new sql.Request(tx)
      .input('UserID', sql.Int, userId)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .input('Status', sql.VarChar, 'Submitted')
      .input('TotalPrice', sql.Decimal(10, 2), totalPrice)
      .input('TotalWithTax', sql.Decimal(10, 2), totalWithTax)
      .query(`
        INSERT INTO Orders (UserID, ClientCompanyID, Status, TotalPrice, TotalWithTax, SubmittedAt)
        OUTPUT INSERTED.OrderID
        VALUES (@UserID, @ClientCompanyID, @Status, @TotalPrice, @TotalWithTax, SYSUTCDATETIME())
      `);
    const orderId = orderIns.recordset[0].OrderID;

    // 3) Редове към OrderItem (със същата логика за отстъпка)
    for (const product of productList) {
      const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
      const unitPrice = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;

      await new sql.Request(tx)
        .input('OrderID', sql.Int, orderId)
        .input('ProductID', sql.Int, product.ProductID)
        .input('Quantity', sql.Int, product.quantity)
        .input('UnitPrice', sql.Decimal(10, 2), unitPrice)
        .input('DiscountPercentage', sql.Int, product.DiscountPercentage || 0)
        .query(`
          INSERT INTO OrderItem (OrderID, ProductID, Quantity, UnitPrice, DiscountPercentage)
          VALUES (@OrderID, @ProductID, @Quantity, @UnitPrice, @DiscountPercentage)
        `);
    }

    // 4) Excel — форматиран
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Products order from Lotus');

    // Заглавие
    const title = `Order #${orderId} for ${client.Name} — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = title;
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    // Празен ред
    ws.addRow([]);

    // Колони
    ws.columns = [
      { header: 'Product Name', key: 'name', width: 36 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price per Unit', key: 'pricePerUnit', width: 15 },
      { header: 'Total Price', key: 'totalPriceRow', width: 15 },
      { header: 'Discount', key: 'discount', width: 14 }
    ];

    // Header стил
    const headerRow = ws.getRow(3);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell(c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    });

    // Данни
    for (const product of productList) {
      const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
      const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
      const rowTotal = pricePerUnit * product.quantity; // !! различно име от totalPrice, за да не засенчва параметъра

      ws.addRow({
        name: product.Name,
        quantity: product.quantity,
        pricePerUnit: Number(pricePerUnit),
        totalPriceRow: Number(rowTotal),
        discount: hasDiscount ? `${product.DiscountPercentage}% Off` : `No Discount`
      });
    }

    // Формати на клетки
    const firstDataRow = 4;
    const lastDataRow = ws.lastRow.number;
    ws.getColumn('quantity').alignment = { horizontal: 'right' };
    ws.getColumn('pricePerUnit').numFmt = '$#,##0.00';
    ws.getColumn('totalPriceRow').numFmt = '$#,##0.00';

    // Тънки бордюри за данните (по избор)
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      ws.getRow(r).eachCell(c => {
        c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    }

    // Празен ред + обобщение
    ws.addRow({});
    const summary1 = ws.addRow({ name: 'Total (no tax)', totalPriceRow: Number(totalPrice) });
    const summary2 = ws.addRow({ name: 'Total (with tax 20%)', totalPriceRow: Number(totalWithTax) });

    summary1.font = { bold: true };
    summary2.font = { bold: true };
    ws.getCell(`D${summary1.number}`).numFmt = '$#,##0.00';
    ws.getCell(`D${summary2.number}`).numFmt = '$#,##0.00';

    // Freeze header + autofilter
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
    ws.autoFilter = { from: 'A3', to: `E${lastDataRow}` };

    const buffer = await workbook.xlsx.writeBuffer();

    // 5) ExportHistory (с OrderID)
    const exportedResult = await new sql.Request(tx)
      .input('UserID', sql.Int, userId)
      .input('ClientCompanyID', sql.Int, clientCompanyId)
      .input('TotalPrice', sql.Decimal(10, 2), totalPrice)
      .input('TotalWithTax', sql.Decimal(10, 2), totalWithTax)
      .input('OrderID', sql.Int, orderId)
      .query(`
        INSERT INTO ExportHistory (UserID, ClientCompanyID, TotalPrice, TotalWithTax, OrderID)
        OUTPUT INSERTED.ExportID
        VALUES (@UserID, @ClientCompanyID, @TotalPrice, @TotalWithTax, @OrderID)
      `);
    const exportId = exportedResult.recordset[0].ExportID;

    // 6) (по избор) Копие на редовете в ExportedProduct — запазвам твоята логика
    for (const product of productList) {
      const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
      const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;

      await new sql.Request(tx)
        .input('ExportID', sql.Int, exportId)
        .input('ProductID', sql.Int, product.ProductID)
        .input('Quantity', sql.Int, product.quantity)
        .input('PricePerUnit', sql.Decimal(10, 2), pricePerUnit)
        .input('DiscountPercentage', sql.Int, product.DiscountPercentage || 0)
        .query(`
          INSERT INTO ExportedProduct (ExportID, ProductID, Quantity, PricePerUnit, DiscountPercentage)
          VALUES (@ExportID, @ProductID, @Quantity, @PricePerUnit, @DiscountPercentage)
        `);
    }

    await tx.commit();

    // 7) Имейл с прикачения Excel
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: client.Email,
      subject: `Your order from Lotus (Excel) — Export #${exportId}, Order #${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Hello ${client.Name},</h2>
          <p>Your exported product list is attached as an Excel file.</p>
          <p>The order was made at: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          <p>Summary:</p>
          <ul>
            <li><strong>Total Products:</strong> ${productList.length}</li>
            <li><strong>Total (no tax):</strong> $${Number(totalPrice).toFixed(2)}</li>
            <li><strong>Total (with tax 20%):</strong> $${Number(totalWithTax).toFixed(2)}</li>
            <li><strong>Order ID:</strong> ${orderId}</li>
            <li><strong>Export ID:</strong> ${exportId}</li>
          </ul>
        </div>
      `,
      attachments: [
        {
          filename: `ProductExport_Order_${orderId}.xlsx`,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    });

    res.status(200).json({ message: 'Excel export and send was successful', orderId, exportId });
  } catch (err) {
    console.error('Error sending Excel export: ', err);
    try { const pool2 = await sql.connect(); const tx2 = new sql.Transaction(pool2); await tx2.rollback(); } catch {}
    res.status(500).json({ message: 'Failed to send Excel export' });
  }
});


// Админ: списък поръчки
router.get('/orders', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const pool = await sql.connect();
    const rows = (await pool.request().query(`
      SELECT o.OrderID, o.Status, o.TotalPrice, o.TotalWithTax, o.CreatedAt, o.SubmittedAt, o.CancelledAt,
             c.Name AS ClientName, u.Username
      FROM Orders o
      JOIN ClientCompany c ON o.ClientCompanyID = c.ClientCompanyID
      JOIN Users u ON u.UserID = o.UserID
      ORDER BY o.CreatedAt DESC
    `)).recordset;
    res.json(rows);
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ message: 'Failed to list orders' });
  }
});

// Админ: смяна на статус на Cancelled
router.put('/orders/:id/cancel', authenticateToken, authorizeAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  try {
    const pool = await sql.connect();
    await pool.request()
      .input('OrderID', sql.Int, orderId)
      .query(`UPDATE Orders SET Status='Cancelled', CancelledAt = SYSUTCDATETIME() WHERE OrderID = @OrderID`);
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
});

// Админ: изтриване на поръчка
router.delete('/orders/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  try {
    const pool = await sql.connect();
    await pool.request()
      .input('OrderID', sql.Int, orderId)
      .query(`DELETE FROM Orders WHERE OrderID = @OrderID`);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});


//exporting an User sales in Excel
router.get('/export/user/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const userId = parseInt(req.params.userId);
    try {
        const pool = await sql.connect();

        const exportHistory = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT eh.ExportID, eh.TotalPrice, eh.TotalWithTax, eh.ExportDate, cc.Name AS ClientName
                FROM ExportHistory eh
                JOIN ClientCompany cc ON eh.ClientCompanyID = cc.ClientCompanyID
                WHERE eh.UserID = @UserID
            `);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('User Sales');

        sheet.columns = [
            { header: 'Export ID', key: 'ExportID' },
            { header: 'Client Name', key: 'ClientName', width: 10},
            { header: 'Product Name', key: 'ProductName', width: 30 },
            { header: 'Quantity', key: 'Quantity' },
            { header: 'Unit Price', key: 'PricePerUnit', width: 15 },
            { header: 'Discount %', key: 'DiscountPercentage' },
            { header: 'Total', key: 'Total', width: 15 },
            { header: 'Export Date', key: 'ExportDate' , width: 15},
        ];

        for (const exportRecord of exportHistory.recordset) {
            const productResult = await pool.request()
                .input('ExportID', sql.Int, exportRecord.ExportID)
                .query(`
                    SELECT ep.Quantity, ep.PricePerUnit, ep.DiscountPercentage, p.Name AS ProductName
                    FROM ExportedProduct ep
                    JOIN Product p ON ep.ProductID = p.ProductID
                    WHERE ep.ExportID = @ExportID
                `);

            for (const prod of productResult.recordset) {
                sheet.addRow({
                    ExportID: exportRecord.ExportID,
                    ClientName: exportRecord.ClientName,
                    ProductName: prod.ProductName,
                    Quantity: prod.Quantity,
                    PricePerUnit: prod.PricePerUnit.toFixed(2),
                    DiscountPercentage: prod.DiscountPercentage || 0,
                    Total: (prod.PricePerUnit * prod.Quantity).toFixed(2),
                    ExportDate: exportRecord.ExportDate.toISOString().split('T')[0]
                });
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=User_Sales_${userId}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error exporting user sales: ', err);
        res.status(500).json({ message: 'Failed to export user sales' });
    }
});


//getting the featured products
router.get('/featured-products', async (req, res) => {
    try{
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM Product WHERE IsFeatured = 1');
        res.json(result.recordset);
    } catch(err){
        console.error('Error fetching featured products:', err);
        res.status(500).json({message: 'Failed to fetch featured products'});
    }
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
    const {name, description, price, imagePath, brand, stockqty, isFeatured, isArchived, discountPercentage, discountMinQty } = req.body;

    try{
        const pool = await sql.connect();
        const result = await pool.request().input('Name', sql.NVarChar, name)
                            .input('Description', sql.NVarChar, description)
                            .input('Price', sql.Decimal(10,2), price)
                            .input('ImagePath', sql.NVarChar, imagePath)
                            .input('Brand', sql.NVarChar, brand)
                            .input('StockQty', sql.Int, stockqty)
                            .input('IsFeatured', sql.Bit, isFeatured)
                            .input('IsArchived', sql.Bit, isArchived)
                            .input('DiscountPercentage', sql.Int, discountPercentage)
                            .input('DiscountMinQty', sql.Int, discountMinQty)
                            .query(`
                INSERT INTO Product (Name, Description, Price, ImagePath, Brand, StockQty, IsFeatured, IsArchived, DiscountPercentage, DiscountMinQty)
                OUTPUT INSERTED.ProductID
                VALUES (@Name, @Description, @Price, @ImagePath, @Brand, @StockQty, @IsFeatured, @IsArchived, @DiscountPercentage, @DiscountMinQty)`);
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
    const {name, description, price, imagePath, brand, stockqty, isFeatured, isArchived, discountPercentage, discountMinQty, discountStart, discountEnd} = req.body;

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
        const result = await pool.request().query('SELECT UserID, Username, Email, IsAdmin FROM Users');
        res.json(result.recordset);
    } catch(err) {
        console.error('Error fetching users:', err);
        res.status(500).json({message: 'Failed to fetch users'});
    }
}
);
//updating a user by ID
router.put('/users/:id', authenticateToken, authorizeAdmin, async(req, res) => {
    const userId = parseInt(req.params.id, 10);
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