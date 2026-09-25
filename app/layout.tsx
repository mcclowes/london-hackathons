import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.scss";

const display = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "London hackathons",
  description:
    "Every upcoming hackathon in London, merged from Luma, organiser calendars, Devpost, MLH and Eventbrite. Subscribe as one calendar.",
  alternates: { types: { "text/calendar": "/calendar.ics" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
