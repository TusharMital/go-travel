import React, { useState, useEffect } from 'react';
import { partnerApi, PartnerLocation } from '../api/client';
import {
  MapPin,
  Plus,
  Calendar,
  Layers,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
} from 'lucide-react';

export const LocationsInventoryTab: React.FC = () => {
  const [locations, setLocations] = useState<PartnerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PartnerLocation | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New Location Form State
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('Berlin');
  const [newLocLat, setNewLocLat] = useState('52.5200');
  const [newLocLng, setNewLocLng] = useState('13.4050');
  const [newLocCapacity, setNewLocCapacity] = useState('30');
  const [newLocPrice, setNewLocPrice] = useState('6.50');

  // Inventory Update Form State
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invCapacity, setInvCapacity] = useState('45');
  const [invPrice, setInvPrice] = useState('7.00');

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await partnerApi.listLocations();
      if (res && res.data) {
        setLocations(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load partner locations:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await partnerApi.createLocation({
        name: newLocName,
        address: newLocAddress,
        city: newLocCity,
        lat: parseFloat(newLocLat),
        lng: parseFloat(newLocLng),
        initial_capacity: parseInt(newLocCapacity, 10),
        price_per_bag_per_day: parseFloat(newLocPrice),
      });
      setShowAddModal(false);
      setFeedback(`Location "${created.name}" created with 14-day seeded inventory!`);
      setTimeout(() => setFeedback(null), 4000);
      loadLocations();
    } catch (err: any) {
      alert(`Error creating location: ${err.message}`);
    }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    try {
      await partnerApi.updateInventory(selectedLocation.id, {
        date: invDate,
        total_capacity: parseInt(invCapacity, 10),
        price_per_bag_per_day: parseFloat(invPrice),
      });
      setShowInventoryModal(false);
      setFeedback(`Inventory & pricing updated for ${selectedLocation.name} on ${invDate}!`);
      setTimeout(() => setFeedback(null), 4000);
      loadLocations();
    } catch (err: any) {
      alert(`Error updating inventory: ${err.message}`);
    }
  };

  const totalCapacity = locations.reduce((sum, l) => sum + (l.inventories?.[0]?.total_capacity || 20), 0);

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Locations</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{locations.length}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">100% Verified Storage Hubs</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Daily Capacity</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCapacity} bags</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Across all facilities</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Base Daily Rate</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">$6.50 – $7.50</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Per bag / 24 hours</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
            <ShieldCheck className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {locations.reduce((s, l) => s + (l._count?.bookings || 0), 0)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Lifetime check-ins</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-900 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Locations Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Manage Storage Locations</h2>
          <p className="text-xs text-slate-500">
            Configure lockers, operational opening hours, and set daily bag pricing & capacity.
          </p>
        </div>

        <button
          onClick={() => {
            setNewLocName('');
            setNewLocAddress('');
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Location</span>
        </button>
      </div>

      {/* Locations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((loc) => {
          const todayInv = loc.inventories?.[0];
          return (
            <div
              key={loc.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {loc.city}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{loc.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{loc.address}</span>
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl">
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </span>
                </div>

                {/* Capacity & Price Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium text-[11px]">Today's Capacity</span>
                    <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                      {todayInv ? `${todayInv.booked_capacity} / ${todayInv.total_capacity} bags` : '30 bags'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block font-medium text-[11px]">Price / Bag / Day</span>
                    <span className="font-extrabold text-emerald-600 text-sm mt-0.5 block">
                      ${todayInv ? Number(todayInv.price_per_bag_per_day).toFixed(2) : '6.50'}
                    </span>
                  </div>
                </div>

                {/* Accepted types & hours */}
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Open 08:00 – 22:00 daily</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Max Size: <strong className="capitalize">{loc.max_bag_size || 'Large'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {loc.id.slice(0, 12)}...
                </span>

                <button
                  onClick={() => {
                    setSelectedLocation(loc);
                    setInvCapacity(String(todayInv?.total_capacity || 40));
                    setInvPrice(String(todayInv?.price_per_bag_per_day || 6.5));
                    setShowInventoryModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Update Pricing & Slots</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Location */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Storage Location</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. Potsdamer Platz Lockers Hub"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. Alte Potsdamer Str. 7"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Price ($/bag)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newLocPrice}
                    onChange={(e) => setNewLocPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (bags)</label>
                  <input
                    type="number"
                    required
                    value={newLocCapacity}
                    onChange={(e) => setNewLocCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={newLocLat}
                    onChange={(e) => setNewLocLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={newLocLng}
                    onChange={(e) => setNewLocLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Inventory & Pricing */}
      {showInventoryModal && selectedLocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Set Capacity & Price</h3>
                <p className="text-xs text-slate-500">{selectedLocation.name}</p>
              </div>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateInventory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={invDate}
                  onChange={(e) => setInvDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Capacity Slots</label>
                <input
                  type="number"
                  required
                  value={invCapacity}
                  onChange={(e) => setInvCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price Per Bag / Day ($)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={invPrice}
                  onChange={(e) => setInvPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-600"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Updating capacity executes an atomic database transaction that updates daily inventory without disrupting confirmed bookings.
              </p>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInventoryModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Save Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
