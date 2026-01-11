import mongoose from 'mongoose';
import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { Customer } from '../models/Customer.model';
import { ReturnTransaction } from '../models/ReturnTransaction.model';
import { ExchangeSlip } from '../models/ExchangeSlip.model';
import { CustomerOverpayment } from '../models/CustomerOverpayment.model';
import { ReturnPolicy } from '../models/ReturnPolicy.model';
import { Inventory } from '../models/Inventory.model';
import { StockMovement } from '../models/StockMovement.model';
import { UnitBarcode } from '../models/UnitBarcode.model';

interface ReturnItem {
  product: string;
  quantity: number;
  returnAmount: number;
  reason: 'defective' | 'expired' | 'damaged' | 'wrong_item' | 'unwanted' | 'size_issue' | 'color_issue' | 'other';
  condition?: 'new' | 'opened' | 'damaged' | 'defective';
  disposition?: 'restock' | 'damage' | 'write_off' | 'return_to_supplier';
}

interface ReturnRequest {
  saleId: string;
  items: ReturnItem[];
  returnType: 'full_refund' | 'partial_refund' | 'exchange' | 'store_credit';
  refundMethod: 'cash' | 'card' | 'bank_transfer' | 'digital' | 'store_credit' | 'exchange_slip' | 'overpayment';
  refundDetails?: any;
  discount?: number;
  managerOverride?: boolean;
  notes?: string;
}

interface SaleLookupOptions {
  invoiceNo?: string;
  customerName?: string;
  customerPhone?: string;
  customerNIC?: string;
  customerEmail?: string;
  productName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchDays?: number;
}

export class ReturnService {
  
  // Generate unique return number
  static async generateReturnNumber(): Promise<string> {
    const prefix = 'RET';
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    
    const lastReturn = await ReturnTransaction.findOne({
      returnNo: new RegExp(`^${prefix}${dateStr}`)
    }).sort({ returnNo: -1 });
    
    let sequence = 1;
    if (lastReturn) {
      const lastSeq = parseInt(lastReturn.returnNo.slice(-4));
      sequence = lastSeq + 1;
    }
    
    return `${prefix}${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  // Generate unique exchange slip number
  static async generateExchangeSlipNumber(): Promise<string> {
    const prefix = 'EXS';
    const today = new Date();
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
    
    const lastSlip = await ExchangeSlip.findOne({
      slipNo: new RegExp(`^${prefix}${dateStr}`)
    }).sort({ slipNo: -1 });
    
    let sequence = 1;
    if (lastSlip) {
      const lastSeq = parseInt(lastSlip.slipNo.slice(-4));
      sequence = lastSeq + 1;
    }
    
    return `${prefix}${dateStr}${sequence.toString().padStart(4, '0')}`;
  }

  // Look up sales by various criteria
  static async lookupSales(options: SaleLookupOptions): Promise<any[]> {
    const filters: any = {};
    const searchDays = options.searchDays || 365; // Default to 1 year for better search coverage
    
    // Date range filter - make it more lenient for specific searches
    const dateFrom = options.dateFrom || new Date(Date.now() - searchDays * 24 * 60 * 60 * 1000);
    const dateTo = options.dateTo || new Date();
    filters.createdAt = { $gte: dateFrom, $lte: dateTo };
    
    // Build OR conditions for different search types
    const saleOrConditions: any[] = [];
    
    // Invoice number search
    if (options.invoiceNo) {
      saleOrConditions.push({ invoiceNo: new RegExp(options.invoiceNo.trim(), 'i') });
    }
    
    // Customer search - find customers first, then add to OR conditions
    if (options.customerName || options.customerPhone || options.customerNIC || options.customerEmail) {
      const customerFilters: any = {};
      const customerOrConditions: any[] = [];
      
      if (options.customerName) {
        customerOrConditions.push(
          { name: new RegExp(options.customerName.trim(), 'i') },
          { firstName: new RegExp(options.customerName.trim(), 'i') },
          { lastName: new RegExp(options.customerName.trim(), 'i') }
        );
      }
      if (options.customerPhone) {
        const raw = options.customerPhone.trim();
        const digits = raw.replace(/\D/g, '');
        const variants: string[] = [];
        
        // Generate all possible phone number variants (same logic as customer controller)
        if (digits) {
          // Local (0XXXXXXXXX) and international (94XXXXXXXXX / +94XXXXXXXXX) variants
          if (digits.length === 10 && digits.startsWith('0')) {
            const local = digits; // 0XXXXXXXXX
            const intlNoPlus = '94' + digits.slice(1); // 94XXXXXXXXX
            const intlPlus = '+94' + digits.slice(1); // +94XXXXXXXXX
            variants.push(local, intlNoPlus, intlPlus);
          } else if (digits.length === 11 && digits.startsWith('94')) {
            const intlNoPlus = digits; // 94XXXXXXXXX
            const local = '0' + digits.slice(2); // 0XXXXXXXXX
            const intlPlus = '+' + digits; // +94XXXXXXXXX
            variants.push(local, intlNoPlus, intlPlus);
          } else if (digits.length === 9) { // Missing leading 0, assume local
            const local = '0' + digits;
            const intlNoPlus = '94' + digits;
            const intlPlus = '+94' + digits;
            variants.push(local, intlNoPlus, intlPlus, digits);
          } else {
            variants.push(digits);
          }
        }
        
        const unique = variants.filter((v, i) => variants.indexOf(v) === i);
        const plusVariants = unique.filter(v => v.startsWith('+'));
        const nonPlus = unique.map(v => v.startsWith('+') ? v.slice(1) : v);
        
        // Search with all variants
        customerOrConditions.push(
          { phone: { $in: unique } },
          { phone: { $in: plusVariants } },
          { canonicalPhone: { $in: nonPlus } },
          { alternatePhone: { $in: unique } },
          { alternatePhone: { $in: plusVariants } }
        );
        
        // Also try partial match on last 7 digits as fallback if we have enough digits
        if (digits.length >= 7) {
          customerOrConditions.push(
            { phone: { $regex: digits.slice(-7) + '$' } },
            { alternatePhone: { $regex: digits.slice(-7) + '$' } }
          );
        }
      }
      if (options.customerNIC) {
        customerOrConditions.push({ nic: new RegExp(options.customerNIC.trim(), 'i') });
      }
      if (options.customerEmail) {
        customerOrConditions.push({ email: new RegExp(options.customerEmail.trim(), 'i') });
      }
      
      if (customerOrConditions.length > 0) {
        customerFilters.$or = customerOrConditions;
      }
      
      const customers = await Customer.find(customerFilters).select('_id');
      if (customers.length > 0) {
        saleOrConditions.push({ customer: { $in: customers.map(c => c._id) } });
      }
      // Don't return empty if no customers found - might still match by invoice number
    }
    
    // If we have OR conditions, use them; otherwise use the base filters
    if (saleOrConditions.length > 0) {
      filters.$or = saleOrConditions;
    }
    
    // Product search
    if (options.productName) {
      const products = await Product.find({
        $or: [
          { name: new RegExp(options.productName.trim(), 'i') },
          { sku: new RegExp(options.productName.trim(), 'i') }
        ]
      }).select('_id');
      
      if (products.length > 0) {
        filters['items.product'] = { $in: products.map(p => p._id) };
      } else {
        return []; // No matching products found
      }
    }
    
    // Debug logging
    if (options.customerPhone || options.invoiceNo || options.customerNIC) {
      console.log('Sale lookup filters:', JSON.stringify(filters, null, 2));
    }
    
    // Find matching sales
    const sales = await Sale.find(filters)
      .populate('customer', 'name firstName lastName phone email nic customerCode canonicalPhone')
      .populate({
        path: 'items.product',
        select: 'name sku price.retail price.cost productName',
        model: 'Product'
      })
      .populate('cashier', 'name username')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    
    // Debug logging
    if (options.customerPhone || options.invoiceNo || options.customerNIC) {
      console.log(`Found ${sales.length} sales matching the search criteria`);
    }
    
    // Return sales with properly populated items
    // Transform each sale to ensure items are properly structured
    const salesWithItems = sales.map((sale: any) => {
      // Ensure items array exists - use the items from the sale directly
      // The populate should have already populated items.product
      const saleItems = sale.items || [];
      
      // Map items to ensure proper structure
      const items = saleItems.map((item: any) => {
        // Handle both populated and unpopulated product references
        const product = item.product || {};
        
        // Extract product ID (works for both ObjectId and populated object)
        const productId = product._id ? product._id : (typeof product === 'object' && !product._id ? product : item.product);
        
        // Build the item object, preserving all original fields
        const processedItem: any = {
          ...item,
          product: productId // Keep product reference (ID or populated object)
        };
        
        // If product is populated (has _id and other fields), add productDetails
        if (typeof product === 'object' && product._id) {
          processedItem.productDetails = product;
        }
        
        return processedItem;
      });
      
      // Debug logging for troubleshooting
      if (options.customerPhone && items.length === 0 && saleItems.length > 0) {
        console.warn(`Sale ${sale.invoiceNo || sale._id} has ${saleItems.length} items but processed items is empty`);
      }
      
      return {
        ...sale,
        items: items, // Always include items array (even if empty)
        // Ensure returnSummary exists for frontend
        returnSummary: sale.returnSummary || {
          totalReturned: 0,
          returnedItems: 0
        }
      };
    });
    
    return salesWithItems;
  }

  // Get applicable return policy for a sale
  static async getApplicableReturnPolicy(saleId: string): Promise<any> {
    const sale = await Sale.findById(saleId).populate('items.product', 'category');
    if (!sale) throw new Error('Sale not found');
    
    // Get all active policies ordered by priority
    const policies = await ReturnPolicy.find({ isActive: true })
      .sort({ priority: 1 })
      .lean();
    
    // Find the first applicable policy
    for (const policy of policies) {
      // Defensive: applicableTo might be missing on some documents
      if (policy.applicableTo?.allProducts) {
        return policy;
      }
      
      // Check if any sale items match policy categories or products
      const saleItems = sale.items as any[];
      const hasApplicableItem = saleItems.some(item => {
        if (policy.applicableTo?.products?.includes(item.product._id)) {
          return true;
        }
        if (policy.applicableTo?.categories?.includes(item.product.category)) {
          return true;
        }
        return false;
      });
      
      if (hasApplicableItem) {
        return policy;
      }
    }
    
    // Return default policy if none found
    return {
      returnWindow: { days: 30 },
      refundMethods: {
        allowCash: true,
        allowCard: true,
        allowStoreCredit: true,
        allowExchange: true,
        allowDigital: true,
        allowBankTransfer: false
      },
      approvalRequirements: {
        managerApprovalRequired: false,
        receiptRequired: true,
        allowNoReceiptReturns: false,
        approvalThreshold: 0
      },
      stockHandling: {
        autoRestock: true,
        defaultDisposition: 'restock'
      },
      restrictions: {
        maxReturnsPerCustomer: {
          enabled: false,
          count: 5,
          periodDays: 30
        },
        maxReturnAmount: {
          enabled: false,
          amount: 10000,
          currency: 'LKR'
        },
        excludeCategories: [],
        excludeProducts: []
      }
    };
  }

  // Validate return request
  static async validateReturn(request: ReturnRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    requiresApproval: boolean;
    policy: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresApproval = false;
    
    // Get sale and policy
    const sale = await Sale.findById(request.saleId).populate('items.product');
    if (!sale) {
      errors.push('Sale not found');
      return { valid: false, errors, warnings, requiresApproval, policy: null };
    }
    
    const policy = await this.getApplicableReturnPolicy(request.saleId);
    
    // Check return window
    const saleDate = new Date(sale.createdAt);
    const daysSinceSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceSale > policy.returnWindow.days && !request.managerOverride) {
      errors.push(`Return window expired. Sale is ${daysSinceSale} days old, policy allows ${policy.returnWindow.days} days.`);
    } else if (daysSinceSale > policy.returnWindow.days) {
      warnings.push('Return window expired but manager override provided');
      requiresApproval = true;
    }
    
    // Validate return items
    const saleItemsMap = new Map(
      (sale.items as any[]).map(item => [
        item.product._id.toString(),
        { quantity: item.quantity, price: item.price, totalReturned: 0 }
      ])
    );
    
    // Calculate already returned quantities
    if (sale.returns && sale.returns.length > 0) {
      for (const returnRecord of sale.returns as any[]) {
        for (const returnItem of returnRecord.items) {
          const productId = returnItem.product.toString();
          const saleItem = saleItemsMap.get(productId);
          if (saleItem) {
            saleItem.totalReturned += returnItem.quantity;
          }
        }
      }
    }
    
    let totalReturnAmount = 0;
    for (const item of request.items) {
      const saleItem = saleItemsMap.get(item.product);
      if (!saleItem) {
        errors.push(`Product ${item.product} not found in original sale`);
        continue;
      }
      
      const availableQuantity = saleItem.quantity - saleItem.totalReturned;
      if (item.quantity > availableQuantity) {
        errors.push(`Cannot return ${item.quantity} units of product ${item.product}. Only ${availableQuantity} available for return.`);
      }
      
      // Validate return amount doesn't exceed proportional original amount
      const maxReturnAmount = (saleItem.price * item.quantity);
      if (item.returnAmount > maxReturnAmount) {
        warnings.push(`Return amount ${item.returnAmount} exceeds proportional sale amount ${maxReturnAmount} for product ${item.product}`);
      }
      
      totalReturnAmount += item.returnAmount;
    }
    
    // Check approval thresholds
    if (policy?.approvalRequirements?.approvalThreshold > 0 && 
        totalReturnAmount > policy.approvalRequirements.approvalThreshold) {
      requiresApproval = true;
      warnings.push(`Return amount ${totalReturnAmount} exceeds approval threshold ${policy.approvalRequirements.approvalThreshold}`);
    }
    
    // Check refund method availability
    // Map refund method to policy keys
    const refundMethodMap: Record<string, string> = {
      exchange_slip: 'allowExchange',
      store_credit: 'allowStoreCredit',
      overpayment: 'allowStoreCredit' // treat overpayment similar to store credit
    };
    let methodKey = refundMethodMap[request.refundMethod];
    if (!methodKey) {
      methodKey = `allow${request.refundMethod.charAt(0).toUpperCase() + request.refundMethod.slice(1).replace('_', '')}`;
    }
    if (!policy?.refundMethods?.[methodKey] && !request.managerOverride) {
      errors.push(`Refund method ${request.refundMethod} not allowed by policy`);
    }
    
    // Check customer return limits
    if (policy?.restrictions?.maxReturnsPerCustomer?.enabled) {
      const customer = sale.customer;
      if (customer) {
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - (policy.restrictions.maxReturnsPerCustomer.periodDays || 30));
        
        const recentReturns = await ReturnTransaction.countDocuments({
          customer: customer,
          createdAt: { $gte: periodStart }
        });
        
        if (recentReturns >= (policy.restrictions.maxReturnsPerCustomer.count || 0)) {
          errors.push(`Customer has exceeded maximum returns limit of ${policy.restrictions.maxReturnsPerCustomer.count} in ${policy.restrictions.maxReturnsPerCustomer.periodDays} days`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiresApproval,
      policy
    };
  }

  // Process return transaction
  static async processReturn(request: ReturnRequest, processedBy: string): Promise<any> {
    const session = await mongoose.startSession();
    let returnTransaction: any;
    let exchangeSlip: any;
    let overpayment: any;
    
    try {
      await session.withTransaction(async () => {
        // Validate return
        const validation = await this.validateReturn(request);
        if (!validation.valid) {
          throw new Error(`Return validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Get sale (include items for price lookup)
        const sale = await Sale.findById(request.saleId).session(session);
        if (!sale) throw new Error('Sale not found');

        // Build quick lookup map for sale items
        const saleItemsIndex = new Map<string, any>();
        (sale.items as any[]).forEach(si => {
          saleItemsIndex.set(si.product.toString(), si);
        });
        
        // Create return transaction
        const returnNo = await this.generateReturnNumber();
        const totalAmount = request.items.reduce((sum, item) => sum + item.returnAmount, 0) - (request.discount || 0);
        
        returnTransaction = await ReturnTransaction.create([{
          returnNo,
          originalSale: request.saleId,
            customer: sale.customer,
          returnedBy: processedBy,
          returnType: request.returnType,
          items: request.items.map(item => {
            const saleItem = saleItemsIndex.get(item.product);
            if (!saleItem) {
              throw new Error(`Product ${item.product} not found in original sale while processing return`);
            }
            return {
              ...item,
              originalPrice: saleItem.price, // per-unit original price
              condition: item.condition || 'new',
              disposition: item.disposition || validation.policy.stockHandling.defaultDisposition
            };
          }),
          totalAmount,
          refundMethod: request.refundMethod,
          refundDetails: request.refundDetails || {},
          discount: request.discount || 0,
          status: validation.requiresApproval ? 'pending' : 'approved',
          notes: request.notes
        }], { session });
        
        // Handle different refund methods
        switch (request.refundMethod) {
          case 'exchange_slip':
            exchangeSlip = await this.createExchangeSlip(
              request.saleId,
              request.items,
              totalAmount,
              processedBy,
              session
            );
            returnTransaction[0].exchangeSlip = exchangeSlip._id;
            break;
            
          case 'store_credit':
          case 'overpayment':
            if (!sale.customer) {
              throw new Error('Sale has no customer to assign store credit/overpayment');
            }
            overpayment = await this.createOverpayment(
              sale.customer.toString(),
              totalAmount,
              'refund',
              processedBy,
              request.saleId,
              session
            );
            returnTransaction[0].overpaymentCreated = overpayment._id;
            break;
        }
        
        // Update sale with return information
        await this.updateSaleWithReturn(request.saleId, returnTransaction[0], session);
        
        // Handle inventory adjustments
        if (validation.policy.stockHandling.autoRestock) {
          await this.processInventoryAdjustments(request.items, returnTransaction[0]._id, processedBy, session);
        }

        // Track barcode returns
        try {
          for (const item of request.items) {
            // Find barcodes that were sold in this sale for this product
            const barcodes = await UnitBarcode.find({
              product: item.product,
              sale: request.saleId,
              status: 'sold'
            }).limit(item.quantity).session(session);

            for (const bc of barcodes) {
              bc.status = 'returned';
              bc.return = returnTransaction[0]._id;
              bc.returnedAt = new Date();
              bc.returnReason = item.reason;
              await bc.save({ session });
            }
          }
        } catch (bcErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[barcode.track.return] failed', bcErr);
          }
        }
        
        await returnTransaction[0].save({ session });
      });
      
      return {
        success: true,
        data: {
          returnTransaction: returnTransaction[0],
          exchangeSlip,
          overpayment
        }
      };
      
    } catch (error: any) {
      // Enhance error clarity for common validation issues
      if (error?.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map((e: any) => e.message);
        throw new Error(`Return processing validation error: ${messages.join('; ')}`);
      }
      // Log unexpected errors (could replace with proper logger)
      console.error('Process return failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Create exchange slip
  static async createExchangeSlip(
    saleId: string,
    items: ReturnItem[],
    totalValue: number,
    issuedBy: string,
    session: mongoose.ClientSession
  ): Promise<any> {
    const sale = await Sale.findById(saleId).populate('items.product', 'name sku').session(session);
    if (!sale) throw new Error('Sale not found');
    
    const slipNo = await this.generateExchangeSlipNumber();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90); // 90 days default
    
    // Attempt to annotate slip items with product name/sku where available from the original sale
    const exchangeItems = items.map(item => {
      // try to find matching sale item to access populated product info
      const saleItem = (sale.items || []).find((si: any) => {
        try {
          return si.product && si.product._id ? si.product._id.toString() === item.product.toString() : si.product.toString() === item.product.toString();
        } catch (e) {
          return false;
        }
      });

      const productName = ((saleItem && ((saleItem.product as any)?.name || (saleItem as any)?.productName)) || (item as any)?.productName) || 'Product';
      const sku = ((saleItem && ((saleItem.product as any)?.sku || (saleItem as any)?.sku)) || (item as any)?.sku) || '';

      return {
        product: item.product,
        quantity: item.quantity,
        originalPrice: item.returnAmount / (item.quantity || 1),
        exchangeValue: item.returnAmount,
        name: productName,
        sku
      };
    });

    const exchangeSlip = await ExchangeSlip.create([{
      slipNo,
      originalSale: saleId,
      customer: sale.customer,
      items: exchangeItems,
      totalValue,
      expiryDate,
      issuedBy,
      status: 'active'
    }], { session });
    
    return exchangeSlip[0];
  }

  // Create customer overpayment
  static async createOverpayment(
    customerId: string,
    amount: number,
    source: string,
    createdBy: string,
    originalSaleId?: string,
    session?: mongoose.ClientSession
  ): Promise<any> {
    const overpayment = await CustomerOverpayment.create([{
      customer: customerId,
      amount,
      balance: amount,
      source,
      originalSale: originalSaleId,
      createdBy,
      status: 'active'
    }], session ? { session } : {});
    
    return session ? overpayment[0] : overpayment;
  }

  // Update sale with return information
  static async updateSaleWithReturn(
    saleId: string,
    returnTransaction: any,
    session: mongoose.ClientSession
  ): Promise<void> {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale) throw new Error('Sale not found');
    
    // Add return record to sale
    if (!sale.returns) (sale as any).returns = [];
    (sale.returns as any).push({
      returnTransaction: returnTransaction._id,
      items: returnTransaction.items.map((item: any) => ({
        product: item.product,
        quantity: item.quantity,
        amount: item.returnAmount,
        reason: item.reason,
        disposition: item.disposition
      })),
      total: returnTransaction.totalAmount,
      method: returnTransaction.refundMethod,
      reference: returnTransaction.returnNo,
      processedBy: returnTransaction.returnedBy,
      createdAt: new Date()
    });
    
    // Update return summary
    if (!sale.returnSummary) (sale as any).returnSummary = { totalReturned: 0, returnedItems: 0 };
    (sale.returnSummary as any).totalReturned = ((sale.returnSummary as any).totalReturned || 0) + returnTransaction.totalAmount;
    (sale.returnSummary as any).returnedItems = ((sale.returnSummary as any).returnedItems || 0) + 
      returnTransaction.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    (sale.returnSummary as any).lastReturnDate = new Date();
    
    // Update sale status
    const originalTotal = (sale as any).total + ((sale.returnSummary as any).totalReturned || 0);
    const remainingTotal = originalTotal - ((sale.returnSummary as any).totalReturned || 0);
    
    if (remainingTotal <= 0) {
      (sale as any).status = 'refunded';
    } else if ((sale.returnSummary as any).totalReturned > 0) {
      (sale as any).status = 'partially_refunded';
    }
    
    // Add exchange slip or overpayment references
    if (returnTransaction.exchangeSlip) {
      if (!sale.exchangeSlipsIssued) sale.exchangeSlipsIssued = [];
      (sale.exchangeSlipsIssued as any).push(returnTransaction.exchangeSlip);
    }
    
    if (returnTransaction.overpaymentCreated) {
      if (!sale.overpayments) sale.overpayments = [];
      (sale.overpayments as any).push(returnTransaction.overpaymentCreated);
    }
    
    await sale.save({ session });
  }

  // Process inventory adjustments
  static async processInventoryAdjustments(
    items: ReturnItem[],
    returnTransactionId: string,
    processedBy: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    for (const item of items) {
      if (item.disposition === 'restock') {
        // Increase inventory
        await Product.updateOne(
          { _id: item.product },
          { $inc: { 'stock.current': item.quantity } },
          { session }
        );
        
        // Update Inventory model
        const inventory = await Inventory.findOne({ product: item.product }).session(session);
        if (inventory) {
          inventory.currentStock = (inventory.currentStock || 0) + item.quantity;
          inventory.availableStock = (inventory.availableStock || 0) + item.quantity;
          inventory.updatedAt = new Date();
          await inventory.save({ session });
        }
        
        // Log stock movement
        await StockMovement.create([{
          product: item.product,
          type: 'return',
          quantity: item.quantity,
          previousStock: (inventory?.currentStock || 0) - item.quantity,
          newStock: (inventory?.currentStock || 0),
          reference: returnTransactionId,
          referenceId: returnTransactionId,
          // referenceType must match enum in StockMovement.model.ts; using 'Sale' as neutral association
          // (Alternatively, extend enum to include 'ReturnTransaction').
          referenceType: 'Adjustment',
          performedBy: processedBy,
          reason: 'customer_return_restock'
        }], { session });
      }
      // For 'damage', 'write_off', etc., we don't increase stock but still log the movement
    }
  }

  static async searchExchangeSlips(options: { customerId?: string; phone?: string; limit?: number }): Promise<any[]> {
    const { customerId, phone, limit = 20 } = options;
    const searchLimit = Math.min(Math.max(limit, 1), 50);
    const query: any = {};
    let hasCustomerFilter = false;

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return [];
      }
      query.customer = new mongoose.Types.ObjectId(customerId);
      hasCustomerFilter = true;
    }

    if (phone) {
      const normalized = phone.replace(/\D/g, '');
      if (!normalized) {
        return [];
      }
      const regex = new RegExp(normalized, 'i');
      const customers = await Customer.find({
        $or: [
          { phone: regex },
          { 'contact.phone': regex }
        ]
      }).select('_id');

      if (!customers.length) {
        return [];
      }

      const ids = customers.map((c) => c._id);
      if (hasCustomerFilter) {
        if (!ids.some((id) => id.equals(query.customer))) {
          return [];
        }
      } else {
        query.customer = { $in: ids };
        hasCustomerFilter = true;
      }
    }

    if (!hasCustomerFilter) {
      return [];
    }

    return ExchangeSlip.find(query)
      .populate('customer', 'name firstName lastName phone email')
      .populate('originalSale', 'invoiceNo total createdAt')
      .sort({ createdAt: -1 })
      .limit(searchLimit)
      .lean();
  }

  // Redeem exchange slip
  static async redeemExchangeSlip(
    slipNo: string,
    saleId: string,
    redeemedBy: string
  ): Promise<any> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const exchangeSlip = await ExchangeSlip.findOne({ slipNo, status: 'active' }).session(session);
        if (!exchangeSlip) {
          throw new Error('Exchange slip not found or already redeemed');
        }
        
        if (exchangeSlip.expiryDate < new Date()) {
          throw new Error('Exchange slip has expired');
        }
        
        // Mark as redeemed
        exchangeSlip.status = 'redeemed';
        exchangeSlip.redeemedBy = redeemedBy as any;
        exchangeSlip.redeemedAt = new Date();
        exchangeSlip.redemptionSale = saleId as any;
        
        await exchangeSlip.save({ session });
        
        return { success: true, exchangeSlip };
      });
    } finally {
      await session.endSession();
    }
  }

  static async cancelExchangeSlip(
    identifier: string,
    cancelledBy: string,
    reason?: string
  ): Promise<any> {
    if (!identifier) {
      throw new Error('Exchange slip identifier is required');
    }

    const query: any = [{ slipNo: identifier.trim() }];
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      query.push({ _id: new mongoose.Types.ObjectId(identifier) });
    }

    const exchangeSlip = await ExchangeSlip.findOne({ $or: query });
    if (!exchangeSlip) {
      throw new Error('Exchange slip not found');
    }

    if (exchangeSlip.status !== 'active') {
      throw new Error('Only active exchange slips can be cancelled');
    }

    exchangeSlip.status = 'cancelled';
    (exchangeSlip as any).cancelledBy = cancelledBy;
    (exchangeSlip as any).cancelledAt = new Date();
    if (reason) {
      (exchangeSlip as any).cancellationReason = reason;
    }

    await exchangeSlip.save();
    return exchangeSlip;
  }

  // Use customer overpayment
  static async useOverpayment(
    customerId: string,
    amount: number,
    saleId: string,
    usedBy: string
  ): Promise<any> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        // Get available overpayments
        const overpayments = await CustomerOverpayment.find({
          customer: customerId,
          status: 'active',
          balance: { $gt: 0 }
        })
        .sort({ createdAt: 1 }) // Use oldest first
        .session(session);
        
        const totalAvailable = overpayments.reduce((sum, op) => sum + op.balance, 0);
        if (totalAvailable < amount) {
          throw new Error(`Insufficient overpayment balance. Available: ${totalAvailable}, Requested: ${amount}`);
        }
        
        let remainingAmount = amount;
        const usedOverpayments = [];
        
        for (const overpayment of overpayments) {
          if (remainingAmount <= 0) break;
          
          const useAmount = Math.min(remainingAmount, overpayment.balance);
          overpayment.balance -= useAmount;
          
          // Add usage record
          overpayment.usageHistory.push({
            usedAmount: useAmount,
            remainingBalance: overpayment.balance,
            usedInSale: saleId as any,
            usedBy: usedBy as any,
            usedAt: new Date()
          });
          
          if (overpayment.balance <= 0) {
            overpayment.status = 'fully_used';
          }
          
          await overpayment.save({ session });
          usedOverpayments.push({
            overpaymentId: overpayment._id,
            amountUsed: useAmount
          });
          
          remainingAmount -= useAmount;
        }
        
        return { success: true, usedOverpayments };
      });
    } finally {
      await session.endSession();
    }
  }

  // Get customer return history
  static async getCustomerReturnHistory(customerId: string, limit = 20): Promise<any[]> {
    return await ReturnTransaction.find({ customer: customerId })
      .populate('originalSale', 'invoiceNo total createdAt')
      .populate('items.product', 'name sku')
      .populate('returnedBy', 'name username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  // Get return analytics
  static async getReturnAnalytics(dateFrom: Date, dateTo: Date): Promise<any> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateFrom, $lte: dateTo },
          status: { $in: ['approved', 'processed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalReturns: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgReturnAmount: { $avg: '$totalAmount' },
          returnsByType: {
            $push: {
              type: '$returnType',
              amount: '$totalAmount'
            }
          },
          returnsByReason: {
            $push: {
              reasons: '$items.reason',
              amount: '$totalAmount'
            }
          }
        }
      }
    ];
    
    const [analytics] = await ReturnTransaction.aggregate(pipeline);
    return analytics || {
      totalReturns: 0,
      totalAmount: 0,
      avgReturnAmount: 0,
      returnsByType: [],
      returnsByReason: []
    };
  }
}