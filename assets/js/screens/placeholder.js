import {strings} from '../strings.js?v=2026-11-14p1';

export function mount(host){
  const section=document.createElement('section');section.className='empty-state';
  const message=document.createElement('p');message.className='screen-placeholder';message.textContent=strings.placeholder;
  section.append(message);host.replaceChildren(section);
}



