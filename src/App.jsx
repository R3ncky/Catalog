import { useState } from 'react'
import './App.css'
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './components/Index';
import ProductCatalog from './components/ProductCatalog';
import AboutUs from './components/AboutUs';
import TermsConditions from './components/TermsConditions';
import TwoFactorForm from './components/TwoFactorForm';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path='/aboutus' element={<AboutUs/>}/>
        <Route path='/terms&conditions' element={<TermsConditions />}/>
        <Route path="/catalog" element={<ProductCatalog/>} />
        <Route path="/login" element={<LoginForm />} />
        <Route path='/verify-2fa' element={<TwoFactorForm />} />
        <Route 
            path="/admin"
            element={
              <ProtectedRoute>
                  <AdminPanel />
              </ProtectedRoute>
            }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
