/**
 * NBSTR RMS v0.5 — Dog Intake & Profile Services
 * Consolidated development build companion.
 */

function ensureV05Tables_() {
  ensureTable_(SpreadsheetApp.getActive(), 'FosterInterests', [
    'FosterInterestID','RescueRequestID','FosterHomeID','Response',
    'QuestionOrNote','RespondedByPersonID','RespondedAt','Status'
  ]);
  ensureTable_(SpreadsheetApp.getActive(), 'IntakeChecklist', [
    'IntakeChecklistID','DogID','ItemType','ItemLabel','RequiredStatus',
    'CompletionStatus','CompletedByPersonID','CompletedAt','Notes'
  ]);
}

function getDogsForUI() {
  ensureV05Tables_();
  const fosters = getFosterHomesForUI();
  return getRecords_('Dogs').map(d => {
    const f = fosters.find(x => String(x.id) === String(d.CurrentFosterHomeID));
    return {
      id:d.DogID, name:d.Name, breed:d.Breed || 'Unknown',
      status:d.LifecycleStatus, readiness:d.AdoptionReadinessStatus,
      foster:f ? f.name : d.CurrentFosterHomeID || 'Unassigned',
      intakeDate:d.IntakeDate || '', origin:[d.OriginCity,d.OriginState].filter(String).join(', ')
    };
  }).reverse();
}

function getDogProfileForUI(dogID) {
  ensureV05Tables_();
  const d=findRecord_('Dogs','DogID',dogID);
  if(!d) throw new Error('Dog not found: '+dogID);
  const request=findRecord_('RescueRequests','RescueRequestID',d.RescueRequestID);
  return {
    dog:d,
    rescueRequest:request || {},
    checklist:getRecords_('IntakeChecklist').filter(x=>String(x.DogID)===String(dogID)),
    medical:getRecords_('MedicalEvents').filter(x=>String(x.DogID)===String(dogID)),
    timeline:getRecords_('TimelineEvents')
      .filter(x=>String(x.RelatedRecordType)==='Dog'&&String(x.RelatedRecordID)===String(dogID))
      .sort((a,b)=>new Date(b.EventAt)-new Date(a.EventAt)).slice(0,50)
  };
}

function officiallyAcceptRequest(rescueRequestID, officialName) {
  ensureV05Tables_();
  const dogID=acceptRescueRequest(rescueRequestID, officialName);
  buildIntakeChecklist_(dogID);
  createTask_({
    taskTypeName:'Arrange Intake / Arrival',
    relatedRecordType:'Dog',
    relatedRecordID:dogID,
    title:'Complete intake for '+officialName,
    workflowID:'WF-OFFICIAL-ACCEPTANCE'
  });
  return {ok:true,dogID:dogID,message:officialName+' officially accepted into NBSTR.'};
}

function buildIntakeChecklist_(dogID) {
  const dog=findRecord_('Dogs','DogID',dogID);
  if(!dog) throw new Error('Dog not found.');
  const request=findRecord_('RescueRequests','RescueRequestID',dog.RescueRequestID) || {};
  const originState=String(request.CurrentState || dog.OriginState || '').trim().toUpperCase();

  const items=[
    ['IDENTITY','Confirm official NBSTR name','Required'],
    ['PETPOINT','Enter dog in PetPoint','Required'],
    ['PHOTO','Collect intake photos','Required'],
    ['RECORDS','Collect available medical/vaccine records','Required'],
    ['MEDICAL','Schedule or confirm veterinary evaluation','Required'],
    ['MICROCHIP','Record/verify microchip information','Required'],
    ['FOSTER','Confirm foster placement','Required']
  ];

  // Wisconsin-specific movement rule requested by NBSTR:
  // CVI is conditionally required when the dog is transported into Wisconsin.
  if(originState && originState !== 'WI') {
    items.push(['CVI','Import CVI / Wisconsin movement documentation review','Conditional']);
  } else {
    items.push(['CVI','Import CVI / Wisconsin movement documentation review','Not Applicable']);
  }

  items.forEach(i=>{
    const exists=getRecords_('IntakeChecklist').some(x=>String(x.DogID)===String(dogID)&&String(x.ItemType)===i[0]);
    if(!exists) appendRecord_('IntakeChecklist',{
      IntakeChecklistID:'IC-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      DogID:dogID,ItemType:i[0],ItemLabel:i[1],RequiredStatus:i[2],
      CompletionStatus:i[2]==='Not Applicable'?'Not Applicable':'Open',
      CompletedByPersonID:'',CompletedAt:'',Notes:''
    });
  });
}

function completeIntakeItem(itemID, notes) {
  const item=findRecord_('IntakeChecklist','IntakeChecklistID',itemID);
  if(!item) throw new Error('Checklist item not found.');
  updateRecord_('IntakeChecklist','IntakeChecklistID',itemID,{
    CompletionStatus:'Complete',CompletedByPersonID:currentPersonId_(),
    CompletedAt:new Date(),Notes:String(notes||'')
  });
  logTimeline_('Dog',item.DogID,'INTAKE_ITEM_COMPLETED',
    item.ItemLabel,'',currentPersonId_(),'IntakeChecklist',itemID);
  return getDogProfileForUI(item.DogID);
}

function addDogMedicalEvent(data) {
  validateRequired_(data,['dogID','eventDate','eventType','summary']);
  const id=generateId_('MedicalEvents');
  appendRecord_('MedicalEvents',{
    MedicalEventID:id,DogID:data.dogID,EventDate:new Date(data.eventDate),
    ProviderPersonID:'',EventType:data.eventType,Summary:String(data.summary).trim(),
    Cost:data.cost===''?'':Number(data.cost),DocumentID:'',
    NextDueDate:data.nextDueDate?new Date(data.nextDueDate):'',CreatedAt:new Date()
  });
  logTimeline_('Dog',data.dogID,'MEDICAL_EVENT_ADDED',
    data.eventType+': '+String(data.summary).trim(),'',
    currentPersonId_(),'MedicalEvents',id);
  return getDogProfileForUI(data.dogID);
}
