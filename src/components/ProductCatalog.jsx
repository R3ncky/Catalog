import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import '../styles/ProductCatalog.css';
import { useNavigate } from "react-router-dom";

export default function ProductCatalog() {
    const [products, setProducts] = useState([]);
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    
    useEffect(() => {
        const token = localStorage.getItem('token');
        const headers = {};
        if(token){
            headers['Authorization'] = `Bearer ${token}`;
            setToken(token);
        try{
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUsername(payload.username || '');       
        } catch(err){
            console.warn('Invalid token:', err.message);
            setUsername('');
            setToken(null);
        }
    }
        fetch('http://localhost:5000/api/products', {
            headers: headers
        })
        .then(async res => {
            if(!res.ok){
                const text = await res.text();
                throw new Error(text || 'Failed to catch fetch');
            }
            return res.json();
        }).then(data => setProducts(data)).catch(err => console.error('Error fetching the products: ', err.message || err));
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
            <div className='navbar-right'>
                <span>Welcome, {username}</span>
                <button className="LoginButton" onClick={handleLogOut}>Logout</button>
            </div>
        );
    } else {
        authSection = (
            <div className='navbar-right'>
                <button className="LoginButton" onClick={goToLogin}>Login</button>
            </div>
        );
    }

    let adminButton;
    if(token){
        adminButton = (
            <div className="navbar-left">
            <button onClick={() => navigate('/admin')} className='admin-button'>Go To Admin Panel</button>
            </div>
        );
    } else {
        adminButton = (
            <div className="navbar-left">
            </div>
        )
    }
    return (
        <>
        
            <div className="navbar">
                <HomeButton />
                {adminButton}
                {authSection}
            </div>
            <div className="product-page">
            <h2 className="header2">Product Catalog</h2>
            <div className="product-grid">
                {products.map(product => (
                    <div className="product-card" key={product.ProductID}>
                        <img src={`/assets/${product.ImagePath}`} alt={product.Name} className="product-image" />
                        <h3>{product.Name}</h3>
                        <p>{product.Description}</p>
                        <p>Status: {product.Status}</p>
                        {product.Price !== undefined && (
                            <p><strong>Price: ${product.Price}</strong></p>
                        )}
                    </div>
                ))}
            </div>
        </div>
        </>
    )
}