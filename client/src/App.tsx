import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Pos from './pages/POS';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/store/auth.store';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import DeliveriesPage from './pages/Deliveries';
import CategoriesPage from './pages/Categories';
import DamagesPage from './pages/Damages';
import WarrantyPage from './pages/Warranty';

function App() {
	const checkAuth = useAuthStore((s) => s.checkAuth);
	const isChecking = useAuthStore((s) => s.isChecking);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

		return (
			<BrowserRouter>
				{isChecking ? (
					// Minimal splash while verifying auth on refresh
					<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F8F8' }}>Loading…</div>
				) : (
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/" element={<LoginPage />} />
					<Route
						path="/warranty"
						element={
							<ProtectedRoute requiredRoles={['admin','sales_rep']}>
								<WarrantyPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/damages"
						element={
							<ProtectedRoute requiredRoles={['admin', 'sales_rep']}>
								<DamagesPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/categories"
						element={
							<ProtectedRoute>
								<CategoriesPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/users"
						element={
							<ProtectedRoute requiredRoles={['admin']}>
								<UsersPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/settings"
						element={
							<ProtectedRoute requiredRoles={['admin']}>
								<SettingsPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/deliveries"
						element={
							<ProtectedRoute requiredRoles={['admin', 'sales_rep']}>
								<DeliveriesPage />
							</ProtectedRoute>
						}
					/>
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
							<ProtectedRoute requiredRoles={["admin","cashier","sales_rep"]}>
								<Pos />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/sales"
						element={
							<ProtectedRoute requiredRoles={["admin","cashier","sales_rep"]}>
								<Sales />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/customers"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Customers />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/inventory"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Inventory />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/suppliers"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Suppliers />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/purchase-orders"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<PurchaseOrders />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/reports"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Reports />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/products"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Products />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/analytics"
						element={
							<ProtectedRoute requiredRoles={["admin","sales_rep"]}>
								<Analytics />
							</ProtectedRoute>
						}
					/>
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
				)}
			</BrowserRouter>
		);
	}
	export default App;