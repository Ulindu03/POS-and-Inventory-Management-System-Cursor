import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import connectDB from './config/database';
import { User } from './models/User.model';
import { Category } from './models/Category.model';
import { Product } from './models/Product.model';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import saleRoutes from './routes/sale.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
	origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
	credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Test route
app.get('/', (req, res) => {
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

    res.json({ success: true, message: 'Seeded products and categories' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Seed error', error: (error as Error).message });
  }
});

// Test route to check database
app.get('/api/test-db', async (req, res) => {
  try {
    // Count users in database
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      message: 'Database is working!',
      userCount: userCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
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
      }
      return user;
    };

    const admin = await ensureUser('admin', 'admin@voltzone.lk', 'admin123', 'admin');
    const cashier = await ensureUser('cashier', 'cashier@voltzone.lk', 'cashier123', 'cashier');

    res.json({
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
    res.status(500).json({
      success: false,
      message: 'Error seeding users',
      error: (error as Error).message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║                                        ║');
  console.log('║     VoltZone POS Server Started!      ║');
  console.log('║                                        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Press CTRL + C to stop the server');
});