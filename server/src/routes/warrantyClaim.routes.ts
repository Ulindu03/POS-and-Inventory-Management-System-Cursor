import { Router } from 'express';
import * as claimSvc from '../services/warrantyClaim.service';

const router = Router();

router.get('/', async (req,res)=>{
  try { const data = await claimSvc.listClaims(req.query, { page: Number(req.query.page)||1, pageSize: Number(req.query.pageSize)||25 }); return res.json({ success:true, data }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.get('/:id', async (req,res)=>{
  try { const claim = await claimSvc.getClaim(req.params.id); if(!claim) return res.status(404).json({ success:false, message:'Not found' }); return res.json({ success:true, data: claim }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.post('/', async (req,res)=>{
  try { const c = await claimSvc.createClaim(req.body); return res.status(201).json({ success:true, data:c }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

router.post('/:id/status', async (req,res)=>{
  try { const c = await claimSvc.updateClaimStatus(req.params.id, req.body.status, req.body.userId); return res.json({ success:true, data:c }); } catch(e:any){ return res.status(400).json({ success:false, message:e.message }); }
});

export default router;