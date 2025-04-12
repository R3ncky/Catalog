import dotenv from 'dotenv';
import express from 'express';
import sql from 'mssql';

dotenv.config();
const app = express();
app.use(express.json());

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
}).catch(err => {
    console.log("There was an error connecting to the database", err);
});
