/**
 * NBSTR RMS v0.9 — Dog Entry Adapter, Missing Records & Circle of Care
 */

function ensureV09Tables_() {
  ensureV08Tables_();
  ensureTable_(SpreadsheetApp.getActive(),'DogFormFieldMap',[
    'DogFormFieldMapID','FormName','SourceField','StableFieldKey',
    'DestinationField','FieldType','DocumentType','Active'
  ]);
}

function seedNBSTRDogEntryFieldMap() {
  ensureV09Tables_();
  const rows=[
    ['NBSTR Dog Entry Form','Dog Name','dog_name','Name','Dog',''],
    ['NBSTR Dog Entry Form','Breed','dog_breed','Breed','Dog',''],
    ['NBSTR Dog Entry Form','Sex','dog_sex','Sex','Dog',''],
    ['NBSTR Dog Entry Form','Weight','dog_weight','WeightCurrent','Dog',''],
    ['NBSTR Dog Entry Form','Current City','origin_city','OriginCity','Dog',''],
    ['NBSTR Dog Entry Form','Current State','origin_state','OriginState','Dog',''],
    ['NBSTR Dog Entry Form','PetPoint ID','petpoint_id','PetPointID','Dog',''],
    ['NBSTR Dog Entry Form','Dog Photos','dog_photos','','File','Photo'],
    ['NBSTR Dog Entry Form','Medical Records','medical_records','','File','Medical Record'],
    ['NBSTR Dog Entry Form','Rabies Certificate','rabies_certificate','','File','Rabies Certificate'],
    ['NBSTR Dog Entry Form','CVI','cvi_document','','File','CVI'],
    ['NBSTR Dog Entry Form','Other Paperwork','other_paperwork','','File','Intake Record']
  ];
  rows.forEach(r=>{
    const exists=getRecords_('DogFormFieldMap').some(x=>String(x.FormName)===r[0]&&String(x.SourceField)===r[1]);
    if(!exists) appendRecord_('DogFormFieldMap',{
      DogFormFieldMapID:'DFM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      FormName:r[0],SourceField:r[1],StableFieldKey:r[2],DestinationField:r[3],
      FieldType:r[4],DocumentType:r[5],Active:true
    });
  });
  return {ok:true,message:'Starter Dog Entry field map created. Review exact response headings before activating the trigger.'};
}

function googleFormDogEntrySubmit(e) {
  if(!e || !e.namedValues) throw new Error('Run from a spreadsheet form-submit trigger.');
  return normalizeDogEntryForm_('NBSTR Dog Entry Form',e.namedValues,'Google Form');
}

function normalizeDogEntryForm_(formName,namedValues,source) {
  ensureV09Tables_();
  const maps=getRecords_('DogFormFieldMap').filter(m=>
    String(m.FormName)===String(formName)&&String(m.Active).toLowerCase()==='true'
  );
  const dogData={}, files=[];
  Object.keys(namedValues||{}).forEach(label=>{
    const raw=Array.isArray(namedValues[label])?namedValues[label].join(', '):namedValues[label];
    const map=maps.find(m=>String(m.SourceField).trim()===String(label).trim());
    if(!map) return;
    if(String(map.FieldType)==='Dog' && map.DestinationField) dogData[map.DestinationField]=raw;
    if(String(map.FieldType)==='File') extractDriveFileIDs_(raw).forEach(id=>files.push({
      driveFileID:id,documentType:map.DocumentType||'Other',source:source
    }));
  });

  let dog=null;
  if(dogData.PetPointID) dog=getRecords_('Dogs').find(d=>String(d.PetPointID)===String(dogData.PetPointID));
  if(!dog && dogData.Name) {
    const candidates=getRecords_('Dogs').filter(d=>String(d.Name).toLowerCase()===String(dogData.Name).toLowerCase());
    if(candidates.length===1) dog=candidates[0];
  }
  if(!dog) throw new Error('Dog Entry Form could not safely match an existing RMS dog. Review the submission and link it manually.');

  const update={UpdatedAt:new Date()};
  ['Breed','Sex','OriginCity','OriginState','PetPointID'].forEach(k=>{if(dogData[k])update[k]=dogData[k];});
  if(dogData.WeightCurrent && !isNaN(Number(dogData.WeightCurrent))) update.WeightCurrent=Number(dogData.WeightCurrent);
  updateRecord_('Dogs','DogID',dog.DogID,update);
  createDogDriveFolder(dog.DogID);

  files.forEach(f=>registerExistingDriveFile({
    relatedRecordType:'Dog',relatedRecordID:dog.DogID,
    documentType:f.documentType,driveFileID:f.driveFileID,source:f.source
  }));

  refreshDogIntakeChecklistFromDocuments_(dog.DogID);
  logTimeline_('Dog',dog.DogID,'DOG_ENTRY_FORM_IMPORTED',
    'Dog Entry Form imported',files.length+' file(s) filed',currentPersonId_(),'Dogs',dog.DogID);
  return {ok:true,dogID:dog.DogID,message:'Dog Entry Form imported for '+dog.Name+'.'};
}

function extractDriveFileIDs_(value) {
  const text=String(value||'');
  const ids=[];
  const re=/(?:id=|\/d\/)([-\w]{20,})/g;
  let m; while((m=re.exec(text))!==null) ids.push(m[1]);
  if(/^[-\w]{20,}$/.test(text.trim())) ids.push(text.trim());
  return [...new Set(ids)];
}

function refreshDogIntakeChecklistFromDocuments_(dogID) {
  const docs=getDocumentsForRecord('Dog',dogID);
  const items=getRecords_('IntakeChecklist').filter(x=>String(x.DogID)===String(dogID));
  const map={
    PHOTO:d=>String(d.type).toLowerCase().includes('photo'),
    RECORDS:d=>/medical|rabies|vaccine|intake/.test(String(d.type).toLowerCase()),
    CVI:d=>String(d.type).toLowerCase().includes('cvi')
  };
  Object.keys(map).forEach(type=>{
    const item=items.find(x=>String(x.ItemType)===type);
    if(item && String(item.CompletionStatus)==='Open' && docs.some(map[type])) {
      updateRecord_('IntakeChecklist','IntakeChecklistID',item.IntakeChecklistID,{
        CompletionStatus:'Complete',CompletedByPersonID:currentPersonId_(),
        CompletedAt:new Date(),Notes:'Automatically completed from linked RMS document.'
      });
    }
  });
}

function getCircleOfCareStatus(dogID) {
  ensureV09Tables_();
  refreshDogIntakeChecklistFromDocuments_(dogID);
  const d=findRecord_('Dogs','DogID',dogID);
  if(!d) throw new Error('Dog not found.');
  const checklist=getRecords_('IntakeChecklist').filter(x=>String(x.DogID)===String(dogID));
  const docs=getDocumentsForRecord('Dog',dogID);
  const medical=getRecords_('MedicalEvents').filter(x=>String(x.DogID)===String(dogID));
  const required=checklist.filter(x=>String(x.RequiredStatus)==='Required');
  const complete=required.filter(x=>String(x.CompletionStatus)==='Complete');
  const missing=checklist.filter(x=>String(x.CompletionStatus)==='Open').map(x=>({
    type:x.ItemType,label:x.ItemLabel,requiredStatus:x.RequiredStatus
  }));

  const stages=[
    {name:'Accepted',complete:true,detail:'Official NBSTR dog record exists'},
    {name:'Foster Secured',complete:Boolean(d.CurrentFosterHomeID),detail:d.CurrentFosterHomeID||'No foster recorded'},
    {name:'Intake Records',complete:missing.filter(x=>['PHOTO','RECORDS','CVI'].includes(x.type)).length===0,detail:missing.filter(x=>['PHOTO','RECORDS','CVI'].includes(x.type)).map(x=>x.label).join(', ')||'Complete'},
    {name:'PetPoint',complete:Boolean(d.PetPointID),detail:d.PetPointID||'PetPoint ID missing'},
    {name:'Medical',complete:medical.length>0,detail:medical.length+' medical event(s) recorded'},
    {name:'Adoption Readiness',complete:String(d.AdoptionReadinessStatus)==='Ready',detail:d.AdoptionReadinessStatus||'Not reviewed'}
  ];
  return {
    dogID:dogID,name:d.Name,
    percent:required.length?Math.round((complete.length/required.length)*100):100,
    requiredComplete:complete.length,requiredTotal:required.length,
    missing:missing,stages:stages,documentCount:docs.length
  };
}

function getNothingForgottenDogs() {
  return getRecords_('Dogs')
    .filter(d=>!['Adopted','Rainbow Bridge'].includes(String(d.LifecycleStatus)))
    .map(d=>getCircleOfCareStatus(d.DogID))
    .filter(x=>x.missing.length || x.stages.some(s=>!s.complete))
    .sort((a,b)=>a.percent-b.percent);
}
