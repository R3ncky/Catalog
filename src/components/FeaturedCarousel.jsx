import React, {useState, useEffect, useRef, use} from "react";
import '../styles/FeaturedCarousel.css';
import { animate, AnimatePresence, motion } from "framer-motion";
import { parse } from "dotenv";

export default function FeaturedCarousel() {
    const [products, setProducts] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef();

    useEffect(() => {
        fetch('http://localhost:5000/api/featured-products')
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error('Error fetching featured products:', err));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isHovered) scroll('right');
        }, 5000); // Auto-scroll every 5 seconds
        return () => clearInterval(interval);
    }, [isHovered]);

    const scroll = (direction) => {
        const container = containerRef.current;
        if (!container) return;
        const firstItem = container.querySelector('.carousel-item');
        if (!firstItem) return;
        const itemWidth = firstItem.offsetWidth;
        const gap = parseInt(getComputedStyle(container).columnGap || getComputedStyle(container).gap || '0', 10);
        const step = itemWidth + gap;

        if(direction === 'right') {
            const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
            if(atEnd) {
                container.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: step, behavior: 'smooth' });
            }
        }
        else {
            container.scrollBy({ left: -step, behavior: 'smooth' });
        }
    };

    const containerVariants = {
        animate: {
            transition: {
                staggerChildren: 0.1,
            }
        }
    };

    const itemVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y:0, transition: {duration: 0.4} },
        exit: { opacity: 0, y:-10, transition: {duration: 0.2} }
    };
    
    return (
        <div className="carousel-wrapper">
            <h2>Featured Products</h2>
            <div className="carousel-container">
                <button className="arrow-button left" onClick={() => scroll('left')}>&lt;</button>
                <motion.div className="carousel-row" ref={containerRef} variants={containerVariants} initial="initial" animate="animate" 
                onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                    <AnimatePresence>
                    {products.map((product) => (
                        <motion.div key={product.ProductID} className="carousel-item" variants={itemVariants} initial="initial" animate="animate" exit="exit" whileHover={{ scale: 1.05 }}> 
                            <img src={`/assets/${product.ImagePath}`} alt={product.Name} />
                            <h4>{product.Name}</h4>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </motion.div>
                <button className="arrow-button right" onClick={() => scroll('right')}>&gt;</button>
            </div>
        </div>
    );
}
    