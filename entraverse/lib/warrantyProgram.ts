export type WarrantyValueType = "percent" | "amount";

export type WarrantyComponent = {
  id?: string;
  label: string;
  valueType: WarrantyValueType;
  value: number;
  notes?: string;
};

export type WarrantyPricingComponent = {
  valueType: WarrantyValueType;
  value: number;
};

export type WarrantyPricingConfig = {
  cost: WarrantyPricingComponent;
  profit: WarrantyPricingComponent;
};

export type WarrantyProgramData = {
  components: WarrantyComponent[];
  pricing: WarrantyPricingConfig;
};

export const WARRANTY_COST_LABEL = "Biaya Program Garansi";
export const WARRANTY_PROFIT_LABEL = "Keuntungan Program Garansi";

const DECIMAL_REGEX = /[^\d.,-]/g;
const DIGIT_REGEX = /[^\d]/g;

const normalizeLabel = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const COST_LABEL_KEY = normalizeLabel(WARRANTY_COST_LABEL);
const PROFIT_LABEL_KEY = normalizeLabel(WARRANTY_PROFIT_LABEL);

const createId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `warranty-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const DEFAULT_WARRANTY_PRICING: WarrantyPricingConfig = {
  cost: { valueType: "percent", value: 0 },
  profit: { valueType: "percent", value: 0 },
};

export const isAmountValueType = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "amount" || normalized === "rp" || normalized === "rupiah";
};

const toValueType = (value: unknown, fallback: WarrantyValueType = "percent"): WarrantyValueType =>
  isAmountValueType(value) ? "amount" : fallback;

export const parseDecimalValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(DECIMAL_REGEX, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseRupiahValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const digits = value.replace(DIGIT_REGEX, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const normalizeNumericValue = (valueType: WarrantyValueType, rawValue: unknown): number =>
  valueType === "amount"
    ? parseRupiahValue(rawValue)
    : Math.max(0, parseDecimalValue(rawValue));

const toPricingComponent = (
  value: unknown,
  fallback: WarrantyPricingComponent = DEFAULT_WARRANTY_PRICING.cost
): WarrantyPricingComponent => {
  if (typeof value === "object" && value !== null) {
    const row = value as Record<string, unknown>;
    const valueType = toValueType(row.valueType, fallback.valueType);
    return {
      valueType,
      value: normalizeNumericValue(valueType, row.value ?? fallback.value),
    };
  }

  return { ...fallback };
};

const parseComponent = (item: unknown): WarrantyComponent | null => {
  if (typeof item === "string") {
    const label = item.trim().replace(/\s+/g, " ");
    if (!label) return null;
    return { id: createId(), label, valueType: "percent", value: 0 };
  }

  if (typeof item !== "object" || item === null) {
    return null;
  }

  const row = item as Record<string, unknown>;
  const label = String(row.label ?? row.name ?? "").trim().replace(/\s+/g, " ");
  if (!label) return null;
  const valueType = toValueType(row.valueType);
  return {
    id: String(row.id ?? createId()),
    label,
    valueType,
    value: normalizeNumericValue(valueType, row.value),
    notes: String(row.notes ?? "").trim() || undefined,
  };
};

const setPricingFromLabel = (
  label: string,
  component: WarrantyPricingComponent,
  pricing: WarrantyPricingConfig
): boolean => {
  const key = normalizeLabel(label);
  if (key === COST_LABEL_KEY) {
    pricing.cost = component;
    return true;
  }

  if (key === PROFIT_LABEL_KEY) {
    pricing.profit = component;
    return true;
  }

  return false;
};

const setPricingFromRecord = (record: Record<string, unknown>, pricing: WarrantyPricingConfig): void => {
  const candidates = [
    { key: "cost", aliases: ["cost", "biaya", "biaya_program_garansi", "cost_component"] },
    { key: "profit", aliases: ["profit", "keuntungan", "keuntungan_program_garansi", "profit_component"] },
  ] as const;

  candidates.forEach(({ key, aliases }) => {
    const payload = aliases
      .map((alias) => record[alias])
      .find((candidate) => candidate !== undefined && candidate !== null);

    if (payload === undefined) return;
    if (key === "cost") {
      pricing.cost = toPricingComponent(payload, pricing.cost);
      return;
    }
    pricing.profit = toPricingComponent(payload, pricing.profit);
  });
};

const appendUniqueComponent = (target: WarrantyComponent[], component: WarrantyComponent): void => {
  const key = normalizeLabel(component.label);
  if (!key) return;
  if (target.some((item) => normalizeLabel(item.label) === key)) return;
  target.push(component);
};

const parseFromRaw = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
};

export const parseWarrantyProgram = (rawValue: unknown): WarrantyProgramData => {
  const pricing: WarrantyPricingConfig = {
    cost: { ...DEFAULT_WARRANTY_PRICING.cost },
    profit: { ...DEFAULT_WARRANTY_PRICING.profit },
  };
  const components: WarrantyComponent[] = [];

  const addParsedComponent = (rawComponent: unknown) => {
    const component = parseComponent(rawComponent);
    if (!component) return;

    const pricingComponent: WarrantyPricingComponent = {
      valueType: component.valueType,
      value: component.value,
    };

    if (setPricingFromLabel(component.label, pricingComponent, pricing)) {
      return;
    }

    appendUniqueComponent(components, component);
  };

  const parsed = parseFromRaw(rawValue);
  if (!parsed) {
    return { components, pricing };
  }

  if (typeof parsed === "string") {
    parsed
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((label) => addParsedComponent(label));
    return { components, pricing };
  }

  if (Array.isArray(parsed)) {
    parsed.forEach((item) => addParsedComponent(item));
    return { components, pricing };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const pricingRecord = record.pricing;
    if (typeof pricingRecord === "object" && pricingRecord !== null) {
      setPricingFromRecord(pricingRecord as Record<string, unknown>, pricing);
    }
    setPricingFromRecord(record, pricing);

    if (Array.isArray(record.components)) {
      record.components.forEach((item) => addParsedComponent(item));
      return { components, pricing };
    }

    addParsedComponent(record);
  }

  return { components, pricing };
};

export const serializeWarrantyProgram = (value: WarrantyProgramData): string => {
  const normalizePricingRow = (row: WarrantyPricingComponent): WarrantyPricingComponent => {
    const valueType = row.valueType === "amount" ? "amount" : "percent";
    return {
      valueType,
      value: normalizeNumericValue(valueType, row.value),
    };
  };

  return JSON.stringify({
    components: value.components.map((item, index) => {
      const valueType = item.valueType === "amount" ? "amount" : "percent";
      return {
        id: item.id || `component-${index + 1}`,
        label: item.label,
        valueType,
        value: normalizeNumericValue(valueType, item.value),
        notes: item.notes?.trim() || null,
      };
    }),
    pricing: {
      cost: normalizePricingRow(value.pricing.cost),
      profit: normalizePricingRow(value.pricing.profit),
    },
  });
};

export const isWarrantyMetaLabel = (label: string): boolean => {
  const key = normalizeLabel(label);
  return key === COST_LABEL_KEY || key === PROFIT_LABEL_KEY;
};

