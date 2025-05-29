import { useNavigate } from "react-router-dom";
import logo from '../styles/logo.png';
import '../styles/ProductCatalog.css';

export default function HomeButton() {
    const navigate =  useNavigate();

    return (
        <img 
        src={logo}
        alt="Home"
        onClick={() => navigate('/')}
        className="home-button"/>
    );
}