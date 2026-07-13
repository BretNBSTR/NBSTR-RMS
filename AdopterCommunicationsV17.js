/**
 * NBSTR RMS v1.7 — Adopter Communications & Education
 */
function ensureV17Tables_(){
  ensureTable_(SpreadsheetApp.getActive(),'CommunicationTemplates',[
    'CommunicationTemplateID','TemplateName','CommunicationType','SubjectTemplate',
    'BodyTemplate','Active','UpdatedAt'
  ]);
  ensureTable_(SpreadsheetApp.getActive(),'CommunicationLog',[
    'CommunicationLogID','RelatedRecordType','RelatedRecordID','RecipientEmail',
    'CommunicationType','TemplateName','Subject','SentAt','SentByPersonID','Status','Notes'
  ]);
}

function seedNBSTRCommunicationTemplatesV17(){
  ensureV17Tables_();
  const rows=[
    ['Application Approved','Approval','Your NBSTR adoption application has been approved',
`Hi {{FIRST_NAME}},

Your adoption application with New Beginnings Shih Tzu & Friends Rescue has been approved.

Your application will remain on file for five years. Approval means you are eligible to be considered for an NBSTR dog; it does not guarantee a specific dog or adoption. Our foster homes work to find the best match for each dog.

{{APPROVED_GROUP_INFO}}

If you are interested in a dog, please follow the instructions provided for approved adopters. Dogs can move quickly, and the foster home will review approved applications to determine the best fit.

Thank you,
New Beginnings Shih Tzu & Friends Rescue`],
    ['Application Denied','Denial','Update on your NBSTR adoption application',
`Hi {{FIRST_NAME}},

Thank you for your interest in adopting from New Beginnings Shih Tzu & Friends Rescue.

After reviewing your application and reference information, we are unable to approve your application at this time.

{{DECISION_REASON}}

We appreciate the time you took to apply.

Thank you,
New Beginnings Shih Tzu & Friends Rescue`],
    ['More Information Needed','More Information','More information needed for your NBSTR adoption application',
`Hi {{FIRST_NAME}},

We are reviewing your adoption application and need a little more information before we can complete the process.

{{INFORMATION_NEEDED}}

Please reply with the requested information as soon as you can. Once received, we can continue reviewing your application.

Thank you,
New Beginnings Shih Tzu & Friends Rescue`],
    ['Adopter Education Packet','Post Adoption','Welcome home, {{DOG_NAME}} — important adoption information',
`Hi {{FIRST_NAME}},

Congratulations on adopting {{DOG_NAME}}!

The first days and weeks in a new home are a major transition. Please read the information below and give {{DOG_NAME}} time, patience, routine, and a safe place to settle in.

{{THREE_THREE_THREE}}

{{NOTE_FROM_DOG}}

{{HEARTWORM_GUIDANCE}}

Please continue year-round heartworm prevention and work with your veterinarian on annual heartworm testing and your dog's ongoing care.

If you have concerns about your new dog's adjustment, please contact NBSTR.

Thank you for adopting,
New Beginnings Shih Tzu & Friends Rescue`],
    ['Adoption Follow-Up','Follow Up','How is {{DOG_NAME}} settling in?',
`Hi {{FIRST_NAME}},

We wanted to check in and see how {{DOG_NAME}} is settling into the family.

Every rescue dog adjusts at a different pace. Please reply and let us know how things are going, including any questions or concerns you have.

Remember that adjustment can take weeks or months. Routine, patience, and positive reinforcement are important.

We would love an update and a picture when you have time!

Thank you,
New Beginnings Shih Tzu & Friends Rescue`]
  ];
  rows.forEach(r=>{
    const existing=getRecords_('CommunicationTemplates').find(x=>String(x.TemplateName)===r[0]);
    const data={TemplateName:r[0],CommunicationType:r[1],SubjectTemplate:r[2],BodyTemplate:r[3],Active:true,UpdatedAt:new Date()};
    if(existing) updateRecord_('CommunicationTemplates','CommunicationTemplateID',existing.CommunicationTemplateID,data);
    else appendRecord_('CommunicationTemplates',Object.assign({CommunicationTemplateID:'CTM-'+Utilities.getUuid().slice(0,8).toUpperCase()},data));
  });
  return {ok:true,message:'NBSTR adopter communication templates created.'};
}

function educationBlocksV17_(){
  return {
    THREE_THREE_THREE:
`THE 3-3-3 RULE — A GENERAL GUIDE

First 3 days: Your dog may feel overwhelmed, scared, quiet, restless, or unsure. Keep life calm and predictable. Limit visitors and give your dog a safe place to rest.

First 3 weeks: Your dog may begin to settle into a routine and show more of their personality. Continue clear routines, supervision, patience, and positive reinforcement.

First 3 months: Trust and a stronger bond often continue to grow. Your dog may feel more secure and comfortable in the home.

The 3-3-3 rule is a guideline, not a deadline. Every dog adjusts at their own pace.`,

    NOTE_FROM_DOG:
`A NOTE FROM YOUR DOG

Everything is new to me — your home, your sounds, your routine, and even the people who already love me. I may not understand right away what you expect.

Please give me time to learn that I am safe. Show me where to rest, take me outside often, supervise me carefully, and help me learn with patience and positive reinforcement.

I may have accidents. I may be nervous. I may follow you everywhere or need space. The dog you see today may not be the same dog you see after I feel safe and settled.

Please be patient with me while I learn how to be part of your family.`,

    HEARTWORM_GUIDANCE:
`HEARTWORM PREVENTION AND TESTING

A negative heartworm test is good news, but it does not replace future prevention and testing. Heartworm disease is spread by mosquitoes, and early infection may not always be detectable immediately.

NBSTR strongly encourages every adopter to keep their dog on veterinarian-recommended year-round heartworm prevention and have heartworm testing performed annually. Talk with your veterinarian about when your newly adopted dog should be retested, especially if the dog came from another geographic area or their prior prevention history is incomplete or unknown.

Prevention is safer and generally far easier than treating established heartworm disease.`
  };
}

function previewCommunicationV17(templateName,recordType,recordID,extra){
  const template=getRecords_('CommunicationTemplates').find(x=>String(x.TemplateName)===String(templateName)&&String(x.Active).toLowerCase()!=='false');
  if(!template) throw new Error('Communication template not found.');
  const context=buildCommunicationContextV17_(recordType,recordID,extra||{});
  return {
    templateName:templateName,
    recipientEmail:context.EMAIL||'',
    subject:mergeCommunicationV17_(template.SubjectTemplate,context),
    body:mergeCommunicationV17_(template.BodyTemplate,context)
  };
}

function sendCommunicationV17(templateName,recordType,recordID,extra){
  const preview=previewCommunicationV17(templateName,recordType,recordID,extra||{});
  if(!preview.recipientEmail) throw new Error('Recipient email is missing.');
  MailApp.sendEmail(preview.recipientEmail,preview.subject,preview.body);
  appendRecord_('CommunicationLog',{
    CommunicationLogID:'COM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    RelatedRecordType:recordType,RelatedRecordID:recordID,
    RecipientEmail:preview.recipientEmail,CommunicationType:templateName,
    TemplateName:templateName,Subject:preview.subject,SentAt:new Date(),
    SentByPersonID:currentPersonId_(),Status:'Sent',Notes:''
  });
  return {ok:true,message:templateName+' email sent to '+preview.recipientEmail+'.'};
}

function buildCommunicationContextV17_(recordType,recordID,extra){
  const blocks=educationBlocksV17_();
  const c=Object.assign({
    FIRST_NAME:'',EMAIL:'',DOG_NAME:'your new dog',DECISION_REASON:'',
    INFORMATION_NEEDED:'',APPROVED_GROUP_INFO:'',
    THREE_THREE_THREE:blocks.THREE_THREE_THREE,
    NOTE_FROM_DOG:blocks.NOTE_FROM_DOG,
    HEARTWORM_GUIDANCE:blocks.HEARTWORM_GUIDANCE
  },extra||{});

  if(recordType==='Application'){
    const app=findRecord_('Applications','ApplicationID',recordID);
    if(!app) throw new Error('Application not found.');
    const p=findRecord_('People','PersonID',app.PrimaryApplicantPersonID);
    if(p){c.FIRST_NAME=p.FirstName||'';c.EMAIL=p.Email||'';}
  } else if(recordType==='Adoption'){
    const adoption=findRecord_('Adoptions','AdoptionID',recordID);
    if(!adoption) throw new Error('Adoption not found.');
    const dog=findRecord_('Dogs','DogID',adoption.DogID);
    const app=findRecord_('Applications','ApplicationID',adoption.ApplicationID);
    const p=app?findRecord_('People','PersonID',app.PrimaryApplicantPersonID):null;
    if(dog)c.DOG_NAME=dog.Name||c.DOG_NAME;
    if(p){c.FIRST_NAME=p.FirstName||'';c.EMAIL=p.Email||'';}
  }
  return c;
}

function mergeCommunicationV17_(text,context){
  return String(text||'').replace(/\{\{([A-Z0-9_]+)\}\}/g,(m,k)=>context[k]!==undefined?String(context[k]):m);
}

function queueAdopterEducationV17(adoptionID){
  const existing=getRecords_('Tasks').some(t=>
    String(t.RelatedRecordType)==='Adoption'&&String(t.RelatedRecordID)===String(adoptionID)&&
    String(t.Title)==='Send Adopter Education Packet'&&['Open','In Progress','Waiting'].includes(String(t.Status))
  );
  if(!existing) appendRecord_('Tasks',{
    TaskID:nextId_('Task','TASK'),TaskTypeID:'',Title:'Send Adopter Education Packet',
    RelatedRecordType:'Adoption',RelatedRecordID:adoptionID,AssignedRole:'Adoption Workflow',
    Status:'Open',Priority:'Normal',DueAt:new Date(Date.now()+24*60*60*1000),
    Instructions:'Preview and send the NBSTR adopter education packet.',CreatedAt:new Date()
  });
  return {ok:true,message:'Adopter education task is ready.'};
}

function scheduleAdoptionFollowUpsV17(adoptionID){
  [3,14,30].forEach(days=>{
    const title='Adoption Follow-Up — Day '+days;
    const exists=getRecords_('Tasks').some(t=>String(t.RelatedRecordType)==='Adoption'&&String(t.RelatedRecordID)===String(adoptionID)&&String(t.Title)===title);
    if(!exists) appendRecord_('Tasks',{
      TaskID:nextId_('Task','TASK'),TaskTypeID:'',Title:title,
      RelatedRecordType:'Adoption',RelatedRecordID:adoptionID,AssignedRole:'Adoption Workflow',
      Status:'Open',Priority:'Routine',DueAt:new Date(Date.now()+days*24*60*60*1000),
      Instructions:'Send or review adopter follow-up for this adoption.',CreatedAt:new Date()
    });
  });
  return {ok:true,message:'3-day, 14-day, and 30-day adoption follow-ups scheduled.'};
}
