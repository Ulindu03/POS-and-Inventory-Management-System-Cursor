import { useState } from 'react';
import FormModal from '@/components/ui/FormModal';
import { deliveriesApi } from '@/lib/api/deliveries.api';
import { useAuthStore } from '@/store/auth.store';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}>;

export default function DeliveryForm({ open, onClose, onSaved }: Props) {
  const user = useAuthStore((s) => s.user);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [route, setRoute] = useState('');
  const [scheduledDay, setScheduledDay] = useState<string>(''); // YYYY-MM-DD
  const [scheduledTime, setScheduledTime] = useState<string>(''); // HH:mm
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!vehicleNo || !driverName || !driverPhone || !scheduledDay) return;
    try {
      setSubmitting(true);
      const time = scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime) ? scheduledTime : '09:00';
      const iso = new Date(`${scheduledDay}T${time}:00`).toISOString();
      const payload = {
        lorryDetails: {
          vehicleNo: vehicleNo.toUpperCase().trim(),
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim(),
          driverLicense: driverLicense.trim() || undefined,
        },
        // salesRep is set on the server from the authenticated user
        route: route || undefined,
        shops: [],
        scheduledDate: iso,
      };
      await deliveriesApi.create(payload);
      onSaved?.();
      onClose();
      // reset minimal fields for next open
      setVehicleNo('');
      setDriverName('');
      setDriverPhone('');
      setDriverLicense('');
      setRoute('');
      setScheduledDay('');
      setScheduledTime('');
    } catch (err: any) {
      // quick surface of server error to assist debugging
      const msg = err?.response?.data?.message || err?.message || 'Failed to create delivery';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={open}
      title="New Delivery"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-[#F8F8F8] hover:bg-white/20 disabled:opacity-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !vehicleNo || !driverName || !driverPhone || !scheduledDay}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Create Delivery'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vehicleNo" className="block text-sm mb-1">Vehicle No</label>
          <input
            id="vehicleNo"
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder="ABC-1234"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="driverName" className="block text-sm mb-1">Driver Name</label>
          <input
            id="driverName"
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder=""
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="driverPhone" className="block text-sm mb-1">Driver Phone</label>
          <input
            id="driverPhone"
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder="07X-XXXXXXX"
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="driverLicense" className="block text-sm mb-1">Driver License (optional)</label>
          <input
            id="driverLicense"
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder="B1234567"
            value={driverLicense}
            onChange={(e) => setDriverLicense(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="route" className="block text-sm mb-1">Route (optional)</label>
          <input
            id="route"
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder="Colombo > Gampaha > Negombo"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="scheduledDay" className="block text-sm mb-1">Scheduled Date</label>
          <input
            id="scheduledDay"
            type="date"
            className="w-full rounded bg-white/10 px-3 py-2"
            min={new Date().toISOString().slice(0,10)}
            value={scheduledDay}
            onChange={(e) => setScheduledDay(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="scheduledTime" className="block text-sm mb-1">Scheduled Time (optional)</label>
          <input
            id="scheduledTime"
            type="time"
            className="w-full rounded bg-white/10 px-3 py-2"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>
      </div>
      <p className="mt-3 text-xs opacity-70">Sales rep will be set to your account automatically.</p>
    </FormModal>
  );
}
