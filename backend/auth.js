import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;

export function generateToken(user){
    return jwt.sign({id: user.id, username: user.username, isAdmin: user.isAdmin}, secret, {expiresIn: '1h'});
}

export function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if(!token) return res.sendStatus(401);
    jwt.verify(token, secret, (err, user) =>{
        if(err){ 
            console.error('Token verification failed', err);
            return res.sendStatus(401);
        }
        req.user = user;
        next();
    });
}

export function authorizeAdmin(req, res, next){
    if(!req.user || !req.user.isAdmin){
        return res.status(403).json({message: 'Admin access required'});
    }
    next();
}

export function refreshToken(req, res) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split('')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.sendStatus(403);

        const newToken = generateToken({id: user.id, username: user.username});
    });
}