import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as warrantySvc from '../services/warranty.service';
import { Warranty } from '../models/Warranty.model';

const router = Router();

router.get('/', authenticate, authorize('store_owner','cashier','sales_rep'), async (req, res) => {
  try {
    const page = Number(req.query.page)||1;
    const pageSize = Number(req.query.pageSize)||25;
    const data = await warrantySvc.listWarranties(req.query, { page, pageSize });
    if (req.query.debug === '1' || process.env.WARRANTY_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log('[warranty.list] query', req.query, 'resultCount', data.items.length, 'total', data.total);
    }
    return res.json({ success: true, data });
  } catch (e:any) { return res.status(400).json({ success:false, message: e.message }); }
});

// Dev diagnostics BEFORE :id so it is reachable (keep ordering before any :id route)
router.get('/__dev/diag', authenticate, authorize('store_owner'), async (_req, res) => {
  try {
    const total = await Warranty.countDocuments();
    const recent = await Warranty.find().sort({ createdAt: -1 }).limit(20).select('warrantyNo status periodDays customerSnapshot.phone saleSnapshot.invoiceNo createdAt').lean();
    return res.json({ success: true, data: { total, recent } });
  } catch (e:any) { return res.status(500).json({ success:false, message: e.message }); }
});

// Dev: return first 200 warranties ignoring filters (debug only)
router.get('/__dev/all', authenticate, authorize('store_owner'), async (_req, res) => {
  try {
    const items = await Warranty.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: { items, total: items.length } });
  } catch (e:any) { return res.status(500).json({ success:false, message: e.message }); }
});

router.get('/:id', authenticate, authorize('store_owner','cashier','sales_rep'), async (req,res) => {
  try {
    const w = await warrantySvc.getWarranty(req.params.id);
    if(!w) return res.status(404).json({ success:false, message:'Not found' });
    return res.json({ success:true, data: w });
  } catch(e:any){
    return res.status(400).json({ success:false, message:e.message });
  }
});

router.post('/register', authenticate, authorize('store_owner','cashier','sales_rep'), async (req,res) => {
  try {
    const body = req.body;
    const w = await warrantySvc.issueWarranty({
      productId: body.productId,
      saleId: body.saleId,
      saleItemId: body.saleItemId,
      customerId: body.customerId,
      issuedBy: body.userId || body.issuedBy,
      periodDays: body.periodDays,
      coverage: body.coverage,
      exclusions: body.exclusions,
      type: body.type,
      requiresActivation: body.requiresActivation,
      serialNumber: body.serialNumber,
  batchNumber: body.batchNumber,
  branchId: body.branchId
    });
    return res.status(201).json({ success: true, data: w });
  } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.post('/:id/activate', authenticate, authorize('store_owner','cashier','sales_rep'), async (req,res) => {
  try { const w = await warrantySvc.activateWarranty(req.params.id, req.body.serialNumber, req.body.userId); return res.json({ success:true, data:w }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.post('/:id/transfer', authenticate, authorize('store_owner'), async (req,res)=>{
  try { const w = await warrantySvc.transferWarranty(req.params.id, req.body.toCustomerId, req.body.userId, req.body.reason); return res.json({ success:true, data:w }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.post('/:id/revoke', authenticate, authorize('store_owner'), async (req,res)=>{
  try { const w = await warrantySvc.revokeWarranty(req.params.id, req.body.userId, req.body.reason); return res.json({ success:true, data:w }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});


export default router;