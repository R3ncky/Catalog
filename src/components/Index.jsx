import { useNavigate} from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../styles/Index.css';
import HomeButton from './HomeButton';

export default function Index(){
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');

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
            }
        }
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
            <div className='top-right-auth'>
                <span>Welcome, {username}</span>
                <button onClick={handleLogOut}>Logout</button>
            </div>
        );
    } else {
        authSection = (
            <div className='top-right-auth'>
                <button onClick={goToLogin}>Login</button>
            </div>
        );
    }

    let adminButton;
    if(token){
        adminButton = (
            <button onClick={() => navigate('/admin')} className='admin-button'>Go To Admin Panel</button>
        );
    }
    return (
        <div>
            <HomeButton />
            {authSection}
            <div className='index-wrapper'>
            <h1>Welcome to the Catalog App</h1>
            {adminButton}
            <button onClick={() => navigate('catalog')} style={{padding: '10px 20px', marginTop: '20px'}}>
                Browse Catalog
            </button>
            </div>
        </div>
    )
}