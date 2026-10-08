import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { walletApi } from "../../lib/api";
import { errorMessage } from "./-mansa-types";
import type { Fields } from "./-mansa-kyb-types";
import {
  CERT_TYPES,
  COUNTRY_OPTIONS,
  KYC_FILE_TYPES,
  PHONE_AREA_CODES,
  ROLES,
} from "./-mansa-kyb-types";

export function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs text-slate space-y-1">
      <span className="font-medium text-ink/90">{label}</span>
      {children}
      {helper && <span className="block text-[11px] text-slate/70">{helper}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "input w-full",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={COUNTRY_OPTIONS}
      placeholder={placeholder}
    />
  );
}

export function PhoneAreaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={PHONE_AREA_CODES}
      placeholder="Dial code..."
    />
  );
}

export function FileUploader({
  userId,
  defaultFileType = "1",
  onUploaded,
}: {
  userId: string;
  defaultFileType?: string;
  onUploaded: (file: {
    file_id: string;
    file_type: string;
    name: string;
  }) => void;
}) {
  const [fileType, setFileType] = useState(defaultFileType);
  const [customType, setCustomType] = useState("");

  const effectiveType = fileType === "99" ? customType.trim() : fileType;

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("fileType", effectiveType);
      const response = await walletApi.post(
        `/api/admin/mansa/senders/${userId}/files`,
        form,
      );
      return {
        file_id: response.data.data.file_id as string,
        file_type: effectiveType,
        name: file.name,
      };
    },
    onSuccess: (uploaded) => {
      toast.success(`Uploaded ${uploaded.name}`);
      onUploaded(uploaded);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex flex-wrap gap-2 items-center bg-vellum/50 p-2 rounded-lg border border-graphite-hairline">
      <Select
        value={fileType}
        onChange={setFileType}
        options={KYC_FILE_TYPES}
        placeholder="Select document type..."
        className="input text-xs max-w-xs"
      />
      {fileType === "99" && (
        <input
          className="input text-xs w-32"
          placeholder="Type code"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
        />
      )}
      <input
        type="file"
        className="text-xs file:btn-secondary file:text-xs file:py-1 file:px-2 file:cursor-pointer"
        disabled={!effectiveType || upload.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
      {upload.isPending && (
        <span className="text-xs text-slate animate-pulse">Uploading...</span>
      )}
    </div>
  );
}

export function StakeholderCard({
  stakeholder: s,
  index: i,
  totalCount,
  userId,
  onUpdate: setS,
  onRemove,
}: {
  stakeholder: Fields;
  index: number;
  totalCount: number;
  userId: string;
  onUpdate: (index: number, key: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const f = (
    key: string,
    label: string,
    type = "text",
    placeholder = "",
    helper = "",
  ) => (
    <Field label={label} helper={helper}>
      <input
        type={type}
        className="input w-full"
        placeholder={placeholder}
        value={s[key] || ""}
        onChange={(e) => setS(i, key, e.target.value)}
      />
    </Field>
  );

  return (
    <div className="border border-graphite-hairline bg-paper rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex justify-between items-center text-xs font-semibold text-ink border-b border-graphite-hairline pb-2">
        <span>Stakeholder #{i + 1}</span>
        {totalCount > 1 && (
          <button
            type="button"
            className="cursor-pointer text-red-600 hover:underline"
            onClick={() => onRemove(i)}
          >
            Remove stakeholder
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <Select
            value={s.role}
            onChange={(v) => setS(i, "role", v)}
            options={ROLES}
          />
        </Field>
        {f("name", "Full legal name", "text", "John Doe")}
        <Field label="Gender">
          <Select
            value={s.gender}
            onChange={(v) => setS(i, "gender", v)}
            options={[
              ["1", "Male"],
              ["2", "Female"],
            ]}
          />
        </Field>
        {f("birthday", "Date of birth", "date")}
        <Field label="Nationality">
          <CountrySelect
            value={s.nationality}
            onChange={(v) => setS(i, "nationality", v)}
          />
        </Field>
        <Field label="Document issuing country">
          <CountrySelect
            value={s.document_issuing_country}
            onChange={(v) => setS(i, "document_issuing_country", v)}
          />
        </Field>
        <Field label="ID document type">
          <Select
            value={s.cert_type}
            onChange={(v) => setS(i, "cert_type", v)}
            options={CERT_TYPES}
          />
        </Field>
        {f("cert_num", "ID number", "text", "A12345678")}
        {f("effective_date", "ID issue date", "date")}
        <Field label="ID expiry date">
          <input
            type="date"
            className="input w-full"
            disabled={s.is_long_term === "1"}
            value={s.expiration_date || ""}
            onChange={(e) => setS(i, "expiration_date", e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-slate col-span-2">
          <input
            type="checkbox"
            checked={s.is_long_term === "1"}
            onChange={(e) =>
              setS(i, "is_long_term", e.target.checked ? "1" : "0")
            }
          />{" "}
          ID has no expiration date (Long-term)
        </label>
        <Field label="Residence country">
          <CountrySelect
            value={s.residence_area}
            onChange={(v) => setS(i, "residence_area", v)}
          />
        </Field>
        {f("province", "Province / state", "text", "Lagos")}
        {f("city", "City", "text", "Ikeja")}
        {f("address", "Residential address", "text", "12 Broad Street, Suite 4")}
        {s.role === "1" &&
          f("share_percentage", "Share percentage (%)", "number", "25.00", "Must be > 0 for UBO")}
      </div>

      <div className="space-y-3 pt-2 border-t border-graphite-hairline">
        <div>
          <p className="text-xs font-medium text-ink mb-1">
            ID Document Front {s.cert_front ? "✓ Uploaded" : "(Required)"}
          </p>
          <FileUploader
            userId={userId}
            defaultFileType="11"
            onUploaded={(u) => setS(i, "cert_front", u.file_id)}
          />
        </div>
        {s.cert_type === "11" && (
          <div>
            <p className="text-xs font-medium text-ink mb-1">
              ID Document Back {s.cert_back ? "✓ Uploaded" : "(Required for ID Card)"}
            </p>
            <FileUploader
              userId={userId}
              defaultFileType="11"
              onUploaded={(u) => setS(i, "cert_back", u.file_id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
