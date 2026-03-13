import { Button } from "@/components/ui/button";
import { api, API_URL } from "@/config";
import { useBusiness } from "@/contexts/business-context";
import { useI18n } from "@/i18n";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Check, Percent, Phone, Store } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/settings/")({
  component: () => (
    <AuthGuard allowedRoles={["admin"]}>
      <AdminSettings />
    </AuthGuard>
  ),
});

export default function AdminSettings() {
  const { businessType, setBusinessType } = useBusiness();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serviceFeePercent, setServiceFeePercent] = useState(0);
  const [businessName, setBusinessName] = useState("POS System");
  const [businessPhone, setBusinessPhone] = useState("+998");

  const { t } = useI18n();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [feeRes, profileRes] = await Promise.all([
          fetch(`${API_URL}${api.admin.base}/system-config/service-fee`),
          fetch(`${API_URL}${api.admin.base}/system-config/restaurant-profile`),
        ]);
        if (feeRes.ok) {
          const feeData = await feeRes.json();
          setServiceFeePercent(Number(feeData?.value || 0));
        }
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setBusinessName(profileData?.business_name || "POS System");
          setBusinessPhone(profileData?.business_phone || "+998");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    loadSettings();
  }, []);

  const handleUpdate = async (type: "restaurant" | "market") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}${api.admin.base}/system-config/business-type`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_type: type }),
        },
      );

      if (res.ok) {
        setBusinessType(type);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update:", err);
      alert(t("common.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeeUpdate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}${api.admin.base}/system-config/service-fee`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service_fee_percent: serviceFeePercent }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update fee");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update service fee:", err);
      alert(t("common.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileUpdate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}${api.admin.base}/system-config/restaurant-profile`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: businessName.trim(),
            business_phone: businessPhone.trim(),
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update restaurant profile:", err);
      alert(t("common.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-800">
          <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-gray-100">
            {t(`admin.settings.title`)}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {t(`admin.settings.selectBusinessType`)}
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleUpdate("restaurant")}
                disabled={isSubmitting}
                className={`relative p-8 rounded-2xl border-2 transition-all text-left ${
                  businessType === "restaurant"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-lg"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
              >
                {businessType === "restaurant" && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-2">
                    <Check className="size-5" />
                  </div>
                )}
                <Building2
                  className={`size-16 mx-auto mb-4 ${businessType === "restaurant" ? "text-blue-600" : "text-gray-400 dark:text-gray-500"}`}
                />
                <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-gray-100">
                  {t(`admin.settings.restaurant`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`admin.settings.restaurant_desc`)}
                </p>
                <ul className="mt-4 text-sm text-gray-700 dark:text-gray-200 text-left space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.restaurant_feature_table_required`)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.restaurant_feature_table_management`)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.restaurant_feature_waiter`)}
                  </li>
                </ul>
              </button>

              <button
                onClick={() => handleUpdate("market")}
                disabled={isSubmitting}
                className={`relative p-8 rounded-2xl border-2 transition-all text-left ${
                  businessType === "market"
                    ? "border-green-600 bg-green-50 dark:bg-green-900/30 shadow-lg"
                    : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
              >
                {businessType === "market" && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white rounded-full p-2">
                    <Check className="size-5" />
                  </div>
                )}
                <Store
                  className={`size-16 mx-auto mb-4 ${businessType === "market" ? "text-green-600" : "text-gray-400 dark:text-gray-500"}`}
                />
                <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-gray-100">
                  {t(`admin.settings.market`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`admin.settings.market_desc`)}
                </p>
                <ul className="mt-4 text-sm text-gray-700 dark:text-gray-200 text-left space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.market_feature_no_table`)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.market_feature_fast_service`)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-green-600" />
                    {t(`admin.settings.market_feature_simple_trade`)}
                  </li>
                </ul>
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-4 mt-6">
              <div className="flex gap-3">
                <div className="text-amber-600 text-xl">⚠️</div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1">
                    {t(`admin.settings.warning_title`)}
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t(`admin.settings.warning_text`)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mt-6 border border-gray-200 dark:border-gray-700">
              <h4 className="font-bold mb-3 text-gray-900 dark:text-gray-100">
                {t(`admin.settings.current_status`)}
              </h4>
              <div className="flex items-center gap-3">
                {businessType === "restaurant" ? (
                  <>
                    <Building2 className="size-6 text-blue-600" />
                    <span className="font-bold text-blue-600">
                      {t(`admin.settings.restaurant_active`)}
                    </span>
                  </>
                ) : (
                  <>
                    <Store className="size-6 text-green-600" />
                    <span className="font-bold text-green-600">
                      {t(`admin.settings.market_active`)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 mt-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Phone className="size-5 text-blue-600" />
                <h4 className="font-bold text-gray-900 dark:text-gray-100">
                  Receipt Header
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                These values are printed on customer receipts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Restaurant Title
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base font-semibold text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="w-full h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-base font-semibold text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleProfileUpdate}
                  disabled={
                    isSubmitting ||
                    !businessName.trim() ||
                    !businessPhone.trim()
                  }
                >
                  Save Receipt Header
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-5 mt-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <Percent className="size-5 text-orange-600" />
                <h4 className="font-bold text-gray-900 dark:text-gray-100">
                  Service Fee
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                This percentage is applied automatically to new staff orders.
              </p>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service Fee Percent
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={serviceFeePercent}
                      onChange={(e) =>
                        setServiceFeePercent(
                          Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0),
                          ),
                        )
                      }
                      className="w-32 h-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-lg font-bold text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      %
                    </span>
                  </div>
                </div>
                <Button onClick={handleFeeUpdate} disabled={isSubmitting}>
                  Save Fee
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="fixed top-8 right-8 bg-green-600 text-white px-6 py-4 md:px-8 md:py-6 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce z-50">
          <Check className="size-10" />
          <span className="font-black text-lg md:text-2xl">
            {t(`admin.settings.success_saved`)}
          </span>
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t(`admin.settings.saving`)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
