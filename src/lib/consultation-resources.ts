export interface TelephoneResource {
  label: string;
  phoneNumber: string;
  href: `tel:${string}`;
}

export const EMERGENCY_RESOURCES = {
  ambulance: {
    label: "救急・消防",
    phoneNumber: "119",
    href: "tel:119",
  },
  police: {
    label: "事件・事故",
    phoneNumber: "110",
    href: "tel:110",
  },
} as const satisfies Record<string, TelephoneResource>;

export const IMMEDIATE_SUPPORT_RESOURCE = {
  label: "#いのちSOS",
  phoneNumber: "0120-061-338",
  href: "tel:0120061338",
} as const satisfies TelephoneResource;

export const OFFICIAL_SUPPORT_LINKS = {
  mamorouyoKokoro: {
    label: "厚生労働省「まもろうよ こころ」",
    href: "https://www.mhlw.go.jp/mamorouyokokoro/",
  },
  kokoroNoMimi: {
    label: "働く人の「こころの耳」相談窓口",
    href: "https://kokoro.mhlw.go.jp/soudan/",
  },
} as const;

