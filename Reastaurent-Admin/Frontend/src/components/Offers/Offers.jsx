import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { OFFERS_SETTINGS } from "../../Utils/Constant";
import fetchWithRefreshToken from "../../Utils/fetchWithRefreshToken";
import PageHeader from "../common/PageHeader";

function Offers() {
  const [form, setForm] = useState({
    is_enabled: true,
    promo_title: "Free Delivery on 1st Order",
    promo_message: "Welcome! Enjoy free delivery on your first order with us. Use code FREE1ST at checkout.",
    coupon_code: "FREE1ST",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const applySettings = (settings = {}) => {
    setForm({
      is_enabled: Number(settings.is_enabled) === 1,
      promo_title: settings.promo_title || "Free Delivery on 1st Order",
      promo_message: settings.promo_message || "",
      coupon_code: settings.coupon_code || "FREE1ST",
    });
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithRefreshToken(OFFERS_SETTINGS);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load offers settings");
      }

      applySettings(data.data || {});
    } catch (error) {
      toast.error(error.message || "Failed to load offers settings");
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
      const response = await fetchWithRefreshToken(OFFERS_SETTINGS, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_enabled: form.is_enabled,
          promo_title: form.promo_title.trim(),
          promo_message: form.promo_message.trim(),
          coupon_code: form.coupon_code.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to save offers settings");
      }

      applySettings(data.data || {});
      toast.success("Welcome offers settings saved successfully");
    } catch (error) {
      toast.error(error.message || "Failed to save offers settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Offers & Promotions"
          subtitle="Configure welcome promotions and discounts shown to first-time customer portal visitors."
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
        title="Offers & Promotions"
        subtitle="Manage popup rules, discount descriptions, and coupon availability for new customers."
      />

      <form
        className="grid gap-5 rounded-[8px] border border-[rgba(148,163,184,0.22)] bg-white/82 p-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-[12px]"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid min-w-0 max-w-[760px] content-start gap-[18px]">
            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Promotion Title</span>
              <input
                type="text"
                value={form.promo_title}
                onChange={(event) => setFieldValue("promo_title", event.target.value)}
                placeholder="e.g. Free Delivery on 1st Order"
                required
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Coupon Code</span>
              <input
                type="text"
                value={form.coupon_code}
                onChange={(event) => setFieldValue("coupon_code", event.target.value)}
                placeholder="e.g. FREE1ST"
                required
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none uppercase focus:border-orange-500"
              />
            </div>

            <div className="grid gap-2">
              <span className="text-[0.92rem] font-semibold text-slate-600">Welcome Message & Instructions</span>
              <textarea
                value={form.promo_message}
                onChange={(event) => setFieldValue("promo_message", event.target.value)}
                placeholder="Welcome to our restaurant! Use code FREE1ST at checkout for free delivery on your first order."
                rows={5}
                className="w-full max-w-[720px] rounded-[8px] border border-slate-300 bg-white px-[14px] py-3 text-slate-900 outline-none focus:border-orange-500 resize-y"
              />
            </div>
          </div>

          <div className="grid min-w-0 max-w-[400px] content-start gap-[18px]">
            <div className="grid gap-4 rounded-[8px] border border-slate-200 bg-white p-[18px]">
              <strong className="text-[#1f2937]">Promotion Settings</strong>
              <label className="grid gap-2 rounded-[8px] border border-slate-200 bg-white p-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <strong className="text-[#1f2937]">Welcome Popup</strong>
                    <span className="text-[0.88rem] text-slate-500">
                      Enable or disable the first-order welcome popup for new visitors.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`inline-flex w-fit items-center gap-2.5 rounded-full border border-slate-300 px-[14px] py-2 pl-2 ${
                      form.is_enabled ? "bg-emerald-50 text-green-800" : "bg-white text-slate-700"
                    }`}
                    onClick={() => setFieldValue("is_enabled", !form.is_enabled)}
                  >
                    <span
                      className={`h-6 w-6 rounded-full transition-all duration-200 ${
                        form.is_enabled ? "bg-green-500 transform translate-x-0" : "bg-slate-400"
                      }`}
                    />
                    {form.is_enabled ? "Active" : "Disabled"}
                  </button>
                </div>
              </label>
            </div>

            <div className="rounded-[8px] border border-blue-100 bg-blue-50/50 p-[18px]">
              <h4 className="text-blue-900 font-semibold m-0 flex items-center gap-1.5 text-sm">
                💡 Configuration Guidelines
              </h4>
              <p className="text-xs text-blue-700 leading-relaxed mt-2 mb-0">
                This promotion uses the email entered by users during signup/checkout to determine eligibility. 
                If the email is not registered in the customers database, the configured welcome popup will trigger. 
                Keep titles short and coupon codes concise for premium customer readability.
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

export default Offers;
