import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import Cryptogram from './pages/TextCryptogram';
import BrickBreaker from './pages/BrickBreaker';
import NotFound from './pages/NotFound';

import './index.css';

export default function App(){
  return (
    <div data-theme="roblox-bright" className="blocky min-h-screen">
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/cryptogram" element={<Cryptogram />} />
        <Route path="/breakout" element={<BrickBreaker />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
