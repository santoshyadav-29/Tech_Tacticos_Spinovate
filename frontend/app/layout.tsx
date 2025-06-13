import type { Metadata } from "next";
import "@/app/globals.css";
export const metadata: Metadata = {
  title: "Spinovate",
  description: "Spinovate - Want to correct your posture? Spinovate is here to help you with that.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
