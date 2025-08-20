import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/store/auth.store';

// Removed inline Dashboard duplicate

function App() {
	const checkAuth = useAuthStore((s) => s.checkAuth);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/" element={<Navigate to="/dashboard" replace />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/pos"
					element={
						<ProtectedRoute>
							<POS />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/sales"
					element={
						<ProtectedRoute>
							<Sales />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/customers"
					element={
						<ProtectedRoute>
							<Customers />
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<Navigate to="/dashboard" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;