/**
 * NBSTR RMS v1.4 — Connector Test Lab & Health
 */

function ensureV14Tables_() {
  ensureConnectorTablesV13_();
  ensureTable_(SpreadsheetApp.getActive(),'ConnectorTests',[
    'ConnectorTestID','TestType','TestAt','Status','RelatedRecordType',
    'RelatedRecordID','Message','TestedByPersonID'
  ]);
}

function runDogConnectorSampleV14() {
  ensureV14Tables_();
  const payload={
    formType:'Dog',
    responseId:'RMS-TEST-DOG-'+Utilities.getUuid(),
    submittedAt:new Date().toISOString(),
    responderEmail:'rms.pilot@example.invalid',
    answers:{
      dog_name:'Pilot Teddy',
      petpoint_exists:'No',
      intake_date:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'MM/dd/yyyy'),
      foster_home:'Pilot Foster',
      origin_detail:'Davenport, Iowa — RMS TEST ONLY',
      dog_breed:'Maltipoo',
      dog_age:'3 years',
      dog_sex:'Male',
      microchip_number:'0',
      rabies_current:'Unknown',
      distemper_current:'Unknown',
      bordetella_current:'Unknown'
    },
    files:[]
  };
  return runInternalConnectorTestV14_('Dog',payload);
}

function runReferenceConnectorSampleV14() {
  ensureV14Tables_();
  const app=findPilotApplicationV14_();
  if(!app) throw new Error('No pilot application found. Seed fake pilot data first.');
  const p=findRecord_('People','PersonID',app.PrimaryApplicantPersonID);
  const payload={
    formType:'Reference',
    responseId:'RMS-TEST-REF-'+Utilities.getUuid(),
    submittedAt:new Date().toISOString(),
    responderEmail:'rms.checker@example.invalid',
    answers:{
      checker_name:'RMS Pilot Checker',
      checker_email:'rms.checker@example.invalid',
      reference_date:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'MM/dd/yyyy'),
      applicant_name:[p.FirstName,p.LastName].filter(String).join(' '),
      applicant_email:p.Email,
      overall_result:'Pass',
      landlord_permission:'Pilot test — allowed',
      vet_name:'Pilot Veterinary Clinic',
      groomer_name:'Pilot Groomer',
      checker_comments:'RMS connector test only.'
    }
  };
  return runInternalConnectorTestV14_('Reference',payload);
}

function runInternalConnectorTestV14_(testType,payload) {
  try {
    let result;
    if(testType==='Dog') result=receiveDogFormV13_(payload);
    else result=receiveReferenceFormV13_(payload);
    recordConnectorTestV14_(testType,'Pass',result.relatedRecordType||'',result.relatedRecordID||'',JSON.stringify(result));
    return {ok:true,status:'Pass',message:testType+' connector sample passed.',result:result};
  } catch(err) {
    recordConnectorTestV14_(testType,'Fail','','',String(err.message||err));
    return {ok:false,status:'Fail',message:String(err.message||err)};
  }
}

function findPilotApplicationV14_() {
  const people=getRecords_('People');
  const p=people.find(x=>String(x.Email||'').endsWith('@example.invalid'));
  if(!p) return null;
  return getRecords_('Applications').find(x=>String(x.PrimaryApplicantPersonID)===String(p.PersonID))||null;
}

function recordConnectorTestV14_(type,status,recordType,recordID,message) {
  appendRecord_('ConnectorTests',{
    ConnectorTestID:'CT-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    TestType:type,TestAt:new Date(),Status:status,RelatedRecordType:recordType,
    RelatedRecordID:recordID,Message:message,TestedByPersonID:currentPersonId_()
  });
}

function getConnectorHealthV14() {
  ensureV14Tables_();
  const receipts=getRecords_('ConnectorReceipts');
  const errors=getRecords_('ConnectorErrors');
  const tests=getRecords_('ConnectorTests');
  const now=new Date();
  const last24=new Date(now.getTime()-24*60*60*1000);
  const recentErrors=errors.filter(x=>new Date(x.ErrorAt)>=last24);
  const recentReceipts=receipts.filter(x=>new Date(x.ReceivedAt)>=last24);
  const lastDog=[...tests].reverse().find(x=>x.TestType==='Dog')||null;
  const lastRef=[...tests].reverse().find(x=>x.TestType==='Reference')||null;
  return {
    status:recentErrors.length?'Attention':'Healthy',
    receipts24h:recentReceipts.length,
    errors24h:recentErrors.length,
    totalReceipts:receipts.length,
    lastDog:lastDog,lastReference:lastRef,
    recentErrors:errors.slice(-10).reverse(),
    recentTests:tests.slice(-10).reverse()
  };
}

function getNothingForgottenConnectorAlertsV14() {
  const h=getConnectorHealthV14(), alerts=[];
  if(h.errors24h) alerts.push({
    type:'Connector',priority:'High',
    title:h.errors24h+' connector error(s) in the last 24 hours',
    detail:'Review Connector Health before processing additional live form submissions.'
  });
  if(!h.lastDog || h.lastDog.Status!=='Pass') alerts.push({
    type:'Connector',priority:'Normal',title:'Dog Intake connector test not passing',
    detail:'Run the Dog sample test in Connector Test Lab.'
  });
  if(!h.lastReference || h.lastReference.Status!=='Pass') alerts.push({
    type:'Connector',priority:'Normal',title:'Reference connector test not passing',
    detail:'Run the Reference sample test in Connector Test Lab.'
  });
  return alerts;
}

function initializeConnectorTestLabV14() {
  ensureV14Tables_();
  return {ok:true,message:'Connector Test Lab initialized.'};
}
