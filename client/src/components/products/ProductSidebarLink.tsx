import { Link, useLocation } from 'react-router-dom';
import { Package } from 'lucide-react';

export default function ProductSidebarLink() {
  const location = useLocation();
  const active = location.pathname.startsWith('/products');
  return (
    <Link to="/products" className={`sidebar-link${active ? ' active' : ''}`}> 
  <Package className="mr-2" />
      Products
    </Link>
  );
}
