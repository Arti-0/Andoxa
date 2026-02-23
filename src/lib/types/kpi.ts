export interface KpiLayoutItem {
  i: string; // item id
  x: number; // x position
  y: number; // y position
  w: number; // width
  h: number; // height
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface KpiLayoutPutPayload {
  page: "dashboard" | "campaign";
  campaignId?: string;
  items: KpiLayoutItem[];
  version?: number;
}

export interface KpiLayout {
  page: "dashboard" | "campaign";
  campaignId?: string;
  items: KpiLayoutItem[];
  version: number;
  updatedAt: string;
}
