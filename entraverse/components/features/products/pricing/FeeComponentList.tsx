"use client";

type FeeComponentListProps = {
  tiktokCommissionPercent: number;
  xtraCashbackPercent: number;
  shopeeInsurancePercent: number;
  tokopediaFeePercent: number;
  shopeeFeePercent: number;
  tiktokFeePercent: number;
  onChange: (
    field:
      | "tiktokCommissionPercent"
      | "xtraCashbackPercent"
      | "shopeeInsurancePercent"
      | "tokopediaFeePercent"
      | "shopeeFeePercent"
      | "tiktokFeePercent",
    value: number
  ) => void;
};

const inputClass = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";

export default function FeeComponentList(props: FeeComponentListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs">
        <span>Komisi Dinamis TikTok (%)</span>
        <input className={inputClass} type="number" min={0} value={props.tiktokCommissionPercent} onChange={(e) => props.onChange("tiktokCommissionPercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>XTRA Cashback (%)</span>
        <input className={inputClass} type="number" min={0} value={props.xtraCashbackPercent} onChange={(e) => props.onChange("xtraCashbackPercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Asuransi Shopee (%)</span>
        <input className={inputClass} type="number" min={0} value={props.shopeeInsurancePercent} onChange={(e) => props.onChange("shopeeInsurancePercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Fee Tokopedia (%)</span>
        <input className={inputClass} type="number" min={0} value={props.tokopediaFeePercent} onChange={(e) => props.onChange("tokopediaFeePercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Fee Shopee (%)</span>
        <input className={inputClass} type="number" min={0} value={props.shopeeFeePercent} onChange={(e) => props.onChange("shopeeFeePercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Fee TikTok (%)</span>
        <input className={inputClass} type="number" min={0} value={props.tiktokFeePercent} onChange={(e) => props.onChange("tiktokFeePercent", Number(e.target.value) || 0)} />
      </label>
    </div>
  );
}
