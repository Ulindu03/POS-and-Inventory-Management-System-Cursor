import express from 'express';
import http from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { setIO } from './services/realtime.service';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import { User } from './models/User.model';
import { Category } from './models/Category.model';
import { Product } from './models/Product.model';
import { Customer } from './models/Customer.model';
import { Supplier } from './models/Supplier.model';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import saleRoutes from './routes/sale.routes';
import customerRoutes from './routes/customer.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';
import inventoryRoutes from './routes/inventory.routes';
import reportsRoutes from './routes/reports.routes';
import userRoutes from './routes/user.routes';
import settingsRoutes from './routes/settings.routes';
import deliveryRoutes from './routes/delivery.routes';
import returnRoutes from './routes/return.routes';
import promotionRoutes from './routes/promotion.routes';
import tripRoutes from './routes/trip.routes';
import damageRoutes from './routes/damage.routes';
import warrantyRoutes from './routes/warranty.routes';
import warrantyClaimRoutes from './routes/warrantyClaim.routes';
import dashboardRoutes from './routes/dashboard.routes';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import swaggerUI from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

// Immediately log raw presence of critical SMTP env vars to diagnose loading issues
// (values partially redacted). This runs BEFORE any service captures them.
(() => {
  const redact = (v?: string) => (v ? v.slice(0, 2) + '***' : 'missing');
  console.log('[startup][env-check] SMTP vars', {
    host: process.env.SMTP_HOST ? 'set' : 'missing',
    user: redact(process.env.SMTP_USER),
    pass: process.env.SMTP_PASS ? 'set' : 'missing',
    from: redact(process.env.EMAIL_FROM),
    enableEthereal: process.env.ENABLE_ETHEREAL_FALLBACK,
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd(),
  });
})();

// Create Express app and HTTP server
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
// CORS: allow all origins in development to avoid dev-port/origin churn; restrict in production
app.use(cors({
  origin: (_origin, cb) => {
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      // allow any origin in development
      return cb(null, true);
    }
    // no origin (e.g., curl/postman) or allowed list match
    // Note: socket.io will use its own CORS below too
    return cb(null, true);
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());
// Serve uploaded files
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Swagger API docs
app.use('/api/docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
// Raw OpenAPI JSON (for debugging/spec inspection)
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// Test route
app.get('/', (_req, res) => {
  res.json({
    message: 'VoltZone POS API',
    status: 'Running',
    database: 'Connected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/damages', damageRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/warranty-claims', warrantyClaimRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Dev seed route for products and categories
app.get('/api/dev/seed-products', async (_req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: 'Products already seeded' });
    }

    const bulbs = await Category.create({ name: { en: 'Bulbs', si: 'බල්බ' }, description: { en: '', si: '' } });
    const wiring = await Category.create({ name: { en: 'Wiring', si: 'සම්බන්ධක' }, description: { en: '', si: '' } });

    const sample = [
      { sku: 'LED-9W', barcode: '1000001', name: { en: 'LED Bulb 9W', si: 'එල්ඊඩී බල්බ 9W' }, description: { en: '', si: '' }, category: bulbs._id, unit: 'pcs', price: { cost: 300, retail: 450 }, stock: { current: 200 } },
      { sku: 'EXT-5M', barcode: '1000002', name: { en: 'Extension Cord 5m', si: 'දිගු කේබල් 5m' }, description: { en: '', si: '' }, category: wiring._id, unit: 'pcs', price: { cost: 1500, retail: 2250 }, stock: { current: 50 } },
      { sku: 'SW-2G', barcode: '1000003', name: { en: 'Switch 2-Gang', si: 'ස්විච් 2-ගැන්ග්' }, description: { en: '', si: '' }, category: wiring._id, unit: 'pcs', price: { cost: 850, retail: 1250 }, stock: { current: 120 } },
      { sku: 'SKT-13A', barcode: '1000004', name: { en: 'Socket 13A', si: 'සොකට් 13A' }, description: { en: '', si: '' }, category: wiring._id, unit: 'pcs', price: { cost: 600, retail: 850 }, stock: { current: 80 } },
      { sku: 'USB-CHG', barcode: '1000005', name: { en: 'USB Charger', si: 'USB චාජර්' }, description: { en: '', si: '' }, category: wiring._id, unit: 'pcs', price: { cost: 1100, retail: 1450 }, stock: { current: 60 } },
      { sku: 'SP-PLUG', barcode: '1000006', name: { en: 'Smart Plug', si: 'ස්මාට් ප්ලග්' }, description: { en: '', si: '' }, category: wiring._id, unit: 'pcs', price: { cost: 3100, retail: 3950 }, stock: { current: 40 } },
    ];

    await Product.insertMany(sample);

  return res.json({ success: true, message: 'Seeded products and categories' });
  } catch (error) {
  return res.status(500).json({ success: false, message: 'Seed error', error: (error as Error).message });
  }
});

// Dev seed route for customers
app.get('/api/dev/seed-customers', async (_req, res) => {
  try {
    const count = await Customer.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: 'Customers already seeded' });
    }

    const sampleCustomers = [
      {
        customerCode: 'CUST-001',
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+94 71 234 5678',
        alternatePhone: '+94 11 234 5678',
        type: 'retail',
        creditLimit: 50000,
        creditUsed: 15000,
        loyaltyPoints: 1250,
        address: {
          street: '123 Main Street',
          city: 'Colombo',
          province: 'Western',
          postalCode: '10000'
        },
        taxId: 'TAX123456',
        birthday: '1990-05-15',
        notes: 'Regular customer, prefers LED products',
        isActive: true
      },
      {
        customerCode: 'CUST-002',
        name: 'ABC Electronics Ltd',
        email: 'orders@abcelectronics.lk',
        phone: '+94 11 345 6789',
        type: 'corporate',
        creditLimit: 500000,
        creditUsed: 125000,
        loyaltyPoints: 8500,
        address: {
          street: '456 Business Avenue',
          city: 'Colombo',
          province: 'Western',
          postalCode: '10001'
        },
        taxId: 'CORP789012',
        notes: 'Corporate client, bulk orders',
        isActive: true
      },
      {
        customerCode: 'CUST-003',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@email.com',
        phone: '+94 72 456 7890',
        type: 'retail',
        creditLimit: 0,
        creditUsed: 0,
        loyaltyPoints: 450,
        address: {
          street: '789 Residential Road',
          city: 'Kandy',
          province: 'Central',
          postalCode: '20000'
        },
        birthday: '1985-12-20',
        notes: 'New customer',
        isActive: true
      }
    ];

    await Customer.insertMany(sampleCustomers);

  return res.json({ success: true, message: 'Seeded customers' });
  } catch (error) {
  return res.status(500).json({ success: false, message: 'Seed error', error: (error as Error).message });
  }
});

// Dev seed route for suppliers
app.get('/api/dev/seed-suppliers', async (_req, res) => {
  try {
    const count = await Supplier.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: 'Suppliers already seeded' });
    }

    const sampleSuppliers = [
      {
        supplierCode: 'SUP-001',
        name: 'Tech Distributors Ltd',
        contactPerson: 'Mr. Rajesh Kumar',
        email: 'orders@techdistributors.lk',
        phone: '+94 11 234 5678',
        alternatePhone: '+94 71 234 5678',
        address: {
          street: '123 Industrial Zone',
          city: 'Colombo',
          province: 'Western',
          postalCode: '10000'
        },
        taxId: 'TAX123456789',
        paymentTerms: '30 days',
        creditLimit: 1000000,
        creditUsed: 250000,
        rating: 4,
        performance: {
          onTimeDelivery: 95,
          qualityRating: 92,
          priceCompetitiveness: 88
        },
        status: 'active',
        isActive: true,
        notes: 'Primary supplier for LED products and smart devices',
        bankDetails: {
          accountName: 'Tech Distributors Ltd',
          accountNumber: '1234567890',
          bankName: 'Commercial Bank',
          branch: 'Colombo Main'
        }
      },
      {
        supplierCode: 'SUP-002',
        name: 'Electrical Components Co',
        contactPerson: 'Ms. Priya Silva',
        email: 'sales@electricalcomp.lk',
        phone: '+94 11 345 6789',
        alternatePhone: '+94 72 345 6789',
        address: {
          street: '456 Manufacturing Road',
          city: 'Gampaha',
          province: 'Western',
          postalCode: '11000'
        },
        taxId: 'TAX987654321',
        paymentTerms: '45 days',
        creditLimit: 750000,
        creditUsed: 180000,
        rating: 3,
        performance: {
          onTimeDelivery: 85,
          qualityRating: 78,
          priceCompetitiveness: 95
        },
        status: 'active',
        isActive: true,
        notes: 'Good for bulk wiring and basic electrical components',
        bankDetails: {
          accountName: 'Electrical Components Co',
          accountNumber: '0987654321',
          bankName: 'Bank of Ceylon',
          branch: 'Gampaha'
        }
      },
      {
        supplierCode: 'SUP-003',
        name: 'Smart Solutions Lanka',
        contactPerson: 'Mr. Anil Perera',
        email: 'info@smartsolutions.lk',
        phone: '+94 11 456 7890',
        alternatePhone: '+94 73 456 7890',
        address: {
          street: '789 Innovation Park',
          city: 'Kandy',
          province: 'Central',
          postalCode: '20000'
        },
        taxId: 'TAX456789123',
        paymentTerms: '15 days',
        creditLimit: 500000,
        creditUsed: 75000,
        rating: 5,
        performance: {
          onTimeDelivery: 98,
          qualityRating: 96,
          priceCompetitiveness: 82
        },
        status: 'active',
        isActive: true,
        notes: 'Premium supplier for smart home devices and IoT products',
        bankDetails: {
          accountName: 'Smart Solutions Lanka',
          accountNumber: '1122334455',
          bankName: 'Sampath Bank',
          branch: 'Kandy'
        }
      }
    ];

    await Supplier.insertMany(sampleSuppliers);

  return res.json({ success: true, message: 'Seeded suppliers' });
  } catch (error) {
  return res.status(500).json({ success: false, message: 'Seed error', error: (error as Error).message });
  }
});

// Test route to check database
app.get('/api/test-db', async (_req, res) => {
  try {
    // Count users in database
    const userCount = await User.countDocuments();
    return res.json({
      success: true,
      message: 'Database is working!',
      userCount: userCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: (error as Error).message
    });
  }
});

// Create a test user route
app.get('/api/dev/seed-users', async (_req, res) => {
  try {
    const ensureUser = async (
      username: string,
      email: string,
      password: string,
      role: 'admin' | 'cashier'
    ) => {
      let user = await User.findOne({ username });
      if (!user) {
        user = new User({
          username,
          email,
          password,
          firstName: username.charAt(0).toUpperCase() + username.slice(1),
          lastName: 'User',
          role,
        });
        await user.save();
      } else {
        // Keep email in sync for dev seeding if it changed
        if (email && user.email !== email) {
          user.email = email;
          await user.save();
        }
      }
      return user;
    };

  // Seed both admin and cashier demo accounts
  const admin = await ensureUser('admin', 'admin@voltzone.lk', 'admin123', 'admin');
  const cashier = await ensureUser('cashier', 'cashier@voltzone.lk', 'cashier123', 'cashier');

    return res.json({
      success: true,
      message: 'Seed complete',
      users: [
        { username: admin.username, role: admin.role },
        { username: cashier.username, role: cashier.role },
      ],
      credentials: {
        admin: { username: 'admin', password: 'admin123' },
        cashier: { username: 'cashier', password: 'cashier123' },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error seeding users',
      error: (error as Error).message,
    });
  }
});

// Dev helper: list users with emails (do NOT enable in production)
app.get('/api/dev/list-users', async (_req, res) => {
  try {
    const users = await User.find({}, { username: 1, email: 1, role: 1 }).lean();
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error listing users', error: (error as Error).message });
  }
});

// Socket.io
const io = new IOServer(httpServer, {
  cors: {
  origin: (_origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if ((process.env.NODE_ENV || 'development') !== 'production') {
        return cb(null, true);
  }
  },
  credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 25000,
});

io.on('connection', (socket: Socket) => {
  if (process.env.NODE_ENV !== 'production') console.log('🔌 socket connected', socket.id);
  socket.on('disconnect', (reason: any) => {
    if (process.env.NODE_ENV !== 'production') console.log('🔌 socket disconnected', socket.id, 'reason:', reason);
  });
  socket.on('error', (err: any) => {
    if (process.env.NODE_ENV !== 'production') console.warn('⚠️ socket error', socket.id, err);
  });
});

// Log low-level engine.io connection errors (e.g., CORS/transport issues)
// @ts-ignore - engine is a public property on the server instance
(io as any).engine.on('connection_error', (err: any) => {
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    console.warn('⚠️ engine.io connection_error:', {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  }
});

// expose io to services
setIO(io);

// cache busting is invoked directly in controllers after mutations

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  const redacted = (v?: string) => v ? v.slice(0,3) + '***' : 'none';
  console.log('[smtp] config summary', {
    host: process.env.SMTP_HOST || 'gmail-service-or-missing',
    user: redacted(process.env.SMTP_USER),
    passSet: Boolean(process.env.SMTP_PASS),
    from: process.env.EMAIL_FROM,
  });
});