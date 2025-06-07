import { useNavigate} from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/Index.css';
import HomeButton from './HomeButton';

export default function Index(){
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if(storedToken){
            setToken(storedToken);
            try {
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                setUsername(payload.username || '');
            } catch(err){
                console.warn('Invalid token: ', err.message);
                setToken(null);
                setUsername('');
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
        navigate('/');
    };

    let authSection;
    if(token){
        authSection = (
            <div className='navbar-right-index'>
                <span>Welcome, {username}</span>
                <button onClick={handleLogOut}>Logout</button>
            </div>
        );
    } else {
        authSection = (
            <div className='navbar-right-index'>
                <button onClick={goToLogin}>Login</button>
            </div>
        );
    }

    let adminButton;
    if(token){
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons-index'>Go To Admin Panel</button>
        );
    }
    return (
        <>
            <div className="navbar-index">               
            <HomeButton />
            <div className='navbar-left-index'>
            <button className="left-buttons-index" onClick={() => navigate(0)}>Home</button>
            {adminButton}
            <button className="left-buttons-index" onClick={() => navigate('/catalog')}>Browse Catalog</button>
            </div>
            {authSection}
            </div>
            <div className='index-wrapper'>
            <h1>Welcome to the Catalog App</h1>
            <div className='category-buttons' style={{marginTop: '2rem'}}>
              <h2>Browse by Category</h2>
              <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: '0.5rem', marginTop: '1rem'}}>
                    <button onClick={() => navigate('/catalog')}>All</button>
                    {categories.map(cat => (
                        <button key={cat.CategoryID} onClick={() => navigate(`/catalog?category=${cat.CategoryID}`)}>
                            {cat.Name}
                        </button>
                    ))}
              </div>  
            </div>
            </div>
        </>
    )
}