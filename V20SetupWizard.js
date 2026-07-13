/**
 * NBSTR RMS v2.0 — Unified Pilot Setup Wizard
 * CONTROLLED PILOT. Does not activate live form triggers or import historical data.
 */
function getV20SetupStatus(){
  const checks=[];
  function check(name,fn){
    try { const result=fn(); checks.push({name:name,status:result?'Pass':'Needs Attention'}); }
    catch(err){ checks.push({name:name,status:'Needs Attention',detail:String(err.message||err)}); }
  }
  check('Core RMS spreadsheet',()=>Boolean(SpreadsheetApp.getActive().getId()));
  check('Pilot framework',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('PilotTests')));
  check('Role assignments',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('UserRoleAssignments')));
  check('Launch checklist',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('LaunchChecklist')));
  check('Connector health',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('ConnectorTests')));
  check('Communication templates',()=>getRecords_('CommunicationTemplates').length>=5);
  check('Adoption closing',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('AdoptionClosingItems')));
  check('Finance bridge',()=>Boolean(SpreadsheetApp.getActive().getSheetByName('FinanceTransactions')));
  check('Connector secret',()=>Boolean(PropertiesService.getScriptProperties().getProperty('NBSTR_CONNECTOR_SECRET')));
  check('Project timezone Central',()=>/Chicago|Central/i.test(Session.getScriptTimeZone()));
  const pass=checks.filter(x=>x.status==='Pass').length;
  return {checks:checks,pass:pass,total:checks.length,percent:Math.round(pass/checks.length*100)};
}

function runNBSTRSetupWizardV20(){
  const steps=[];
  function run(name,fn){
    try { const r=fn(); steps.push({name:name,status:'Pass',message:r&&r.message?r.message:''}); }
    catch(err){ steps.push({name:name,status:'Fail',message:String(err.message||err)}); }
  }
  run('Pilot tables',()=>{ ensureV10Tables_(); return initializeNBSTRPilotV10(); });
  run('NBSTR roles',()=>setupNBSTRPilotRoles());
  run('Production readiness',()=>initializeProductionReadinessV11());
  run('Verified form maps',()=>seedVerifiedNBSTRFormMapsV12());
  run('Connector receiver',()=>initializeNBSTRConnectorV13());
  run('Connector test lab',()=>initializeConnectorTestLabV14());
  run('Notification tables',()=>{ ensureV16Tables_(); return {message:'Notification framework ready. Trigger not installed.'}; });
  run('Adopter communications',()=>seedNBSTRCommunicationTemplatesV17());
  run('Adoption closing',()=>{ ensureV18Tables_(); return {message:'Adoption closing framework ready.'}; });
  run('Finance bridge',()=>{ ensureV19Tables_(); return {message:'Finance bridge ready.'}; });
  return {ok:steps.every(x=>x.status==='Pass'),steps:steps,status:getV20SetupStatus()};
}

function runV20PrerequisiteAudit(){
  const s=getV20SetupStatus(), blockers=[];
  s.checks.forEach(x=>{ if(x.status!=='Pass') blockers.push(x.name+(x.detail?' — '+x.detail:'')); });
  let pilot=null, production=null, connector=null;
  try{ pilot=getPilotSummary(); if(pilot.fail||pilot.blocked||pilot.notTested) blockers.push('Pilot tests are not all passed.'); }catch(err){}
  try{
  production = getProductionReadiness();
  console.log('Production readiness:', JSON.stringify(production));
  if (production.criticalOpen) {
    blockers.push(production.criticalOpen + ' critical production checklist item(s) remain open.');
  }
}catch(err){
  console.log('Production readiness error:', err);
}
  try{ connector=getConnectorHealthV14(); if(connector.errors24h) blockers.push(connector.errors24h+' connector error(s) occurred in the last 24 hours.'); }catch(err){}
  return {ready:blockers.length===0,blockers:blockers,setup:s,pilot:pilot,production:production,connector:connector};
}

function seedV20Pilot(){
  const setup=runNBSTRSetupWizardV20();
  const data=seedNBSTRPilotData();
  return {setup:setup,data:data,message:'Unified v2.0 pilot initialized with fake data only.'};
}

function getV20Dashboard(){
  const audit=runV20PrerequisiteAudit();
  let closing=[], finance={}, connector={};
  try{ closing=getAdoptionsNeedingClosingAttentionV18(); }catch(err){}
  try{ finance=getFinanceReviewV19(); }catch(err){}
  try{ connector=getConnectorHealthV14(); }catch(err){}
  return {audit:audit,closingAttention:closing.length,finance:finance,connector:connector};
}
