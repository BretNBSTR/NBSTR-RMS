/**
 * NBSTR RMS v2.1 — Guided Pilot Test Runner
 * Fake pilot records only. No live trigger activation or historical import.
 */
function ensureV21Tables_(){
  ensureTable_(SpreadsheetApp.getActive(),'V21PilotRuns',[
    'PilotRunID','StartedAt','StartedByPersonID','Status','CurrentStep','Passed',
    'Failed','Blocked','CompletedAt','Notes'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'V21PilotStepResults',[
    'PilotStepResultID','PilotRunID','StepNumber','StepName','Status',
    'ResultDetail','TestedAt','TestedByPersonID'
  ]);
}
function getV21Steps_(){
  return [
    [1,'Unified setup audit','AUTO'],
    [2,'Fake pilot data exists','AUTO'],
    [3,'Dog Intake connector sample','AUTO'],
    [4,'Reference connector sample','AUTO'],
    [5,'Application workflow review','MANUAL'],
    [6,'Parallel foster visibility and PetPoint work','MANUAL'],
    [7,'Application Ready to Match','MANUAL'],
    [8,'Foster secured before dog acceptance','MANUAL'],
    [9,'One NBSTR dog name confirmed','MANUAL'],
    [10,'Dog Circle of Care reviewed','MANUAL'],
    [11,'Movement/CVI routing reviewed','MANUAL'],
    [12,'Ambiguous paperwork does not auto-guess','MANUAL'],
    [13,'Adoption closing initialized','MANUAL'],
    [14,'Closing gate blocks missing required items','MANUAL'],
    [15,'Adopter education preview reviewed','MANUAL'],
    [16,'3/14/30-day follow-ups created','MANUAL'],
    [17,'Five payment sources tested','MANUAL'],
    [18,'Gross, fee, and net preserved','MANUAL'],
    [19,'Finance duplicate protection confirmed','MANUAL'],
    [20,'Dog-level income and expense links tested','MANUAL'],
    [21,'Role-based My Work reviewed','MANUAL'],
    [22,'Nothing Forgotten reviewed','MANUAL'],
    [23,'Critical production readiness reviewed','MANUAL'],
    [24,'Final v2.0 launch audit','AUTO']
  ];
}
function startV21PilotRun(){
  ensureV21Tables_();
  const id='PRUN-'+Utilities.getUuid().slice(0,8).toUpperCase();
  appendRecord_('V21PilotRuns',{
    PilotRunID:id,StartedAt:new Date(),StartedByPersonID:currentPersonId_(),
    Status:'In Progress',CurrentStep:1,Passed:0,Failed:0,Blocked:0,CompletedAt:'',Notes:''
  });
  return getV21PilotRun(id);
}
function getV21PilotRun(runID){
  ensureV21Tables_();
  const run=findRecord_('V21PilotRuns','PilotRunID',runID);
  if(!run) throw new Error('Pilot run not found.');
  const results=getRecords_('V21PilotStepResults').filter(x=>String(x.PilotRunID)===String(runID));
  const steps=getV21Steps_().map(s=>{
    const r=results.find(x=>Number(x.StepNumber)===s[0]);
    return {number:s[0],name:s[1],mode:s[2],status:r?r.Status:'Not Tested',detail:r?r.ResultDetail:''};
  });
  return {run:run,steps:steps};
}
function runV21AutomaticStep(runID,stepNumber){
  let status='Pass',detail='';
  try{
    switch(Number(stepNumber)){
      case 1:
        const setup=getV20SetupStatus();
        status=setup.percent===100?'Pass':'Blocked';
        detail='Setup '+setup.percent+'% complete.';
        break;
      case 2:
        status=findPilotApplicationV14_()?'Pass':'Blocked';
        detail=status==='Pass'?'Fake pilot application found.':'Seed fake pilot data first.';
        break;
      case 3:
        const dog=runDogConnectorSampleV14();
        status=dog.ok?'Pass':'Fail'; detail=dog.message; break;
      case 4:
        const ref=runReferenceConnectorSampleV14();
        status=ref.ok?'Pass':'Fail'; detail=ref.message; break;
      case 24:
        const audit=runV20PrerequisiteAudit();
        status=audit.ready?'Pass':'Blocked';
        detail=audit.ready?'No launch blockers found.':audit.blockers.join(' | ');
        break;
      default: throw new Error('This step requires manual review.');
    }
  }catch(err){ status='Fail'; detail=String(err.message||err); }
  return saveV21StepResult_(runID,stepNumber,status,detail);
}
function markV21ManualStep(runID,stepNumber,status,detail){
  if(!['Pass','Fail','Blocked'].includes(String(status))) throw new Error('Invalid pilot result.');
  return saveV21StepResult_(runID,stepNumber,status,String(detail||''));
}
function saveV21StepResult_(runID,stepNumber,status,detail){
  const step=getV21Steps_().find(x=>x[0]===Number(stepNumber));
  if(!step) throw new Error('Pilot step not found.');
  const old=getRecords_('V21PilotStepResults').find(x=>String(x.PilotRunID)===String(runID)&&Number(x.StepNumber)===Number(stepNumber));
  const values={PilotRunID:runID,StepNumber:Number(stepNumber),StepName:step[1],Status:status,
    ResultDetail:detail,TestedAt:new Date(),TestedByPersonID:currentPersonId_()};
  if(old) updateRecord_('V21PilotStepResults','PilotStepResultID',old.PilotStepResultID,values);
  else appendRecord_('V21PilotStepResults',Object.assign({PilotStepResultID:'PSR-'+Utilities.getUuid().slice(0,8).toUpperCase()},values));
  updateV21RunSummary_(runID);
  return getV21PilotRun(runID);
}
function updateV21RunSummary_(runID){
  const results=getRecords_('V21PilotStepResults').filter(x=>String(x.PilotRunID)===String(runID));
  const passed=results.filter(x=>x.Status==='Pass').length;
  const failed=results.filter(x=>x.Status==='Fail').length;
  const blocked=results.filter(x=>x.Status==='Blocked').length;
  const next=getV21Steps_().find(s=>!results.some(r=>Number(r.StepNumber)===s[0]&&r.Status==='Pass'));
  const complete=passed===getV21Steps_().length && !failed && !blocked;
  updateRecord_('V21PilotRuns','PilotRunID',runID,{
    Status:complete?'Passed':failed?'Failed':blocked?'Blocked':'In Progress',
    CurrentStep:next?next[0]:24,Passed:passed,Failed:failed,Blocked:blocked,
    CompletedAt:complete?new Date():''
  });
}
function getLatestV21PilotRun(){
  ensureV21Tables_();
  const runs=getRecords_('V21PilotRuns');
  return runs.length?getV21PilotRun(runs[runs.length-1].PilotRunID):null;
}
