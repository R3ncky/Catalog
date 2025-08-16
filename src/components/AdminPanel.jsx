import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import { useNavigate } from "react-router-dom";
import '../styles/AdminPanel.css';
import { motion, AnimatePresence } from 'framer-motion';
import { parse } from "dotenv";

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
    isFeatured: false,
    isArchived: false
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (e) {
      return true;
    }
  }

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
            if (localStorage.getItem('token')) {
              localStorage.setItem('token', data.token);
            } else {
              sessionStorage.setItem('token', data.token);
            }
          }
        }).catch(() => {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        });
    }
  };

  useEffect(() => {
    if (!showOrders) return;
    fetch('http://localhost:5000/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.error('Fetch orders error: ', err));
  }, [showOrders]);


  useEffect(() => {
    ['keydown', 'click'].forEach(event => window.addEventListener(event, checkAndRefreshToken));
    return () => {
      ['keydown', 'click'].forEach(event => window.removeEventListener(event, checkAndRefreshToken));
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  //getting the users
  useEffect(() => {
    fetch('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json()).then(data => setUsers(data)).catch(err => console.error('Fetch users error: ', err));
  }, []);

  //getting the categories 
  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json()).then(data => {
        setCategories(data);
        setCurrentPage(1);
      }).catch(err => console.error('Fetch categories error: ', err));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showProducts, showUsers, showOrders]);

  const HandleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this product?');
    if (!confirmDelete) return;
    try {
      await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setProducts(products.filter(p => p.ProductID !== id));
    } catch (err) {
      console.error('Delete error: ', err);
    }
  };

  const handleExport = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/export/user/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to export sales data');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_data_user_${userId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error: ', err);
      alert('Failed to export sales data');
    }
  }
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (res.ok) {
        setUsername('');
        setEmail('');
        setPassword('');
        setIsRegistering(false);
        window.location.reload();
      } else {
        alert('Registration failed');
      }
    } catch (err) {
      console.error('Registration error ', err);
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      await fetch(`http://localhost:5000/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOrders(prev => prev.map(o => o.OrderID === orderId ? { ...o, Status: 'Cancelled', CancelledAt: new Date().toISOString() } : o));
    } catch (err) {
      console.error('Cancel order error: ', err);
    }
  };

  const deleteOrder = async (orderId) => {
    const ok = window.confirm('Are you sure you want to delete this order?');
    if (!ok) return;
    try {
      await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(prev => prev.filter(o => o.OrderID !== orderId));
    } catch (err) {
      console.error('Delete order error: ', err);
    }
  };

  const handleChange = (e) => {
    const fieldName = e.target.name;
    let fieldValue;

    if (e.target.type === 'checkbox') {
      fieldValue = e.target.checked;
    } else {
      fieldValue = e.target.value;
    }

    const updatedForm = { ...form };
    updatedForm[fieldName] = fieldValue;
    setForm(updatedForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Token:', token);
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const data = await res.json();
        const newProductId = data.productId;
        console.log('Token:', token);
        for (const categoryId of selectedCategories) {
          await fetch('http://localhost:5000/api/product-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              categoryId,
              productId: newProductId
            })
          });
        }

        setForm({
          name: '',
          description: '',
          price: '',
          imagePath: '',
          brand: '',
          stockqty: '',
          isFeatured: false,
          isArchived: false
        });
        setSelectedCategories([]);
        //refresh products
        window.location.reload();
      } else {
        alert('Failed to add product');
      }
    } catch (err) {
      console.error('Add product error: ', err);
    }
  };

  const startEdit = (product) => {
    setEditForm({
      name: product.Name ?? '',
      description: product.Description ?? '',
      price: product.Price ?? '',
      imagePath: product.ImagePath ?? '',
      brand: product.Brand ?? '',
      stockqty: product.StockQty ?? '',
      isFeatured: product.IsFeatured ?? false,
      isArchived: product.IsArchived ?? false,
      discountPercentage: product.DiscountPercentage ?? '',
      discountMinQty: product.DiscountMinQty ?? '',
      discountStart: product.DiscountStart ?? '',
      discountEnd: product.DiscountEnd ?? '',
      ProductID: product.ProductID
    });
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditSubmit = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/products/${editForm.ProductID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setIsEditing(false);
        setEditForm(null);
        window.location.reload();
      } else {
        alert('Failed to update product');
      }
    } catch (err) {
      console.error('Edit product error: ', err);
    }
  };

  const startEditUser = (user) => {
    setEditingUser({
      UserID: user.UserID,
      Username: user.Username ?? '',
      Email: user.Email ?? '',
      IsAdmin: user.IsAdmin ?? false,
      Password: ''
    });
    setIsEditingUser(true);
  };

  const handleUserEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUserUpdate = async () => {

    const userToSend = {
      username: editingUser.Username,
      email: editingUser.Email,
      isAdmin: editingUser.IsAdmin
    };

    if (editingUser.Password && editingUser.Password.trim() !== '') {
      userToSend.password = editingUser.Password;
    }
    try {
      console.log('user update: ', userToSend);
      const res = await fetch(`http://localhost:5000/api/users/${editingUser.UserID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(userToSend)
      });
      if (res.ok) {
        setIsEditingUser(false);
        setEditingUser(null);
        window.location.reload();
      } else {
        const errData = await res.json();
        alert('Failed to update user');
      }
    } catch (err) {
      console.error('Update user error: ', err);
    }
  };

  const handleUserDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this user?');
    if (!confirmDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(users.filter(user => user.UserID !== id));
    } catch (err) {
      console.error('Delete user error: ', err);
    }
  };
  const filteredOrders = orders.filter(o => {
    const q = searchTerm.toLowerCase();
    return String(o.OrderID).includes(searchTerm) || (o.ClientName ?? '').toLowerCase().includes(q) ||
      (o.Username ?? '').toLowerCase().includes(q) || (o.Status ?? '').toLowerCase().includes(q)
  });



  const filteredProducts = products.filter(product => product.Name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = users.filter(user => user.Username.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeItems = showProducts ? filteredProducts : showUsers ? filteredUsers : filteredOrders;
  const totalPages = Math.ceil(activeItems.length / productsPerPage);
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentItems = activeItems.slice(indexOfFirst, indexOfLast);

  const goToFirst = () => setCurrentPage(1);
  const goToPrev = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNext = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLast = () => setCurrentPage(totalPages);

  return (
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
        <button onClick={() => { setShowProducts(true); setShowUsers(false); setShowOrders(false); }} className='add-button'>Products</button>
        <button onClick={() => { setShowUsers(true); setShowProducts(false); setShowOrders(false); }} className='add-button'>Users</button>
        <button onClick={() => { setShowOrders(true); setShowProducts(false); setShowUsers(false); }} className='add-button'>Orders</button>
        <input type="text" placeholder="Search by name.." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input-admin" />
        <div>
          {showProducts && (
            <AnimatePresence>
              {currentItems.map(product => (
                <motion.div key={product.ProductID} className="product-horizontal-card"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  <img src={`/assets/${product.ImagePath}`} alt={product.Name} className="product-horizontal-image" />
                  <div className="product-info">
                    <h3>{product.Name}</h3>
                    <p>{product.Description}</p>
                    <p>${product.Price}</p>
                    <p>Status: {product.StockQty < 1 ? 'Out of Stock' : 'Available'}</p>
                    <p><strong>Price: ${product.Price}</strong></p>
                    <p><strong>With Tax (20%): ${(product.Price * 1.2).toFixed(2)}</strong></p>
                    {product.DiscountPercentage > 0 && product.DiscountMinQty > 0 && product.DiscountEnd && new Date(product.DiscountStart) <= new Date() && (
                      <p><strong>Discount: </strong>Qty: {product.DiscountMinQty}+ for {product.DiscountPercentage}%<br /> Valid until {new Date(product.DiscountEnd).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="product-actions">
                    <button onClick={() => startEdit(product)}>Edit</button>
                    <button onClick={() => HandleDelete(product.ProductID)}>Delete</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {showUsers && (
            <AnimatePresence>
              {currentItems.map(user => (
                <motion.div key={user.UserID} className="product-horizontal-card"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                  <div className="product-info">
                    <h3>{user.Username}</h3>
                    <p>Email: {user.Email}</p>
                    <p>Admin: {user.IsAdmin ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="product-actions">
                    <button onClick={() => startEditUser(user)}>Edit</button>
                    <button onClick={() => handleExport(user.UserID)}>Export Sales</button>
                    <button onClick={() => handleUserDelete(user.UserID)}>Delete</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {showOrders && (
            <AnimatePresence>
              {currentItems.map(o => (
                <motion.div
                  key={o.OrderID}
                  className="product-horizontal-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="product-info">
                    <h3>Order #{o.OrderID}</h3>
                    <p><strong>Client:</strong> {o.ClientName}</p>
                    <p><strong>Sales rep:</strong> {o.Username}</p>
                    <p><strong>Status:</strong> {o.Status}</p>
                    <p><strong>Total (with tax):</strong> ${Number(o.TotalWithTax).toFixed(2)}</p>
                    <p><strong>Created:</strong> {new Date(o.CreatedAt).toLocaleString()}</p>
                    {o.SubmittedAt && <p><strong>Submitted:</strong> {new Date(o.SubmittedAt).toLocaleString()}</p>}
                    {o.CancelledAt && <p><strong>Cancelled:</strong> {new Date(o.CancelledAt).toLocaleString()}</p>}
                  </div>

                  <div className="product-actions">
                    {o.Status !== 'Cancelled' && (
                      <button onClick={() => cancelOrder(o.OrderID)}>Cancel</button>
                    )}
                    <button onClick={() => deleteOrder(o.OrderID)}>Delete</button>
                  </div>
                </motion.div>
              ))}
              {currentItems.length === 0 && (
                <motion.div
                  className="product-horizontal-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="product-info">
                    <p>No orders found.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </div>
        {isEditing && editForm && (
          <div className="modal-overlay">
            <div className="modal-card">
              {/* Header */}
              <div className="modal-header">
                <h3>Edit Product</h3>
                <button
                  className="icon-btn"
                  onClick={() => { setIsEditing(false); setEditForm(null); }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="modal-body">
                {/* Name / Brand */}
                <div className="grid-2">
                  <div className="form-field">
                    <span>Name</span>
                    <input
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      placeholder="Name"
                    />
                  </div>

                  <div className="form-field">
                    <span>Brand</span>
                    <select
                      name="brand"
                      value={editForm.brand}
                      onChange={handleEditChange}
                    >
                      <option value="">-- Select Brand --</option>
                      <option value="Aurora Essentials">Aurora Essentials</option>
                      <option value="Velora Naturals">Velora Naturals</option>
                      <option value="Nimbus Care">Nimbus Care</option>
                      <option value="Zenith Glow">Zenith Glow</option>
                      <option value="Moonpetal Organics">Moonpetal Organics</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="form-field">
                  <span>Description</span>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    placeholder="Description"
                  />
                </div>

                {/* Price / Stock */}
                <div className="grid-2">
                  <div className="form-field">
                    <span>Price</span>
                    <input
                      className="admin-price-input"
                      name="price"
                      type="number"
                      value={editForm.price}
                      onChange={handleEditChange}
                      placeholder="Price"
                    />
                  </div>
                  <div className="form-field">
                    <span>Stock Qty</span>
                    <input
                      className="admin-price-input"
                      name="stockqty"
                      type="number"
                      value={editForm.stockqty}
                      onChange={handleEditChange}
                      placeholder="Stock Qty"
                    />
                  </div>
                </div>

                {/* Image */}
                <div className="form-field">
                  <span>Image Path</span>
                  <input
                    name="imagePath"
                    value={editForm.imagePath}
                    onChange={handleEditChange}
                    placeholder="Image Path"
                  />
                </div>

                {/* Toggles */}
                <div className="toggle-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={editForm.isFeatured}
                      onChange={handleEditChange}
                    />
                    Featured
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      name="isArchived"
                      checked={editForm.isArchived}
                      onChange={handleEditChange}
                    />
                    Archived
                  </label>
                </div>

                {/* Discount */}
                <div className="grid-2">
                  <div className="form-field">
                    <span>Discount %</span>
                    <input
                      className="admin-price-input"
                      type="number"
                      name="discountPercentage"
                      placeholder="Discount %"
                      value={editForm.discountPercentage}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <span>Min Qty for Discount</span>
                    <input
                      className="admin-price-input"
                      type="number"
                      name="discountMinQty"
                      placeholder="Min Qty for Discount"
                      value={editForm.discountMinQty}
                      onChange={handleEditChange}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid-2">
                  <div className="form-field">
                    <span>Discount Start</span>
                    <input
                      type="datetime-local"
                      name="discountStart"
                      value={editForm.discountStart}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-field">
                    <span>Discount End</span>
                    <input
                      type="datetime-local"
                      name="discountEnd"
                      value={editForm.discountEnd}
                      onChange={handleEditChange}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setIsEditing(false); setEditForm(null); }}
                >
                  Cancel
                </button>
                <button className="btn primary" onClick={handleEditSubmit}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}


        {isAdding && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsAdding(false)}>
            <motion.div className="modal-card"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Product</h3>
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setIsAdding(false)}>×</button>
              </div>
              <form id="add-product-form" onSubmit={handleSubmit} className="modal-body">
                <div className="grid-2">
                  <label className="form-field">
                    <span>Name</span>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </label>
                  <label className="form-field">
                    <span>Brand</span>
                    <select name="brand" value={form.brand} onChange={handleChange}
                      style={{ marginBottom: '1rem', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dfe3e8', background: 'white' }} required>
                      <option value="">-- Select Brand --</option>
                      <option value="Aurora Essentials">Aurora Essentials</option>
                      <option value="Velora Naturals">Velora Naturals</option>
                      <option value="Nimbus Care">Nimbus Care</option>
                      <option value="Zenith Glow">Zenith Glow</option>
                      <option value="Moonpetal Organics">Moonpetal Organics</option>
                    </select>
                  </label>
                </div>
                <label className="form-field">
                  <span>Description</span>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} required />
                </label>
                <div className="grid-2">
                  <label className="form-field">
                    <span>Price</span>
                    <input className="number" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
                  </label>
                  <label className="form-field">
                    <span>Stock Qty</span>
                    <input className="number" name="stockqty" type="number" value={form.stockqty} onChange={handleChange} />
                  </label>
                </div>
                <label className="form-field">
                  <span>Image Path</span>
                  <input name="imagePath" value={form.imagePath} onChange={handleChange} />
                </label>
                <fieldset className="fieldset">
                  <legend>Select Categories</legend>
                  <div className="checkbox-grid">
                    {categories.map((cat) => (
                      <label key={cat.CategoryID} className="check">
                        <input type="checkbox" value={cat.CategoryID} checked={selectedCategories.includes(cat.CategoryID)}
                          onChange={(e) => {
                            const id = parseInt(e.target.value, 10);
                            setSelectedCategories((prev) =>
                              e.target.checked ? [...prev, id] : prev.filter((c) => c !== id)
                            );
                          }} />
                        <span>{cat.Name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="toggle-row">
                  <label className="check">
                    <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
                    <span>Featured</span>
                  </label>
                  <label className="check">
                    <input type="checkbox" name="isArchived" checked={form.isArchived} onChange={handleChange} />
                    <span>Archived</span>
                  </label>
                </div>
              </form>
              <div className="modal-footer">
                <button type="button" className="btn ghost" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" form="add-product-form" className="btn primary">Post</button>
              </div>
            </motion.div>
          </div>
        )}

        {isRegistering && (
          <div className="modal-overlay">{/* was edit-modal */}
            <div className="modal-card">{/* was edit-grid */}
              <div className="modal-header">
                <h3>Add New User</h3>
                <button className="icon-btn" onClick={() => setIsRegistering(false)}>×</button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleRegister}>
                  <div className="form-field">
                    <span>Username</span>
                    <input type="text" placeholder="Username" value={username}
                      onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <span>Email</span>
                    <input type="text" placeholder="Email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="form-field">
                    <span>Password</span>
                    <input type="password" placeholder="Password" value={password}
                      onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn ghost" onClick={() => setIsRegistering(false)}>Cancel</button>
                    <button type="submit" className="btn primary">Register</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


        {isEditingUser && editingUser && (
          <div className="modal-overlay">
            <div className="modal-card">
              {/* Header */}
              <div className="modal-header">
                <h3>Edit User</h3>
                <button
                  className="icon-btn"
                  onClick={() => { setIsEditingUser(false); setEditingUser(null); }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="modal-body">
                <div className="form-field">
                  <span>Username</span>
                  <input
                    type="text"
                    name="Username"
                    value={editingUser.Username}
                    onChange={handleUserEditChange}
                    placeholder="Username"
                  />
                </div>

                <div className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="Email"
                    value={editingUser.Email}
                    onChange={handleUserEditChange}
                    placeholder="Email"
                  />
                </div>

                <div className="form-field">
                  <span>New password (optional)</span>
                  <input
                    type="password"
                    name="Password"
                    value={editingUser.Password}
                    onChange={handleUserEditChange}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div className="toggle-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="IsAdmin"
                      checked={editingUser.IsAdmin}
                      onChange={handleUserEditChange}
                    />
                    Admin
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => { setIsEditingUser(false); setEditingUser(null); }}
                >
                  Cancel
                </button>
                <button className="btn primary" onClick={handleUserUpdate}>
                  Update
                </button>
              </div>
            </div>
          </div>
        )}


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
      </div>
    </div>
  )
}