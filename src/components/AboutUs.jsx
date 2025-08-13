import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import { useNavigate } from "react-router-dom";
import '../styles/AboutUs.css';

export default function AboutUs(){
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if(token){
            setToken(token);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
                setIsAdmin(!!payload.isAdmin);
            } catch(err){
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
        } catch(e) {
            return true;
        }
    }
    
        const checkAndRefreshToken = () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if(!token || isTokenExpired(token)) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                return;
            }

            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            const timeLeft = payload.exp - now;

            if(timeLeft < 300){
                fetch('api/refresh-token', {
                    method: 'POST',
                    headers: {'Authorization' : `Bearer ${token}`}
                })
                .then(res => res.json()).then(data => {
                    if(data.token){
                        if(localStorage.getItem('token')) {
                            localStorage.setItem('token', data.token);
                        } else {
                            sessionStorage.setItem('token', data.token);
                        }   
                        
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

    const handleLogOut = () =>{
        localStorage.removeItem('token');
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
    if(token && isAdmin){
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons-index'>Admin Panel</button>
        );
    }

    return(
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
        <h2>About us</h2>
        <div className="about-us-container">
           <img src="../assets/doge.jpg" alt="" className="about-us-image"/>
            <div className="about-us-text">
            <p>Welcome to Catalog App, your trusted source for honest and detailed information about cosmetic products. 
               Whether you're searching for the perfect makeup sponge, a gentle shampoo, nourishing soaps, or other beauty essentials, 
               this catalog is here to help you make informed choices.<br />
            <br />
              Our mission is to provide comprehensive, reliable, and up-to-date reviews and guides that empower you to discover products
              that suit your unique needs and lifestyle. We understand how important quality and safety are when it comes to personal care, and that's why we carefully
              curate our content with the latest insights and expert advice.<br />
            <br />
              In this Catalog App, we believe that beauty starts with knowledge — and great products. 
              Explore our extensive catalog, learn about the benefits and ingredients, and find the best options to enhance your daily routine.<br />
            <br />
              Thank you for trusting us as your go-to resource for cosmetic products!</p>
        </div>
        
        </div>
        </main>
        <footer className='index-footer'>
                <div className='footer-content'>  
                    <div className='footer-section'>
                        <h4>Company</h4>
                        <button className='button-footer' onClick={() => {navigate('/aboutus')}}>About us</button>
                    </div>
                    <div className='footer-section'>
                        <h4>Legal</h4>
                        <button className='button-footer' onClick={() => {navigate('/terms&conditions')}}>Terms & Conditions</button>
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