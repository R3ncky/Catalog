import { useNavigate } from "react-router-dom";
import logo from '../assets/logo.png';

export default function HomeButton() {
    const navigate =  useNavigate();

    return (
        <img 
        src={logo}
        alt="Home"
        onClick={() => navigate('/')}
        style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            width: '40px',
            height: '40px',
            cursor: 'pointer'
        }}/>
    );
}