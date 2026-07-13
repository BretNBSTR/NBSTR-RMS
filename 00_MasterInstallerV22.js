/**
 * NBSTR RMS v2.2 — Master Installer
 * Installs/validates RMS tables and seeded configuration in dependency order.
 * Does NOT activate live forms, import historical data, or post to QuickBooks.
 */
function installNBSTRRMSV22(){
  const log=[];
  function step(name,fn){
    try{
      const result=fn();
      log.push({step:name,status:'Pass',message:result&&result.message?result.message:''});
    }catch(err){
      log.push({step:name,status:'Fail',message:String(err.message||err)});
    }
  }

  step('Core compatibility',()=>{ ensureTable_(SpreadsheetApp.getActive(),'People',['PersonID','FirstName','LastName','Email']); ensureTable_(SpreadsheetApp.getActive(),'Dogs',['DogID','Name']); ensureTable_(SpreadsheetApp.getActive(),'Applications',['ApplicationID','PrimaryApplicantPersonID','Status']); ensureTable_(SpreadsheetApp.getActive(),'Tasks',['TaskID','Title','RelatedRecordType','RelatedRecordID','AssignedRole','Status','Priority']); return {message:'Core compatibility tables verified.'}; });
  step('Pilot framework',()=>{ ensureV10Tables_(); return initializeNBSTRPilotV10(); });
  step('Roles and permissions',()=>setupNBSTRPilotRoles());
  step('Production readiness',()=>initializeProductionReadinessV11());
  step('Verified form maps',()=>seedVerifiedNBSTRFormMapsV12());
  step('Connector receiver',()=>initializeNBSTRConnectorV13());
  step('Connector test health',()=>initializeConnectorTestLabV14());
  step('Notification framework',()=>{ ensureV16Tables_(); return {message:'Notification tables ready; digest trigger remains OFF.'}; });
  step('Communication templates',()=>seedNBSTRCommunicationTemplatesV17());
  step('Adoption closing',()=>{ ensureV18Tables_(); return {message:'Adoption closing tables ready.'}; });
  step('Finance bridge',()=>{ ensureV19Tables_(); return {message:'Finance bridge tables ready.'}; });
  step('Guided pilot runner',()=>{ ensureV21Tables_(); return {message:'Guided pilot tables ready.'}; });

  const failed=log.filter(x=>x.status==='Fail');
  PropertiesService.getScriptProperties().setProperty('NBSTR_RMS_VERSION','2.2');
  PropertiesService.getScriptProperties().setProperty('NBSTR_RMS_INSTALL_AT',new Date().toISOString());
  return {ok:failed.length===0,version:'2.2',steps:log,failed:failed.length};
}

function verifyNBSTRRMSV22(){
  const requiredFunctions=[
    'getVolunteerHomeV15','getConnectorHealthV14','sendDailyVolunteerDigestsV16',
    'previewCommunicationV17','getAdoptionClosingV18','getFinanceReviewV19',
    'getV20SetupStatus','getLatestV21PilotRun'
  ];
  const functions=requiredFunctions.map(name=>{
    try{return {name:name,status:typeof this[name]==='function'?'Pass':'Missing'};}
    catch(err){return {name:name,status:'Missing'};}
  });

  const requiredSheets=[
    'People','Dogs','Applications','Tasks','UserRoleAssignments','PilotTests',
    'LaunchChecklist','ConnectorReceipts','ConnectorTests','NotificationPreferences',
    'CommunicationTemplates','AdoptionClosingItems','FinanceTransactions',
    'V21PilotRuns','V21PilotStepResults'
  ];
  const ss=SpreadsheetApp.getActive();
  const sheets=requiredSheets.map(name=>({name:name,status:ss.getSheetByName(name)?'Pass':'Missing'}));
  const blockers=functions.filter(x=>x.status!=='Pass').map(x=>'Function: '+x.name)
    .concat(sheets.filter(x=>x.status!=='Pass').map(x=>'Sheet: '+x.name));

  return {
    version:PropertiesService.getScriptProperties().getProperty('NBSTR_RMS_VERSION')||'Unknown',
    functions:functions,sheets:sheets,blockers:blockers,
    ready:blockers.length===0
  };
}

function getV22InstallDashboard(){
  let verification=verifyNBSTRRMSV22(), setup=null, pilot=null;
  try{setup=getV20SetupStatus();}catch(err){}
  try{pilot=getLatestV21PilotRun();}catch(err){}
  return {verification:verification,setup:setup,pilot:pilot};
}
