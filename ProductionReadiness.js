/**
 * NBSTR RMS v1.1 — Production Readiness
 * Permissions, backups, launch gates, and small live cohort controls.
 */

function ensureV11Tables_() {
  ensureV10Tables_();
  ensureTable_(SpreadsheetApp.getActive(),'UserRoleAssignments',[
    'UserRoleAssignmentID','Email','PersonID','RoleName','Active','CreatedAt','CreatedByPersonID'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'LaunchChecklist',[
    'LaunchChecklistID','ItemName','Category','Critical','Status','Notes','CompletedByPersonID','CompletedAt'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'SystemBackups',[
    'SystemBackupID','BackupType','SpreadsheetFileID','DriveFolderID','CreatedAt','CreatedByPersonID','Notes'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'LiveCohort',[
    'LiveCohortID','RecordType','RecordID','AddedAt','AddedByPersonID','Status','Notes'
  ]);
}

function seedProductionLaunchChecklist() {
  ensureV11Tables_();
  const items=[
    ['Exact Adoption Application field map reviewed','Forms',true],
    ['Exact Dog Entry Form field map reviewed','Forms',true],
    ['Reference Check form mapping reviewed','Forms',true],
    ['Current volunteer role assignments confirmed','People & Roles',true],
    ['RMS administrator assigned','People & Roles',true],
    ['Development backup created','Backup',true],
    ['Restore procedure reviewed','Backup',true],
    ['Pilot critical tests passed','Pilot',true],
    ['No unresolved critical pilot failures','Pilot',true],
    ['Live application trigger remains off until launch approval','Triggers',true],
    ['Live Dog Entry trigger remains off until launch approval','Triggers',true],
    ['Small live cohort limit confirmed','Launch',true],
    ['Applicant privacy access reviewed','Permissions',true],
    ['Background-check access restricted','Permissions',true],
    ['Drive development folder confirmed separate from live records','Drive',true],
    ['First-week daily review owner assigned','Launch',false]
  ];
  items.forEach(i=>{
    if(!getRecords_('LaunchChecklist').some(x=>String(x.ItemName)===i[0]))
      appendRecord_('LaunchChecklist',{
        LaunchChecklistID:'LC-'+Utilities.getUuid().slice(0,8).toUpperCase(),
        ItemName:i[0],Category:i[1],Critical:i[2],Status:'Open',Notes:'',
        CompletedByPersonID:'',CompletedAt:''
      });
  });
  return {ok:true,message:'Production launch checklist created.'};
}

function assignRMSRole(email, roleName, personID) {
  ensureV11Tables_();
  if(!email || !roleName) throw new Error('Email and role are required.');
  const role=getRecords_('Roles').find(r=>String(r.RoleName)===String(roleName)&&String(r.Active).toLowerCase()!=='false');
  if(!role) throw new Error('Role not found: '+roleName);
  const existing=getRecords_('UserRoleAssignments').find(x=>
    String(x.Email).toLowerCase()===String(email).toLowerCase() &&
    String(x.RoleName)===String(roleName));
  if(existing) {
    updateRecord_('UserRoleAssignments','UserRoleAssignmentID',existing.UserRoleAssignmentID,{Active:true,PersonID:personID||existing.PersonID});
  } else {
    appendRecord_('UserRoleAssignments',{
      UserRoleAssignmentID:'URA-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      Email:String(email).trim().toLowerCase(),PersonID:personID||'',RoleName:roleName,
      Active:true,CreatedAt:new Date(),CreatedByPersonID:currentPersonId_()
    });
  }
  return {ok:true,message:'Role assigned.'};
}

function getCurrentUserAccess() {
  ensureV11Tables_();
  const email=Session.getActiveUser().getEmail().toLowerCase();
  const roles=getRecords_('UserRoleAssignments').filter(x=>
    String(x.Email).toLowerCase()===email && String(x.Active).toLowerCase()!=='false'
  ).map(x=>x.RoleName);
  return {
    email:email,roles:roles,
    isAdmin:roles.includes('RMS Administrator'),
    canViewBackground:roles.includes('RMS Administrator')||roles.includes('Background Check Reviewer')||roles.includes('Application Coordinator')
  };
}

function createRMSBackup(note) {
  ensureV11Tables_();
  const ss=SpreadsheetApp.getActive();
  const root=getOrCreateRMSRootFolder_();
  const backupsIter=root.getFoldersByName('Backups');
  const backups=backupsIter.hasNext()?backupsIter.next():root.createFolder('Backups');
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HHmm');
  const copy=DriveApp.getFileById(ss.getId()).makeCopy('NBSTR RMS Backup '+stamp,backups);
  const id='BKP-'+Utilities.getUuid().slice(0,8).toUpperCase();
  appendRecord_('SystemBackups',{
    SystemBackupID:id,BackupType:'Spreadsheet Snapshot',SpreadsheetFileID:copy.getId(),
    DriveFolderID:backups.getId(),CreatedAt:new Date(),CreatedByPersonID:currentPersonId_(),Notes:note||''
  });
  return {ok:true,id:id,url:copy.getUrl(),message:'RMS spreadsheet backup created.'};
}

function updateLaunchChecklistItem(id,status,notes) {
  ensureV11Tables_();
  const allowed=['Open','Complete','Blocked'];
  if(!allowed.includes(status)) throw new Error('Invalid launch checklist status.');
  updateRecord_('LaunchChecklist','LaunchChecklistID',id,{
    Status:status,Notes:String(notes||''),
    CompletedByPersonID:status==='Complete'?currentPersonId_():'',
    CompletedAt:status==='Complete'?new Date():''
  });
  return getProductionReadiness();
}

function getProductionReadiness() {
  ensureV11Tables_();
  const items=getRecords_('LaunchChecklist');
  const pilot=getPilotSummary();
  const criticalOpen=items.filter(x=>String(x.Critical).toLowerCase()==='true'&&String(x.Status)!=='Complete');
  return {
    items:items,pilot:pilot,criticalOpen:criticalOpen.length,
    launchReady:items.length>0&&criticalOpen.length===0&&pilot.fail===0&&pilot.blocked===0&&pilot.notTested===0,
    backups:getRecords_('SystemBackups').slice(-10).reverse(),
    cohort:getRecords_('LiveCohort').filter(x=>String(x.Status)!=='Removed')
  };
}

function addToLiveCohort(recordType,recordID,notes) {
  ensureV11Tables_();
  const allowed=['Application','Dog','RescueRequest'];
  if(!allowed.includes(recordType)) throw new Error('Invalid live cohort record type.');
  const active=getRecords_('LiveCohort').filter(x=>String(x.Status)==='Active');
  const limit=Number(getSettingValue_('LIVE_COHORT_LIMIT')||10);
  if(active.length>=limit) throw new Error('Live cohort limit of '+limit+' has been reached.');
  if(active.some(x=>String(x.RecordType)===recordType&&String(x.RecordID)===String(recordID)))
    throw new Error('Record is already in the live cohort.');
  appendRecord_('LiveCohort',{
    LiveCohortID:'LCO-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    RecordType:recordType,RecordID:recordID,AddedAt:new Date(),
    AddedByPersonID:currentPersonId_(),Status:'Active',Notes:notes||''
  });
  return getProductionReadiness();
}

function initializeProductionReadinessV11() {
  ensureV11Tables_();
  seedProductionLaunchChecklist();
  upsertSetting_('LIVE_COHORT_LIMIT','10','Maximum active records in the initial controlled live cohort.');
  return {ok:true,message:'Production readiness framework initialized. Live triggers remain manual and off until approved.'};
}
