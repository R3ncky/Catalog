import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;

export function generateToken(user){
    return jwt.sign({id: user.id, username: user.username}, secret, {expiresIn: '1h'});
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

export function refreshToken(req, res) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split('')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.sendStatus(403);

        const newToken = generateToken({id: user.id, username: user.username});
    });
}