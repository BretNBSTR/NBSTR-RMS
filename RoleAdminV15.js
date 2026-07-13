/**
 * v1.5 role assignment helpers for pilot setup.
 */
function getRoleAssignmentAdminV15(){
  const access=getCurrentUserAccess();
  if(!access.isAdmin) throw new Error('RMS Administrator access required.');
  return {
    roles:getRecords_('Roles').filter(r=>String(r.Active).toLowerCase()!=='false'),
    assignments:getRecords_('UserRoleAssignments').filter(a=>String(a.Active).toLowerCase()!=='false')
  };
}

function deactivateRMSRoleV15(assignmentID){
  const access=getCurrentUserAccess();
  if(!access.isAdmin) throw new Error('RMS Administrator access required.');
  updateRecord_('UserRoleAssignments','UserRoleAssignmentID',assignmentID,{Active:false});
  return getRoleAssignmentAdminV15();
}
