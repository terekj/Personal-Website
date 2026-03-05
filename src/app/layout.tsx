import type { Metadata } from "next";
import "./globals.css";
import { Figtree , EB_Garamond} from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "terek johnson 👋",
  description: "see what i've been up to",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
       <body className={`${figtree.variable} ${ebGaramond.variable}`}>{children}</body>
    </html>
  );
}
