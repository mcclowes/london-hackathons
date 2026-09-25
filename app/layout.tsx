import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.scss";

const mono = JetBrains_Mono({ weight: ["400", "500", "700", "800"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "London hackathons",
  description:
    "Every upcoming hackathon in London, merged from Luma, organiser calendars, Devpost, MLH and Eventbrite. Subscribe as one calendar.",
  alternates: { types: { "text/calendar": "/calendar.ics" } },
};

export const viewport: Viewport = { themeColor: "#0b0b0b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
