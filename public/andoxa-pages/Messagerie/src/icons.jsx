// Lucide-style stroke icons, inline (1.5px stroke, rounded)
const I = (path, opts = {}) => (props) => {
  const { size = 16, ...rest } = props || {};
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={opts.sw || 1.75} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );
};

const Icon = {
  Search: I(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  Bell: I(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>),
  Filter: I(<><path d="M3 6h18M7 12h10M11 18h2"/></>),
  ChevronLeft: I(<><path d="m15 18-6-6 6-6"/></>),
  ChevronRight: I(<><path d="m9 18 6-6-6-6"/></>),
  ChevronDown: I(<><path d="m6 9 6 6 6-6"/></>),
  Plus: I(<><path d="M12 5v14M5 12h14"/></>),
  Send: I(<><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>),
  Sparkles: I(<><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><path d="M12 8l1.3 2.7L16 12l-2.7 1.3L12 16l-1.3-2.7L8 12l2.7-1.3z" fill="currentColor" stroke="none"/></>),
  Calendar: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>),
  CalendarPlus: I(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v6M9 17h6"/></>),
  Tag: I(<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></>),
  Phone: I(<><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></>),
  Note: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></>),
  Paperclip: I(<><path d="m21 12-9.3 9.3a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-9.3 9.3a2 2 0 0 1-3-3L16 7"/></>),
  Linkedin: I(<><rect x="2" y="2" width="20" height="20" rx="2.5" fill="#0A66C2" stroke="#0A66C2"/><path d="M7 10v7M7 7v.5M11 17v-7m0 2c1-2 5-2.5 5 1v4" stroke="white" strokeWidth="2"/></>, { sw: 1.5 }),
  Whatsapp: I(<><circle cx="12" cy="12" r="10" fill="#25D366" stroke="#25D366"/><path d="M8 13a4.5 4.5 0 0 0 4 3l1.5-1.5 2 1-1 2A7 7 0 0 1 8 12l1-1 1 2L8.5 14.5 8 13z" fill="white" stroke="white" strokeWidth="0.5"/></>, { sw: 1 }),
  Flame: I(<><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 1 2 3 1 3-1 0-2-.5-3 0-4z M5 16a7 7 0 0 0 14 0c0-3-2-5-3-6 .5 3-2 4-3 4-2 0-3-1.5-3-3-2 1-5 2-5 5z"/></>),
  Snowflake: I(<><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19M9 5l3-3 3 3M9 19l3 3 3-3M5 9 2 12l3 3M19 9l3 3-3 3"/></>),
  Zap: I(<><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></>),
  ArrowUpDown: I(<><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></>),
  Check: I(<><path d="m5 12 5 5L20 7"/></>),
  CheckCheck: I(<><path d="m2 12 5 5L17 7M11 17 22 6"/></>),
  Clock: I(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>),
  ExternalLink: I(<><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>),
  Smile: I(<><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>),
  Settings: I(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>),
  Inbox: I(<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.9A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.1z"/></>),
  Grid: I(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>),
  Users: I(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>),
  Megaphone: I(<><path d="M3 11v3a1 1 0 0 0 1 1h2l3 3h2V8H9l-3 3H4a1 1 0 0 0-1 1z M14 5l7-2v18l-7-2"/></>),
  ArrowRight: I(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
  X: I(<><path d="M18 6 6 18M6 6l12 12"/></>),
  MoreH: I(<><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>),
  TrendingUp: I(<><path d="m22 7-9 9-4-4-7 7"/><path d="M16 7h6v6"/></>),
  AtSign: I(<><circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-9 9"/></>),
  FileText: I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></>),
  Bookmark: I(<><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></>),
  Eye: I(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>),
  Mic: I(<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/></>),
  Mail: I(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></>),
  Archive: I(<><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/></>),
  Trash: I(<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></>),
  MessageSquare: I(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>),
  MessageSquarePlus: I(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M12 7v6 M9 10h6"/></>),
  ArrowLeft: I(<><path d="M19 12H5M12 19l-7-7 7-7"/></>),
  Pencil: I(<><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></>),
  Copy: I(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>),
};

window.Icon = Icon;
