import type { ReactNode } from 'react';

export const metadata = {
  title: '孙志昊 · AI 分身代理',
  description: 'sunzhihaoai.top 的站内 AI 分身 API'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
