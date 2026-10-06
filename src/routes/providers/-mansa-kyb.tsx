import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { walletApi } from "../../lib/api";
import { errorMessage } from "./-mansa-types";
import type { Fields, KycFile } from "./-mansa-kyb-types";
import {
  BUSINESS_TYPES,
  COMPANY_REQUIRED,
  MONTHLY_COUNT,
  MONTHLY_VOLUME,
  SINGLE_TX,
  STAKEHOLDER_REQUIRED,
  emptyStakeholder,
} from "./-mansa-kyb-types";
import {
  Field,
  FileUploader,
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
    business_type: "",
  });
  const [files, setFiles] = useState<KycFile[]>([]);
  const [stakeholders, setStakeholders] = useState<Fields[]>([
    emptyStakeholder(),
  ]);

  const setC = (key: string) => (value: string) =>
    setCompany((c) => ({ ...c, [key]: value }));
  const setS = (index: number, key: string, value: string) =>
    setStakeholders((list) =>
      list.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  const text = (key: string, label: string, placeholder = "") => (
    <Field label={label}>
      <input
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
    <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
      <section className="space-y-2">
        <h4 className="text-sm text-ink">Company</h4>
        <div className="grid grid-cols-2 gap-3">
          {text("member_name", "Company name (English)")}
          {text("name_on_cert", "Name exactly as on certificate")}
          {text("reg_number", "Registration number")}
          {text("reg_country", "Registration country (ISO-2)", "HK")}
          {text("province", "Province / state")}
          {text("city", "City")}
          {text("reg_address", "Registered address (with unit no.)")}
          {text("postcode", "Postcode")}
          {text("actual_operating_address", "Operating address")}
          {text("email", "Email")}
          {text("phone_area_code", "Phone area code (no +)", "852")}
          {text("phone_num", "Phone number")}
          {text("website", "Website (optional)")}
          {text("domestic_entity_name", "Domestic entity name (optional)")}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm text-ink">Registration & business</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration date">
            <input
              type="date"
              className="input w-full"
              value={company.effective_date || ""}
              onChange={(e) => setC("effective_date")(e.target.value)}
            />
          </Field>
          <Field label="Expiration date">
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
            Long-term (no expiry)
          </label>
          <Field label="Business type">
            <Select
              value={company.business_type || ""}
              onChange={setC("business_type")}
              options={BUSINESS_TYPES}
            />
          </Field>
          {company.business_type === "7" &&
            text("business_type_other", "Business type (other)")}
          {text("industry_type", "Industry code", "T1030001")}
          {company.industry_type === "T1030099" &&
            text("industry_type_other", "Industry (other)")}
          {text("business_scope", "Business scope")}
          {text("business_category", "Business category")}
          {text(
            "operation_region",
            "Operation regions (ISO-2, comma-separated)",
            "HK,NG",
          )}
          {text("payment_regions", "Main source of incoming funds")}
          {text("export_regions", "Main destination of outgoing funds")}
          <Field label="Monthly transaction count">
            <Select
              value={company.amt_count || ""}
              onChange={setC("amt_count")}
              options={MONTHLY_COUNT}
            />
          </Field>
          <Field label="Monthly volume">
            <Select
              value={company.amt_amt || ""}
              onChange={setC("amt_amt")}
              options={MONTHLY_VOLUME}
            />
          </Field>
          <Field label="Single transaction amount">
            <Select
              value={company.ex_amt || ""}
              onChange={setC("ex_amt")}
              options={SINGLE_TX}
            />
          </Field>
          <div className="col-span-2">
            {text("business_use_case", "Business use case")}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm text-ink">Company documents</h4>
        <FileUploader
          userId={userId}
          onUploaded={(f) => setFiles((list) => [...list, f])}
        />
        <ul className="text-xs text-slate space-y-1">
          {files.map((f, i) => (
            <li key={f.file_id} className="flex justify-between">
              <span>
                {f.name} ({f.file_type})
              </span>
              <button
                type="button"
                className="cursor-pointer text-red-600"
                onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm text-ink">
            Stakeholders (owners / directors / signatories)
          </h4>
          <button
            type="button"
            className="btn-secondary cursor-pointer"
            onClick={() => setStakeholders((l) => [...l, emptyStakeholder()])}
          >
            Add stakeholder
          </button>
        </div>
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
      </section>

      <div className="flex justify-end">
        <button
          className="btn-primary cursor-pointer"
          disabled={submit.isPending}
          onClick={send}
        >
          {submit.isPending ? "Submitting..." : "Submit KYB"}
        </button>
      </div>
    </div>
  );
}
