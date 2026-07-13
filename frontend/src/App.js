import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';

import ShareLinkView from './pages/ShareLinkView';
import FileList from './pages/FileList';
import ShareManage from './pages/ShareManage';
import RecycleBin from './pages/RecycleBin';
import TeamCollaboration from './pages/TeamCollaboration';
import StorageStats from './pages/StorageStats';
import UserSearch from './pages/UserSearch';
import UserInfo from './pages/UserInfo';
import FriendManage from './pages/FriendManage';
import FriendChat from './pages/FriendChat';
import Moments from './pages/Moments';
import MainLayout from './components/MainLayout';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router basename={process.env.PUBLIC_URL}>
            <Routes>
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/share/:shareCode" element={<ShareLinkView />} />
                <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/files" />} />
                    <Route path="files" element={<FileList />} />
                    <Route path="share" element={<ShareManage />} />
                    <Route path="recycle" element={<RecycleBin />} />
                    <Route path="team" element={<TeamCollaboration />} />
                    <Route path="storage" element={<StorageStats />} />
                    <Route path="user-search" element={<UserSearch />} />
                    <Route path="user/info" element={<UserInfo />} />
                    <Route path="friend/manage" element={<FriendManage />} />
                    <Route path="friend/chat" element={<FriendChat />} />
                    <Route path="moments" element={<Moments />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
