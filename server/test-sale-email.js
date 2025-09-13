// Test script to simulate a sale and check email sending
require('dotenv').config();
const mongoose = require('mongoose');
const { sendEmail, buildSaleReceiptEmail } = require('./dist/services/notify.service');

async function testSaleEmail() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voltzone-pos');
    console.log('Connected to database');

    // Create a mock sale and customer
    const mockSale = {
      invoiceNo: 'INV-TEST-001',
      total: 1500,
      subtotal: 1500,
      discount: 0,
      tax: { vat: 0, nbt: 0 },
      currency: { code: 'LKR' },
      items: [
        {
          product: { name: 'Test Product' },
          quantity: 2,
          price: 750,
          total: 1500
        }
      ]
    };

    const mockCustomer = {
      name: 'Test Customer',
      email: process.env.TEST_EMAIL || 'test@example.com'
    };

    console.log('Testing email receipt generation...');
    const { subject, text, html } = buildSaleReceiptEmail(mockSale, mockCustomer);
    
    console.log('Subject:', subject);
    console.log('Text preview:', text.substring(0, 100) + '...');
    
    console.log('Sending test email...');
    const result = await sendEmail(subject, mockCustomer.email, text, html);
    
    if (result) {
      console.log('✅ Test email sent successfully');
    } else {
      console.log('❌ Test email failed to send');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSaleEmail();
