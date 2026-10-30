import type { SVGProps } from 'react';

const paths = {
  home: 'M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7',
  gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8.5A2.5 2.5 0 1 1 11 5.5L12 8Zm0 0h3.5A2.5 2.5 0 1 0 13 5.5L12 8Z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  message: 'M21 11.5a8.5 8.5 0 0 1-12.6 7.45L3 21l1.55-5.4A8.5 8.5 0 1 1 21 11.5Z',
  list: 'M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v5H9zM8 12h.01M12 12h4M8 17h.01M12 17h4',
  arrow: 'M7 17 17 7M7 7h10v10',
  close: 'm6 6 12 12M6 18 18 6',
} as const;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
