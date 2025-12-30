import Layout from "./Layout.jsx";

import Home from "./Home";

import CreateDare from "./CreateDare";

import MyDares from "./MyDares";

import Leaderboard from "./Leaderboard";

import DareChat from "./DareChat";

import Chat from "./Chat";

import Streamers from "./Streamers";

import Terms from "./Terms";

import Privacy from "./Privacy";

import About from "./About";

import NotFound from "./NotFound";

import FAQ from "./FAQ";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    CreateDare: CreateDare,
    
    MyDares: MyDares,
    
    Leaderboard: Leaderboard,
    
    DareChat: DareChat,
    
    Chat: Chat,
    
    Streamers: Streamers,
    
    Terms: Terms,
    
    Privacy: Privacy,
    
    About: About,
    
    NotFound: NotFound,
    
    FAQ: FAQ,
    
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
                
                <Route path="/CreateDare" element={<CreateDare />} />
                
                <Route path="/MyDares" element={<MyDares />} />
                
                <Route path="/Leaderboard" element={<Leaderboard />} />
                
                <Route path="/DareChat" element={<DareChat />} />
                
                <Route path="/Chat" element={<Chat />} />
                
                <Route path="/Streamers" element={<Streamers />} />
                
                <Route path="/Terms" element={<Terms />} />
                
                <Route path="/Privacy" element={<Privacy />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/NotFound" element={<NotFound />} />
                
                <Route path="/FAQ" element={<FAQ />} />
                
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