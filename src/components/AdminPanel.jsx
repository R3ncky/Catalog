import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";

export default function AdminPanel(){
    const [products, setProducts] = useState([]);
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
            const res = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            if(res.ok) {
                const  newProduct = await res.json();
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
                //refresh products
                window.location.reload();
            } else{
                alert('Failed to add product');
            }
        } catch(err){
            console.error('Add product error: ',err);
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
                    </div>
                ))}
            </div>
        </div>
    )
}