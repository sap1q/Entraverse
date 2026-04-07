"use client";

import { useEffect, useState } from "react";
import { BannerSlider } from "@/components/features/banners/BannerSlider";
import { bannerApi } from "@/lib/api/banner";
import type { Banner } from "@/lib/api/types/banner.types";

export default function HeroSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true);

      try {
        const rows = await bannerApi.getActive();
        setBanners(rows);
      } catch {
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchBanners();
  }, []);

  return <BannerSlider banners={banners} loading={loading} />;
}
