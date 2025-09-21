// Main app router. On start, we ask the auth store to check if the user is logged in.
import { useEffect } from 'react'; // React hook to run code on mount
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Router components
// Import all pages we can navigate to
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Pos from './pages/POS';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'; // Wrapper that blocks unauthenticated users
import { useAuthStore } from '@/store/auth.store'; // Our auth state/actions
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import DeliveriesPage from './pages/Deliveries';
import CategoriesPage from './pages/Categories';
import DamagesPage from './pages/Damages';
import WarrantyPage from './pages/Warranty';
import ReturnsPage from './pages/ReturnsPageNew';
import GlobalToasts from '@/components/ui/toasts/GlobalToasts';

function App() {
	// Pull actions/state from auth store
	const checkAuth = useAuthStore((s) => s.checkAuth);   // function that validates tokens and loads user
	const isChecking = useAuthStore((s) => s.isChecking); // true while checkAuth is running

	// On first render, run a one-time auth check
	useEffect(() => {
		checkAuth(); // verify token and load current user on first render / refresh
	}, [checkAuth]);

		return (
			<BrowserRouter>
				<GlobalToasts />
				{isChecking ? (
					// Show a minimal splash screen while verifying auth
					<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F8F8F8', background: '#000' }}>Loading…</div>
				) : (
				// Once auth check is done, render routes
				<Routes>
					{/* Public routes */}
					<Route path="/login" element={<LoginPage />} />
					<Route path="/" element={<LoginPage />} /> {/* Default to login */}
					{/* Protected routes. Only render if logged in. Some require specific roles. */}
					<Route
						path="/warranty"
						element={
							<ProtectedRoute requiredRoles={['admin','cashier','sales_rep']}>
								<WarrantyPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/damages"
						element={
							<ProtectedRoute requiredRoles={['admin']}>
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
							<ProtectedRoute requiredRoles={['admin']}>
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
							<ProtectedRoute requiredRoles={["admin","sales_rep","cashier"]}>
								<Customers />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/inventory"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<Inventory />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/suppliers"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<Suppliers />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/purchase-orders"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<PurchaseOrders />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/reports"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<Reports />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/products"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<Products />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/analytics"
						element={
							<ProtectedRoute requiredRoles={["admin"]}>
								<Analytics />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/returns"
						element={
							<ProtectedRoute requiredRoles={["admin","manager","cashier","sales_rep"]}>
								<ReturnsPage />
							</ProtectedRoute>
						}
					/>
					{/* Catch-all: if unknown path, go to dashboard (will redirect to login if not authed) */}
					<Route path="*" element={<Navigate to="/dashboard" replace />} />
				</Routes>
				)}
			</BrowserRouter>
		);
	}
	export default App; // Export component so index.tsx can render it