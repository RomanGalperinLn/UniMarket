import Layout from "./Layout.jsx";

import Home from "./Home";

import ListingNew from "./ListingNew";

import ListingDetail from "./ListingDetail";

import Profile from "./Profile";

import SellDashboard from "./SellDashboard";

import Admin from "./Admin";

import AuctionRoom from "./AuctionRoom";

import Checkout from "./Checkout";

import OrderDetail from "./OrderDetail";

import Verify from "./Verify";

import VerifyHandoff from "./VerifyHandoff";

import Handoff from "./Handoff";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    ListingNew: ListingNew,
    
    ListingDetail: ListingDetail,
    
    Profile: Profile,
    
    SellDashboard: SellDashboard,
    
    Admin: Admin,
    
    AuctionRoom: AuctionRoom,
    
    Checkout: Checkout,
    
    OrderDetail: OrderDetail,
    
    Verify: Verify,
    
    VerifyHandoff: VerifyHandoff,
    
    Handoff: Handoff,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/ListingNew" element={<ListingNew />} />
                
                <Route path="/ListingDetail" element={<ListingDetail />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/SellDashboard" element={<SellDashboard />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/AuctionRoom" element={<AuctionRoom />} />
                
                <Route path="/Checkout" element={<Checkout />} />
                
                <Route path="/OrderDetail" element={<OrderDetail />} />
                
                <Route path="/Verify" element={<Verify />} />
                
                <Route path="/VerifyHandoff" element={<VerifyHandoff />} />
                
                <Route path="/Handoff" element={<Handoff />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}