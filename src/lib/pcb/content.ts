// @ts-nocheck
// IDEEZA PCB Software — content generators.
// Ported verbatim from the prototype's build* methods. Each returns an HTML
// string rendered via dangerouslySetInnerHTML (matching the original runtime).
// The brand purple var(--color-violet-600) is mapped to the --color-violet-600 token.
// Type-checking is disabled here: this is a faithful port of display-only HTML
// string builders, not interactive logic — the inner helpers are intentionally
// loosely typed to match the source exactly.
import type { Mode, BottomTab, RightTab, SettingsPage } from "./types";

export function buildCanvas(mode: Mode): string {
  const m = mode;
    if (m === 'schematic') {
      return `<div style="position:relative; width:920px; height:640px; margin:var(--spacing-32) auto; background:var(--color-bg-surface); border:var(--border-width-1) solid var(--color-border-strong); box-shadow:var(--elevation-3);">
        ${[1,2,3,4,5,6].map((n,i)=>`<div style="position:absolute; top:-1px; left:${40+i*145}px; font-size:var(--font-size-xs); color:var(--color-text-tertiary);">${n}</div><div style="position:absolute; bottom:-1px; left:${40+i*145}px; font-size:var(--font-size-xs); color:var(--color-text-tertiary);">${n}</div>`).join('')}
        ${['A','B','C','D'].map((l,i)=>`<div style="position:absolute; left:6px; top:${50+i*150}px; font-size:var(--font-size-xs); color:var(--color-text-tertiary);">${l}</div><div style="position:absolute; right:6px; top:${50+i*150}px; font-size:var(--font-size-xs); color:var(--color-text-tertiary);">${l}</div>`).join('')}
        <div style="position:absolute; inset:26px; border:var(--border-width-1-5) solid var(--color-border-strong);"></div>
        <div style="position:absolute; right:30px; bottom:30px; width:430px; border:var(--border-width-1-5) solid var(--color-text-primary); font-size:var(--font-size-xs); color:var(--color-text-primary);">
          <div style="display:grid; grid-template-columns:1.2fr 1.2fr 1fr;">
            <div style="border-right:var(--border-width-1) solid var(--color-text-primary); border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Schematic</div>
            <div style="border-right:var(--border-width-1) solid var(--color-text-primary); border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Board</div>
            <div style="border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Page</div>
            <div style="border-right:var(--border-width-1) solid var(--color-text-primary); border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Schematic</div>
            <div style="border-right:var(--border-width-1) solid var(--color-text-primary); border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Board-1</div>
            <div style="border-bottom:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Page-1</div>
          </div>
          <div style="display:grid; grid-template-columns:1.2fr 2.2fr; border-bottom:var(--border-width-1) solid var(--color-text-primary);"><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Review</div><div style="padding:5px 8px;">Testing</div></div>
          <div style="display:grid; grid-template-columns:1.6fr .8fr .8fr 1fr 1fr; border-bottom:var(--border-width-1) solid var(--color-text-primary);"><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Review</div><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Version</div><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Size</div><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-2) var(--spacing-4);">Page-1</div><div style="padding:5px 8px;">Total-1</div></div>
          <div style="display:grid; grid-template-columns:1.6fr .8fr .8fr 1.8fr;"><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-4) var(--spacing-4); display:flex; align-items:center; gap:var(--spacing-3); font-weight:700; color:var(--color-violet-600);"><span style="width:16px;height:16px;border-radius:var(--radius-full);background:var(--color-violet-600);display:inline-block;position:relative;"><span style="position:absolute;top:4px;left:5px;width:0;height:0;border-left:6px solid var(--color-text-on-brand);border-top:var(--border-width-4) solid transparent;border-bottom:var(--border-width-4) solid transparent;"></span></span>IDEEZA</div><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-4) var(--spacing-4);">V1.0</div><div style="border-right:var(--border-width-1) solid var(--color-text-primary); padding:var(--spacing-4) var(--spacing-4);">A4</div><div style="padding:9px 8px;">IDEEZA.com</div></div>
        </div>
      </div>`;
    }
    if (m === 'pcb') {
      return `<div style="position:relative; width:760px; height:520px; margin:var(--spacing-40) auto; background:#0d3b24; border:var(--border-width-2) solid #1a6b3f; border-radius:var(--radius-md); box-shadow:0 8px 30px rgba(0,0,0,.25); overflow:hidden;">
        <div style="position:absolute; inset:0; background-image:linear-gradient(rgba(46,190,105,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(46,190,105,.12) 1px,transparent 1px); background-size:24px 24px;"></div>
        <div style="position:absolute; inset:30px; border:1.5px dashed #4bd486; border-radius:var(--radius-sm);"></div>
        ${[[120,90],[520,120],[300,260],[600,340],[160,360]].map(([x,y],i)=>`<div style="position:absolute; left:${x}px; top:${y}px; width:${i%2?64:90}px; height:${i%2?40:56}px; background:#0a2c1b; border:var(--border-width-1-5) solid #39b56f; border-radius:var(--radius-xs);"></div>`).join('')}
        ${[[230,118,520,148],[348,288,624,360],[210,388,348,288]].map(([x1,y1,x2,y2])=>`<svg style="position:absolute; inset:0;" width="760" height="520"><path d="M${x1} ${y1} L${(x1+x2)/2} ${y1} L${(x1+x2)/2} ${y2} L${x2} ${y2}" fill="none" stroke="#ffbf0f" stroke-width="2.5"/></svg>`).join('')}
        ${[[120,90],[520,120],[300,260],[600,340],[160,360]].map(([x,y])=>`<div style="position:absolute; left:${x-4}px; top:${y-4}px; width:8px; height:8px; border-radius:var(--radius-full); background:#d9a441;"></div>`).join('')}
      </div>`;
    }
    if (m === '2d') {
      return `<div style="position:relative; width:760px; height:520px; margin:var(--spacing-40) auto; background:var(--color-bg-surface); border:var(--border-width-1) solid var(--color-border-strong); border-radius:var(--radius-md); box-shadow:var(--elevation-3); overflow:hidden;">
        <div style="position:absolute; inset:0; background-image:linear-gradient(#eee 1px,transparent 1px),linear-gradient(90deg,#eee 1px,transparent 1px); background-size:20px 20px;"></div>
        <div style="position:absolute; inset:40px; border:var(--border-width-2) solid var(--color-violet-600); border-radius:var(--radius-sm);"></div>
        <div style="position:absolute; left:40px; top:18px; right:40px; height:2px;"></div>
        ${[[140,120],[520,140],[300,300],[560,360]].map(([x,y],i)=>`<div style="position:absolute; left:${x}px; top:${y}px; width:80px; height:50px; border:var(--border-width-1-5) solid var(--color-text-primary); border-radius:var(--radius-xs); display:flex; align-items:center; justify-content:center; font-size:var(--font-size-xs); color:var(--color-text-primary); font-family:Inter;">U${i+1}</div>`).join('')}
        <div style="position:absolute; left:40px; bottom:14px; font-size:var(--font-size-sm); color:var(--color-violet-600); font-weight:600;">Board Outline · 80mm × 60mm</div>
      </div>`;
    }
    return `<div style="position:relative; width:100%; height:100%; min-height:560px; background:radial-gradient(circle at 50% 40%, #2a2540, #161320); display:flex; align-items:center; justify-content:center;">
      <div style="transform:rotateX(58deg) rotateZ(-32deg); transform-style:preserve-3d;">
        <div style="width:380px; height:260px; background:linear-gradient(135deg,#1f7a47,#0d3b24); border-radius:var(--radius-lg); box-shadow:0 40px 60px rgba(0,0,0,.5), 0 0 0 2px #2f9c5b; position:relative;">
          ${[[60,50],[260,70],[150,150],[300,180]].map(([x,y],i)=>`<div style="position:absolute; left:${x}px; top:${y}px; width:${i%2?44:60}px; height:24px; background:#111; border-radius:var(--radius-xs); box-shadow:0 8px 12px rgba(0,0,0,.4); transform:translateZ(14px);"></div>`).join('')}
        </div>
      </div>
      <div style="position:absolute; bottom:24px; left:50%; transform:translateX(-50%); color:#cdbbe6; font-size:var(--font-size-sm); font-weight:500;">3D Module Preview · drag to orbit</div>
    </div>`;
}

export function buildDesignRules(): string {
  const rows = [['1','Net'],['2','Reuse Block'],['3','Component'],['4','Component'],['5','Reuse Block'],['6','Reuse Block'],['7','Component'],['8','Reuse Block'],['9','Reuse Block']];
    return `<div>
      <div style="display:grid; grid-template-columns:46px 110px 1.5fr 140px; padding:var(--spacing-0) var(--spacing-2) var(--spacing-4); border-bottom:var(--border-width-1-5) solid var(--color-border-default); font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);"><span>No</span><span>Check</span><span>Design Rules</span><span>Message Level</span></div>` +
      rows.map(([no,chk])=>`<div style="display:grid; grid-template-columns:46px 110px 1.5fr 140px; align-items:center; padding:var(--spacing-4) var(--spacing-2); border-bottom:var(--border-width-1) solid var(--color-border-subtle); font-size:var(--font-size-sm); color:var(--color-text-secondary);">
        <span style="display:flex; align-items:center; gap:var(--spacing-4);"><span style="width:16px;height:16px;border:var(--border-width-1-5) solid var(--color-border-strong);border-radius:var(--radius-sm);flex:0 0 auto;"></span>${no}</span>
        <span style="color:var(--color-text-primary);">${chk}</span>
        <span style="color:var(--color-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:var(--spacing-5);">${chk}: Finish Design Rule Checking. Fatal Error: 0, Error: 0, Warning</span>
        <span style="display:flex;align-items:center;justify-content:space-between;gap:var(--spacing-3);padding:var(--spacing-3) var(--spacing-4);border:var(--border-width-1) solid var(--color-border-default);border-radius:var(--radius-md);"><span style="font-size:var(--font-size-sm);color:var(--color-text-error);font-weight:600;">Fatal Error</span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></span>
      </div>`).join('') + `</div>`;
}

export function buildFindReplace(): string {
  const dd = (val, w) => `<div style="display:flex; align-items:center; justify-content:space-between; gap:var(--spacing-3); padding:var(--spacing-3) var(--spacing-4); border:var(--border-width-1) solid var(--color-border-default); border-radius:var(--radius-md); min-width:${w||72}px; font-size:var(--font-size-sm); color:var(--color-text-primary); background:var(--color-bg-surface);">${val}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg></div>`;
    const condRow = `<div style="display:flex; align-items:center; gap:var(--spacing-5); margin-bottom:var(--spacing-4);"><span style="width:26px; font-size:var(--font-size-sm); color:var(--color-text-secondary);">All</span>${dd('Contain',96)}<span style="color:var(--color-text-tertiary);">-</span>${dd('Any',110)}</div>`;
    const header = `<div style="display:grid; grid-template-columns:1.3fr 1fr 1.2fr 1fr; gap:var(--spacing-6); padding:var(--spacing-0) var(--spacing-0) var(--spacing-4); border-bottom:var(--border-width-1-5) solid var(--color-border-default); margin-bottom:var(--spacing-2);">
      <span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);">Property Name</span><span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);">Condition</span><span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);">Property Value</span><span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);">Canvas Display</span></div>`;
    const row = (name, val) => `<div style="display:grid; grid-template-columns:1.3fr 1fr 1.2fr 1fr; gap:var(--spacing-6); align-items:center; padding:var(--spacing-3) var(--spacing-0); border-bottom:var(--border-width-1) solid var(--color-border-subtle);">
      <span style="font-size:var(--font-size-sm); color:var(--color-text-primary);">${name}</span>${dd('Any')}<div style="display:flex; align-items:center; gap:var(--spacing-3);"><span style="color:var(--color-text-tertiary);">-</span><span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${val||''}</span></div>${dd('Any')}</div>`;
    const rows = [['Layer','Top Layer'],['Designator','C-1'],['Footprint',''],['Device',''],['ID',''],['Name',''],['Unique ID',''],['Add Info ROM',''],['3D Model',''],['Rotation',''],['Locked',''],['Silk screen color',''],['Group Name',''],['Reuse Block',''],['Group ID',''],['Channel ID','']];
    const custom = [['Supplier Footprint..',''],['Value',''],['Description','']];
    return `${condRow}${condRow}${header}${rows.map(([n,v])=>row(n,v)).join('')}
      <div style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary); margin:var(--spacing-7) var(--spacing-0) var(--spacing-3);">Custom Properties</div>
      ${custom.map(([n,v])=>row(n,v)).join('')}`;
}

export function buildBottom(tab: BottomTab): string {
  const t = tab;
    if (t === 'logs') {
      const rows = [['10:04:21','INFO','var(--color-text-success)','Project "Testing" loaded successfully'],['10:04:22','INFO','var(--color-text-success)','Schematic Board-1 / Page-1 opened'],['10:05:13','WARN','var(--color-text-warning)','Net N12 has only one connection'],['10:06:02','INFO','var(--color-text-success)','Auto-save completed'],['10:07:44','ERROR','var(--color-text-error)','Footprint missing for U3 (LM358)'],['10:08:10','WARN','var(--color-text-warning)','Designator R5 duplicated — auto-renamed to R7'],['10:09:55','INFO','var(--color-text-success)','Converted schematic to PCB · 42 parts placed']];
      return `<div style="padding:4px 0;">` + rows.map(([tm,lv,c,m])=>`<div style="display:flex; gap:var(--spacing-7); align-items:center; padding:var(--spacing-3) var(--spacing-8); border-bottom:var(--border-width-1) solid var(--color-bg-subtle);"><span style="font-size:var(--font-size-sm); color:var(--color-text-tertiary); width:62px; flex:0 0 auto; font-variant-numeric:tabular-nums;">${tm}</span><span style="font-size:var(--font-size-2xs); font-weight:700; color:${c}; width:46px; flex:0 0 auto;">${lv}</span><span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${m}</span></div>`).join('') + `</div>`;
    }
    if (t === 'device') {
      const rows = [['R1','SMD Resistor 10k','0603','Standardized','var(--color-text-success)'],['C1','Ceramic Cap 100nF','0402','Standardized','var(--color-text-success)'],['U3','Op-Amp LM358','SOIC-8','Pending Review','var(--color-text-warning)'],['J1','USB-C Receptacle','Custom','Non-standard','var(--color-text-error)'],['D2','Diode 1N4148','SOD-123','Standardized','var(--color-text-success)'],['Q1','MOSFET BSS138','SOT-23','Standardized','var(--color-text-success)']];
      return `<div><div style="display:grid; grid-template-columns:70px 1.7fr 1fr 1.1fr; padding:var(--spacing-5) var(--spacing-8); border-bottom:var(--border-width-1) solid var(--color-border-default); background:var(--color-bg-subtle); font-size:var(--font-size-xs); font-weight:700; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:.4px;"><span>Ref</span><span>Device</span><span>Package</span><span>Status</span></div>` + rows.map(([r,d,p,st,c])=>`<div style="display:grid; grid-template-columns:70px 1.7fr 1fr 1.1fr; padding:var(--spacing-5) var(--spacing-8); border-bottom:var(--border-width-1) solid var(--color-bg-subtle); align-items:center;"><span style="font-size:var(--font-size-sm); font-weight:600; color:var(--color-text-primary);">${r}</span><span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${d}</span><span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${p}</span><span style="font-size:var(--font-size-sm); font-weight:600; color:${c};">● ${st}</span></div>`).join('') + `</div>`;
    }
    if (t === 'drc') {
      const rows = [['var(--color-text-error)','Clearance Violation','Track to Pad &lt; 0.15mm near U3.2'],['var(--color-text-error)','Unrouted Net','Net VCC not fully routed (2 segments left)'],['var(--color-text-warning)','Silkscreen Overlap','R5 designator overlaps component pad'],['var(--color-text-warning)','Acute Angle','Track angle &lt; 90° at junction J1.1'],['var(--color-text-success)','Hole Size Check','124 holes within tolerance — passed'],['var(--color-text-success)','Annular Ring','All vias meet minimum ring — passed']];
      return `<div style="padding:4px 0;">` + rows.map(([c,title,loc])=>`<div style="display:flex; gap:var(--spacing-6); align-items:flex-start; padding:var(--spacing-4) var(--spacing-8); border-bottom:var(--border-width-1) solid var(--color-bg-subtle);"><span style="width:8px;height:8px;border-radius:var(--radius-full);background:${c};margin-top:var(--spacing-2);flex:0 0 auto;"></span><div><div style="font-size:var(--font-size-sm); font-weight:600; color:var(--color-text-primary);">${title}</div><div style="font-size:var(--font-size-sm); color:var(--color-text-tertiary);">${loc}</div></div></div>`).join('') + `</div>`;
    }
    return `<div style="padding:18px;">
      <div style="display:flex; gap:var(--spacing-6); margin-bottom:var(--spacing-8);">
        <div style="flex:1; background:#fef0f2; border:var(--border-width-1) solid #fbd5da; border-radius:var(--radius-xl); padding:var(--spacing-6) var(--spacing-7);"><div style="font-size:var(--font-size-3xl); font-weight:800; color:var(--color-text-error);">2</div><div style="font-size:var(--font-size-sm); color:#a8636e; font-weight:600;">Errors</div></div>
        <div style="flex:1; background:#fff8e8; border:var(--border-width-1) solid #f7e6b8; border-radius:var(--radius-xl); padding:var(--spacing-6) var(--spacing-7);"><div style="font-size:var(--font-size-3xl); font-weight:800; color:var(--color-text-warning);">2</div><div style="font-size:var(--font-size-sm); color:#a8862e; font-weight:600;">Warnings</div></div>
        <div style="flex:1; background:#eafaef; border:var(--border-width-1) solid #bdebcb; border-radius:var(--radius-xl); padding:var(--spacing-6) var(--spacing-7);"><div style="font-size:var(--font-size-3xl); font-weight:800; color:var(--color-text-success);">124</div><div style="font-size:var(--font-size-sm); color:#4a8a64; font-weight:600;">Checks Passed</div></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-1) var(--spacing-12); margin-bottom:var(--spacing-8);">
        ${[['Board Size','80 × 60 mm'],['Layers','4'],['Components','42'],['Nets','27'],['Vias','31'],['Est. Cost','$12.40 / board']].map(([k,v])=>`<div style="display:flex; justify-content:space-between; padding:var(--spacing-3) var(--spacing-0); border-bottom:var(--border-width-1) solid var(--color-border-subtle);"><span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${k}</span><span style="font-size:var(--font-size-sm); font-weight:600; color:var(--color-text-primary);">${v}</span></div>`).join('')}
      </div>
      <div style="display:flex; gap:var(--spacing-5);"><span style="padding:9px 20px; background:var(--color-violet-600); color:var(--color-text-on-brand); border-radius:var(--radius-lg); font-size:var(--font-size-sm); font-weight:600;">Generate Gerber</span><span style="padding:9px 20px; border:var(--border-width-1) solid var(--color-border-default); color:var(--color-text-secondary); border-radius:var(--radius-lg); font-size:var(--font-size-sm); font-weight:600;">Order PCB</span></div>
    </div>`;
}

export function buildLayers(mode: Mode): string {
  const eye = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.6"/></svg>';
    const eyeoff = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.3-1M3 3l18 18"/></svg>';
    const lock = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
    const layers = mode === '3d'
      ? [['Top Layer','#e34c4c',true],['Middle Layer 1','#3bb56f',true],['Middle Layer 2','#2f7ad6',false],['Bottom Layer','#e3b23b',true],['Top Silkscreen','var(--color-text-primary)',true],['Bottom Silkscreen','var(--color-violet-600)',false]]
      : [['Top Layer','#e34c4c',true],['Middle Layer 1','#3bb56f',true],['Middle Layer 2','#2f7ad6',true],['Bottom Layer','#e3b23b',true],['Top Silkscreen','var(--color-text-primary)',true],['Bottom Silkscreen','var(--color-text-tertiary)',true],['Top Paste','#c060c0',false],['Bottom Paste','#3bb5b5',false],['Drill Layer','#555',true],['Board Outline','var(--color-violet-600)',true]];
    return `<div style="padding:6px 0;">` + layers.map(([name,color,on])=>`
      <div style="display:flex; align-items:center; gap:var(--spacing-5); padding:var(--spacing-4) var(--spacing-8); border-bottom:var(--border-width-1) solid var(--color-border-subtle);">
        <span style="width:16px; height:16px; border-radius:var(--radius-sm); background:${color}; flex:0 0 auto; box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);"></span>
        <span style="flex:1; font-size:var(--font-size-sm); color:var(--color-text-primary); ${on?'':'opacity:var(--opacity-disabled);'}">${name}</span>
        <span style="color:${on?'var(--color-violet-600)':'var(--color-border-strong)'}; display:inline-flex;">${on?eye:eyeoff}</span>
        <span style="color:var(--color-border-strong); display:inline-flex;">${lock}</span>
      </div>`).join('') + `</div>`;
}

export function buildFilter(): string {
  const check = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--color-text-on-brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>';
    const cats = [['All Objects',true,'248'],['Components',true,'42'],['Pads',true,'168'],['Vias',true,'31'],['Tracks',true,'96'],['Arcs',false,'12'],['Fills',false,'4'],['Text',true,'18'],['Nets',true,'27'],['Dimensions',false,'3']];
    return `<div style="padding:16px 18px;">
      <div style="font-size:var(--font-size-xs); color:var(--color-text-tertiary); font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:var(--spacing-4);">Object Filter</div>` +
      cats.map(([name,on,count])=>`
      <div style="display:flex; align-items:center; gap:var(--spacing-5); padding:var(--spacing-4) var(--spacing-0); cursor:pointer;">
        <span style="width:18px; height:18px; border-radius:var(--radius-sm); border:var(--border-width-1-5) solid ${on?'var(--color-violet-600)':'var(--color-border-strong)'}; background:${on?'var(--color-violet-600)':'#fff'}; display:flex; align-items:center; justify-content:center; flex:0 0 auto;">${on?check:''}</span>
        <span style="flex:1; font-size:var(--font-size-sm); color:var(--color-text-primary);">${name}</span>
        <span style="font-size:var(--font-size-sm); color:var(--color-text-tertiary);">${count}</span>
      </div>`).join('') + `</div>`;
}

export function buildLibrary(): string {
  const chip = (label, sel) => `<div style="display:flex; flex-direction:column; align-items:center; gap:var(--spacing-3); padding:var(--spacing-5) var(--spacing-2); border-radius:var(--radius-lg); border:var(--border-width-1-5) solid ${sel?'var(--color-violet-600)':'var(--color-border-subtle)'}; background:${sel?'#faf6fe':'#fff'}; position:relative;">
      ${sel?'<span style="position:absolute; top:5px; right:5px; width:15px; height:15px; border-radius:var(--radius-full); background:var(--color-violet-600); display:flex; align-items:center; justify-content:center;"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-on-brand)" stroke-width="3.2"><path d="M5 12l5 5L20 6"/></svg></span>':''}
      <span style="width:56px; height:30px; border-radius:var(--radius-xs); background:linear-gradient(#dadade,#c2c2c8); display:flex; align-items:center; justify-content:center; font-size:var(--font-size-xs); color:#3a3a3a; font-weight:700; box-shadow:inset 0 0 0 1px #abacb2; position:relative;">
        <span style="position:absolute; left:0; top:0; bottom:0; width:9px; background:linear-gradient(#d2d2d7,#b0b0b6); border-radius:var(--radius-xs) 0 0 3px;"></span>
        <span style="position:absolute; right:0; top:0; bottom:0; width:9px; background:linear-gradient(#d2d2d7,#b0b0b6); border-radius:0 3px 3px 0;"></span>103</span>
      <span style="font-size:var(--font-size-xs); color:var(--color-text-secondary);">${label}</span></div>`;
    const ti = (label, depth, o) => `<div style="display:flex; align-items:center; gap:var(--spacing-3); padding:var(--spacing-3) var(--spacing-4); padding-left:${8+depth*15}px; border-radius:var(--radius-md); ${o.active?'background:var(--color-bg-brand-subtle);':''} cursor:pointer;">
      ${o.caret?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4" style="transform:rotate(${o.open?'90deg':'0deg'});"><path d="M9 6l6 6-6 6"/></svg>`:'<span style="width:12px;display:inline-block;"></span>'}
      <span style="font-size:var(--font-size-sm); white-space:nowrap; color:${o.active?'var(--color-violet-600)':'var(--color-text-primary)'}; font-weight:${o.active?'600':'500'};">${label}</span></div>`;
    return `
    <div style="display:flex; align-items:center; gap:var(--spacing-8); padding:var(--spacing-1) var(--spacing-8) var(--spacing-5);">
      <span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-violet-600); border-bottom:var(--border-width-2) solid var(--color-violet-600); padding-bottom:var(--spacing-3);">Common Library</span>
      <span style="font-size:var(--font-size-sm); font-weight:500; color:var(--color-text-tertiary); padding-bottom:var(--spacing-3);">All Library</span>
    </div>
    <div style="padding:0 14px 10px;">
      <div style="display:flex; align-items:center; gap:var(--spacing-4); background:var(--color-bg-subtle); border:var(--border-width-1) solid var(--color-border-subtle); border-radius:var(--radius-lg); padding:var(--spacing-4) var(--spacing-6);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>
        <span style="font-size:var(--font-size-sm); color:var(--color-text-tertiary);">Search parts &amp; compo..</span>
      </div>
    </div>
    <div style="display:flex; gap:var(--spacing-8); padding:var(--spacing-0) var(--spacing-8) var(--spacing-3);">
      <span style="font-size:var(--font-size-sm); font-weight:600; color:var(--color-text-primary); border-bottom:var(--border-width-2) solid var(--color-violet-600); padding-bottom:var(--spacing-2);">Categories</span>
      <span style="font-size:var(--font-size-sm); font-weight:500; color:var(--color-text-tertiary); padding-bottom:var(--spacing-2);">Collections</span>
    </div>
    <div style="padding:4px 8px;">
      ${ti('Symbols',0,{caret:true,open:true})}${ti('Passive',1,{caret:true,open:true})}${ti('Resistor',2,{caret:true,open:true})}${ti('SMD',3,{active:true})}${ti('Through Hole',3,{})}${ti('Variable',3,{})}${ti('Capacitor',2,{caret:true})}${ti('Inductor',2,{caret:true})}${ti('Power',1,{caret:true})}${ti('Connector',1,{caret:true})}${ti('Discrete',1,{caret:true})}${ti('UI',1,{caret:true})}
    </div>
    <div style="border-top:var(--border-width-1) solid var(--color-border-subtle); padding:var(--spacing-6) var(--spacing-7);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--spacing-5);">
        <span style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary);">R_US (SMD Resistor)</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:var(--spacing-4);">
        ${chip('0201',false)}${chip('0402',false)}${chip('0603',true)}${chip('0201',false)}${chip('0402',false)}${chip('0603',false)}
      </div>
      <div style="display:flex; gap:var(--spacing-3); margin-top:var(--spacing-6);">
        <span style="flex:1; text-align:center; padding:var(--spacing-3); border-radius:var(--radius-lg); background:var(--color-violet-600); color:var(--color-text-on-brand); font-size:var(--font-size-sm); font-weight:600;">US</span>
        <span style="flex:1; text-align:center; padding:var(--spacing-3); border-radius:var(--radius-lg); background:var(--color-bg-brand-subtle); color:var(--color-violet-600); font-size:var(--font-size-sm); font-weight:600;">EU</span>
      </div>
      <div style="margin-top:12px; padding:var(--spacing-5) var(--spacing-6); background:var(--color-bg-subtle); border:var(--border-width-1) solid var(--color-border-subtle); border-radius:var(--radius-lg);">
        <div style="font-size:var(--font-size-sm); font-weight:700; color:var(--color-text-primary); margin-bottom:var(--spacing-1);">1 &amp; 2. Select Variant</div>
        <div style="font-size:var(--font-size-sm); color:var(--color-text-tertiary); line-height:1.4;">Navigate and select 0603 Resistor from R_US group</div>
      </div>
    </div>`;
}

export function buildRight(mode: Mode, rightTab: RightTab): string {
  if (rightTab === 'layer') return buildLayers(mode);
    if (rightTab === 'filter') return buildFilter();
    const groups = mode === 'pcb'
      ? [['Document', [['Unit','mil / mm'],['Grid Type','Dot'],['Grid Size','11.7mm'],['Snap Size','11.7mm'],['Routing Mode','Block']]],
         ['Common Setting',[['Start Track Width','5'],['Track Width','0.374mm'],['Via Size','Follow Rule'],['Via Inside Diameter','0.374mm']]],
         ['Colorful Silkscreen',[['Top Side Board','#1E1E1E'],['Top Silkscreen','#1E1E1E'],['Bottom Board','#1E1E1E']]]]
      : mode === '2d'
      ? [['Board',[['Board Material','FR-4'],['Board Side','Top Side'],['Silkscreen Tech','Standard'],['Board Color','Blue'],['Pad Plating','Goldarn'],['Silkscreen','Visible']]]]
      : [['Basic properties',[['Sheet Size','A4'],['Orientation','Landscape'],['Unit','mil / mm'],['Grid Size','5 mil'],['Snap Size','5 mil']]],
         ['Drawing Border',[['Show Border','Yes'],['Border Style','Standard'],['Border Color','#1E1E1E'],['Margin','10 mm'],['Zones','6 x 4']]],
         ['Title Block',[['Title','Universal Remote Controller'],['Document Number','DXF_P1'],['Revision','v1.0'],['Author','Product Design Team'],['Company','IDEEZA'],['Date','2025-12-02'],['Sheet','1 / 1']]]];
    return groups.map(([title, rows]) => `
      <div style="border-bottom:var(--border-width-1) solid var(--color-border-subtle);">
        <div style="display:flex; align-items:center; gap:var(--spacing-4); padding:var(--spacing-6) var(--spacing-8);">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" stroke-width="2.6"><path d="M6 9l6 6 6-6"/></svg>
          <span style="font-size:var(--font-size-md); font-weight:700; color:var(--color-text-primary);">${title}</span>
        </div>
        <div style="padding:0 18px 12px;">
          ${rows.map(([k,v])=>`<div style="display:flex; align-items:center; justify-content:space-between; padding:var(--spacing-3) var(--spacing-0);">
            <span style="font-size:var(--font-size-sm); color:var(--color-text-secondary);">${k}</span>
            <span style="font-size:var(--font-size-sm); color:var(--color-text-primary); font-weight:600; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${v}</span>
          </div>`).join('')}
        </div>
      </div>`).join('');
}

export function buildSettingsBody(p: SettingsPage): string {
    const field = (k, v, type) => `<div style="display:flex; align-items:center; justify-content:space-between; padding:var(--spacing-6) var(--spacing-0); border-bottom:var(--border-width-1) solid var(--color-border-subtle);">
      <div><div style="font-size:var(--font-size-md); color:var(--color-text-primary); font-weight:600;">${k}</div></div>
      ${type==='toggle' ? `<div style="width:42px; height:24px; border-radius:var(--radius-xl); background:${v?'var(--color-violet-600)':'#dcd6e3'}; position:relative; cursor:pointer; transition:background .2s;"><div style="position:absolute; top:3px; left:${v?'21px':'3px'}; width:18px; height:18px; border-radius:var(--radius-full); background:var(--color-bg-surface); transition:left .2s; box-shadow:var(--elevation-1);"></div></div>`
      : `<div style="display:flex; align-items:center; gap:var(--spacing-4); padding:var(--spacing-4) var(--spacing-6); border:var(--border-width-1) solid var(--color-border-default); border-radius:var(--radius-lg); min-width:160px; justify-content:space-between;"><span style="font-size:var(--font-size-sm); color:var(--color-text-primary);">${v}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg></div>`}
    </div>`;
    const data = {
      system: [['Language','English','sel'],['Auto Save','',true],['Crash Recovery','',true],['Theme','Light','sel'],['Default Unit','mil','sel'],['Show Welcome Screen','',false]],
      drawing: [['Grid Style','Dotted','sel'],['Grid Size','5 mil','sel'],['Snap to Grid','',true],['Show Rulers','',true],['Wire Width','0.254mm','sel'],['Auto Junction','',true]],
      hotkey: [['Undo','Ctrl + Z','sel'],['Redo','Ctrl + Y','sel'],['Place Wire','W','sel'],['Place Net Label','N','sel'],['Zoom Fit','Ctrl + 0','sel'],['Delete','Del','sel']],
      property: [['Show Designators','',true],['Designator Size','1.5mm','sel'],['Show Pin Numbers','',true],['Show Net Names','',false],['Color Theme','Default','sel']],
      save: [['Auto Save Interval','5 min','sel'],['Backup Copies','3','sel'],['Save Location','Cloud + Local','sel'],['Compress Files','',true],['Save on Exit','',true]],
    };
    return (data[p]||data.system).map(([k,v,t])=>field(k, v, t)).join('');
}
