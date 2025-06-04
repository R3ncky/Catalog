import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";
import '../styles/AdminPanel.css';
//import { application } from "express";

export default function AdminPanel(){
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
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
        .then(res => res.json()).then(data => setCategories(data)).catch(err => console.error('Fetch categories error: ', err));
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
                alert('the problem is here');
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

    return(
        <div style={{maxWidth: '800px', margin: 'auto'}}>
            <HomeButton />
            <h2>Admin Panel</h2>
            <form onSubmit={handleSubmit} style={{marginBottom: '2rem'}}>
                <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required /><br />
                <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required /><br />
                <input name="price" placeholder="Price" type="number" value={form.price} onChange={handleChange} required/><br />
                <input name="imagePath" placeholder="Image Path" value={form.imagePath} onChange={handleChange} /><br />
                <input name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} /><br />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required>
                    <option value="">Select a Category</option>
                    {categories.map(cat => (
                        <option key={cat.CategoryID} value={cat.CategoryID}>{cat.Name}</option>
                    ))}
                </select><br />
                <input name="stockqty" placeholder="Stock Qty" type="number" value={form.stockqty} onChange={handleChange} /><br />
                <input name="status" placeholder="Status" value={form.status} onChange={handleChange} /><br />
                <label><input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />Featured</label><br />
                <label><input type="checkbox" name="isArchived" checked={form.isArchived} onChange={handleChange} />Archived</label><br />
                <button type="submit">Add product</button>
            </form>

            <div>
                {products.map(product =>(
                    <div key={product.ProductID} style={{border: '1px solid gray', padding: '1rem', marginBottom: '1rem'}}>
                        <img src={`/assets/${product.ImagePath}`} alt={product.Name}
                        style={{width: '120px', height: '120px', objectFit: 'cover', marginRight: '1rem'}} />
                        <h3>{product.Name}</h3>
                        <p>{product.Description}</p>
                        <p><strong>${product.Price}</strong></p>
                        <p>Status: {product.Status}</p>
                        <button onClick={() => HandleDelete(product.ProductID)}>Delete</button>
                        <button onClick={() => startEdit(product)}>Edit</button>
                    </div>
                ))}
            </div>
            {isEditing && editForm && (
                <div className="edit-modal">
                    <div className="edit-grid">
                        <h3>Edit Product</h3>
                        <input name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name"/><br />
                        <textarea name="description" value={editForm.description} onChange={handleEditChange} placeholder="Description" /><br />
                        <input name="price" type="number" value={editForm.price} onChange={handleEditChange} placeholder="Price" /><br />
                        <input name="imagePath" value={editForm.imagePath} onChange={handleEditChange} placeholder="Image Path" /><br />
                        <input name="brand" value={editForm.brand} onChange={handleEditChange} placeholder="Brand"  /><br />
                        <input name="stockqty" type="number" value={editForm.stockqty} onChange={handleEditChange} placeholder="Stock Qty" /><br />
                        <input name="status" value={editForm.status} onChange={handleEditChange} placeholder="Status" /><br />
                        <label><input type="checkbox" name="isFeatured" checked={editForm.isFeatured} onChange={handleEditChange}/>Featured</label><br />
                        <label><input type="checkbox" name="isArchived" checked={editForm.isArchived} onChange={handleEditChange}/>Archived</label><br />
                        <button onClick={handleEditSubmit}>Post</button>
                        <button onClick={() => {setIsEditing(false); setEditForm(null);}}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    )
}