import express from 'express';
import { generateToken, authenticateToken } from './auth';

const app = express();
app.use(express.json());

const users = [
    {id: 1, username: 'admin', password: 'adminpass'} //Demo only (need to delete)
];

app.post('/login', (req, res) => {
    const {username, password} = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if(!user) return res.status(401).json({message: 'Invalid credentials'});
    
    const token = generateToken(user);
    res.json({token});
});

app.get('/admin', authenticateToken, (req, res) => {
    res.json({message: `Welcome ${req.user.username}, you are authenticated.`});
});

app.listen(3000, () => console.log('Server running on port 3000'));