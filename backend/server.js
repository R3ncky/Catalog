import dotenv from 'dotenv';
import express from 'express';
import sql from 'mssql';
import router from './routes.js';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    options: {
        trustServerCertificate: true,
    }  
};
console.log("🔌 Connecting to:", config.server);
sql.connect(config).then(() => {
    console.log("Connected to the database");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>{
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.log("There was an error connecting to the database", err);
});
