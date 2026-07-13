/**
 * NBSTR RMS v1.3 — Microsoft Forms / Power Automate Receiver
 * Deploy as a Web App. Power Automate POSTs normalized JSON here.
 */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const result = receiveNBSTRFormV13_(body);
    return jsonOutputV13_({ok:true,result:result});
  } catch (err) {
    logConnectorErrorV13_(err);
    return jsonOutputV13_({ok:false,error:String(err.message || err)});
  }
}

function receiveNBSTRFormV13_(payload) {
  if (!payload || !payload.formType) throw new Error('formType is required.');
  verifyConnectorSecretV13_(payload.connectorSecret);
  const formType=String(payload.formType);
  const responseId=String(payload.responseId || '');
  if (!responseId) throw new Error('responseId is required.');
  if (connectorReceiptExistsV13_(formType,responseId))
    return {status:'Duplicate ignored',formType:formType,responseId:responseId};

  let result;
  if (formType==='Dog') result=receiveDogFormV13_(payload);
  else if (formType==='Reference') result=receiveReferenceFormV13_(payload);
  else throw new Error('Unsupported formType: '+formType);

  appendRecord_('ConnectorReceipts',{
    ConnectorReceiptID:'CR-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    FormType:formType,ResponseID:responseId,ReceivedAt:new Date(),
    Status:'Processed',RelatedRecordType:result.relatedRecordType || '',
    RelatedRecordID:result.relatedRecordID || ''
  });
  return result;
}

function receiveDogFormV13_(payload) {
  const answers=payload.answers || {};
  return importDogEntrySubmissionV09({
    formName:'NBSTR Dog Intake Form or Paperwork Submission',
    submittedAt:payload.submittedAt || new Date(),
    submittedByEmail:payload.responderEmail || '',
    answers:answers,
    files:payload.files || []
  });
}

function receiveReferenceFormV13_(payload) {
  const a=payload.answers || {};
  const email=String(a.applicant_email || '').trim().toLowerCase();
  if (!email) throw new Error('Reference submission missing applicant_email.');
  const app=findApplicationByEmailV13_(email);
  if (!app) throw new Error('No RMS application found for applicant email '+email);

  const summary=[
    'Overall result: '+String(a.overall_result || ''),
    'Landlord permission: '+String(a.landlord_permission || ''),
    'Vet: '+String(a.vet_name || ''),
    'Groomer: '+String(a.groomer_name || ''),
    'Checker comments: '+String(a.checker_comments || '')
  ].join('\n');

  const checker=findPersonByEmailV13_(String(a.checker_email || '').trim().toLowerCase());
  const status=String(a.overall_result || '').toLowerCase()==='pass' ? 'Completed - Pass' :
               String(a.overall_result || '').toLowerCase()==='fail' ? 'Completed - Fail' : 'Completed';

  const id=nextId_('ReferenceCheck','REF');
  appendRecord_('ReferenceChecks',{
    ReferenceCheckID:id,ApplicationID:app.ApplicationID,
    ReferencePersonID:'',ReferenceType:'Combined NBSTR Reference Check',
    Status:status,CompletedByPersonID:checker ? checker.PersonID : '',
    CompletedAt:payload.submittedAt || new Date(),Summary:summary,
    ConcernFlag:String(a.overall_result || '').toLowerCase()==='fail'
  });

  appendRecord_('TimelineEvents',{
    TimelineEventID:nextId_('TimelineEvent','TLE'),
    RelatedRecordType:'Application',RelatedRecordID:app.ApplicationID,
    EventType:'Reference Check Received',EventAt:new Date(),
    Summary:'Reference check form received: '+String(a.overall_result || 'Completed'),
    Detail:summary,CreatedByPersonID:checker ? checker.PersonID : '',
    SourceRecordType:'ReferenceCheck',SourceRecordID:id
  });
  return {status:'Processed',relatedRecordType:'Application',relatedRecordID:app.ApplicationID,referenceCheckID:id};
}

function findApplicationByEmailV13_(email) {
  const people=getRecords_('People');
  const p=people.find(x=>String(x.Email || '').trim().toLowerCase()===email);
  if (!p) return null;
  return getRecords_('Applications').find(x=>String(x.PrimaryApplicantPersonID)===String(p.PersonID)) || null;
}
function findPersonByEmailV13_(email) {
  return getRecords_('People').find(x=>String(x.Email || '').trim().toLowerCase()===email) || null;
}
function verifyConnectorSecretV13_(secret) {
  const expected=PropertiesService.getScriptProperties().getProperty('NBSTR_CONNECTOR_SECRET');
  if (!expected) throw new Error('NBSTR_CONNECTOR_SECRET is not configured.');
  if (String(secret || '')!==expected) throw new Error('Unauthorized connector request.');
}
function connectorReceiptExistsV13_(formType,responseId) {
  return getRecords_('ConnectorReceipts').some(x=>
    String(x.FormType)===formType && String(x.ResponseID)===responseId);
}
function logConnectorErrorV13_(err) {
  try {
    ensureConnectorTablesV13_();
    appendRecord_('ConnectorErrors',{
      ConnectorErrorID:'CE-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      ErrorAt:new Date(),Message:String(err.message || err),Stack:String(err.stack || '')
    });
  } catch(ignore){}
}
function jsonOutputV13_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function ensureConnectorTablesV13_() {
  const ss=SpreadsheetApp.getActive();
  ensureTable_(ss,'ConnectorReceipts',['ConnectorReceiptID','FormType','ResponseID','ReceivedAt','Status','RelatedRecordType','RelatedRecordID']);
  ensureTable_(ss,'ConnectorErrors',['ConnectorErrorID','ErrorAt','Message','Stack']);
}
function initializeNBSTRConnectorV13() {
  ensureConnectorTablesV13_();
  let secret=PropertiesService.getScriptProperties().getProperty('NBSTR_CONNECTOR_SECRET');
  if (!secret) {
    secret=Utilities.getUuid()+Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('NBSTR_CONNECTOR_SECRET',secret);
  }
  return {ok:true,connectorSecret:secret,message:'Store this secret in Power Automate secure inputs. Do not place it in a sheet.'};
}
