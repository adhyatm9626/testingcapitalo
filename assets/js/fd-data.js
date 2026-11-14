import {readSets} from './data.js?v=2026-11-14p1';

const numeric=value=>Number.isFinite(Number(value))?Number(value):null;
export async function loadFdRecords({signal,force=false}={}){
  const names=['fd-banks','post-office'];const envelopes=await readSets(names,{signal,force});
  const seed=envelopes['fd-banks'].data,post=envelopes['post-office'].data;
  const records=[...(seed.banks||[]),...(seed.foreign_banks||[]),...(seed.corporate_fds||[])].map(record=>({...record,source_name:record.source_name||envelopes['fd-banks'].source||'Capitalo team (manual updates)'}));
  for(const tenure of post.tenures||[])records.push({id:`post-office-${tenure.years}`,name:`Post Office Time Deposit — ${tenure.years}-year`,group:'post-office',type:'post-office',rates:{[`y${tenure.years}`]:tenure.rate},senior_extra_pp:null,verified:Boolean(post.verified),as_of:post.as_of,source_name:envelopes['post-office'].source||'Capitalo team (manual updates)',source_url:'https://www.indiapost.gov.in/',valid_until:post.valid_until,official_website:'https://www.indiapost.gov.in/',postOffice:true});
  for(const record of [...(seed.banks||[]),...(seed.foreign_banks||[]),...(seed.corporate_fds||[])]){
    const tax=record.tax_saving_5y;if(!tax?.general)continue;
    const base=numeric(tax.general.min??tax.general.max);if(base===null)continue;
    const seniorMin=numeric(tax.senior?.min??tax.senior?.max),seniorMax=numeric(tax.senior?.max??tax.senior?.min);
    records.push({...record,id:`${record.id}-tax-saving-5y`,name:`${record.name} — 5-year tax-saving FD`,group:'tax-saving',rates:{y5:base},senior_extra_pp:seniorMin===null?null:{min:Math.max(0,seniorMin-base),max:Math.max(0,(seniorMax??seniorMin)-base)},taxSaving:true});
  }
  return {records,envelopes};
}



