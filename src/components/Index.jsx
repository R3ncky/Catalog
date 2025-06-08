import { useNavigate} from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/Index.css';
import HomeButton from './HomeButton';

export default function Index(){
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token){
            setToken(token);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
                setIsAdmin(payload.isAdmin || false);
            } catch(err){
                console.warn('Invalid token: ', err.message);
                setToken(null);
                setUsername('');
                setIsAdmin(false);
                localStorage.removeItem('token');
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
            const token = localStorage.getItem('token');
            if(!token || isTokenExpired(token)) {
                localStorage.removeItem('token');
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
                        localStorage.setItem('token', data.token);
                    }
                }).catch(() => {
                    localStorage.removeItem('token');
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
            <div className='navbar-right-index'>
                <span>Welcome, {username}</span>
                <button className='right-button-index' onClick={handleLogOut}>Logout</button>
            </div>
        );
    } else {
        authSection = (
            <div className='navbar-right-index'>
                <button className='right-button-index' onClick={goToLogin}>Login</button>
            </div>
        );
    }

    let adminButton;
    if(token && isAdmin){
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons-index'>Go To Admin Panel</button>
        );
    }
    return (
        <>
            <header>
            <div className="navbar-index">               
            <HomeButton />
            <div className='navbar-left-index'>
            <button className="current-index" onClick={() => navigate(0)}>Home</button>
            <button className="left-buttons-index" onClick={() => navigate('/catalog')}>Browse Catalog</button>
            {adminButton}
            </div>
            {authSection}
            </div>
            </header>
            <div className='index-wrapper'>
            <h1>Welcome to the Catalog App</h1>
            <div className='index-motivation'>
                <p>
                    Discover quality and care in every product — from refreshing soaps and smooth
                    shaving creams to reliable knives and handy sponges. 
                    Our curated selection is designed to bring a little more ease, confidence, and comfort to your daily routine. 
                    Because taking care of yourself and your space isn’t just a task — it’s a moment of pride and self-respect.
                    Shop smart. Feel fresh. Live well.
                </p>
                <img src='../assets/lotus-big.jpg' alt="Lotus" />
            </div>
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
            <footer>

            </footer>
        </>
    )
}