import { useNavigate} from 'react-router-dom';
import HomeButton from './HomeButton';

export default function Index(){
    const navigate = useNavigate();

    const goToLogin = () => {
        navigate('/login');
    }

    return (
        <div style={{textAlign: 'center', paddingTop: '100px'}}>
            <HomeButton />
            <h1>Welcome to the Catalog App</h1>
            <button onClick={goToLogin} style={{padding: '10px 20px', marginTop: '20px'}}>
                Login
            </button>
            <button onClick={() => navigate('catalog')} style={{padding: '10px 20px', marginTop: '20px'}}>
                Browse Catalog
            </button>
        </div>
    )
}