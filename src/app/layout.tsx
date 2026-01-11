import "@/styles/globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import type { ReactNode } from "react";
import Script from "next/script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH}/favicon.ico`} />
        <Script src={`${process.env.NEXT_PUBLIC_BASE_PATH}/vendor/tesseract.min.js`} strategy="afterInteractive"/>
        <Script src={`${process.env.NEXT_PUBLIC_BASE_PATH}/vendor/bootstrap.bundle.min.js`} strategy="afterInteractive"/>
      </head>

      <body>
        {children}        
      </body>
    </html>
  );
}
