import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import '../styles/ProductCatalog.css';
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';


export default function ProductCatalog() {
    const [products, setProducts] = useState([]);
    const [token, setToken] = useState(null);
    const [username, setUsername] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [clients, setClients] = useState([]);
    const [sortBy, setSortBy] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [userModifiedCategories, setUserModifiedCategories] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedList, setSelectedList] = useState([]);
    const [showListModal, setShowListModal] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [removalQuantities, setRemovalQuantities] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);
    const location = useLocation();
    const productsPerPage = 12;
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const selectedCategoryId = queryParams.get('category');
    const toggleListModal = () => setShowListModal(s => !s);
    const closeListModal = () => setShowListModal(false);

    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        } catch (e) {
            return true;
        }
    }

    useEffect(() => {
        if (selectedCategoryId && !selectedCategories.includes(Number(selectedCategoryId))) {
            setSelectedCategories(prev => [...prev, Number(selectedCategoryId)]);
        }
    }, [selectedCategoryId]);

    useEffect(() => {
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchTerm]);
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            setToken(token);
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUsername(payload.username || '');
                setIsAdmin(!!payload.isAdmin);
            } catch (err) {
                console.warn('Invalid token:', err.message);
                setUsername('');
                setToken(null);
                setIsAdmin(false);
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                navigate('/login');
            }
        }

        fetch('http://localhost:5000/api/categories')
            .then(res => res.json()).then(data => setCategories(data))
            .catch(err => console.error('Error fetching categories:', err));
        window.scrollTo({ top: 0, behavior: 'smooth' });

        fetch('http://localhost:5000/api/client-companies', { headers })
            .then(res => res.json())
            .then(data => setClients(data))
            .catch(err => console.error('Error fetching clients: ', err));

        const params = new URLSearchParams();

        if (selectedCategories.length > 0) {
            params.append('categories', selectedCategories.join(','));
        }
        if (minPrice) {
            params.append('minPrice', minPrice);
        }
        if (maxPrice) {
            params.append('maxPrice', maxPrice);
        }
        if (!userModifiedCategories && selectedCategoryId && selectedCategories.length === 0) {
            params.append('category', selectedCategoryId);
        }

        const url = `http://localhost:5000/api/products?${params.toString()}`;

        fetch(url, { headers: headers })
            .then(async res => {
                if (!res.ok) {
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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token || isTokenExpired(token)) {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            return;
        }
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = payload.exp - now;

        if (timeLeft < 300) {
            fetch('api/refresh-token', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json()).then(data => {
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                    } else {
                        sessionStorage.setItem('token', data.token);
                    }
                }).catch(() => {
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                });
        }
    };

    useEffect(() => {
        ['keydown', 'click'].forEach(event => window.addEventListener(event, checkAndRefreshToken));
        return () => {
            ['keydown', 'click'].forEach(event => window.removeEventListener(event, checkAndRefreshToken));
        };
    }, []);

    const handleQuantityChange = (productId, value) => {
        const qty = parseInt(value);
        if (!isNaN(qty) && qty >= 0) {
            setQuantities(prev => ({ ...prev, [productId]: qty }));
        }
    };

    const handleAddList = (product) => {
        const quantityToAdd = quantities[product.ProductID] || 1;
        const availablestock = product.StockQty || 0;
        setSelectedList(prev => {
            const existing = prev.find(p => p.ProductID === product.ProductID);
            const existingQty = existing ? existing.quantity : 0;
            const totalAfterAdd = existingQty + quantityToAdd;

            if (totalAfterAdd > availablestock) {
                alert(`Cannot add more than available stock (${availablestock}) for ${product.Name}.`);
                return prev;
            }
            if (existing) {
                return prev.map(p =>
                    p.ProductID === product.ProductID ? { ...p, quantity: totalAfterAdd } : p);
            } else {
                return [...prev, { ...product, quantity: quantityToAdd }];
            }
        });
        setQuantities(prev => ({ ...prev, [product.ProductID]: 1 }));
    };
    const handleClearList = () => {
        setSelectedList([]);
    };

    const exportListAsTxt = () => {
        if (selectedList.length === 0) {
            return;
        }

        let content = 'Your Selected Products:\n\n';
        selectedList.forEach(product => {
            const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
            const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
            const total = (pricePerUnit * product.quantity).toFixed(2);
            content += `${product.Name}\n`;
            content += `Quantity: ${product.quantity}\n`;
            content += `Price per unit: $${pricePerUnit.toFixed(2)}\n`;
            if (hasDiscount) {
                content += `Discount: ${product.DiscountPercentage}% Off\n`;
            }
            content += `Total: $${total}\n\n`;
        });
        content += `Order Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
        content += `Client: ${clients.find(c => c.ClientCompanyID === parseInt(selectedClient))?.Name || 'Not selected'}\n\n`;
        content += `Total Price (no tax): $${getTotalPrice().toFixed(2)}\n`;
        content += `Total Price (with tax 20%): $${getTotalWithTax()}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'selected_products.txt';
        link.click();

        fetch('http://localhost:5000/api/send-export-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                clientCompanyId: parseInt(selectedClient),
                productList: selectedList,
                totalPrice: getTotalPrice(),
                totalWithTax: parseFloat(getTotalWithTax())
            })
        }).then(res => res.json()).then(data => {
            console.log('Email with TXT content sent: ', data);
        }).catch(err => {
            console.error('Error sending TXT email: ', err);
        });

        fetch('http://localhost:5000/api/update-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ products: selectedList.map(product => ({ ProductID: product.ProductID, quantity: product.quantity })) })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to update stock');
                }
                return res.json();

            }).then(data => {
                console.log('Stock updated successfully:', data);
                setTimeout(() => {
                    //window.location.reload();
                }, 500);
            }).catch(err => {
                console.error('Error updating stock:', err);
            });
    };

    const exportListAsExcel = async () => {
        if (selectedList.length === 0) {
            return;
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Selected Products');

        worksheet.columns = [
            { header: 'Product Name', key: 'name', width: 30 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Price per Unit', key: 'pricePerUnit', width: 15 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 }
        ];

        selectedList.forEach(product => {
            const hasDiscount = product.DiscountPercentage > 0 && product.quantity >= product.DiscountMinQty;
            const pricePerUnit = hasDiscount ? product.Price * (1 - product.DiscountPercentage / 100) : product.Price;
            const totalPrice = (pricePerUnit * product.quantity).toFixed(2);
            worksheet.addRow({
                name: product.Name,
                quantity: product.quantity,
                pricePerUnit: pricePerUnit.toFixed(2),
                totalPrice: totalPrice,
                discount: hasDiscount ? `${product.DiscountPercentage}% Off` : 'No Discount'
            });
        });
        worksheet.addRow({name: `The order was made at: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`});
        worksheet.addRow({ name: `Client: ${clients.find(c => c.ClientCompanyID === parseInt(selectedClient))?.Name || 'Not selected'}` });
        worksheet.addRow({});
        worksheet.addRow({ name: 'Total Price (no tax)', totalPrice: getTotalPrice().toFixed(2) });
        worksheet.addRow({ name: 'Total Price (with tax 20%)', totalPrice: getTotalWithTax() });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'selected_products.xlsx');

        fetch('http://localhost:5000/api/send-export-excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                clientCompanyId: parseInt(selectedClient),
                productList: selectedList,
                totalPrice: getTotalPrice(),
                totalWithTax: parseFloat(getTotalWithTax())
            })
        }).then(res => res.json()).then(data => {
            console.log('Email with Excel attachment sent: ', data);
        }).catch(err => {
            console.error('Failed to send Excel email');
        })

        fetch('http://localhost:5000/api/update-stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ products: selectedList.map(product => ({ ProductID: product.ProductID, quantity: product.quantity })) })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to update stock');
                }
                return res.json();

            }).then(data => {
                console.log('Stock updated successfully:', data);
                setTimeout(() => {
                    //window.location.reload();
                }, 500);
            }).catch(err => {
                console.error('Error updating stock:', err);
            });
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

    const handleLogOut = () => {
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
    const sortedProducts = (() => {
        if (sortBy === 'priceAsc') {
            return [...filteredProducts].sort((a, b) => a.Price - b.Price);
        } else if (sortBy === 'priceDesc') {
            return [...filteredProducts].sort((a, b) => b.Price - a.Price);
        }
        return filteredProducts;
    })();
    const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
    const indexOfLast = currentPage * productsPerPage;
    const indexOfFirst = indexOfLast - productsPerPage;
    const currentProducts = sortedProducts.slice(indexOfFirst, indexOfLast);

    const goToFirst = () => setCurrentPage(1);
    const goToPrev = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToLast = () => setCurrentPage(totalPages);

    let authSection;
    if (token) {
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
    if (token && isAdmin) {
        adminButton = (
            <button onClick={() => navigate('/admin')} className='left-buttons'>Admin Panel</button>
        );
    }
    return (
        <div className="page-container">
            <header>
                <div className="navbar">
                    <div className="navbar-left">
                        <HomeButton />
                        <button className="left-buttons" onClick={() => navigate('/')}>Home</button>
                        <button className="Current-Button" onClick={() => navigate(0)}>Catalog</button>
                        {adminButton}
                    </div>
                    {authSection}
                </div>
            </header>
            <main className="main-content">

                <h2 className="header2">Product Catalog</h2>
                <div className="product-page">

                    <div className="filters-card">
                        <div className="filters-header">
                            <h3>Filter</h3>
                            <button className="filters-reset" onClick={() => {
                                setSelectedCategories([]);
                                setMinPrice('');
                                setMaxPrice('');
                                setSelectedClient('');
                                setSortBy(null);
                            }}>
                                Clear
                            </button>
                        </div>

                        <fieldset className="filters-section">
                            <legend>By category</legend>
                            <ul className="filters-categories">
                                {categories.map((category) => {
                                    const checked = selectedCategories.includes(category.CategoryID);
                                    return (
                                        <li key={category.CategoryID}>
                                            <label className={`pill ${checked ? 'pill--checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    value={category.CategoryID}
                                                    checked={checked}
                                                    onChange={() => ToggleCategory(category.CategoryID)}
                                                />
                                                <span className="pill__text">{category.Name}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </fieldset>

                        {token && (
                            <fieldset className="filters-section">
                                <legend>Price</legend>
                                <div className="input-row">
                                    <div className="input-group">
                                        <label>Min</label>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="0.00"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                        />
                                    </div>
                                    <span className="range-sep">—</span>
                                    <div className="input-group">
                                        <label>Max</label>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="99.99"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="price-quick-actions">
                                    <button
                                        type="button"
                                        className={`price-chip ${sortBy === 'priceAsc' ? 'active' : ''}`}
                                        onClick={() => setSortBy('priceAsc')}>                                    
                                        Cheapest first
                                    </button>
                                    <button
                                        type="button"
                                        className={`price-chip ${sortBy === 'priceDesc' ? 'active' : ''}`}
                                        onClick={() => setSortBy('priceDesc')}>
                                        Most expensive first
                                    </button>
                                </div>

                            </fieldset>
                        )}

                        {token && (
                            <fieldset className="filters-section">
                                <legend>Client</legend>
                                <div className="select-wrap">
                                    <select
                                        id="clientSelect"
                                        value={selectedClient || ''}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                    >
                                        <option value="">All clients</option>
                                        {clients.map((client) => (
                                            <option key={client.ClientCompanyID} value={client.ClientCompanyID}>
                                                {client.Name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </fieldset>
                        )}
                    </div>

                    <div className="display-flex2">
                        <div className="search-bar">
                            <input type="text" placeholder="Search by name.." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                            {token && (
                                <button onClick={toggleListModal} className="show-list-button">{showListModal ? `Hide List (${selectedList.length})` : `Show List (${selectedList.length})`}</button>
                            )}
                            {showListModal && (
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
                                                        const totalPrice = (pricePerUnit * product.quantity).toFixed(2);
                                                        const removeQty = removalQuantities[product.ProductID] || 1;
                                                        return (
                                                            <li key={product.ProductID} className="minirow">
                                                                <div className="minirow-top">
                                                                    <div className="minirow-title">
                                                                    <span className="minirow-name">{product.Name}</span>
                                                                    {hasDiscount && (
                                                                        <span className="minirow-discount">{product.DiscountPercentage}% Off</span>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="minirow-prices">
                                                                    <span className="minirow-unit">Unit: ${pricePerUnit.toFixed(2)}</span>
                                                                    <span className="minirow-total">Total: ${totalPrice}</span>
                                                                </div>
                                                                </div>

                                                                <div className="minirow-bottom">
                                                                    <div className="minirow-qty">
                                                                        <span>In list:</span>
                                                                        <strong>{product.quantity}</strong>
                                                                    </div>
                                                                    <div className="minirow-actions">
                                                                        <label>
                                                                            Remove
                                                                            <input type="number" min={1} max={product.quantity} value={removeQty}
                                                                            onChange={(e) => setRemovalQuantities((prev) => ({
                                                                                ...prev,
                                                                                [product.ProductID]: parseInt(e.target.value) || 1,
                                                                            }))} className="minirow-input"/>
                                                                        </label>
                                                                        <button onClick={() => {
                                                                            const qtyToRemove = removalQuantities[product.ProductID] || 1;
                                                                            setSelectedList((prev) => prev.map((p) => 
                                                                               p.ProductID === product.ProductID ? {...p, quantity: p.quantity - qtyToRemove} : p)
                                                                            .filter((p) => p.quantity > 0));
                                                                            setRemovalQuantities((prev) => ({...prev, [product.ProductID]: 1 })); 
                                                                        }} className="minirow-remove">Remove</button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </>
                                        )}
                                        <p><strong>Total (no tax): ${getTotalPrice().toFixed(2)}</strong></p>
                                        <p><strong>Total (with tax 20%): ${getTotalWithTax()}</strong></p>
                                        <button onClick={handleClearList} className="pc-btn pc-btn--danger-outline">Clear List</button>
                                        <button onClick={exportListAsTxt} className="pc-btn pc-btn--primary-outline">Export as TXT</button>
                                        <button onClick={exportListAsExcel} className="pc-btn pc-btn--primary-outline">Export as Excel</button>
                                        <button onClick={closeListModal} className="pc-btn pc-btn--ghost">Close</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="product-grid">
                            <AnimatePresence>
                                {currentProducts.map(product => (
                                    <motion.div className="product-card" key={product.ProductID}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                                        <img src={`/assets/${product.ImagePath}`} alt={product.Name} className="product-image" />
                                        <h3>{product.Name}</h3>
                                        <p>{product.Description}</p>
                                        <p>Status: {product.StockQty < 1 ? 'Out of Stock' : 'In Stock'}</p>
                                        <p>In Stock: {product.StockQty}</p>
                                        {product.Price !== undefined && (
                                            <>
                                                <p><strong>Price: ${product.Price}</strong></p>
                                                <p><strong>With Tax (20%): ${(product.Price * 1.2).toFixed(2)}</strong></p>
                                                {product.DiscountPercentage > 0 && product.DiscountMinQty > 0 && product.DiscountEnd && new Date(product.DiscountStart) <= new Date() && (
                                                    <p><strong>Discount: </strong>Buy {product.DiscountMinQty}+ and get {product.DiscountPercentage}% Off! <br /> Valid until {new Date(product.DiscountEnd).toLocaleDateString()}</p>
                                                )}
                                            </>
                                        )}
                                        {token && (
                                            <div className="list-button-container">
                                                <input type="number" min="1" className="quantity-input" value={quantities[product.ProductID] || 1} onChange={e => handleQuantityChange(product.ProductID, e.target.value)} />
                                                <button className="add-to-list-button" onClick={() => handleAddList(product)}>Add to List</button>
                                            </div>
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
                    {[...Array(totalPages)].map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)}
                            className={currentPage === i + 1 ? 'active-page' : ''}>
                            {i + 1}
                        </button>
                    ))}
                    <button onClick={goToNext} disabled={currentPage === totalPages}>Next</button>
                    <button onClick={goToLast} disabled={currentPage === totalPages}>Last</button>
                </div>
            </main>
            <footer className='index-footer'>
                <div className='footer-content'>
                    <div className='footer-section'>
                        <h4>Company</h4>
                        <button className='button-footer' onClick={() => { navigate('/aboutus') }}>About us</button>
                    </div>
                    <div className='footer-section'>
                        <h4>Legal</h4>
                        <button className='button-footer' onClick={() => { navigate('/terms&conditions') }}>Terms & Conditions</button>
                    </div>
                    <div className='footer-section'>
                        <h4>Social</h4>
                        <button className='button-footer' onClick={() => window.open('https://swu.bg/bg/', '_blank')}>University</button>

                    </div>
                </div>
                <div className='footer-bottom'>
                    © {(new Date().getFullYear())} Plamen Petrov. All rights reserved.
                </div>
            </footer>
        </div>
    )
}