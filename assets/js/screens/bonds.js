import {strings} from '../strings.js?v=2026-11-14p1';
import {mountCatalogue} from '../catalogue.js?v=2026-11-14p1';
export function mount(host){mountCatalogue(host,{setName:'bonds-catalogue',section:'items',title:strings.routes.bonds.title,icon:'bond',note:strings.descriptionOnly})}



