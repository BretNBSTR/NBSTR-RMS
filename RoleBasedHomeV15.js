/**
 * NBSTR RMS v1.5 — Role-Based Volunteer Home
 */

function getVolunteerHomeV15() {
  const access=getCurrentUserAccess();
  const email=String(access.email||'').toLowerCase();
  const roles=access.roles||[];
  const tasks=getRecords_('Tasks').filter(t=>['Open','In Progress','Waiting'].includes(String(t.Status)));
  const assignments=getRecords_('UserRoleAssignments').filter(a=>
    String(a.Email||'').toLowerCase()===email && String(a.Active).toLowerCase()!=='false'
  );
  const roleNames=assignments.map(a=>String(a.RoleName));
  const myTasks=tasks.filter(t=>{
    if(t.AssignedPersonID && String(t.AssignedPersonID)===String(currentPersonId_())) return true;
    return roleNames.includes(String(t.AssignedRole||''));
  }).map(taskForUI_);

  const sections=[];
  addRoleSectionV15_(sections,roleNames,'Reference Checker','Reference Checks',myTasks,'Complete Reference Checks');
  addRoleSectionV15_(sections,roleNames,'Background Check Reviewer','Background Verification',myTasks,'Verify Background Check');
  addRoleSectionV15_(sections,roleNames,'Application Coordinator','Application Review',myTasks,'Review Application');
  addRoleSectionV15_(sections,roleNames,'Foster Visibility Coordinator','Approved Applicant Visibility',myTasks,'Prepare Foster Visibility');
  addRoleSectionV15_(sections,roleNames,'PetPoint Application Entry','PetPoint Applicant Entry',myTasks,'Enter Applicant in PetPoint');
  addRoleSectionV15_(sections,roleNames,'Foster Placement Coordinator','Foster Placement',myTasks,'Foster');
  addRoleSectionV15_(sections,roleNames,'Dog Intake Coordinator','Dog Intake',myTasks,'Intake');
  addRoleSectionV15_(sections,roleNames,'Medical Coordinator','Medical Follow-Up',myTasks,'Medical');

  const attention=[];
  if(roles.includes('RMS Administrator')) {
    try { attention.push.apply(attention,getNothingForgottenV14()); } catch(err) {}
  }
  return {
    email:email,roles:roles,sections:sections,
    totalOpen:myTasks.length,highPriority:myTasks.filter(t=>t.priority==='High'||t.priority==='Urgent').length,
    attention:attention.slice(0,20),
    greetingName:getCurrentVolunteerNameV15_(email)
  };
}

function addRoleSectionV15_(sections,roles,role,title,tasks,taskMatch) {
  if(!roles.includes(role)) return;
  const match=tasks.filter(t=>
    String(t.assignedRole||'')===role ||
    String(t.taskType||'').toLowerCase().includes(String(taskMatch).toLowerCase()) ||
    String(t.title||'').toLowerCase().includes(String(taskMatch).toLowerCase())
  );
  sections.push({role:role,title:title,tasks:match});
}

function getCurrentVolunteerNameV15_(email) {
  const p=getRecords_('People').find(x=>String(x.Email||'').toLowerCase()===email);
  return p ? String(p.FirstName||'Volunteer') : 'Volunteer';
}

function getTaskQuickActionV15(taskID) {
  const t=findRecord_('Tasks','TaskID',taskID);
  if(!t) throw new Error('Task not found.');
  const type=String(t.TaskTypeName||t.TaskType||'');
  const relatedType=String(t.RelatedRecordType||'');
  const relatedID=String(t.RelatedRecordID||'');
  if(relatedType==='Application') return {page:'application',recordID:relatedID};
  if(relatedType==='Dog') return {page:'dog',recordID:relatedID};
  if(relatedType==='RescueRequest') return {page:'rescueRequest',recordID:relatedID};
  return {page:'tasks',recordID:taskID};
}

function completeSimpleVolunteerTaskV15(taskID,note) {
  const t=findRecord_('Tasks','TaskID',taskID);
  if(!t) throw new Error('Task not found.');
  updateRecord_('Tasks','TaskID',taskID,{
    Status:'Complete',CompletedAt:new Date(),CompletedByPersonID:currentPersonId_(),
    CompletionNotes:String(note||'')
  });
  return getVolunteerHomeV15();
}
