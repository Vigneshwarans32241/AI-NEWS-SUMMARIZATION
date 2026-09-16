import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Feed from './pages/Feed'
import ArticleDetail from './pages/ArticleDetail'
import AdminDashboard from './pages/AdminDashboard'
import ArchivePage from './pages/Archive'
import Progress from './pages/Progress'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import BookmarksPage from './pages/Bookmarks'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-bg-base text-text-main">Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}

function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <Router>
                        <Layout>
                            <Routes>
                                {/* Protected Routes */}
                                <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                                <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
                                <Route path="/article/:id" element={<ProtectedRoute><ArticleDetail /></ProtectedRoute>} />
                                <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                                <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />

                                {/* Public Routes */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
                            </Routes>
                        </Layout>
                    </Router>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    )
}

export default App
