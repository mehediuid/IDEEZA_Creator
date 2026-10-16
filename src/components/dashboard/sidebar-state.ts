// The sidebar's collapsed choice (O04, the 64 px rail). It is stored in
// localStorage and mirrored on <html data-sidebar="collapsed">: the root
// layout runs SIDEBAR_PREPAINT in <head>, before the body paints, so a
// collapsed sidebar is never drawn at 280 first and then snapped to 64. The
// sidebar reads the attribute (sidebar.tsx, useSidebarCollapsed); until React
// has drawn the rail, globals.css holds the server's expanded sidebar at the
// rail's width, hidden. No "use client": the root layout is a server component.

export const SIDEBAR_COLLAPSED_KEY = "ideeza:sidebar:collapsed";

/** Copies the stored choice onto <html> before the first paint. */
export const SIDEBAR_PREPAINT = `try{if(localStorage.getItem(${JSON.stringify(SIDEBAR_COLLAPSED_KEY)})==="1")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;
