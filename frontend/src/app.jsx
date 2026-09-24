import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Registrasi from './Registrasi.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" />} />
      <Route path="/register" element={<Registrasi />} />
    </Routes>
  );
}