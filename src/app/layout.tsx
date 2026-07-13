import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Destiny 2 Build Synergy Explorer",
  description:
    "A searchable map of Destiny 2 weapons, abilities, artifacts, armor bonuses, and sandbox mechanics — explaining how they interact.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="container page">{children}</main>
        <footer className="footer">
          <div className="container">
            Fan-made buildcrafting tool. Not affiliated with or endorsed by
            Bungie. Item names, descriptions, and definitions originate from the
            Bungie Destiny Manifest; community-researched values are labelled as
            such. Game data is treated as versioned — see{" "}
            <a href="/data">Data &amp; Sources</a>.
          </div>
        </footer>
      </body>
    </html>
  );
}
