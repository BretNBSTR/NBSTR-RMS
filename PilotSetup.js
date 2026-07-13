/**
 * NBSTR RMS v1.0 — Controlled Pilot & Role Setup
 * DEVELOPMENT / PILOT ONLY
 */

function ensureV10Tables_() {
  ensureV09Tables_();
  ensureTable_(SpreadsheetApp.getActive(),'PilotTests',[
    'PilotTestID','TestName','RecordType','RecordID','ExpectedResult',
    'TestStatus','TestNotes','TestedByPersonID','TestedAt'
  ]);
}

function setupNBSTRPilotRoles() {
  const roles=[
    ['Reference Checker','Completes and documents applicant reference checks.'],
    ['Background Check Reviewer','Verifies applicant background check status.'],
    ['Application Coordinator','Reviews completed applications and makes the approval workflow decision.'],
    ['Foster Mentor','Supports fosters and reviews placement information.'],
    ['Foster Visibility Coordinator','Makes approved applications visible to foster homes and supports adopter/foster connections.'],
    ['PetPoint Application Entry','Enters approved applicants into PetPoint.'],
    ['Foster Placement Coordinator','Coordinates foster searches and foster responses.'],
    ['Dog Intake Coordinator','Makes sure accepted dogs complete intake requirements.'],
    ['Medical Coordinator','Tracks veterinary care and medical follow-up.'],
    ['RMS Administrator','Maintains RMS settings, roles, and pilot configuration.']
  ];
  roles.forEach(r=>{
    const exists=getRecords_('Roles').some(x=>String(x.RoleName)===r[0]);
    if(!exists) appendRecord_('Roles',{
      RoleID:generateId_('Roles'),RoleName:r[0],Description:r[1],Active:true
    });
  });
  return {ok:true,message:'NBSTR pilot roles are ready.'};
}

function seedNBSTRPilotData() {
  ensureV10Tables_();
  const existing=getRecords_('People').some(p=>String(p.Email)==='pilot.applicant1@example.invalid');
  if(existing) return {ok:true,message:'Pilot data already exists. No duplicate test records created.'};

  const apps=[
    {firstName:'Pilot',lastName:'Applicant One',email:'pilot.applicant1@example.invalid',phone:'555-0101',city:'Oak Creek',state:'WI',zip:'53154'},
    {firstName:'Pilot',lastName:'Applicant Two',email:'pilot.applicant2@example.invalid',phone:'555-0102',city:'Madison',state:'WI',zip:'53703'},
    {firstName:'Pilot',lastName:'Applicant Three',email:'pilot.applicant3@example.invalid',phone:'555-0103',city:'Chicago',state:'IL',zip:'60601'}
  ];
  const appIDs=apps.map(a=>submitApplicationToRMS(a).id);

  const requestIDs=[];
  [
    {SourceType:'Owner',CurrentDogName:'Pilot Daisy',Breed:'Shih Tzu',Sex:'Female',EstimatedAge:'6 years',Weight:12,CurrentCity:'Milwaukee',CurrentState:'WI',BehaviorIssues:'No known issues reported.',MedicalConcerns:'Dental evaluation needed.',ReasonForRescue:'Pilot test record only.',Urgency:'Routine'},
    {SourceType:'Shelter',CurrentDogName:'Pilot Teddy',Breed:'Maltipoo',Sex:'Male',EstimatedAge:'3 years',Weight:18,CurrentCity:'Davenport',CurrentState:'IA',BehaviorIssues:'Shy with new people.',MedicalConcerns:'Records pending.',ReasonForRescue:'Pilot test record only.',Urgency:'High'}
  ].forEach(r=>requestIDs.push(createRescueRequest(r)));

  return {ok:true,applicationIDs:appIDs,rescueRequestIDs:requestIDs,message:'Fake pilot applications and rescue requests created.'};
}

function createPilotTestChecklist() {
  ensureV10Tables_();
  const tests=[
    ['Application receipt','Application','','Reference Checker task is created and application status is Received.'],
    ['Reference completion','Application','','Application advances to Background Check and verification task is created.'],
    ['Background verification','Application','','Application advances to Coordinator Review.'],
    ['Coordinator approval','Application','','Foster Visibility and PetPoint tasks are created in parallel.'],
    ['Foster visibility','Application','','Approved application advances to Ready to Match.'],
    ['Rescue request','RescueRequest','','Request creates review work and appears in Rescue Requests.'],
    ['Foster search','RescueRequest','','Begin Foster Search creates one active foster-search task.'],
    ['Official acceptance','Dog','','Dog cannot be officially accepted until a foster is secured.'],
    ['Dog name','Dog','','Official acceptance requires one NBSTR dog name.'],
    ['Dog intake checklist','Dog','','Acceptance creates required intake checklist items.'],
    ['Wisconsin CVI logic','Dog','','Out-of-state origin flags CVI review as Conditional; Wisconsin origin is Not Applicable.'],
    ['Dog Drive folder','Dog','','Dog folder and standard subfolders are created under DEVELOPMENT FILES.'],
    ['Dog Entry form safety','Dog','','Ambiguous dog-name match stops instead of guessing.'],
    ['Circle of Care','Dog','','Incomplete active dog appears in Dogs Needing Attention.'],
    ['Document filing','Dog','','Linked photo or record files route to the correct dog folder and RMS record.'],
    ['Applicant matching','Dog','','Only Ready to Match applications appear in approved applicant matching.'],
    ['Audit history','System','','Major workflow transitions create timeline/history records.'],
    ['Nothing Forgotten','System','','Overdue, unassigned, and incomplete tracked work is surfaced.']
  ];
  tests.forEach(t=>{
    const exists=getRecords_('PilotTests').some(x=>String(x.TestName)===t[0]);
    if(!exists) appendRecord_('PilotTests',{
      PilotTestID:'PT-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      TestName:t[0],RecordType:t[1],RecordID:t[2],ExpectedResult:t[3],
      TestStatus:'Not Tested',TestNotes:'',TestedByPersonID:'',TestedAt:''
    });
  });
  return {ok:true,message:'Pilot test checklist created.'};
}
function getPilotTestsForUI() {
  ensureV10Tables_();

  const rows = getRecords_('PilotTests');

  return JSON.parse(JSON.stringify(rows));
}
function updatePilotTest(testID,status,notes,recordID) {
  console.log('STEP 1 start');

  const allowed=['Not Tested','Pass','Fail','Blocked'];
  if(!allowed.includes(status)) throw new Error('Invalid pilot test status.');

  console.log('STEP 2 before currentPersonId');
  const personID = currentPersonId_();
  console.log('STEP 3 personID=' + personID);

  console.log('STEP 4 before updateRecord');
  updateRecord_('PilotTests','PilotTestID',testID,{
    TestStatus:status,
    TestNotes:String(notes||''),
    RecordID:String(recordID||''),
    TestedByPersonID:personID,
    TestedAt:new Date()
  });

  console.log('STEP 5 after updateRecord');

  const rows = getPilotTestsForUI();
  console.log('STEP 6 complete');

  return rows;
}
function getPilotSummary() {
  ensureV10Tables_();
  const tests=getRecords_('PilotTests');
  const counts={total:tests.length,pass:0,fail:0,blocked:0,notTested:0};
  tests.forEach(t=>{
    if(t.TestStatus==='Pass') counts.pass++;
    else if(t.TestStatus==='Fail') counts.fail++;
    else if(t.TestStatus==='Blocked') counts.blocked++;
    else counts.notTested++;
  });
  return counts;
}

function initializeNBSTRPilotV10() {
  setupNBSTRPilotRoles();
  createPilotTestChecklist();
  return {ok:true,message:'NBSTR RMS v1.0 pilot framework initialized. Fake data is NOT created until Seed Pilot Data is selected.'};
}
