const paths={
  bank:['<path d="M3 10h18M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18M12 3 3 8h18l-9-5Z"/>'],
  fund:['<circle cx="12" cy="12" r="8.5"/>','<path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18"/>'],
  etf:['<path d="M4 7h16l-2 13H6L4 7Z"/>','<path d="M9 7V5a3 3 0 0 1 6 0v2M9 12h6m-6 4h6"/>'],
  stock:['<path d="M4 19V5m0 14h16"/>','<path d="m7 15 4-4 3 2 5-6"/>','<path d="M16 7h3v3"/>'],
  gold:['<path d="m4 16 3-8h10l3 8-3 3H7l-3-3Z"/>','<path d="M7 8 9 5h6l2 3M4 16h16"/>'],
  silver:['<path d="m5 5 14 14M8 3l13 13-4 5L4 8l4-5Z"/>','<path d="m7 11 5-5m-2 10 5-5"/>'],
  bond:['<path d="M6 3h9l4 4v14H6z"/>','<path d="M15 3v5h5M9 12h7m-7 4h7"/>'],
  building:['<path d="M4 21V5l8-3 8 3v16M2 21h20"/>','<path d="M8 8h1m6 0h1M8 12h1m6 0h1M11 21v-5h2v5"/>'],
  post:['<path d="M3 8h18v13H3zM2 8l3-5h14l3 5"/>','<path d="M7 13h10m-10 4h7"/>'],
  pie:['<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/>','<path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>'],
  calculator:['<rect x="5" y="3" width="14" height="18" rx="2"/>','<path d="M8 7h8M8 12h2m4 0h2M8 16h2m4 0h2"/>'],
  tools:['<circle cx="8" cy="8" r="3"/>','<path d="m10.2 10.2 7.3 7.3m-3.5 1.5 6-6m-6 0 6 6"/>'],
  home:['<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>'],
  compare:['<path d="M7 4v16m0-16L4 7m3-3 3 3m7 13V4m0 16-3-3m3 3 3-3"/>'],
  ask:['<path d="M4 5h16v12H9l-5 4V5Z"/>','<path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>'],
  system:['<circle cx="12" cy="12" r="8"/>','<path d="M12 4a8 8 0 0 0 0 16V4Z"/>'],
  dark:['<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z"/>'],
  light:['<circle cx="12" cy="12" r="4"/>','<path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>']
};
export function makeIcon(name,className=''){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');if(className)svg.setAttribute('class',className);for(const markup of paths[name]||[]){const match=markup.match(/^<(path|circle|rect)\s+([^>]+)\/?\s*>$/);if(!match)continue;const shape=document.createElementNS(svg.namespaceURI,match[1]);for(const [,key,value] of match[2].matchAll(/([\w-]+)="([^"]*)"/g))shape.setAttribute(key,value);svg.append(shape)}return svg}
export function mountIcons(root=document){for(const host of root.querySelectorAll('[data-icon]'))host.replaceChildren(makeIcon(host.dataset.icon))}
