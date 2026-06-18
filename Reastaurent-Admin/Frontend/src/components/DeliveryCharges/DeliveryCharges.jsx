import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DELIVERY_CHARGES_SETTINGS } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import PageHeader from "../common/PageHeader";

function DeliveryCharges() {
  const [form, setForm] = useState({
    base_charge: 30.00,
    charge_per_km: 10.00,
    free_delivery_threshold: 500.00,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const applySettings = (settings = {}) => {
    setForm({
      base_charge: Number(settings.base_charge) || 0,
      charge_per_km: Number(settings.charge_per_km) || 0,
      free_delivery_threshold: Number(settings.free_delivery_threshold) || 0,
    });
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithRefreshToken(DELIVERY_CHARGES_SETTINGS);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load delivery charges settings");
      }

      applySettings(data.data || {});
    } catch (error) {
      toast.error(error.message || "Failed to load delivery charges settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setFieldValue = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetchWithRefreshToken(DELIVERY_CHARGES_SETTINGS, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base_charge: Number(form.base_charge),
          charge_per_km: Number(form.charge_per_km),
          free_delivery_threshold: Number(form.free_delivery_threshold),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save delivery charges settings");
      }

      applySettings(data.data || {});
      toast.success("Delivery charges configuration saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save delivery charges settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Delivery Charges"
          subtitle="Configure base and distance-based delivery fees for online orders."
        />
        <div className="rounded-[8px] border border-[rgba(148,163,184,0.22)] bg-white/82 p-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-[12px]">
          <div className="grid min-h-[220px] place-items-center p-7 text-center">
            <div className="h-[42px] w-[42px] animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Delivery Charges"
        subtitle="Manage distance rates, base delivery costs, and free delivery thresholds for online ordering."
      />

      <form
        className="grid gap-5 rounded-[8px] border border-[rgba(148,163,184,0.22)] bg-white/82 p-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-[12px]"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid min-w-0 max-w-[760px] content-start gap-[18px]">
            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Base Delivery Fee (Rs)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.base_charge}
                onChange={(event) => setFieldValue("base_charge", event.target.value)}
                placeholder="e.g. 30.00"
                required
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Distance-Based Charge (Rs per KM)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.charge_per_km}
                onChange={(event) => setFieldValue("charge_per_km", event.target.value)}
                placeholder="e.g. 10.00"
                required
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Free Delivery Minimum Threshold (Rs)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.free_delivery_threshold}
                onChange={(event) => setFieldValue("free_delivery_threshold", event.target.value)}
                placeholder="e.g. 500.00"
                required
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid min-w-0 max-w-[400px] content-start gap-[18px]">
            <div className="rounded-[8px] border border-blue-100 bg-blue-50/50 p-[18px]">
              <h4 className="text-blue-900 font-semibold m-0 flex items-center gap-1.5 text-sm">
                ℹ️ Delivery Formula
              </h4>
              <p className="text-xs text-blue-700 leading-relaxed mt-2 mb-0">
                The total delivery cost for a customer order is calculated as:
                <br />
                <strong className="block my-1 text-blue-800">
                  Delivery Charge = Base Fee + (Distance in KM &times; Charge per KM)
                </strong>
                If the order subtotal exceeds the <strong>Free Delivery Minimum Threshold</strong>, the delivery fee is automatically set to Rs 0.00.
                <br /><br />
                Additionally, for first-time signups, the delivery charges are fully excluded on their first order.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2.5">
          <button
            type="submit"
            className="rounded-[8px] border-0 bg-orange-500 px-6 py-[12px] font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isSaving}
          >
            {isSaving ? "Saving Settings..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeliveryCharges;
