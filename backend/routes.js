import express from 'express';
import { generateToken, authenticateToken } from './auth.js';

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

export default router;