import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { baseApi, walletApi } from "../../lib/api";
import { errorMessage } from "./-mansa-types";
import type { Fields, KycFile } from "./-mansa-kyb-types";
import {
  BUSINESS_TYPES,
  COMPANY_REQUIRED,
  INDUSTRY_TYPES,
  MONTHLY_COUNT,
  MONTHLY_VOLUME,
  SINGLE_TX,
  STAKEHOLDER_REQUIRED,
  emptyStakeholder,
  mapUserDataToKyb,
} from "./-mansa-kyb-types";
import {
  CountrySelect,
  Field,
  FileUploader,
  PhoneAreaSelect,
  Select,
  StakeholderCard,
} from "./-mansa-kyb-components";

export function EnterpriseKybForm({
  userId,
  onSubmitted,
}: {
  userId: string;
  onSubmitted: () => void;
}) {
  const [company, setCompany] = useState<Fields>({
    is_long_term: "0",
    business_type: "1",
    industry_type: "T1030001",
    reg_country: "HK",
    phone_area_code: "852",
    operation_region: "HK",
    payment_regions: "NG",
    export_regions: "HK",
    amt_count: "2",
    amt_amt: "2",
    ex_amt: "2",
  });
  const [files, setFiles] = useState<KycFile[]>([]);
  const [stakeholders, setStakeholders] = useState<Fields[]>([
    emptyStakeholder(),
  ]);

  // Fetch full user profile & merchant details from /api/users/${userId}
  const { data: userData, isLoading: loadingUserData, refetch: refetchUserData } = useQuery({
    queryKey: ["admin-user-kyb-details", userId],
    queryFn: async () => {
      const response = await baseApi.get(`/api/users/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });

  const applyAutoFill = (data: any) => {
    if (!data) return;
    const { companyFields, stakeholders: loadedStakeholders } = mapUserDataToKyb(data);
    setCompany((prev) => ({
      ...prev,
      ...companyFields,
    }));
    if (loadedStakeholders.length > 0) {
      setStakeholders(loadedStakeholders);
    }
    toast.success("Auto-filled KYB fields from merchant profile");
  };

  useEffect(() => {
    if (userData) {
      const { companyFields, stakeholders: loadedStakeholders } = mapUserDataToKyb(userData);
      setCompany((prev) => ({
        ...prev,
        ...companyFields,
      }));
      if (loadedStakeholders.length > 0) {
        setStakeholders(loadedStakeholders);
      }
    }
  }, [userData]);

  const setC = (key: string) => (value: string) =>
    setCompany((c) => ({ ...c, [key]: value }));
  const setS = (index: number, key: string, value: string) =>
    setStakeholders((list) =>
      list.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );

  const text = (
    key: string,
    label: string,
    placeholder = "",
    type = "text",
    helper = "",
  ) => (
    <Field label={label} helper={helper}>
      <input
        type={type}
        className="input w-full"
        placeholder={placeholder}
        value={company[key] || ""}
        onChange={(e) => setC(key)(e.target.value)}
      />
    </Field>
  );

  const validate = () => {
    const missing = COMPANY_REQUIRED.filter((k) => !company[k]?.trim());
    if (company.is_long_term !== "1" && !company.expiration_date)
      missing.push("expiration_date");
    if (company.business_type === "7" && !company.business_type_other)
      missing.push("business_type_other");
    if (company.industry_type === "T1030099" && !company.industry_type_other)
      missing.push("industry_type_other");
    if (!files.length) missing.push("at least one KYC document");
    stakeholders.forEach((s, i) => {
      const required = [...STAKEHOLDER_REQUIRED];
      if (s.role === "1") required.push("share_percentage");
      if (s.is_long_term !== "1") required.push("expiration_date");
      if (s.cert_type === "11") required.push("cert_back");
      required
        .filter((k) => !s[k]?.trim())
        .forEach((k) => missing.push(`stakeholder ${i + 1}: ${k}`));
    });
    return missing;
  };

  const submit = useMutation({
    mutationFn: () => {
      const strip = (o: Fields) =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ""));
      return walletApi.post(`/api/admin/mansa/senders/${userId}/kyc`, {
        profile_type: "enterprise",
        kyc: {
          ...strip(company),
          reg_country: company.reg_country.toUpperCase(),
          kyc_files: files.map(({ file_type, file_id }) => ({
            file_type,
            file_id,
          })),
          stakeholder_info: stakeholders.map(strip),
        },
      });
    },
    onSuccess: () => {
      toast.success("KYB submitted - partner review started");
      onSubmitted();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const send = () => {
    const missing = validate();
    if (missing.length) {
      toast.error(
        `Missing: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "..." : ""}`,
      );
      return;
    }
    submit.mutate();
  };

  return (
    <div className="space-y-8 pb-8 max-w-7xl mx-auto">
      {/* Auto-fill Action Banner */}
      <div className="flex items-center justify-between bg-vellum/60 p-4 rounded-xl border border-graphite-hairline">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-purple shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">Merchant Profile Integration</p>
            <p className="text-xs text-slate">
              {loadingUserData
                ? "Loading merchant details and owners..."
                : "Form auto-populated from registered user profile and business owners."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (userData) applyAutoFill(userData);
            else refetchUserData();
          }}
          disabled={loadingUserData}
          className="btn-secondary cursor-pointer text-xs inline-flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingUserData ? "animate-spin" : ""}`} />
          Re-fill from Profile
        </button>
      </div>

      {/* 1. Company General Information */}
      <section className="space-y-4 bg-vellum/30 p-5 rounded-2xl border border-graphite-hairline">
        <h4 className="text-base font-semibold text-ink border-b border-graphite-hairline pb-2">
          1. Company General Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {text("member_name", "Company Legal Name (English)", "Acme Global Limited")}
          {text("name_on_cert", "Name Exactly as on Registration Cert", "Acme Global Ltd")}
          {text("reg_number", "Business Registration / Tax Number", "BR-98765432")}
          <Field label="Registration Country (ISO-2)">
            <CountrySelect
              value={company.reg_country || "HK"}
              onChange={setC("reg_country")}
            />
          </Field>
          {text("province", "Province / State", "Hong Kong Island")}
          {text("city", "City", "Hong Kong")}
          {text("reg_address", "Registered Address", "Unit 1204, Central Tower, Queens Road")}
          {text("postcode", "Postal Code", "999077")}
          {text("actual_operating_address", "Actual Operating Address", "Unit 1204, Central Tower, Queens Road")}
          {text("email", "Company Contact Email", "compliance@acmeglobal.com", "email")}
          <Field label="Phone Dial Code">
            <PhoneAreaSelect
              value={company.phone_area_code || "852"}
              onChange={setC("phone_area_code")}
            />
          </Field>
          {text("phone_num", "Phone Number", "28374650", "tel", "Without dial code or leading zeros")}
          {text("website", "Official Website (Optional)", "https://acmeglobal.com", "url")}
          {text("domestic_entity_name", "Domestic Entity Name (Optional)", "Acme Nigeria Ltd")}
        </div>
      </section>

      {/* 2. Registration & Business Activity */}
      <section className="space-y-4 bg-vellum/30 p-5 rounded-2xl border border-graphite-hairline">
        <h4 className="text-base font-semibold text-ink border-b border-graphite-hairline pb-2">
          2. Registration & Business Activity
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration Date">
            <input
              type="date"
              className="input w-full"
              value={company.effective_date || ""}
              onChange={(e) => setC("effective_date")(e.target.value)}
            />
          </Field>
          <Field label="Registration Expiration Date">
            <input
              type="date"
              className="input w-full"
              disabled={company.is_long_term === "1"}
              value={company.expiration_date || ""}
              onChange={(e) => setC("expiration_date")(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-slate col-span-2">
            <input
              type="checkbox"
              checked={company.is_long_term === "1"}
              onChange={(e) =>
                setC("is_long_term")(e.target.checked ? "1" : "0")
              }
            />{" "}
            Company registration has no expiration date (Long-term)
          </label>
          <Field label="Legal Structure / Business Type">
            <Select
              value={company.business_type || ""}
              onChange={setC("business_type")}
              options={BUSINESS_TYPES}
            />
          </Field>
          {company.business_type === "7" &&
            text("business_type_other", "Specify Other Business Type")}
          <Field label="Industry Classification">
            <Select
              value={company.industry_type || "T1030001"}
              onChange={setC("industry_type")}
              options={INDUSTRY_TYPES}
            />
          </Field>
          {company.industry_type === "T1030099" &&
            text("industry_type_other", "Specify Other Industry")}
          {text("business_scope", "Business Scope Summary", "Cross-border trading and digital payments")}
          {text("business_category", "Business Category / Niche", "B2B Trade & Settlement")}
          <Field label="Main Operating Country">
            <CountrySelect
              value={company.operation_region || "HK"}
              onChange={setC("operation_region")}
            />
          </Field>
          <Field label="Main Source of Incoming Funds">
            <CountrySelect
              value={company.payment_regions || "NG"}
              onChange={setC("payment_regions")}
            />
          </Field>
          <Field label="Main Destination of Outgoing Funds">
            <CountrySelect
              value={company.export_regions || "HK"}
              onChange={setC("export_regions")}
            />
          </Field>
          <Field label="Estimated Monthly Transactions">
            <Select
              value={company.amt_count || ""}
              onChange={setC("amt_count")}
              options={MONTHLY_COUNT}
            />
          </Field>
          <Field label="Estimated Monthly Transaction Volume">
            <Select
              value={company.amt_amt || ""}
              onChange={setC("amt_amt")}
              options={MONTHLY_VOLUME}
            />
          </Field>
          <Field label="Maximum Single Transaction Amount">
            <Select
              value={company.ex_amt || ""}
              onChange={setC("ex_amt")}
              options={SINGLE_TX}
            />
          </Field>
          <div className="col-span-2">
            {text("business_use_case", "Primary Business Use Case", "Supplier payout & liquidity settlement for international trade")}
          </div>
        </div>
      </section>

      {/* 3. Company Verification Documents */}
      <section className="space-y-4 bg-vellum/30 p-5 rounded-2xl border border-graphite-hairline">
        <h4 className="text-base font-semibold text-ink border-b border-graphite-hairline pb-2">
          3. Company Verification Documents
        </h4>
        <FileUploader
          userId={userId}
          onUploaded={(f) => setFiles((list) => [...list, f])}
        />
        {files.length > 0 && (
          <ul className="text-xs space-y-2 bg-paper p-3 rounded-xl border border-graphite-hairline">
            {files.map((f, i) => (
              <li key={f.file_id} className="flex justify-between items-center text-ink">
                <span>
                  📄 <span className="font-medium">{f.name}</span> (Type Code: <code className="bg-vellum px-1.5 py-0.5 rounded font-mono">{f.file_type}</code>)
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-red-600 hover:underline text-xs"
                  onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Stakeholders (Owners, Directors & Signatories) */}
      <section className="space-y-4 bg-vellum/30 p-5 rounded-2xl border border-graphite-hairline">
        <div className="flex items-center justify-between border-b border-graphite-hairline pb-2">
          <h4 className="text-base font-semibold text-ink">
            4. Stakeholders (Beneficial Owners / Directors / Signatories)
          </h4>
          <button
            type="button"
            className="btn-secondary cursor-pointer"
            onClick={() => setStakeholders((l) => [...l, emptyStakeholder()])}
          >
            + Add Stakeholder
          </button>
        </div>
        <div className="space-y-4">
          {stakeholders.map((s, i) => (
            <StakeholderCard
              key={i}
              stakeholder={s}
              index={i}
              totalCount={stakeholders.length}
              userId={userId}
              onUpdate={setS}
              onRemove={(index) =>
                setStakeholders((l) => l.filter((_, j) => j !== index))
              }
            />
          ))}
        </div>
      </section>

      {/* Submit Action */}
      <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-paper/90 backdrop-blur-md p-4 rounded-xl border-t border-graphite-hairline z-20">
        <button
          className="btn-primary cursor-pointer px-8 py-2.5 text-sm font-medium"
          disabled={submit.isPending}
          onClick={send}
        >
          {submit.isPending ? "Submitting KYB Application..." : "Submit Full KYB Application"}
        </button>
      </div>
    </div>
  );
}
