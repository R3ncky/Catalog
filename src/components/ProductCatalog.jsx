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
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [userModifiedCategories, setUserModifiedCategories] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedList, setSelectedList] = useState([]);
    const [showListModal, setShowListModal] = useState(false);
    const location = useLocation();
    const productsPerPage = 12;
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const selectedCategoryId = queryParams.get('category');

    function isTokenExpired(token) {
         try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        } catch(e) {
            return true;
        }
    }

    useEffect(() => {
        if(selectedCategoryId && !selectedCategories.includes(Number(selectedCategoryId))){
            setSelectedCategories(prev => [...prev, Number(selectedCategoryId)]);
        }
    }, [selectedCategoryId]);
    
    useEffect(() => {
        setCurrentPage(1);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [searchTerm]);
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
            localStorage.removeItem('token');
            navigate('/login');
        }
    }

        fetch('http://localhost:5000/api/categories')
            .then(res => res.json()).then(data => setCategories(data))
            .catch(err => console.error('Error fetching categories:', err));
        window.scrollTo({top: 0, behavior: 'smooth'});

        

        const params = new URLSearchParams();
        
        if(selectedCategories.length > 0) {
            params.append('categories', selectedCategories.join(','));
        }
        if(minPrice){
            params.append('minPrice', minPrice);
        }
        if(maxPrice){
            params.append('maxPrice', maxPrice);
        }
        if(!userModifiedCategories && selectedCategoryId && selectedCategories.length === 0){
            params.append('category', selectedCategoryId);
        }

        const url = `http://localhost:5000/api/products?${params.toString()}`;

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
    }, [selectedCategoryId, selectedCategories, minPrice, maxPrice, token]);

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

    const handleAddList = (product) => {
        setSelectedList(prev => {
            const existing = prev.find(p => p.ProductID === product.ProductID);
            if(existing) {
                return prev.map(p =>
                    p.ProductID === product.ProductID ? {...p, quantity: p.quantity + 1} : p);
            } else {
                return [...prev, {...product, quantity: 1}];
            }
        });
    };

    const handleRemoveList = (productId) => {
        setSelectedList(prev => prev.map(p => p.ProductID === productId ? {...p, quantity: p.quantity - 1} : p).filter(p => p.quantity > 0));
    };

    const handleClearList = () => {
        setSelectedList([]);
    };

    const getTotalPrice = () => {
        return selectedList.reduce((acc, product) => {
            const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
            const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
            return acc + (pricePerUnit * product.quantity);
        }, 0);
    };

    const getTotalWithTax = () => {
        return (getTotalPrice() * 1.2).toFixed(2);
    };

    const goToLogin = () => {
        navigate('/login');
    }

    const handleLogOut = () =>{
        localStorage.removeItem('token');
        setToken(null);
        setUsername('');
        navigate('/');
    };

    const ToggleCategory = (id) => {
        setUserModifiedCategories(true);
        setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const filteredProducts = products.filter(product => product.Name.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const indexOfLast = currentPage * productsPerPage;
    const indexOfFirst = indexOfLast - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);

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
            <h2 className="header2">Product Catalog</h2>
            <div className="product-page">
            
            <div className="filter-section">
                <h3>Filer by category</h3>
                <ul className="category-filter">
                {categories.map(category => (
                    <li key={category.CategoryID}>
                    <label>
                        <input type="checkbox" value={category.CategoryID}
                        checked={selectedCategories.includes(category.CategoryID)}
                        onChange={() => ToggleCategory(category.CategoryID)} />
                        {category.Name}
                    </label>
                    </li>
                    
                ))}
                </ul>
                {token && (
                    <>
                    <h3>Filter by Price</h3>
                    <ul className="price-filter">
                    <li>
                    <input type="number" placeholder="Min Price"
                    value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                    </li>
                    <li>
                    <input type="number" placeholder="Max Price"
                    value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </li>
                    </ul>
                    </>
                )}
            </div>
            <div className="display-flex2">
            <div className="search-bar">
                <input type="text" placeholder="Search by name.." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input"/>
                { token && (
                <button onClick={() => setShowListModal(true)} className="show-list-button">Show List ({selectedList.length})</button>
                )}
                { showListModal && (
                    <div className="list-modal">
                        <div className="modal-content">
                            <h3>Your Selected Products</h3>
                            {selectedList.length === 0 ? (
                                <p>No products added.</p>
                            ) : (
                                <>
                                <ul>
                                    {selectedList.map((product) => {
                                        const hasDiscount = product.DiscountPercentage > 0 && 
                                        product.quantity >= product.DiscountMinQty;

                                        const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
                                        const totalPrice = (pricePerUnit *  product.quantity).toFixed(2);
                                        return(
                                        <li key={product.ProductID} className="modal-item">
                                            {product.Name} (x{product.quantity}) - ${totalPrice}
                                            {hasDiscount && <span className="discount-tag">-{product.DiscountPercentage}%</span>}
                                            <button onClick={() => handleRemoveList(product.ProductID)} className="remove-button">Remove</button>
                                        </li>
                                        );
                                    })}
                                </ul>
                                </>
                            )}
                            <p><strong>Total (no tax): ${getTotalPrice().toFixed(2)}</strong></p>
                            <p><strong>Total (with tax 20%): ${getTotalWithTax()}</strong></p>
                            <button onClick={handleClearList} className="clear-button">Clear List</button>
                            <button onClick={() => setShowListModal(false)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
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
                            <>
                            <p><strong>Price: ${product.Price}</strong></p>
                            <p><strong>With Tax (20%): ${(product.Price * 1.2).toFixed(2)}</strong></p>
                            {product.DiscountPercentage && product.DiscountMinQty && (
                            <p><strong>Discount: </strong>Buy {product.DiscountMinQty}+ and get {product.DiscountPercentage}% Off!</p>
                            )}
                            </>
                        )}
                        { token && (
                        <button className="add-to-list-button" onClick={() => handleAddList(product)}>Add To List</button>
                        )}
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>   
        
            </div>
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
        </>
    )
}