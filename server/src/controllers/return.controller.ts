import { Request, Response, NextFunction } from 'express';
import { ReturnTransaction } from '../models/ReturnTransaction.model';
import { ExchangeSlip } from '../models/ExchangeSlip.model';
import { CustomerOverpayment } from '../models/CustomerOverpayment.model';
import { ReturnPolicy } from '../models/ReturnPolicy.model';
import { ReturnService } from '../services/ReturnService';
import { Settings } from '../models/Settings.model';
import { Customer } from '../models/Customer.model';

export class ReturnController {
  
  // POST /api/returns/lookup - Look up sales for returns
  static async lookupSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        invoiceNo, 
        customerName, 
        customerPhone, 
        customerEmail, 
        productName,
        dateFrom,
        dateTo,
        searchDays = 30 
      } = req.body;
      
      const options = {
        invoiceNo,
        customerName,
        customerPhone,
        customerEmail,
        productName,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        searchDays
      };
      
      const sales = await ReturnService.lookupSales(options);
      
      return res.json({ 
        success: true, 
        data: { 
          sales,
          count: sales.length
        } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns/validate - Validate return before processing
  static async validateReturn(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const settings = await Settings.findOne();
      if (settings?.pos?.allowReturns === false) {
        return res.status(403).json({
          success: false,
          message: 'Returns and refunds are disabled in POS settings'
        });
      }

      const validation = await ReturnService.validateReturn(req.body);
      
      return res.json({ 
        success: true, 
        data: validation 
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns - Process a return
  static async processReturn(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      // Check permissions
      if (!['store_owner', 'admin', 'manager', 'sales_rep'].includes(String(userRole).toLowerCase())) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions for processing returns' 
        });
      }

      const settings = await Settings.findOne();
      if (settings?.pos?.allowReturns === false) {
        return res.status(403).json({
          success: false,
          message: 'Returns and refunds are disabled in POS settings'
        });
      }
      
      const result = await ReturnService.processReturn(req.body, userId);
      return res.status(201).json(result);
  } catch (err: any) {
      // Provide clearer API error instead of opaque 500 where possible
      const message = err?.message || 'Failed to process return';
      if (err?.name === 'ValidationError') {
        return res.status(400).json({ success: false, message });
      }
      return res.status(500).json({ success: false, message });
    }
  }

  // GET /api/returns - List return transactions
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = '1', 
        limit = '20', 
        status, 
        returnType, 
        dateFrom, 
        dateTo,
        customerId,
        customerCode
      } = req.query as Record<string, string>;
      
      const take = Math.min(parseInt(limit, 10) || 20, 100);
      const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
      
      const filters: any = {};
      
      if (status) filters.status = status;
      if (returnType) filters.returnType = returnType;

      if (customerId) {
        filters.customer = customerId;
      } else if (customerCode) {
        const code = String(customerCode).trim().toUpperCase();
        if (code) {
          const customer = await Customer.findOne({ customerCode: code }).select('_id');
          if (!customer) {
            return res.json({
              success: true,
              data: {
                items: [],
                total: 0,
                page: parseInt(page, 10) || 1,
                limit: take
              }
            });
          }
          filters.customer = customer._id;
        }
      }
      
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }
      
      const [items, total] = await Promise.all([
        ReturnTransaction.find(filters)
          .populate('originalSale', 'invoiceNo total createdAt')
          .populate('customer', 'name firstName lastName phone email')
          .populate('returnedBy', 'name username')
          .populate('items.product', 'name sku')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(take),
        ReturnTransaction.countDocuments(filters)
      ]);
      
      return res.json({ 
        success: true, 
        data: { 
          items, 
          total, 
          page: parseInt(page, 10) || 1, 
          limit: take 
        } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/:id - Get return transaction by ID
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const returnTransaction = await ReturnTransaction.findById(id)
        .populate('originalSale', 'invoiceNo total items createdAt')
        .populate('customer', 'name firstName lastName phone email')
        .populate('returnedBy', 'name username')
        .populate('items.product', 'name sku price')
        .populate('exchangeSlip')
        .populate('overpaymentCreated');
      
      if (!returnTransaction) {
        return res.status(404).json({ 
          success: false, 
          message: 'Return transaction not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: { returnTransaction } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns/:id/approve - Approve pending return
  static async approve(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      // Only managers and store owners can approve
      if (!['store_owner', 'admin', 'manager'].includes(String(userRole).toLowerCase())) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only managers and store owners can approve returns' 
        });
      }
      
      const returnTransaction = await ReturnTransaction.findById(id);
      if (!returnTransaction) {
        return res.status(404).json({ 
          success: false, 
          message: 'Return transaction not found' 
        });
      }
      
      if (returnTransaction.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Return is not in pending status' 
        });
      }
      
      returnTransaction.status = 'approved';
      // Ensure managerApproval object exists (schema may not enforce subdoc instantiation)
      if (!returnTransaction.managerApproval) {
        (returnTransaction as any).managerApproval = { required: true };
      }
      (returnTransaction as any).managerApproval.approvedBy = userId;
      (returnTransaction as any).managerApproval.approvedAt = new Date();
      if (notes) (returnTransaction as any).managerApproval.reason = notes;
      
      await returnTransaction.save();
      
      return res.json({ 
        success: true, 
        data: { returnTransaction } 
      });
    } catch (err) {
      return next(err);
    }
  }

  static async searchExchangeSlips(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, customerId, limit } = req.query as Record<string, string>;

      if (!phone && !customerId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a customer phone number or ID'
        });
      }

      const slips = await ReturnService.searchExchangeSlips({
        phone,
        customerId,
        limit: limit ? parseInt(limit, 10) : undefined
      });

      if (!slips.length) {
        return res.status(404).json({
          success: false,
          message: 'No exchange slips found for the provided details'
        });
      }

      return res.json({
        success: true,
        data: {
          exchangeSlips: slips,
          count: slips.length
        }
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns/exchange-slip/redeem - Redeem exchange slip
  static async redeemExchangeSlip(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { slipNo, saleId } = req.body;
      const userId = req.user?.userId;
      
      if (!slipNo || !saleId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Slip number and sale ID are required' 
        });
      }
      
      const result = await ReturnService.redeemExchangeSlip(slipNo, saleId, userId);
      
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }

  static async cancelExchangeSlip(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { identifier } = req.params;
      const { reason } = req.body as { reason?: string };
      const userId = req.user?.userId;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Exchange slip identifier is required'
        });
      }

      const exchangeSlip = await ReturnService.cancelExchangeSlip(identifier, userId, reason);

      return res.json({
        success: true,
        data: { exchangeSlip }
      });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/exchange-slip/:slipNo - Get exchange slip details
  static async getExchangeSlip(req: Request, res: Response, next: NextFunction) {
    try {
      const { slipNo } = req.params;
      
      const exchangeSlip = await ExchangeSlip.findOne({ slipNo })
        .populate('originalSale', 'invoiceNo total createdAt')
        .populate('customer', 'name firstName lastName phone email')
        .populate('issuedBy', 'name username')
        .populate('redeemedBy', 'name username')
        .populate('items.product', 'name sku');
      
      if (!exchangeSlip) {
        return res.status(404).json({ 
          success: false, 
          message: 'Exchange slip not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: { exchangeSlip } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/customer/:customerId/overpayments - Get customer overpayments
  static async getCustomerOverpayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      
      const overpayments = await CustomerOverpayment.find({ 
        customer: customerId,
        status: 'active',
        balance: { $gt: 0 }
      })
      .populate('originalSale', 'invoiceNo createdAt')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
      
      const totalBalance = overpayments.reduce((sum, op) => sum + op.balance, 0);
      
      return res.json({ 
        success: true, 
        data: { 
          overpayments,
          totalBalance,
          count: overpayments.length
        } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns/overpayment/use - Use customer overpayment
  static async useOverpayment(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { customerId, amount, saleId } = req.body;
      const userId = req.user?.userId;
      
      if (!customerId || !amount || !saleId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Customer ID, amount, and sale ID are required' 
        });
      }
      
      const result = await ReturnService.useOverpayment(customerId, amount, saleId, userId);
      
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/customer/:customerId/history - Get customer return history
  static async getCustomerHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const { limit = '20' } = req.query as Record<string, string>;
      
      const history = await ReturnService.getCustomerReturnHistory(
        customerId, 
        parseInt(limit, 10) || 20
      );
      
      return res.json({ 
        success: true, 
        data: { 
          history,
          count: history.length
        } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/analytics - Get return analytics
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query as Record<string, string>;
      
      const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = dateTo ? new Date(dateTo) : new Date();
      
      const analytics = await ReturnService.getReturnAnalytics(from, to);
      
      return res.json({ 
        success: true, 
        data: analytics 
      });
    } catch (err) {
      return next(err);
    }
  }

  // POST /api/returns/policies - Create return policy
  static async createPolicy(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      
      // Only store owners can create policies
      if (!['store_owner', 'admin'].includes(String(userRole).toLowerCase())) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only store owners can create return policies' 
        });
      }
      
      const policyData = { ...req.body, createdBy: userId };
      const policy = await ReturnPolicy.create(policyData);
      
      return res.status(201).json({ 
        success: true, 
        data: { policy } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // GET /api/returns/policies - Get return policies
  static async getPolicies(_req: Request, res: Response, next: NextFunction) {
    try {
      const policies = await ReturnPolicy.find({ isActive: true })
        .populate('createdBy', 'name username')
        .populate('applicableTo.categories', 'name')
        .populate('applicableTo.products', 'name sku')
        .sort({ priority: 1, createdAt: -1 });
      
      return res.json({ 
        success: true, 
        data: { policies } 
      });
    } catch (err) {
      return next(err);
    }
  }

  // Legacy create method (enhanced)
  static async create(req: Request & { user?: any }, res: Response, next: NextFunction) {
    try {
      const { saleId, items, reason, disposition, refundMethod = 'cash', notes } = req.body as {
        saleId: string;
        items: Array<{ product: string; quantity: number; amount: number }>;
        reason: 'defective' | 'wrong_item' | 'expired' | 'damaged' | 'other';
        disposition: 'restock' | 'damage' | 'write_off';
        refundMethod?: string;
        notes?: string;
      };
      
      // Convert to new format and process
      const returnRequest = {
        saleId,
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          returnAmount: item.amount,
          reason,
          disposition
        })),
        returnType: 'partial_refund' as const,
        refundMethod: refundMethod as any,
        notes
      };
      
      const userId = req.user?.userId;
      const result = await ReturnService.processReturn(returnRequest, userId);
      
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  }
}
