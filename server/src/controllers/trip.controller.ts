import { Request, Response } from 'express';
import { Trip } from '../models/Trip.model';
import { Product } from '../models/Product.model';

export class TripController {
  static async list(req: Request, res: Response) {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const total = await Trip.countDocuments();
    const items = await Trip.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    return res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  }

  static async create(req: Request, res: Response) {
    const payload = req.body;
    const count = await Trip.countDocuments();
    const tripNo = `TRP-${(count + 1).toString().padStart(6, '0')}`;
    const doc = await Trip.create({ ...payload, tripNo });
    return res.status(201).json({ success: true, data: doc });
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const doc = await Trip.findByIdAndUpdate(id, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Trip not found' });
    return res.json({ success: true, data: doc });
  }

  // Load manifest at warehouse: moves stock.current -> stock.inTransit
  static async loadManifest(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const { stops } = req.body as { stops: Array<{ manifest: Array<{ product: string; qty: number }> }> };
    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    // apply sequence if missing
  (trip as any).stops = ((trip as any).stops || []).map((s: any, idx: number) => ({ ...s.toObject?.() || s, sequence: s.sequence || idx + 1 }));
    // adjust stock per manifest sum
    const sumMap = new Map<string, number>();
    for (const stop of stops || []) {
      for (const m of stop.manifest || []) {
        sumMap.set(m.product, (sumMap.get(m.product) || 0) + (m.qty || 0));
      }
    }
    for (const [pid, qty] of sumMap.entries()) {
      const p = await Product.findById(pid);
      if (!p) continue;
      const cur = (p.stock as any)?.current ?? 0;
      const inT = (p.stock as any)?.inTransit ?? 0;
      const move = Math.max(0, Math.min(cur, qty));
      p.stock = { ...(p.stock as any), current: cur - move, inTransit: inT + move };
      await p.save();
    }
    // set manifests and totals
    (trip as any).stops = stops as any;
    const loaded = Array.from(sumMap.values()).reduce((a, b) => a + b, 0);
    trip.status = 'loading';
    (trip as any).totals = { ...(trip as any).totals, loaded };
    await trip.save();
    return res.json({ success: true, data: trip });
  }

  // Reconcile a stop: moves inTransit -> delivered/returned back to current
  static async reconcileStop(req: Request, res: Response) {
    const { id, stopIndex } = req.params as unknown as { id: string; stopIndex: string };
    const { delivered } = req.body as { delivered: Array<{ product: string; qty: number; damaged?: number; returned?: number }> };
    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    const idx = parseInt(stopIndex, 10);
    const stop = (trip as any).stops?.[idx];
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });

    // Adjust per product
    for (const line of delivered || []) {
      const p = await Product.findById(line.product);
      if (!p) continue;
      const inT = (p.stock as any)?.inTransit ?? 0;
      const cur = (p.stock as any)?.current ?? 0;
      const totalOut = (line.qty || 0) + (line.returned || 0) + (line.damaged || 0);
      const used = Math.min(inT, totalOut);
      const backToStock = (line.returned || 0);
      p.stock = { ...(p.stock as any), inTransit: Math.max(0, inT - used), current: cur + backToStock };
      await p.save();
    }

    // Save delivered lines and status on stop
    stop.delivered = delivered as any;
    stop.status = 'delivered';
    (trip as any).stops[idx] = stop;
    // Recompute totals
    const totals = { loaded: (trip as any).totals?.loaded || 0, delivered: 0, returned: 0, damaged: 0 };
    for (const s of (trip as any).stops || []) {
      for (const d of s.delivered || []) {
        totals.delivered += d.qty || 0;
        totals.returned += d.returned || 0;
        totals.damaged += d.damaged || 0;
      }
    }
    (trip as any).totals = totals as any;
    await trip.save();
    return res.json({ success: true, data: trip });
  }
}
