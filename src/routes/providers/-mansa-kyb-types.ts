export type { Sender } from "./-mansa-types";

export type Fields = Record<string, string>;

export interface KycFile {
  file_type: string;
  file_id: string;
  name: string;
}

export interface IsoCountry {
  code: string;
  name: string;
  dial: string;
}

export const ISO_COUNTRIES: IsoCountry[] = [
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'HK', name: 'Hong Kong', dial: '852' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'GH', name: 'Ghana', dial: '233' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'SG', name: 'Singapore', dial: '65' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'CN', name: 'China', dial: '86' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'AU', name: 'Australia', dial: '61' },
  { code: 'JP', name: 'Japan', dial: '81' },
  { code: 'NL', name: 'Netherlands', dial: '31' },
  { code: 'CH', name: 'Switzerland', dial: '41' },
  { code: 'IE', name: 'Ireland', dial: '353' },
  { code: 'RW', name: 'Rwanda', dial: '250' },
  { code: 'UG', name: 'Uganda', dial: '256' },
  { code: 'TZ', name: 'Tanzania', dial: '255' },
  { code: 'EG', name: 'Egypt', dial: '20' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '225' },
  { code: 'SN', name: 'Senegal', dial: '221' },
  { code: 'CM', name: 'Cameroon', dial: '237' },
];

export const COUNTRY_OPTIONS: string[][] = ISO_COUNTRIES.map((c) => [
  c.code,
  `${c.name} (${c.code})`,
]);

export const PHONE_AREA_CODES: string[][] = ISO_COUNTRIES.map((c) => [
  c.dial,
  `+${c.dial} — ${c.name}`,
]);

export const BUSINESS_TYPES = [
  ["1", "Limited company"],
  ["2", "LLC"],
  ["3", "Sole proprietorship"],
  ["4", "Listed company"],
  ["5", "Unlisted stock company"],
  ["6", "State-owned"],
  ["7", "Other"],
];

export const INDUSTRY_TYPES = [
  ["T1030001", "T1030001 — E-Commerce / Online Retail"],
  ["T1030002", "T1030002 — Financial Services & Fintech"],
  ["T1030003", "T1030003 — Information Technology & Software"],
  ["T1030004", "T1030004 — Import / Export & International Trade"],
  ["T1030005", "T1030005 — Professional Services & Consulting"],
  ["T1030006", "T1030006 — Logistics, Freight & Supply Chain"],
  ["T1030007", "T1030007 — Gaming & Entertainment"],
  ["T1030008", "T1030008 — Education & Training"],
  ["T1030009", "T1030009 — Travel, Tourism & Hospitality"],
  ["T1030010", "T1030010 — Manufacturing & Industrial"],
  ["T1030099", "T1030099 — Other (Requires explanation)"],
];

export const MONTHLY_COUNT = [
  ["1", "> 1,000 transactions"],
  ["2", "100 - 1,000 transactions"],
  ["3", "1 - 99 transactions"],
];

export const MONTHLY_VOLUME = [
  ["1", "> USD 4M"],
  ["2", "USD 300k - 999,999"],
  ["3", "> USD 1M"],
];

export const SINGLE_TX = [
  ["1", "> USD 100k"],
  ["2", "USD 10k - 99,999"],
  ["3", "USD 0 - 1M"],
];

export const ROLES = [
  ["1", "Ultimate beneficiary (UBO)"],
  ["2", "Director"],
  ["3", "Authorized signatory"],
];

export const CERT_TYPES = [
  ["11", "ID card (National / Resident ID)"],
  ["13", "Passport"],
  ["14", "Driver's license"],
];

export const KYC_FILE_TYPES = [
  ["1", "1 — Certificate of Incorporation / Business Registration"],
  ["2", "2 — Articles of Association (M&A)"],
  ["3", "3 — Register of Directors / Members"],
  ["4", "4 — Shareholder / Ownership Structure Chart"],
  ["5", "5 — Bank Statement / Proof of Operating Address"],
  ["6", "6 — Financial Statements / Audit Report"],
  ["7", "7 — Regulatory License / Permit"],
  ["8", "8 — Director / Board Resolution"],
  ["99", "99 — Other Supporting Document"],
];

export const COMPANY_REQUIRED = [
  "member_name",
  "name_on_cert",
  "reg_country",
  "province",
  "city",
  "reg_address",
  "postcode",
  "actual_operating_address",
  "reg_number",
  "phone_area_code",
  "phone_num",
  "email",
  "effective_date",
  "business_type",
  "industry_type",
  "business_scope",
  "business_category",
  "operation_region",
  "payment_regions",
  "export_regions",
  "amt_count",
  "amt_amt",
  "ex_amt",
  "business_use_case",
];

export const STAKEHOLDER_REQUIRED = [
  "role",
  "name",
  "gender",
  "nationality",
  "document_issuing_country",
  "cert_type",
  "cert_num",
  "effective_date",
  "cert_front",
  "birthday",
  "residence_area",
  "province",
  "city",
  "address",
];

export const emptyStakeholder = (): Fields => ({
  role: "1",
  name: "",
  gender: "1",
  nationality: "NG",
  document_issuing_country: "NG",
  cert_type: "11",
  cert_num: "",
  effective_date: "",
  expiration_date: "",
  is_long_term: "0",
  cert_front: "",
  cert_back: "",
  birthday: "",
  residence_area: "NG",
  province: "",
  city: "",
  address: "",
  share_percentage: "",
});

function parsePhone(rawPhone?: string | null) {
  if (!rawPhone) return { areaCode: "234", number: "" };
  const clean = rawPhone.trim().replace(/^\+/, "");
  for (const c of ISO_COUNTRIES) {
    if (clean.startsWith(c.dial)) {
      return { areaCode: c.dial, number: clean.slice(c.dial.length) };
    }
  }
  return { areaCode: "234", number: clean };
}

export function mapUserDataToKyb(userData: any) {
  if (!userData) return { companyFields: {}, stakeholders: [] };

  const profile = userData.user_profile || userData.profile || {};
  const merchant = userData.merchant_details || userData.merchant || {};
  const regAddr = merchant.addresses?.registered_address || {};
  const mailAddr = merchant.addresses?.mailing_address || {};
  const contact = merchant.contact_person || {};
  const userDocs = userData.userDocuments || userData.documents || [];

  const rawCountry = (
    merchant.formation_country ||
    merchant.country ||
    profile.country_code ||
    "NG"
  ).toUpperCase();
  const regCountry = rawCountry.length === 2 ? rawCountry : "NG";

  const rawPhone = contact.phone || merchant.phone || profile.phone || "";
  const phoneParts = parsePhone(rawPhone);

  const operatingCountries = merchant.operating_countries || [];
  const opRegion = operatingCountries[0]
    ? operatingCountries[0].toUpperCase()
    : regCountry;

  const transactionCountries = merchant.transaction_countries || [];
  const txRegion = transactionCountries[0]
    ? transactionCountries[0].toUpperCase()
    : regCountry;

  let amtCountCode = "2";
  const rawTxCount = (merchant.expected_monthly_transactions || "").toLowerCase();
  if (rawTxCount.includes("1000") || rawTxCount.includes("501")) {
    amtCountCode = "1";
  } else if (rawTxCount.includes("101") || rawTxCount.includes("100")) {
    amtCountCode = "2";
  } else {
    amtCountCode = "3";
  }

  const companyFields: Record<string, string> = {
    member_name:
      merchant.business_name ||
      profile.business_name ||
      (profile.first_name
        ? `${profile.first_name} ${profile.last_name || ""}`.trim()
        : "") ||
      "",
    name_on_cert:
      merchant.business_name ||
      profile.business_name ||
      (profile.first_name
        ? `${profile.first_name} ${profile.last_name || ""}`.trim()
        : "") ||
      "",
    reg_number:
      merchant.registration_number ||
      merchant.tax_identification_number ||
      "",
    reg_country: regCountry,
    province: regAddr.state || mailAddr.state || "",
    city: regAddr.city || mailAddr.city || "",
    reg_address:
      [regAddr.street1, regAddr.street2].filter(Boolean).join(", ") || "",
    postcode: regAddr.postal_code || "",
    actual_operating_address:
      [mailAddr.street1, mailAddr.street2].filter(Boolean).join(", ") ||
      [regAddr.street1, regAddr.street2].filter(Boolean).join(", ") ||
      "",
    email: contact.email || profile.email || "",
    phone_area_code: phoneParts.areaCode,
    phone_num: phoneParts.number,
    website: merchant.business_website || "",
    domestic_entity_name: merchant.business_name || "",
    effective_date: merchant.formation_date
      ? merchant.formation_date.split("T")[0]
      : "",
    expiration_date: "",
    is_long_term: "1",
    business_type:
      merchant.legal_structure === "LIMITED_LIABILITY_COMPANY" ||
      merchant.legal_structure === "LLC"
        ? "2"
        : "1",
    industry_type: "T1030001",
    business_scope:
      merchant.nature_of_business ||
      merchant.business_model ||
      "We buy and sell, import and export and we render services in digital and physical",
    business_category: merchant.business_model || "B2B Trade & Settlement",
    operation_region: opRegion.length === 2 ? opRegion : regCountry,
    payment_regions: txRegion.length === 2 ? txRegion : regCountry,
    export_regions: opRegion.length === 2 ? opRegion : regCountry,
    amt_count: amtCountCode,
    amt_amt: "2",
    ex_amt: "2",
    business_use_case:
      merchant.nature_of_business ||
      merchant.business_model ||
      "Supplier payout & settlement",
  };

  const rawOwners = merchant.business_owners || merchant.owners || [];
  let stakeholders: Record<string, string>[] = [];

  const defaultDocImage = userDocs[0]?.doc_image || "";

  if (Array.isArray(rawOwners) && rawOwners.length > 0) {
    stakeholders = rawOwners.map((owner: any) => {
      const addr = owner.address || {};
      const ownerCountry = (
        addr.country ||
        owner.nationality ||
        regCountry
      )
        .toUpperCase()
        .slice(0, 2);
      const ownerPhone = parsePhone(owner.phone_number || contact.phone);

      return {
        role: owner.is_beneficial_owner
          ? "1"
          : owner.is_signer
            ? "3"
            : "2",
        name:
          [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.full_name ||
          contact.full_name ||
          "",
        gender: owner.gender?.toLowerCase() === "female" ? "2" : "1",
        nationality: ownerCountry.length === 2 ? ownerCountry : regCountry,
        document_issuing_country:
          ownerCountry.length === 2 ? ownerCountry : regCountry,
        cert_type:
          contact.id_type?.toLowerCase().includes("passport") ||
          owner.id_type?.toLowerCase().includes("passport")
            ? "13"
            : "11",
        cert_num: owner.id_number || contact.id_number || "",
        effective_date: owner.relationship_establishment_date
          ? owner.relationship_establishment_date.split("T")[0]
          : "",
        expiration_date: "",
        is_long_term: "1",
        cert_front: owner.front_image || defaultDocImage,
        cert_back: owner.back_image || "",
        birthday: owner.dob ? owner.dob.split("T")[0] : "",
        residence_area: ownerCountry.length === 2 ? ownerCountry : regCountry,
        province: addr.state || regAddr.state || "",
        city: addr.city || regAddr.city || "",
        address:
          [addr.street1, addr.street2].filter(Boolean).join(", ") ||
          companyFields.reg_address ||
          "",
        share_percentage:
          owner.ownership_percentage != null
            ? String(owner.ownership_percentage)
            : "25.00",
      };
    });
  } else {
    stakeholders = [
      {
        role: "1",
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          contact.full_name ||
          "Primary Director",
        gender: "1",
        nationality: regCountry,
        document_issuing_country: regCountry,
        cert_type: "11",
        cert_num: contact.id_number || "",
        effective_date: "",
        expiration_date: "",
        is_long_term: "1",
        cert_front: defaultDocImage,
        cert_back: "",
        birthday: profile.birth_date
          ? profile.birth_date.split("T")[0]
          : "",
        residence_area: regCountry,
        province: regAddr.state || "",
        city: regAddr.city || "",
        address:
          [regAddr.street1, regAddr.street2].filter(Boolean).join(", ") || "",
        share_percentage: "100",
      },
    ];
  }

  return { companyFields, stakeholders };
}
