import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HomeButton from "./HomeButton";

export default function TwoFactorForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const state = location.state || {};
    const userId = state.userId || sessionStorage.getItem('userId');
    const rememberMe = state.rememberMe || (sessionStorage.getItem('rememberMe') === 'true');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!userId) {
            setError('User ID is missing. Please log in again.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/verify-2fa', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({userId, code, rememberMe})
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (rememberMe) {
                        localStorage.setItem('token', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token);
                    }
                    navigate('/');
                } else {
                    setError(data.message || 'Verification failed');
                }
        } catch (err) {
            console.error('Verification error:', err);
            setError('An unexpected error occurred.');
        }
    };
    return (
        <div>
            <header>
                <div className="navbar-login">
                    <div className="navbar-left-login">
                        <HomeButton />
                    </div>
                </div>
            </header>
            <div className="form-login">
                <form onSubmit={handleSubmit} className="sub-form">
                    <div className="form-grid">
                        <h2 className="h2-login">Two-Factor Authentication</h2>
                        <label>Verification Code</label><br />
                        <input className="input-login" type="text" name="code"
                            value={code} onChange={(e) => setCode(e.target.value)} required /><br />
                        {error && <p className="error">{error}</p>}
                        <button type="submit" className="submit-button">Verify</button>
                    </div>
                </form>
            </div>
        </div>
    );
}