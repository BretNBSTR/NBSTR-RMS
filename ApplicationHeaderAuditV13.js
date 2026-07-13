/**
 * NBSTR RMS v1.3 — Google Adoption Application Header Audit
 */
function auditAdoptionResponseSheetV13(spreadsheetId,sheetName) {
  const ss=SpreadsheetApp.openById(spreadsheetId);
  const sh=ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Response sheet not found: '+sheetName);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const mapped=APPLICATION_MAP_V12_();
  const result=headers.map((h,i)=>{
    const exact=mapped.find(r=>String(r[0]).trim()===String(h).trim());
    return {column:i+1,header:h,status:exact?'MAPPED':'UNMAPPED',stableKey:exact?exact[1]:''};
  });
  writeHeaderAuditV13_(result,spreadsheetId,sheetName);
  return result;
}
function writeHeaderAuditV13_(rows,sourceSpreadsheetId,sourceSheetName) {
  const ss=SpreadsheetApp.getActive();
  ensureTable_(ss,'FormHeaderAudit',['AuditAt','FormType','SourceSpreadsheetID','SourceSheetName','Column','Header','Status','StableKey']);
  rows.forEach(r=>appendRecord_('FormHeaderAudit',{
    AuditAt:new Date(),FormType:'Application',SourceSpreadsheetID:sourceSpreadsheetId,
    SourceSheetName:sourceSheetName,Column:r.column,Header:r.header,Status:r.status,StableKey:r.stableKey
  }));
}
function assertApplicationHeadersReadyV13(spreadsheetId,sheetName) {
  const rows=auditAdoptionResponseSheetV13(spreadsheetId,sheetName);
  const unmapped=rows.filter(r=>r.status==='UNMAPPED');
  if (unmapped.length) throw new Error('LIVE TRIGGER BLOCKED: '+unmapped.length+' adoption response headers are unmapped.');
  return {ok:true,message:'All adoption response headers are mapped. Header gate passed.'};
}
