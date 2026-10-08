import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { baseApi, walletApi } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { errorMessage, type Sender } from "./-mansa-types";
import type { Fields } from "./-mansa-kyb-types";
import {
  CERT_TYPES,
  COUNTRY_OPTIONS,
  KYC_FILE_TYPES,
  PHONE_AREA_CODES,
  ROLES,
  mapUserDataToKyb,
} from "./-mansa-kyb-types";
import { EnterpriseKybForm } from "./-mansa-kyb";

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
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
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

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function RegisterModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [pickerPage, setPickerPage] = useState(1);
  const [merchant, setMerchant] = useState<any | null>(null);
  const [mode, setMode] = useState<"create" | "link">("create");
  const [linkId, setLinkId] = useState("");
  const [form, setForm] = useState({
    profile_type: "enterprise",
    legal_name: "",
    country_code: "",
    registration_number: "",
    address: "",
    contact_email: "",
    contact_phone: "",
  });

  const { data: result } = useQuery({
    queryKey: ["admin-mansa-merchants", debouncedSearch, pickerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get("/api/admin/mansa/merchants", {
        params: { search: debouncedSearch, page: pickerPage, limit: 10 },
      });
      return response.data as {
        data: any[];
        pagination: any;
      };
    },
    enabled: !merchant,
  });
  const merchants = result?.data || [];
  const totalPages = result?.pagination?.totalPages || 1;

  // Fetch full user/merchant profile on pick to auto-fill registration fields
  const { data: userProfileData, isLoading: loadingProfile } = useQuery({
    queryKey: ["admin-user-profile-prefetch", merchant?.user_id],
    queryFn: async () => {
      const response = await baseApi.get(`/api/users/${merchant.user_id}`);
      return response.data.data;
    },
    enabled: !!merchant?.user_id,
  });

  useEffect(() => {
    if (userProfileData) {
      const { companyFields } = mapUserDataToKyb(userProfileData);
      setForm((f) => ({
        ...f,
        legal_name: companyFields.member_name || f.legal_name,
        country_code: companyFields.reg_country || f.country_code,
        registration_number: companyFields.reg_number || f.registration_number,
        address: companyFields.reg_address || f.address,
        contact_email: companyFields.email || f.contact_email,
        contact_phone: companyFields.phone_num || f.contact_phone,
      }));
    }
  }, [userProfileData]);

  const register = useMutation({
    mutationFn: () =>
      walletApi.post(
        `/api/admin/mansa/senders/${merchant!.user_id}`,
        mode === "link"
          ? { sender_profile_id: linkId.trim() }
          : {
              sender: {
                ...Object.fromEntries(
                  Object.entries(form).filter(([, v]) => v.trim() !== ""),
                ),
                country_code: form.country_code.toUpperCase(),
              },
            },
      ),
    onSuccess: () => {
      toast.success("Sender registered");
      onDone();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canSubmit =
    !!merchant &&
    (mode === "link"
      ? !!linkId.trim()
      : !!form.legal_name.trim() && form.country_code.length === 2);

  return (
    <Modal isOpen onClose={onClose} title="Register Mansa sender" size="lg">
      <div className="space-y-4">
        {merchant ? (
          <div className="flex items-center justify-between bg-vellum/40 p-3 rounded-xl border border-graphite-hairline">
            <div>
              <p className="text-sm font-medium text-ink">
                {merchant.merchant_name || "Unnamed merchant"}
              </p>
              <p className="text-xs text-slate">{merchant.email}</p>
              {loadingProfile && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink mt-1 bg-vellum/60 px-2 py-0.5 rounded-md w-fit">
                  <Loader2 className="w-3 h-3 animate-spin text-ink" />
                  <span>Fetching profile data to auto-populate form...</span>
                </div>
              )}
            </div>
            <button
              className="btn-secondary cursor-pointer text-xs"
              onClick={() => setMerchant(null)}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="Search merchant by business name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickerPage(1);
              }}
              autoFocus
            />
            <ul className="divide-y divide-graphite-hairline max-h-56 overflow-y-auto">
              {merchants.map((m) => (
                <li key={m.user_id}>
                  <button
                    type="button"
                    onClick={() => setMerchant(m)}
                    className="w-full text-left py-2 px-1 hover:bg-vellum cursor-pointer"
                  >
                    <p className="text-sm text-ink font-medium">
                      {m.merchant_name || "Unnamed merchant"}
                    </p>
                    <p className="text-xs text-slate">{m.email}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-slate">
              <button
                type="button"
                className="btn-secondary cursor-pointer"
                disabled={pickerPage <= 1}
                onClick={() => setPickerPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {pickerPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary cursor-pointer"
                disabled={pickerPage >= totalPages}
                onClick={() => setPickerPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === "create"}
              onChange={() => setMode("create")}
            />{" "}
            Create new sender
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={mode === "link"}
              onChange={() => setMode("link")}
            />{" "}
            Link existing Mansa sender
          </label>
        </div>

        {mode === "link" ? (
          <input
            className="input w-full"
            placeholder="Mansa sender profile ID (UUID)"
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <select
              className="input"
              value={form.profile_type}
              onChange={(e) =>
                setForm({ ...form, profile_type: e.target.value })
              }
            >
              <option value="enterprise">Enterprise</option>
              <option value="individual">Individual</option>
            </select>
            <input
              className="input"
              placeholder="Country code (e.g. NG)"
              maxLength={2}
              value={form.country_code}
              onChange={(e) =>
                setForm({ ...form, country_code: e.target.value })
              }
            />
            <input
              className="input col-span-2"
              placeholder="Legal name"
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Registration number"
              value={form.registration_number}
              onChange={(e) =>
                setForm({ ...form, registration_number: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Contact email"
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Contact phone"
              value={form.contact_phone}
              onChange={(e) =>
                setForm({ ...form, contact_phone: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary cursor-pointer"
            disabled={!canSubmit || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? "Registering..." : "Register"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function KycModal({
  sender,
  onClose,
  onDone,
}: {
  sender: Sender;
  onClose: () => void;
  onDone: () => void;
}) {
  const [profileType, setProfileType] = useState("enterprise");
  const [payload, setPayload] = useState("{\n  \n}");

  const submit = useMutation({
    mutationFn: () =>
      walletApi.post(`/api/admin/mansa/senders/${sender.user_id}/kyc`, {
        profile_type: profileType,
        kyc: JSON.parse(payload),
      }),
    onSuccess: () => {
      toast.success("KYC submitted");
      onDone();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const send = () => {
    try {
      JSON.parse(payload);
    } catch {
      toast.error("KYC payload must be valid JSON");
      return;
    }
    submit.mutate();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Submit KYC - ${sender.merchant_name || sender.merchant_email || "merchant"}`}
      size="full"
    >
      <div className="space-y-4">
        <select
          className="input"
          value={profileType}
          onChange={(e) => setProfileType(e.target.value)}
        >
          <option value="enterprise">Enterprise KYC</option>
          <option value="individual">Personal KYC</option>
        </select>
        {profileType === "enterprise" ? (
          <EnterpriseKybForm
            userId={sender.user_id}
            onSubmitted={() => {
              onDone();
              onClose();
            }}
          />
        ) : (
          <textarea
            className="input w-full font-mono text-xs"
            rows={14}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Mansa personal KYC payload (JSON)"
          />
        )}
        {profileType === "individual" && (
          <div className="flex justify-end gap-2">
            <button className="btn-secondary cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary cursor-pointer"
              disabled={submit.isPending}
              onClick={send}
            >
              {submit.isPending ? "Submitting..." : "Submit KYC"}
            </button>
          </div>
        )}
      </div>
    </Modal>
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
