/**
 * NBSTR RMS Application Intake v0.6
 * Replaces multi-email handoffs with role-based workflow tasks.
 */

function ensureApplicationV06Tables_() {
  ensureTable_(SpreadsheetApp.getActive(),'ApplicationWorkflowHistory',[
    'ApplicationWorkflowHistoryID','ApplicationID','FromStatus','ToStatus',
    'Action','Notes','ChangedByPersonID','ChangedAt'
  ]);
}

function submitApplicationToRMS(data) {
  ensureApplicationV06Tables_();
  validateRequired_(data,['firstName','lastName','email']);
  const now=new Date();
  let person=getRecords_('People').find(p=>String(p.Email).toLowerCase()===String(data.email).trim().toLowerCase());
  let personID;
  if(person){
    personID=person.PersonID;
    updateRecord_('People','PersonID',personID,{
      FirstName:String(data.firstName).trim(),LastName:String(data.lastName).trim(),
      Phone:String(data.phone||'').trim(),Address1:String(data.address1||'').trim(),
      City:String(data.city||'').trim(),State:String(data.state||'').trim().toUpperCase(),
      ZIP:String(data.zip||'').trim(),UpdatedAt:now
    });
  } else {
    personID=generateId_('People');
    appendRecord_('People',{
      PersonID:personID,FirstName:String(data.firstName).trim(),LastName:String(data.lastName).trim(),
      Email:String(data.email).trim(),Phone:String(data.phone||'').trim(),
      Address1:String(data.address1||'').trim(),City:String(data.city||'').trim(),
      State:String(data.state||'').trim().toUpperCase(),ZIP:String(data.zip||'').trim(),
      Active:true,CreatedAt:now,UpdatedAt:now
    });
  }

  const appID=generateId_('Applications');
  const validThrough=new Date(now);
  validThrough.setFullYear(validThrough.getFullYear()+Number(getSettingValue_('APPLICATION_VALID_YEARS')||5));

  appendRecord_('Applications',{
    ApplicationID:appID,PrimaryApplicantPersonID:personID,SubmittedAt:now,
    ValidThrough:validThrough,Status:'Received',AssignedReferenceCheckerID:'',
    BackgroundCheckStatus:'Not Started',CoordinatorReviewStatus:'Pending',
    PetPointEntryStatus:'Not Needed Yet',DriveFolderID:'',CreatedAt:now,UpdatedAt:now
  });

  createTask_({
    taskTypeName:'Complete Reference Checks',relatedRecordType:'Application',
    relatedRecordID:appID,title:'Complete reference checks for '+data.firstName+' '+data.lastName,
    workflowID:'WF-APPLICATION-RECEIVED'
  });
  recordApplicationTransition_(appID,'','Received','Application received','');
  logTimeline_('Application',appID,'APPLICATION_RECEIVED','Application received',
    data.firstName+' '+data.lastName,currentPersonId_(),'Applications',appID);
  return {ok:true,id:appID,message:'Application '+appID+' received and sent to reference checking.'};
}

function getSettingValue_(key){
  const s=findRecord_('Settings','SettingKey',key);
  return s?s.SettingValue:'';
}

function getApplicationsForUI(){
  ensureApplicationV06Tables_();
  const people=getRecords_('People');
  return getRecords_('Applications').map(a=>{
    const p=people.find(x=>String(x.PersonID)===String(a.PrimaryApplicantPersonID))||{};
    return {
      id:a.ApplicationID,name:[p.FirstName,p.LastName].filter(String).join(' ')||a.ApplicationID,
      email:p.Email||'',city:p.City||'',state:p.State||'',status:a.Status,
      background:a.BackgroundCheckStatus,coordinator:a.CoordinatorReviewStatus,
      petPoint:a.PetPointEntryStatus,validThrough:a.ValidThrough||''
    };
  }).reverse();
}

function getApplicationDetailForUI(applicationID){
  ensureApplicationV06Tables_();
  const a=findRecord_('Applications','ApplicationID',applicationID);
  if(!a) throw new Error('Application not found.');
  const p=findRecord_('People','PersonID',a.PrimaryApplicantPersonID)||{};
  const refs=getRecords_('ReferenceChecks').filter(x=>String(x.ApplicationID)===String(applicationID));
  const tasks=getRecords_('Tasks').filter(x=>String(x.RelatedRecordType)==='Application'&&String(x.RelatedRecordID)===String(applicationID));
  const history=getRecords_('ApplicationWorkflowHistory').filter(x=>String(x.ApplicationID)===String(applicationID))
    .sort((x,y)=>new Date(y.ChangedAt)-new Date(x.ChangedAt));
  return {application:a,person:p,references:refs,tasks:tasks.map(taskForUI_),history:history};
}

function completeReferenceStage(applicationID, summary, concernFlag){
  const a=findRecord_('Applications','ApplicationID',applicationID);
  if(!a) throw new Error('Application not found.');
  if(!String(summary||'').trim()) throw new Error('Reference check summary is required.');

  appendRecord_('ReferenceChecks',{
    ReferenceCheckID:generateId_('ReferenceChecks'),ApplicationID:applicationID,
    ReferencePersonID:'',ReferenceType:'Summary',Status:concernFlag?'Concern':'Complete',
    CompletedByPersonID:currentPersonId_(),CompletedAt:new Date(),
    Summary:String(summary).trim(),ConcernFlag:Boolean(concernFlag)
  });
  completeActiveTaskByType_(applicationID,'Complete Reference Checks',String(summary).trim());
  transitionApplication_(applicationID,'Background Check','Reference checks completed',String(summary).trim());
  createTask_({
    taskTypeName:'Verify Background Check',relatedRecordType:'Application',
    relatedRecordID:applicationID,title:'Verify background check for '+applicationID,
    workflowID:'WF-REFERENCES-COMPLETE'
  });
  return getApplicationDetailForUI(applicationID);
}

function verifyApplicationBackground(applicationID,status,notes){
  const allowed=['Verified','Review Needed'];
  if(!allowed.includes(status)) throw new Error('Invalid background status.');
  updateRecord_('Applications','ApplicationID',applicationID,{
    BackgroundCheckStatus:status,UpdatedAt:new Date()
  });
  completeActiveTaskByType_(applicationID,'Verify Background Check',notes||status);
  transitionApplication_(applicationID,'Coordinator Review','Background check '+status,notes||'');
  createTask_({
    taskTypeName:'Review Application',relatedRecordType:'Application',
    relatedRecordID:applicationID,title:'Application Coordinator review: '+applicationID,
    workflowID:'WF-BACKGROUND-VERIFIED',
    priority:status==='Review Needed'?'High':'Normal'
  });
  return getApplicationDetailForUI(applicationID);
}

function coordinatorApplicationDecision(applicationID,decision,notes){
  const allowed=['Approved','Denied','More Information'];
  if(!allowed.includes(decision)) throw new Error('Invalid coordinator decision.');
  updateRecord_('Applications','ApplicationID',applicationID,{
    CoordinatorReviewStatus:decision,UpdatedAt:new Date()
  });
  completeActiveTaskByType_(applicationID,'Review Application',notes||decision);

  if(decision==='Approved'){
    transitionApplication_(applicationID,'Ready for Foster Visibility','Application approved',notes||'');
    createTask_({
      taskTypeName:'Prepare Foster Visibility',relatedRecordType:'Application',
      relatedRecordID:applicationID,title:'Prepare approved application for foster visibility: '+applicationID,
      workflowID:'WF-APPLICATION-APPROVED'
    });
    updateRecord_('Applications','ApplicationID',applicationID,{PetPointEntryStatus:'Pending',UpdatedAt:new Date()});
    createTask_({
      taskTypeName:'Enter Applicant in PetPoint',relatedRecordType:'Application',
      relatedRecordID:applicationID,title:'Enter approved applicant in PetPoint: '+applicationID,
      workflowID:'WF-APPLICATION-APPROVED'
    });
  } else if(decision==='Denied'){
    transitionApplication_(applicationID,'Denied','Application denied',notes||'');
  } else {
    transitionApplication_(applicationID,'On Hold','More information required',notes||'');
  }
  return getApplicationDetailForUI(applicationID);
}

function markApplicationFosterVisible(applicationID,notes){
  completeActiveTaskByType_(applicationID,'Prepare Foster Visibility',notes||'Application made visible to foster team.');
  transitionApplication_(applicationID,'Ready to Match','Application available to foster team',notes||'');
  return getApplicationDetailForUI(applicationID);
}

function markApplicantPetPointComplete(applicationID,petPointReference){
  updateRecord_('Applications','ApplicationID',applicationID,{
    PetPointEntryStatus:'Complete',UpdatedAt:new Date()
  });
  completeActiveTaskByType_(applicationID,'Enter Applicant in PetPoint',
    'PetPoint entry complete'+(petPointReference?' — '+petPointReference:''));
  recordApplicationTransition_(applicationID,'','', 'PetPoint applicant entry completed',petPointReference||'');
  return getApplicationDetailForUI(applicationID);
}

function transitionApplication_(applicationID,toStatus,action,notes){
  const a=findRecord_('Applications','ApplicationID',applicationID);
  const from=a?a.Status:'';
  updateRecord_('Applications','ApplicationID',applicationID,{Status:toStatus,UpdatedAt:new Date()});
  recordApplicationTransition_(applicationID,from,toStatus,action,notes);
  logTimeline_('Application',applicationID,'APPLICATION_STATUS_CHANGED',
    action,from+' → '+toStatus,currentPersonId_(),'Applications',applicationID);
}

function recordApplicationTransition_(applicationID,fromStatus,toStatus,action,notes){
  appendRecord_('ApplicationWorkflowHistory',{
    ApplicationWorkflowHistoryID:'AWH-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    ApplicationID:applicationID,FromStatus:fromStatus,ToStatus:toStatus,
    Action:action,Notes:notes||'',ChangedByPersonID:currentPersonId_(),ChangedAt:new Date()
  });
}
