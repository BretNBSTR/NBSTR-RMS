/**
 * NBSTR RMS v0.8 — Drive Folder & Document Engine
 * Requires prior RMS core/application/dog modules.
 */

function ensureV08Tables_() {
  ensureTable_(SpreadsheetApp.getActive(),'Documents',[
    'DocumentID','RelatedRecordType','RelatedRecordID','DocumentType',
    'FileName','DriveFileID','DriveFolderID','Source','UploadedByPersonID',
    'UploadedAt','Notes','Active'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'FormFieldMap',[
    'FormFieldMapID','FormName','SourceField','StableQuestionKey',
    'QuestionLabel','DestinationType','DestinationField','Active'
  ]);
}

function getOrCreateRMSRootFolder_() {
  const id=getSettingValue_('RMS_DRIVE_ROOT_FOLDER_ID');
  if(id) return DriveApp.getFolderById(id);
  const folders=DriveApp.getFoldersByName('NBSTR RMS - DEVELOPMENT FILES');
  const folder=folders.hasNext()?folders.next():DriveApp.createFolder('NBSTR RMS - DEVELOPMENT FILES');
  upsertSetting_('RMS_DRIVE_ROOT_FOLDER_ID',folder.getId(),'Drive folder ID for RMS development files.');
  return folder;
}

function upsertSetting_(key,value,description) {
  const existing=findRecord_('Settings','SettingKey',key);
  if(existing) updateRecord_('Settings','SettingKey',key,{SettingValue:value,Description:description||existing.Description});
  else appendRecord_('Settings',{SettingKey:key,SettingValue:value,Description:description||''});
}

function getOrCreateRecordFolder_(recordType,recordID,displayName) {
  ensureV08Tables_();
  const root=getOrCreateRMSRootFolder_();
  const parentName=recordType==='Dog'?'Dogs':recordType==='Application'?'Applications':'Other Records';
  const parents=root.getFoldersByName(parentName);
  const parent=parents.hasNext()?parents.next():root.createFolder(parentName);
  const safe=String(displayName||recordID).replace(/[\\/:*?"<>|]/g,' ').trim();
  const folderName=recordID+' - '+safe;
  const found=parent.getFoldersByName(folderName);
  return found.hasNext()?found.next():parent.createFolder(folderName);
}

function createDogDriveFolder(dogID) {
  const d=findRecord_('Dogs','DogID',dogID);
  if(!d) throw new Error('Dog not found.');
  const folder=getOrCreateRecordFolder_('Dog',dogID,d.Name);
  ['Medical','Intake Records','Photos','Adoption','Other'].forEach(n=>{
    const x=folder.getFoldersByName(n); if(!x.hasNext()) folder.createFolder(n);
  });
  updateRecord_('Dogs','DogID',dogID,{DriveFolderID:folder.getId()});
  logTimeline_('Dog',dogID,'DRIVE_FOLDER_READY','Dog Drive folder ready','',currentPersonId_(),'Dogs',dogID);
  return {ok:true,folderID:folder.getId(),folderUrl:folder.getUrl(),message:'Drive folder ready for '+d.Name+'.'};
}

function createApplicationDriveFolder(applicationID) {
  const a=findRecord_('Applications','ApplicationID',applicationID);
  if(!a) throw new Error('Application not found.');
  const p=findRecord_('People','PersonID',a.PrimaryApplicantPersonID)||{};
  const name=[p.FirstName,p.LastName].filter(String).join(' ')||applicationID;
  const folder=getOrCreateRecordFolder_('Application',applicationID,name);
  ['Application','References','Background','Correspondence'].forEach(n=>{
    const x=folder.getFoldersByName(n); if(!x.hasNext()) folder.createFolder(n);
  });
  updateRecord_('Applications','ApplicationID',applicationID,{DriveFolderID:folder.getId(),UpdatedAt:new Date()});
  return {ok:true,folderID:folder.getId(),folderUrl:folder.getUrl(),message:'Application Drive folder ready.'};
}

function registerExistingDriveFile(data) {
  ensureV08Tables_();
  validateRequired_(data,['relatedRecordType','relatedRecordID','documentType','driveFileID']);
  const file=DriveApp.getFileById(data.driveFileID);
  const folder=data.relatedRecordType==='Dog'
    ? DriveApp.getFolderById(createDogDriveFolder(data.relatedRecordID).folderID)
    : DriveApp.getFolderById(createApplicationDriveFolder(data.relatedRecordID).folderID);
  file.moveTo(selectDocumentSubfolder_(folder,data.documentType));
  const id='DOC-'+Utilities.getUuid().slice(0,8).toUpperCase();
  appendRecord_('Documents',{
    DocumentID:id,RelatedRecordType:data.relatedRecordType,RelatedRecordID:data.relatedRecordID,
    DocumentType:data.documentType,FileName:file.getName(),DriveFileID:file.getId(),
    DriveFolderID:folder.getId(),Source:data.source||'RMS',UploadedByPersonID:currentPersonId_(),
    UploadedAt:new Date(),Notes:data.notes||'',Active:true
  });
  logTimeline_(data.relatedRecordType,data.relatedRecordID,'DOCUMENT_ADDED',
    data.documentType+': '+file.getName(),'',currentPersonId_(),'Documents',id);
  return {ok:true,id:id,message:'Document filed in RMS.'};
}

function selectDocumentSubfolder_(recordFolder,documentType) {
  const type=String(documentType||'Other').toLowerCase();
  let name='Other';
  if(type.includes('photo')) name='Photos';
  else if(type.includes('rabies')||type.includes('vaccine')||type.includes('medical')||type.includes('vet')) name='Medical';
  else if(type.includes('cvi')||type.includes('intake')||type.includes('surrender')) name='Intake Records';
  else if(type.includes('adoption')||type.includes('contract')) name='Adoption';
  else if(type.includes('reference')) name='References';
  else if(type.includes('background')) name='Background';
  else if(type.includes('application')) name='Application';
  const f=recordFolder.getFoldersByName(name);
  return f.hasNext()?f.next():recordFolder.createFolder(name);
}

function getDocumentsForRecord(recordType,recordID) {
  ensureV08Tables_();
  return getRecords_('Documents').filter(d=>
    String(d.RelatedRecordType)===String(recordType)&&
    String(d.RelatedRecordID)===String(recordID)&&
    String(d.Active).toLowerCase()!=='false'
  ).map(d=>({
    id:d.DocumentID,type:d.DocumentType,name:d.FileName,
    url:'https://drive.google.com/open?id='+d.DriveFileID,uploadedAt:d.UploadedAt||''
  }));
}
