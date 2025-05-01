import { useState } from 'react'
import './App.css'
import LoginForm from './components/LoginForm';
import AdminPanel from './components/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
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
