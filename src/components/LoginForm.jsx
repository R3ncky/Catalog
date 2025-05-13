import { useState } from "react";
import HomeButton from "./HomeButton";

export default function LoginForm(){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) =>{
        e.preventDefault();
        setError('');

        try{
            const response = await fetch('http://localhost:5000/api/login',{
                method: 'POST',
                headers: {'Content-Type': 'application/json' },
                body: JSON.stringify({username, password}),
            });
            const data = await response.json();

            if(response.ok) {
                localStorage.setItem('token', data.token);
                alert("Login successful!");
                window.location.href = '/admin';
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occured.');
        }
    };

    return(
        <div style={{ maxWidth: '400px', margin: 'auto'}}>
            <HomeButton />
            <h2>Admin login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <input type="text" placeholder="Username" value={username} 
                    onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div style={{marginTop: ' 10px'}}>
                    <input type="password" placeholder="Password" value={password} 
                    onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div style={{marginTop: '20px'}}>
                    <button type="submit">Login</button>
                </div>
                {error && (
                    <div style={{color: 'red', marginTop: '10px'}}>{error}</div>
                )}
            </form>
        </div>
    );
}