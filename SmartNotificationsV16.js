/**
 * NBSTR RMS v1.6 — Smart Notifications & Digests
 */

function ensureV16Tables_(){
  ensureTable_(SpreadsheetApp.getActive(),'NotificationPreferences',[
    'NotificationPreferenceID','Email','ImmediateUrgent','DailyDigest',
    'DigestHour','Active','UpdatedAt'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'NotificationLog',[
    'NotificationLogID','Email','NotificationType','RelatedRecordType',
    'RelatedRecordID','Subject','SentAt','Status','Message'
  ]);
}

function saveNotificationPreferencesV16(data){
  ensureV16Tables_();
  const email=String(data.email||Session.getActiveUser().getEmail()).trim().toLowerCase();
  if(!email) throw new Error('Email is required.');
  const existing=getRecords_('NotificationPreferences').find(x=>String(x.Email).toLowerCase()===email);
  const values={
    Email:email,ImmediateUrgent:Boolean(data.immediateUrgent),
    DailyDigest:Boolean(data.dailyDigest),DigestHour:Number(data.digestHour||7),
    Active:true,UpdatedAt:new Date()
  };
  if(existing) updateRecord_('NotificationPreferences','NotificationPreferenceID',existing.NotificationPreferenceID,values);
  else appendRecord_('NotificationPreferences',Object.assign({
    NotificationPreferenceID:'NP-'+Utilities.getUuid().slice(0,8).toUpperCase()
  },values));
  return getMyNotificationPreferencesV16();
}

function getMyNotificationPreferencesV16(){
  ensureV16Tables_();
  const email=String(Session.getActiveUser().getEmail()||'').toLowerCase();
  return getRecords_('NotificationPreferences').find(x=>String(x.Email).toLowerCase()===email)||
    {Email:email,ImmediateUrgent:true,DailyDigest:true,DigestHour:7,Active:true};
}

function notifyUrgentTaskV16(taskID){
  ensureV16Tables_();
  const t=findRecord_('Tasks','TaskID',taskID);
  if(!t) throw new Error('Task not found.');
  if(!['High','Urgent'].includes(String(t.Priority))) return {ok:true,message:'Task is not urgent; no immediate email sent.'};

  const recipients=getTaskRecipientEmailsV16_(t).filter(email=>notificationAllowedV16_(email,'urgent'));
  recipients.forEach(email=>{
    const subject='NBSTR RMS: '+String(t.Title||'Urgent work needs attention');
    const body='An NBSTR RMS task needs attention.\n\n'+String(t.Title||'')+
      '\nPriority: '+String(t.Priority||'')+
      '\n\nOpen NBSTR RMS and select My Work.';
    MailApp.sendEmail(email,subject,body);
    logNotificationV16_(email,'Immediate Urgent',t.RelatedRecordType,t.RelatedRecordID,subject,'Sent','');
  });
  return {ok:true,message:recipients.length+' urgent notification(s) sent.'};
}

function sendDailyVolunteerDigestsV16(){
  ensureV16Tables_();
  const prefs=getRecords_('NotificationPreferences').filter(x=>
    String(x.Active).toLowerCase()!=='false' && String(x.DailyDigest).toLowerCase()==='true'
  );
  let sent=0;
  prefs.forEach(p=>{
    const tasks=getOpenTasksForEmailV16_(p.Email);
    if(!tasks.length) return;
    const lines=tasks.slice(0,25).map(t=>'• '+t.Title+' ['+t.Priority+']').join('\n');
    const subject='NBSTR RMS Daily Work Digest — '+tasks.length+' item'+(tasks.length===1?'':'s');
    const body='Here is the NBSTR work currently waiting for you:\n\n'+lines+
      '\n\nOpen NBSTR RMS and select My Work. Completed work will disappear from your queue.';
    MailApp.sendEmail(p.Email,subject,body);
    logNotificationV16_(p.Email,'Daily Digest','','',subject,'Sent','');
    sent++;
  });
  return {ok:true,message:sent+' daily digest(s) sent.'};
}

function getOpenTasksForEmailV16_(email){
  const roles=getRecords_('UserRoleAssignments').filter(x=>
    String(x.Email).toLowerCase()===String(email).toLowerCase() &&
    String(x.Active).toLowerCase()!=='false'
  ).map(x=>String(x.RoleName));
  return getRecords_('Tasks').filter(t=>
    ['Open','In Progress','Waiting'].includes(String(t.Status)) &&
    roles.includes(String(t.AssignedRole||''))
  );
}

function getTaskRecipientEmailsV16_(task){
  return [...new Set(getRecords_('UserRoleAssignments').filter(x=>
    String(x.RoleName)===String(task.AssignedRole||'') &&
    String(x.Active).toLowerCase()!=='false'
  ).map(x=>String(x.Email).toLowerCase()).filter(Boolean))];
}

function notificationAllowedV16_(email,type){
  const p=getRecords_('NotificationPreferences').find(x=>String(x.Email).toLowerCase()===String(email).toLowerCase());
  if(!p) return type==='urgent';
  if(String(p.Active).toLowerCase()==='false') return false;
  return type==='urgent' ? String(p.ImmediateUrgent).toLowerCase()==='true' :
    String(p.DailyDigest).toLowerCase()==='true';
}

function logNotificationV16_(email,type,recordType,recordID,subject,status,message){
  appendRecord_('NotificationLog',{
    NotificationLogID:'NL-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    Email:email,NotificationType:type,RelatedRecordType:recordType||'',
    RelatedRecordID:recordID||'',Subject:subject,SentAt:new Date(),
    Status:status,Message:message||''
  });
}

function installDailyDigestTriggerV16(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='sendDailyVolunteerDigestsV16')
    .forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendDailyVolunteerDigestsV16').timeBased().everyDays(1).atHour(7).create();
  return {ok:true,message:'Daily volunteer digest trigger installed for approximately 7 AM project time.'};
}

function getNotificationHealthV16(){
  ensureV16Tables_();
  const logs=getRecords_('NotificationLog');
  const failed=logs.filter(x=>String(x.Status)==='Failed');
  return {
    preferences:getRecords_('NotificationPreferences').length,
    totalSent:logs.filter(x=>String(x.Status)==='Sent').length,
    failed:failed.length,recent:logs.slice(-10).reverse()
  };
}
