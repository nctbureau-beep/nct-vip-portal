import './globals.css'

export const metadata = {
  title: 'NCT VIP Portal | بوابة العملاء المميزين',
  description: 'National Company for Translation - VIP Customer Portal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-100">
        {children}
      </body>
    </html>
  )
}
