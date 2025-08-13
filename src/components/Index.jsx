import { Link, useNavigate} from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/Index.css';
import HomeButton from './HomeButton';
import FeaturedCarousel from './FeaturedCarousel';

export default function Index(){
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [categories, setCategories] = useState([]);
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
    useEffect(() => {
        fetch('http://localhost:5000/api/categories').then(res => res.json()).then(data => setCategories(data))
            .catch(err => console.error('Fetch categories error', err));
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
    if(token && isAdmin){
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons-index'>Admin Panel</button>
        );
    }
    return (
      
            <div className='page-container'>
            <header>
            <div className="navbar-index">               
            <div className='navbar-left-index'>
            <HomeButton />
            <button className="current-index" onClick={() => navigate(0)}>Home</button>
            <button className="left-buttons-index" onClick={() => navigate('/catalog')}>Catalog</button>
            {adminButton}
            </div>
            <button className='menu-toggle' aria-expanded={menuOpen} aria-label='Toggle Menu' onClick={() => setMenuOpen(v => !v)}>☰</button>
            <div className={`navbar-right-index ${menuOpen ? 'is-open' : ''}`}>
            {authSection}
            </div>
            </div>  
            </header>
            <main className='main-content'>
            <div className='index-wrapper'>
            
            <section className="hero-banner">
                <div className="hero-content">
                <h1>Elegance in Every Detail</h1>
                <p>
                Discover quality and care in every product — from refreshing soaps and smooth
                shaving creams to reliable knives and handy sponges.
                </p>
                <button className="hero-button" onClick={() => navigate('/catalog')}>
                Browse Catalog
                </button>
                </div>
                </section>
            <FeaturedCarousel />
            <div className='category-box'>
              <h2>Browse by Category</h2>
              <div className='category-grid'>
                    <button className='category-buttons' onClick={() => navigate('/catalog')}>All</button>
                    {categories.map(cat => (
                        <button className='category-buttons' key={cat.CategoryID} onClick={() => navigate(`/catalog?category=${cat.CategoryID}`)}>
                            {cat.Name}
                        </button>
                    ))}
              </div>  
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