import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import '../styles/ProductCatalog.css';
import { useLocation, useNavigate } from "react-router-dom";
import {motion, AnimatePresence} from 'framer-motion';

export default function ProductCatalog() {
    const [products, setProducts] = useState([]);
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const productsPerPage = 12;
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const selectedCategoryId = queryParams.get('category');

    
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
        window.scrollTo({top: 0, behavior: 'smooth'});

        let url = 'http://localhost:5000/api/products';
        if(selectedCategoryId) {
            url += `?category=${selectedCategoryId}`;
        }
        fetch(url, {headers: headers})
        .then(async res => {
            if(!res.ok){
                const text = await res.text();
                throw new Error(text || 'Failed to catch fetch');
            }
            return res.json();
        }).then(data => {
            setProducts(data);
            setCurrentPage(1);
        })
        .catch(err => console.error('Error fetching the products: ', err.message || err));
    }, [selectedCategoryId]);

    const goToLogin = () => {
        navigate('/login');
    }

    const handleLogOut = () =>{
        localStorage.removeItem('token');
        setToken(null);
        setUsername('');
        navigate('/');
    };

    const totalPages = Math.ceil(products.length / productsPerPage);
    const indexOfLast = currentPage * productsPerPage;
    const indexOfFirst = indexOfLast - productsPerPage;
    const currentProducts = products.slice(indexOfFirst, indexOfLast);

    const goToFirst = () => setCurrentPage(1);
    const goToPrev = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToLast = () => setCurrentPage(totalPages);

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
            <button onClick={() => navigate('/admin')} className='left-buttons'>Go To Admin Panel</button>  
        );
    }
    return (
        <>
            <div className="navbar">
                <HomeButton />
                <div className="navbar-left">
                <button className="left-buttons" onClick={() => navigate('/')}>Home</button>
                {adminButton}
                <button className="Current-Button" onClick={() => navigate(0)}>Browse Catalog</button>
                </div>
                {authSection}              
            </div>
            <div className="product-page">
            <h2 className="header2">Product Catalog</h2>
            <div className="product-grid">
            <AnimatePresence>
                {currentProducts.map(product => (
                    <motion.div className="product-card" key={product.ProductID}
                    initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} 
                    exit={{opacity: 0}} transition={{duration: 0.4}}>
                        <img src={`/assets/${product.ImagePath}`} alt={product.Name} className="product-image" />
                        <h3>{product.Name}</h3>
                        <p>{product.Description}</p>
                        <p>Status: {product.Status}</p>
                        {product.Price !== undefined && (
                            <p><strong>Price: ${product.Price}</strong></p>
                        )}
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
            <div className="pagination-controls">
                <button onClick={goToFirst} disabled={currentPage === 1}>First</button>
                <button onClick={goToPrev} disabled={currentPage === 1}>Previous</button>
                {[...Array(totalPages)].map((_,i) => (
                    <button key={i} onClick={() => setCurrentPage(i+1)} 
                    className={currentPage === i + 1 ? 'active-page' : ''}>
                        {i+1}
                    </button>
                ))}
                <button onClick={goToNext} disabled={currentPage === totalPages}>Next</button>
                <button onClick={goToLast} disabled={currentPage === totalPages}>Last</button>
            </div>
        </div>
        </>
    )
}