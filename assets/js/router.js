import {strings} from './strings.js?v=2026-11-14p1';

const normalize=hash=>String(hash||'').replace(/^#/,'').replace(/^\/+|\/+$/g,'');
export function resolveRoute(hash){
  const raw=normalize(hash)||'home',[routePart,query='']=raw.split('?'),path=decodeURIComponent(routePart);
  const params=new URLSearchParams(query),shareParams=['amount','mode','years','rate'].some(key=>params.has(key))?Object.fromEntries(['amount','mode','years','rate'].map(key=>[key,params.get(key)])):null;
  if(path==='home')return {name:'home',path};
  if(path.startsWith('fd/'))return {name:'fd-detail',path,id:path.slice(3)};
  if(path.startsWith('mf/'))return {name:'mf-detail',path,id:path.slice(3)};
  if(path.startsWith('etf/'))return {name:'etf-detail',path,id:path.slice(4)};
  return {name:strings.routes[path]?path:'unknown',path,shareParams};
}
const screenModules={fd:'fd','fd-detail':'fd-detail',sip:'sip',mf:'mf','mf-detail':'mf-detail',etf:'etf','etf-detail':'etf',stocks:'stocks',gold:'gold',silver:'silver',bonds:'bonds',planner:'planner',compare:'compare',tools:'tools',ask:'ask'};
export async function renderRoute(route){
  const home=document.querySelector('.home-screen'),screen=document.querySelector('#screen');
  if(route.name==='home'){home.hidden=false;screen.hidden=true;document.title=strings.pageTitle;return}
  home.hidden=true;screen.hidden=false;
  const copy=strings.routes[route.name]||{title:strings.routeUnknown,intro:''};
  document.querySelector('#screenTitle').textContent=copy.title;
  document.querySelector('#screenIntro').textContent=copy.intro;
  const content=document.querySelector('#screenContent');content.replaceChildren();
  const skeleton=document.createElement('div');skeleton.className='skeleton-state';skeleton.setAttribute('aria-label',strings.loading);const firstLine=document.createElement('span'),secondLine=document.createElement('span');firstLine.className='skeleton-line';secondLine.className='skeleton-line short';skeleton.append(firstLine,secondLine);content.append(skeleton);
  try{const module=await import(`./screens/${screenModules[route.name]||'placeholder'}.js?v=2026-11-14p1`);module.mount(content,route)}catch{const error=document.createElement('p');error.className='screen-placeholder';error.textContent=`${strings.routeUnknown} (screen_module_unavailable)`;content.replaceChildren(error)}
  document.title=`${copy.title} · Capitalo`;
  document.querySelector('#screenTitle').focus({preventScroll:true});
}



