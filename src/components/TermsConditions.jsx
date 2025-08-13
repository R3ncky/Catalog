import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import { useNavigate } from "react-router-dom";

export default function TermsConditions() {
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            setToken(token);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
                setIsAdmin(!!payload.isAdmin);
            } catch (err) {
                console.warn('Invalid token: ', err.message);
                setToken(null);
                setUsername('');
                setIsAdmin(false);
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                navigate('/login');
            }
        }
    }, []);
    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        } catch (e) {
            return true;
        }
    }

    const checkAndRefreshToken = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token || isTokenExpired(token)) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = payload.exp - now;

        if (timeLeft < 300) {
            fetch('api/refresh-token', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json()).then(data => {
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token);
                    }
                }).catch(() => {
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                });
        }
    };



    useEffect(() => {
        ['keydown', 'click'].forEach(event => window.addEventListener(event, checkAndRefreshToken));
        return () => {
            ['keydown', 'click'].forEach(event => window.removeEventListener(event, checkAndRefreshToken));
        };
    }, []);

    const goToLogin = () => {
        navigate('/login');
    }

    const handleLogOut = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setToken(null);
        setUsername('');
        setIsAdmin(false);
        navigate('/');
    };

    let authSection;
    if(token){
        authSection = (
            <>
                <div className='welcome-message'>
                <span>Welcome, {username}</span>
                </div>
                <button className='right-button-index' onClick={handleLogOut}>Logout</button>
            </>
        );
    } else {
        authSection = ( 
            <>     
                <button className='right-button-index' onClick={goToLogin}>Login</button>
            </>
        );
    }


    let adminButton;
    if (token && isAdmin) {
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons-index'>Admin Panel</button>
        );
    }

    return (
        <div className="page-container">
             <header>
                        <div className="navbar-index">               
                        <div className='navbar-left-index'>
                        <HomeButton />
                        <button className="left-buttons-index" onClick={() => navigate('/')}>Home</button>
                        <button className="left-buttons-index" onClick={() => navigate('/catalog')}>Catalog</button>
                        {adminButton}
                        </div>
                        <button className='menu-toggle' aria-expanded={menuOpen} aria-label='Toggle Menu' onClick={() => setMenuOpen(v => !v)}>☰</button>
                        <div className={`navbar-right-index ${menuOpen ? 'is-open' : ''}`}>
                        {authSection}
                        </div>
                        </div>  
                        </header>
            <main className="main-content">
                <h2>Terms and Conditions</h2>
                <div className="about-us-container">
                    <div className="about-us-text">
                        <p>
                            Effective Date: [10.06.2025]<br />
                            <br />
                            Welcome to Catalog App. These Terms and Conditions govern your access and use of our website available 
                            at [CatalogApp.com] (the "Site"). While the Site is currently hosted locally for development purposes, it is intended for public deployment at a 
                            later date under a registered domain name.
                            By using the Site, you agree to be bound by these Terms. If you do not agree, please do not use the Site.<br />
                            1. Informational Purpose Only<br />
                            <br />
                            The content on this Site is provided for general informational purposes only. 
                            It includes products and descriptions. We do not sell any products directly through this website.<br />
                            <br />
                            We strive to keep information accurate and up to date but do not guarantee the completeness, reliability, or suitability of the content.<br />
                            2. Employee Login Only<br />
                            <br />
                            Access to the login section of this Site is strictly limited to authorized employees of Catalog App. 
                            Users who are not employees are not permitted to access or attempt to access the login area. 
                            Unauthorized access is prohibited and may be subject to legal action.<br />
                            3. No Medical or Professional Advice<br />
                            <br />
                            The content provided on this Site is not intended to be a substitute for professional medical advice, diagnosis, or treatment. 
                            Always seek the advice of a physician or other qualified health provider with any questions regarding a medical condition.<br />
                            4. Third-Party Links<br />
                            <br />
                            This Site may contain links to third-party websites. These links are provided for convenience and do not imply endorsement. 
                            We are not responsible for the content or privacy practices of external sites.<br />
                            5. Changes to Terms<br />
                            <br />
                            We may update these Terms from time to time. Any changes will be posted on this page with an updated effective date. 
                            Continued use of the Site after such changes constitutes your acceptance of the new Terms.<br />
                            7. Contact<br />
                            <br />
                            If you have any questions about these Terms, please contact us at:<br />
                            <br />
                            Email: [example@email.com]<br />
                            Address: [Racoon City, 23 example Street.]
                        </p>
                    </div>
                </div>
            </main>
            <footer className='index-footer'>
                <div className='footer-content'>
                    <div className='footer-section'>
                        <h4>Company</h4>
                        <button className='button-footer' onClick={() => { navigate('/aboutus') }}>About us</button>
                    </div>
                    <div className='footer-section'>
                        <h4>Legal</h4>
                        <button className='button-footer' onClick={() => { navigate('/terms&conditions') }}>Terms & Conditions</button>
                    </div>
                    <div className='footer-section'>
                        <h4>Social</h4>
                        <button className='button-footer' onClick={() => window.open('https://swu.bg/bg/', '_blank')}>University</button>

                    </div>
                </div>
                <div className='footer-bottom'>
                    © {(new Date().getFullYear())} Plamen Petrov. All rights reserved.
                </div>
            </footer>
        </div>
    )
}