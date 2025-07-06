import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import { useNavigate } from "react-router-dom";
import '../styles/AdminPanel.css';
import {motion, AnimatePresence} from 'framer-motion';

export default function AdminPanel(){
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 6;
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        imagePath: '',
        brand: '',
        stockqty: '',
        status: 'Available',
        isFeatured: false, 
        isArchived: false
    });

    const token = localStorage.getItem('token');

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

    useEffect(() => {
        setCurrentPage(1);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }, [searchTerm]);

    //getting the products on load
    useEffect(() => {
        fetch('http://localhost:5000/api/products', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => res.json()).then(data => setProducts(data)).catch(err => console.error('Fetch error: ', err));
    }, []);

    useEffect(() => {
        fetch('http://localhost:5000/api/categories')
        .then(res => res.json()).then(data => {setCategories(data);
            setCurrentPage(1);}).catch(err => console.error('Fetch categories error: ', err));
    }, []);

    const HandleDelete = async(id) => {
        try {
            await fetch(`http://localhost:5000/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setProducts(products.filter(p => p.ProductID !== id));
        } catch(err) {
            console.error('Delete error: ', err);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try{
            const res = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }, 
                body: JSON.stringify({username, email, password}),
            });

            if(res.ok){
                setUsername('');
                setEmail('');
                setPassword('');
                setIsRegistering(false);
                window.location.reload();
            } else{
                alert('Registration failed');
            }
        } catch(err){
            console.error('Registration error ', err);
        }
    }
    
    const handleChange = (e) =>{
        const fieldName = e.target.name;
        let fieldValue; 

        if(e.target.type === 'checkbox'){
            fieldValue = e.target.checked;
        } else{
            fieldValue = e.target.value;
        }

        const updatedForm = {...form};
        updatedForm[fieldName] = fieldValue;
        setForm(updatedForm);
    };

    const handleSubmit = async(e) =>{
        e.preventDefault();
        try{
            console.log('Token:', token);
            const res = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            if(res.ok) {
                const data = await res.json();
                const  newProductId = data.productId;
                console.log('Token:', token);
                await fetch('http://localhost:5000/api/product-category', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        categoryId: selectedCategory,
                        productId: newProductId
                    })
                });

                setForm({
                    name: '',
                    description: '',
                    price: '',
                    imagePath: '',
                    brand: '',
                    stockqty: '',
                    status: 'Available',
                    isFeatured: false,
                    isArchived: false
                });
                setSelectedCategory('');
                //refresh products
                window.location.reload();
            } else{
                alert('Failed to add product');
            }
        } catch(err){
            console.error('Add product error: ',err);
        }
    };

    const startEdit = (product) => {
        setEditForm({
            name: product.Name ?? '',
            description: product.Description ?? '',
            price: product.Price ?? '',
            imagePath: product.ImagePath ?? '',
            brand: product.Brand ?? '',
            stockqty: product.StockSqty ?? '',
            status: product.Status ?? 'Available',
            isFeatured: product.IsFeatured ?? false,
            isArchived: product.IsArchived ?? false,
            discountPercentage: product.DiscountPercentage ?? '',
            discountMinQty: product.DiscountMinQty ?? '',
            ProductID: product.ProductID
        });
        setIsEditing(true);
    };

    const handleEditChange = (e) => {
        const {name, value, type, checked } = e.target;
        setEditForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditSubmit = async () => {
        try{
            const res = await fetch(`http://localhost:5000/api/products/${editForm.ProductID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            if(res.ok){
            setIsEditing(false);
            setEditForm(null);
            window.location.reload();
            } else {
                alert('Failed to update product');
            }
        } catch(err){
            console.error('Edit product error: ', err);
        }
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

    return(
        <div>
            <header>
                <div className="navbar-index">               
                <div className='navbar-left-index'>
                <HomeButton />
                <button className="left-buttons-index" onClick={() => navigate('/')}>Home</button>
                <button className="left-buttons-index" onClick={() => navigate('/catalog')}>Catalog</button>
                <button className="current-index" onClick={() => navigate(0)}>Admin Panel</button>
                </div>
                </div>  
                </header>
        <div className="admin-body">
            <h2>Admin Panel</h2>
            <button onClick={() => setIsAdding(true)} className="add-button">Add New Product</button>
            <button onClick={() => setIsRegistering(true)} className='add-button'>Add new User</button>
            <input type="text" placeholder="Search by name.." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input-admin"/>
            <div>
                <AnimatePresence>
                {currentProducts.map(product =>(
                    <motion.div key={product.ProductID} className="product-horizontal-card"
                    initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} 
                    exit={{opacity: 0}} transition={{duration: 0.4}}>
                        <img src={`/assets/${product.ImagePath}`} alt={product.Name} className="product-horizontal-image" />
                        <div className="product-info">
                        <h3>{product.Name}</h3>
                        <p>{product.Description}</p>  
                        <p>${product.Price}</p>                  
                        <p>Status: {product.Status}</p>
                        </div>
                        <div className="product-actions">
                        <button onClick={() => HandleDelete(product.ProductID)}>Delete</button>
                        <button onClick={() => startEdit(product)}>Edit</button>
                        </div>
                    </motion.div>                  
                ))}
                </AnimatePresence>
            </div>
            {isEditing && editForm && (
                <div className="edit-modal">
                    <div className="edit-grid">
                        <h3>Edit Product</h3>
                        <input name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name" style={{marginBottom: '1rem'}}/><br />
                        <textarea name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" style={{marginBottom: '1rem'}}/><br />
                        <input name="price" type="number" value={editForm.price} onChange={handleEditChange} placeholder="Price" style={{marginBottom: '1rem'}}/><br />
                        <input name="imagePath" value={editForm.imagePath} onChange={handleEditChange} placeholder="Image Path" style={{marginBottom: '1rem'}}/><br />
                        <input name="brand" value={editForm.brand} onChange={handleEditChange} placeholder="Brand"  style={{marginBottom: '1rem'}}/><br />
                        <input name="stockqty" type="number" value={editForm.stockqty} onChange={handleEditChange} placeholder="Stock Qty" style={{marginBottom: '1rem'}}/><br />
                        <input name="status" value={editForm.status} onChange={handleEditChange} placeholder="Status" style={{marginBottom: '1rem'}}/><br />
                        <label><input type="checkbox" name="isFeatured" checked={editForm.isFeatured} onChange={handleEditChange} style={{marginBottom: '1rem'}}/>Featured</label><br />
                        <label><input type="checkbox" name="isArchived" checked={editForm.isArchived} onChange={handleEditChange} style={{marginBottom: '1rem'}}/>Archived</label><br />
                        <input type="number" name="discountPercentage" placeholder="Discount %" value={editForm.discountPercentage} onChange={handleEditChange} style={{marginBottom: '1rem'}}/><br />
                        <input type="number" name="discountMinQty" placeholder="Min Qty for Discount" value={editForm.discountMinQty} onChange={handleEditChange} style={{marginBottom: '1rem'}}/><br />
                        <button onClick={handleEditSubmit} style={{marginBottom: '1rem'}}>Post</button><br />
                        <button type="button" onClick={() => {setIsEditing(false); setEditForm(null);}} style={{marginBottom: '1rem'}}>Cancel</button>
                    </div>
                </div>
            )}
            {isAdding && (
                <div className="edit-modal">
                    <div className="edit-grid">
                         <h3>Add New Product</h3>
                         <form onSubmit={handleSubmit} style={{marginBottom: '2rem'}}>
                            <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={{marginBottom: '1rem'}}/><br />
                            <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required style={{marginBottom: '1rem'}}/><br />
                            <input name="price" placeholder="Price" type="number" value={form.price} onChange={handleChange} required style={{marginBottom: '1rem'}}/><br />
                            <input name="imagePath" placeholder="Image Path" value={form.imagePath} onChange={handleChange} style={{marginBottom: '1rem'}}/><br />
                            <input name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} style={{marginBottom: '1rem'}}/><br />
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required style={{marginBottom: '1rem'}}>
                            <option value="">Select a Category</option>
                                {categories.map(cat => (
                                <option key={cat.CategoryID} value={cat.CategoryID}>{cat.Name}</option>
                                ))}
                            </select><br />
                            <input name="stockqty" placeholder="Stock Qty" type="number" value={form.stockqty} onChange={handleChange} style={{marginBottom: '1rem'}}/><br />
                            <input name="status" placeholder="Status" value={form.status} onChange={handleChange} style={{marginBottom: '1rem'}}/><br />
                            <label><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} style={{marginBottom: '1rem'}}/>Featured</label><br />
                            <label><input type="checkbox" name="isArchived" checked={form.isArchived} onChange={handleChange} style={{marginBottom: '1rem'}}/>Archived</label><br />
                            <button type="submit" style={{marginBottom: '1rem'}}>Post</button><br/>
                            <button type="button" onClick={() => setIsAdding(false)} style={{marginBottom: '1rem'}}>Cancel</button>
                         </form>
                    </div>
                </div>
            )}
            {isRegistering && (
                <div className="edit-modal">
                    <div className="edit-grid">
                        <h3>Add New User</h3>
                        <form onSubmit={handleRegister} style={{marginBottom: '2rem'}}>
                            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required style={{marginBottom: '1rem'}}/><br />
                            <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{marginBottom: '1rem'}}/><br />
                            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{marginBottom: '1rem'}}/><br />
                            <button type="submit"  style={{marginBottom: '1rem'}}>Register</button><br />
                            <button type="button" onClick={() => setIsRegistering(false)} style={{marginBottom: '1rem'}}>Cancel</button><br />
                        </form>
                    </div>
                </div>
            )}
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
        </div>
    )
}