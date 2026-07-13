/**
 * NBSTR RMS v2.4 — Core Compatibility Helpers
 * Resolves shared dependencies used throughout the consolidated RMS modules.
 */
function ensureTable_(ss,name,headers){
  ss=ss||SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);
  if(sh.getLastRow()===0 && headers && headers.length) sh.getRange(1,1,1,headers.length).setValues([headers]);
  else if(headers && headers.length){
    const existing=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0];
    headers.forEach(h=>{ if(existing.indexOf(h)<0){ sh.getRange(1,sh.getLastColumn()+1).setValue(h); existing.push(h); }});
  }
  return sh;
}
function getRecords_(sheetName){
  const sh=SpreadsheetApp.getActive().getSheetByName(sheetName);
  if(!sh || sh.getLastRow()<2) return [];
  const values=sh.getDataRange().getValues(), headers=values.shift().map(String);
  return values.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{
    const o={}; headers.forEach((h,i)=>o[h]=r[i]); return o;
  });
}
function appendRecord_(sheetName,obj){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(sheetName);
  if(!sh) sh=ensureTable_(ss,sheetName,Object.keys(obj));
  let headers=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0];
  Object.keys(obj).forEach(k=>{if(headers.indexOf(k)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(k);headers.push(k);}});
  sh.appendRow(headers.map(h=>obj[h]===undefined?'':obj[h]));
  return obj;
}
function findRecord_(sheetName,key,value){
  return getRecords_(sheetName).find(x=>String(x[key])===String(value))||null;
}
function updateRecord_(sheetName,key,value,changes){
  const sh=SpreadsheetApp.getActive().getSheetByName(sheetName);
  if(!sh) throw new Error('Sheet not found: '+sheetName);
  let headers=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0];
  Object.keys(changes).forEach(k=>{if(headers.indexOf(k)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(k);headers.push(k);}});
  const values=sh.getDataRange().getValues();
  const keyCol=headers.indexOf(key);
  for(let r=1;r<values.length;r++){
    if(String(values[r][keyCol])===String(value)){
      Object.keys(changes).forEach(k=>sh.getRange(r+1,headers.indexOf(k)+1).setValue(changes[k]));
      return changes;
    }
  }
  throw new Error('Record not found in '+sheetName+': '+value);
}
function generateId_(prefix){ return String(prefix||'ID')+'-'+Utilities.getUuid().slice(0,8).toUpperCase(); }
function nextId_(type,prefix){ return generateId_(prefix||String(type||'ID').toUpperCase()); }
function validateRequired_(data,fields){
  const missing=(fields||[]).filter(f=>data[f]===undefined||data[f]===null||String(data[f]).trim()==='');
  if(missing.length) throw new Error('Required field(s) missing: '+missing.join(', '));
  return true;
}
function currentPersonId_(){
  const email=String(Session.getActiveUser().getEmail()||'').toLowerCase();
  const p=getRecords_('People').find(x=>String(x.Email||'').toLowerCase()===email);
  return p?p.PersonID:'';
}
function logTimeline_(recordType,recordID,eventType,detail){
  ensureTable_(SpreadsheetApp.getActive(),'TimelineEvents',['TimelineEventID','RelatedRecordType','RelatedRecordID','EventType','EventAt','Summary','Detail','CreatedByPersonID']);
  appendRecord_('TimelineEvents',{TimelineEventID:generateId_('TLE'),RelatedRecordType:recordType,RelatedRecordID:recordID,EventType:eventType,EventAt:new Date(),Summary:eventType,Detail:detail||'',CreatedByPersonID:currentPersonId_()});
}
function addTimelineEvent_(recordType,recordID,eventType,detail){ return logTimeline_(recordType,recordID,eventType,detail); }
function createTask_(data){
  ensureTable_(SpreadsheetApp.getActive(),'Tasks',['TaskID','TaskTypeID','TaskTypeName','Title','RelatedRecordType','RelatedRecordID','AssignedRole','AssignedPersonID','Status','Priority','DueAt','Instructions','CreatedAt']);
  const row=Object.assign({TaskID:generateId_('TASK'),Status:'Open',Priority:'Normal',CreatedAt:new Date()},data||{});
  appendRecord_('Tasks',row); return row;
}
function completeActiveTaskByType_(relatedType,relatedID,taskType){
  const t=getRecords_('Tasks').find(x=>String(x.RelatedRecordType)===String(relatedType)&&String(x.RelatedRecordID)===String(relatedID)&&
    (String(x.TaskTypeName||x.TaskType||'')===String(taskType)||String(x.Title||'')===String(taskType))&&['Open','In Progress','Waiting'].includes(String(x.Status)));
  if(t) updateRecord_('Tasks','TaskID',t.TaskID,{Status:'Complete',CompletedAt:new Date(),CompletedByPersonID:currentPersonId_()});
  return t||null;
}
function taskForUI_(t){
  return {id:t.TaskID,title:t.Title||t.TaskTypeName||'Work item',priority:t.Priority||'Normal',status:t.Status||'Open',
    dueAt:t.DueAt||'',assignedRole:t.AssignedRole||'',taskType:t.TaskTypeName||t.TaskType||'',relatedRecordType:t.RelatedRecordType||'',relatedRecordID:t.RelatedRecordID||''};
}
