/**
 * NBSTR RMS v0.7 — Application Import, Detailed References & Matching
 */

function ensureV07Tables_() {
  ensureTable_(SpreadsheetApp.getActive(),'ApplicationAnswers',[
    'ApplicationAnswerID','ApplicationID','QuestionKey','QuestionLabel','AnswerValue','Source','CreatedAt'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'ApplicantPreferences',[
    'ApplicantPreferenceID','ApplicationID','PreferenceType','PreferenceValue','CreatedAt'
  ]);
}

function importApplicationRecord(payload) {
  ensureV07Tables_();
  if(!payload || !payload.applicant) throw new Error('Applicant data is required.');
  const result=submitApplicationToRMS(payload.applicant);
  const appID=result.id;

  Object.keys(payload.answers||{}).forEach(key=>{
    const item=payload.answers[key];
    appendRecord_('ApplicationAnswers',{
      ApplicationAnswerID:'AANS-'+Utilities.getUuid().slice(0,8).toUpperCase(),
      ApplicationID:appID,QuestionKey:key,
      QuestionLabel:item.label||key,AnswerValue:String(item.value||''),
      Source:payload.source||'Imported Form',CreatedAt:new Date()
    });
  });

  (payload.preferences||[]).forEach(p=>appendRecord_('ApplicantPreferences',{
    ApplicantPreferenceID:'APREF-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    ApplicationID:appID,PreferenceType:p.type,PreferenceValue:String(p.value||''),CreatedAt:new Date()
  }));

  return {ok:true,id:appID,message:'Application '+appID+' imported into RMS.'};
}

function addDetailedReferenceCheck(data) {
  validateRequired_(data,['applicationID','referenceType','status','summary']);
  const id=generateId_('ReferenceChecks');
  appendRecord_('ReferenceChecks',{
    ReferenceCheckID:id,ApplicationID:data.applicationID,ReferencePersonID:'',
    ReferenceType:data.referenceType,Status:data.status,
    CompletedByPersonID:currentPersonId_(),CompletedAt:new Date(),
    Summary:String(data.summary).trim(),ConcernFlag:Boolean(data.concernFlag)
  });
  logTimeline_('Application',data.applicationID,'REFERENCE_CHECK_RECORDED',
    data.referenceType+' reference: '+data.status,String(data.summary).trim(),
    currentPersonId_(),'ReferenceChecks',id);
  return getApplicationMatchDetail_(data.applicationID);
}

function getApprovedApplicantsForMatching(dogID) {
  ensureV07Tables_();
  const dog=findRecord_('Dogs','DogID',dogID);
  if(!dog) throw new Error('Dog not found.');
  const people=getRecords_('People');
  const prefs=getRecords_('ApplicantPreferences');
  const apps=getRecords_('Applications').filter(a=>String(a.Status)==='Ready to Match');

  return apps.map(a=>{
    const p=people.find(x=>String(x.PersonID)===String(a.PrimaryApplicantPersonID))||{};
    const ap=prefs.filter(x=>String(x.ApplicationID)===String(a.ApplicationID));
    let score=50, reasons=[];
    const weightPref=ap.find(x=>x.PreferenceType==='Max Dog Weight');
    if(weightPref && dog.WeightCurrent){
      if(Number(dog.WeightCurrent)<=Number(weightPref.PreferenceValue)){score+=15;reasons.push('Dog fits stated weight preference');}
      else {score-=10;reasons.push('Dog is above stated weight preference');}
    }
    const breedPref=ap.find(x=>x.PreferenceType==='Breed');
    if(breedPref && dog.Breed && String(breedPref.PreferenceValue).toLowerCase().includes(String(dog.Breed).toLowerCase())){
      score+=10; reasons.push('Breed preference may align');
    }
    const agePref=ap.find(x=>x.PreferenceType==='Age');
    if(agePref){score+=5;reasons.push('Age preference recorded for foster review');}
    return {
      applicationID:a.ApplicationID,
      name:[p.FirstName,p.LastName].filter(String).join(' '),
      city:p.City||'',state:p.State||'',score:Math.max(0,Math.min(100,score)),
      reasons:reasons,preferences:ap.map(x=>x.PreferenceType+': '+x.PreferenceValue)
    };
  }).sort((a,b)=>b.score-a.score);
}

function getApplicationMatchDetail_(applicationID){
  ensureV07Tables_();
  const detail=getApplicationDetailForUI(applicationID);
  detail.answers=getRecords_('ApplicationAnswers').filter(x=>String(x.ApplicationID)===String(applicationID));
  detail.preferences=getRecords_('ApplicantPreferences').filter(x=>String(x.ApplicationID)===String(applicationID));
  return detail;
}

function getApplicationMatchDetail(applicationID){
  return getApplicationMatchDetail_(applicationID);
}

function recordDogApplicantInterest(dogID,applicationID,status){
  const allowed=['Interested','Foster Reviewing','Match Candidate','Not Selected','Withdrawn'];
  if(!allowed.includes(status)) throw new Error('Invalid interest status.');
  let existing=getRecords_('ApplicationDogInterest').find(x=>
    String(x.DogID)===String(dogID)&&String(x.ApplicationID)===String(applicationID));
  if(existing){
    updateRecord_('ApplicationDogInterest','InterestID',existing.InterestID,{InterestStatus:status});
  }else{
    appendRecord_('ApplicationDogInterest',{
      InterestID:generateId_('ApplicationDogInterest'),ApplicationID:applicationID,
      DogID:dogID,InterestStatus:status,CreatedAt:new Date()
    });
  }
  logTimeline_('Dog',dogID,'APPLICANT_MATCH_STATUS',
    applicationID+' — '+status,'',currentPersonId_(),'Applications',applicationID);
  return getApprovedApplicantsForMatching(dogID);
}
