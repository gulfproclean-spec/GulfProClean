const React = require('react');

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Gulf Coast Proclean</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
