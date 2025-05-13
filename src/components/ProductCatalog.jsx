import { useState, useEffect } from "react";
import HomeButton from "./HomeButton";

export default function ProductCatalog() {
    const [products, setProducts] = useState([]);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetch('http://localhost:5000/api/products').then(res => res.json()).then(data => setProducts(data))
            .then(err => console.error('Error fetching the products: ', err));
    }, []);

    return (
        <div style={{maxWidth: '800px', margin: 'auto'}}>
            <HomeButton />
            <h2>Product Catalog</h2>
            <div>
                {products.map(product => (
                    <div>
                        <h3>{product.Name}</h3>
                        <p>{product.Description}</p>
                        <p>Status: {product.Status}</p>
                        {token && <p><strong>Price: ${product.Price}</strong></p>}
                    </div>
                ))}
            </div>
        </div>
    )
}