import b1 from "@/assets/barber-1.jpg";
import b2 from "@/assets/barber-2.jpg";
import b3 from "@/assets/barber-3.jpg";
import b4 from "@/assets/barber-4.jpg";

export type Service = "Cut" | "Color" | "Perm" | "Beard";
export const SERVICES: Service[] = ["Cut", "Color", "Perm", "Beard"];

export type FeaturedBarber = {
  id: string;
  name: string;
  shop: string;
  photo: string;
  services: Service[];
  rating: number;
  reviews: number;
  fromPrice: number;
};

// Sample showcase data for v1 — real barbers arrive in a later milestone.
export const FEATURED_BARBERS: FeaturedBarber[] = [
  { id: "marco", name: "Marco Bellini", shop: "Oak & Blade · Da'an", photo: b1, services: ["Cut", "Beard"], rating: 4.9, reviews: 312, fromPrice: 28 },
  { id: "lena", name: "Lena Ruiz", shop: "Studio Lumen · Xinyi", photo: b2, services: ["Cut", "Color", "Perm"], rating: 4.8, reviews: 254, fromPrice: 35 },
  { id: "kai", name: "Kai Morgan", shop: "Ink & Fade · Zhongshan", photo: b3, services: ["Cut", "Beard"], rating: 4.9, reviews: 198, fromPrice: 25 },
  { id: "henry", name: "Henry Walsh", shop: "The Gentleman's Chair · Songshan", photo: b4, services: ["Cut", "Beard", "Color"], rating: 5.0, reviews: 421, fromPrice: 40 },
];
