import { useState } from "react";
import HomeButton from "./HomeButton";
import '../styles/LoginForm.css';
import { useNavigate } from "react-router-dom";

export default function LoginForm(){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        e.preventDefault();
        setError('');

        try{
            const response = await fetch('http://localhost:5000/api/login',{
                method: 'POST',
                headers: {'Content-Type': 'application/json' },
                body: JSON.stringify({email, password}),
            });
            const data = await response.json();

            if(response.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = '/';
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occured.');
        }
    };

    return(
        <div>
            <header>
            <div className="navbar-login">
                <HomeButton />
                <button className="left-buttons-login" onClick={() => navigate('/')}>Home</button>
                <button className="left-buttons-login" onClick={() => navigate('/catalog')}>Browse Catalog</button>
            </div>
            </header>
            <div className="form-login">
            <form onSubmit={handleSubmit} className="sub-form">
                <div className="form-grid">
                    <h2 className="h2-login">Login Form</h2>
                    <label>Email</label> <br />
                    <input className="input-login" type="text" name="Email" 
                    value={email} onChange={(e) => setEmail(e.target.value)} required/><br />
                    <label>Password</label><br />
                    <input className="input-login" type="password" name="password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required/><br />
                    <div>
                        <button type="submit" className="btn">Login</button>
                    </div>
                </div>
                {error && (
                    <div style={{color: 'red', marginTop: '10px'}}>{error}</div>
                )}
            </form>
            </div>
        </div>
    );
}