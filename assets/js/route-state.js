let selectedAsset=null;
const comparedFunds=new Map();
export const setSelectedAsset=value=>{selectedAsset=value};
export const saveSelectedAsset=value=>{selectedAsset=value};
export const takeSelectedAsset=()=>{const value=selectedAsset;selectedAsset=null;return value};
export const getComparedFunds=()=>[...comparedFunds.values()];
export function toggleComparedFund(fund){if(comparedFunds.has(fund.code)){comparedFunds.delete(fund.code);return false}if(comparedFunds.size>=3)return false;comparedFunds.set(fund.code,fund);return true}
export const removeComparedFund=code=>comparedFunds.delete(String(code));
