import { useEffect, useState } from 'react';
import {Navigate} from 'react-router-dom';

export default function ProtectedRoute({children}) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

    if(isAuthenticated === null){
        return null;
    }

    if(!isAuthenticated){
        return <Navigate to="/" replace />;
    }

    return children;
}