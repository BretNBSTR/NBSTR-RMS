/**
 * NBSTR RMS v0.8 — Configurable Google Forms Adapter
 *
 * Installable spreadsheet on-form-submit trigger:
 * googleFormApplicationSubmit(e)
 *
 * The adapter uses FormFieldMap. Exact question wording is isolated here
 * instead of being embedded in workflow code.
 */

function seedNBSTRApplicationFieldMap() {
  ensureV08Tables_();
  const rows=[
    ['NBSTR Adoption Application','First Name','applicant_first_name','First Name','Applicant','firstName'],
    ['NBSTR Adoption Application','Last Name','applicant_last_name','Last Name','Applicant','lastName'],
    ['NBSTR Adoption Application','Email Address','applicant_email','Email Address','Applicant','email'],
    ['NBSTR Adoption Application','Phone Number','applicant_phone','Phone Number','Applicant','phone'],
    ['NBSTR Adoption Application','Street Address','applicant_address','Street Address','Applicant','address1'],
    ['NBSTR Adoption Application','City','applicant_city','City','Applicant','city'],
    ['NBSTR Adoption Application','State','applicant_state','State','Applicant','state'],
    ['NBSTR Adoption Application','Zip Code','applicant_zip','Zip Code','Applicant','zip']
  ];
  rows.forEach(r=>{
    const exists=getRecords_('FormFieldMap').some(x=>String(x.FormName)===r[0]&&String(x.SourceField)===r[1]);
    if(!exists) appendRecord_('FormFieldMap',{
      FormFieldMapID:'FFM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      FormName:r[0],SourceField:r[1],StableQuestionKey:r[2],QuestionLabel:r[3],
      DestinationType:r[4],DestinationField:r[5],Active:true
    });
  });
  return {ok:true,message:'Starter NBSTR application field map created. Review source question names before activating the trigger.'};
}

function googleFormApplicationSubmit(e) {
  if(!e || !e.namedValues) throw new Error('This function must run from a spreadsheet form-submit trigger.');
  return normalizeAndImportForm_('NBSTR Adoption Application',e.namedValues,'Google Form');
}

function normalizeAndImportForm_(formName,namedValues,source) {
  ensureV08Tables_();
  const maps=getRecords_('FormFieldMap').filter(m=>
    String(m.FormName)===String(formName)&&String(m.Active).toLowerCase()==='true'
  );
  const payload={applicant:{},answers:{},preferences:[],source:source};
  Object.keys(namedValues||{}).forEach(label=>{
    const raw=Array.isArray(namedValues[label])?namedValues[label].join(', '):namedValues[label];
    const map=maps.find(m=>String(m.SourceField).trim()===String(label).trim());
    if(map && String(map.DestinationType)==='Applicant'){
      payload.applicant[map.DestinationField]=raw;
    } else if(map && String(map.DestinationType)==='Preference'){
      payload.preferences.push({type:map.DestinationField,value:raw});
      payload.answers[map.StableQuestionKey]={label:map.QuestionLabel||label,value:raw};
    } else {
      const key=map?map.StableQuestionKey:makeStableQuestionKey_(label);
      payload.answers[key]={label:map?(map.QuestionLabel||label):label,value:raw};
    }
  });
  const result=importApplicationRecord(payload);
  createApplicationDriveFolder(result.id);
  return result;
}

function makeStableQuestionKey_(label) {
  return 'unmapped_'+String(label).toLowerCase()
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80);
}

function auditFormFieldMapping(sampleHeaders) {
  ensureV08Tables_();
  const maps=getRecords_('FormFieldMap').filter(m=>String(m.Active).toLowerCase()==='true');
  return (sampleHeaders||[]).map(h=>{
    const m=maps.find(x=>String(x.SourceField).trim()===String(h).trim());
    return {sourceField:h,mapped:Boolean(m),stableQuestionKey:m?m.StableQuestionKey:makeStableQuestionKey_(h)};
  });
}
