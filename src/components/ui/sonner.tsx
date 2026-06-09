import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#aebf83]" />,
        info: <InfoIcon className="size-4 text-[#9fb5d8]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#d4bf63]" />,
        error: <OctagonXIcon className="size-4 text-[#c37b77]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#d4bf63]" />,
      }}
      style={
        {
          '--normal-bg': '#101d3a',
          '--normal-text': '#eef2fa',
          '--normal-border': '#6d7891',
          '--border-radius': '0.375rem',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'border-2 border-[#6d7891] bg-[#101d3a] px-4 py-3 font-sans text-[#eef2fa] shadow-[0_0_0_1px_#0b1630,3px_3px_0_#050b18] [text-rendering:geometricPrecision]',
          title: 'text-[13px] leading-tight font-bold tracking-normal text-[#f4e9a6]',
          description: 'text-[12px] leading-snug font-medium text-[#cbd3e2]',
          icon: 'text-[#d4bf63]',
          closeButton:
            'border-[#6d7891] bg-[#172b52] text-[#d8deeb] hover:border-[#8f9cb4] hover:bg-[#1d345f] hover:text-white',
          actionButton: 'border border-[#8c7d37] bg-[#d4bf63] px-2.5 font-bold text-[#07101f] hover:bg-[#decc79]',
          cancelButton: 'border border-[#6d7891] bg-[#172b52] px-2.5 font-bold text-[#d8deeb] hover:bg-[#1d345f]',
          success: 'border-[#7f8c6f]',
          info: 'border-[#71829e]',
          warning: 'border-[#9c8c47]',
          error: 'border-[#9b6968]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
