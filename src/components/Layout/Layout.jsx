import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CartSidebar from './CartSidebar';
import AIAssistant from '../AIAssistant/AIAssistant';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <CartSidebar />
      <main className="main-content">
        {children}
      </main>
      <AIAssistant />
      <Footer />
    </div>
  );
};

export default Layout;
