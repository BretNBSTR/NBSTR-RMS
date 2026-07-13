/**
 * NBSTR RMS v1.8 — Adoption Closing & Nothing Forgotten
 */
function ensureV18Tables_(){
  ensureTable_(SpreadsheetApp.getActive(),'AdoptionClosingItems',[
    'ClosingItemID','AdoptionID','ItemType','RequiredStatus','ItemStatus',
    'DocumentID','PaymentID','Notes','CompletedByPersonID','CompletedAt','UpdatedAt'
  ]);
}

function initializeAdoptionClosingV18(adoptionID){
  ensureV18Tables_();
  const adoption=findRecord_('Adoptions','AdoptionID',adoptionID);
  if(!adoption) throw new Error('Adoption not found.');
  const dog=findRecord_('Dogs','DogID',adoption.DogID);
  if(!dog) throw new Error('Dog not found.');

  const items=[
    ['Adoption Contract','Required'],
    ['Home Visit','Required'],
    ['Rabies Certificate','Required'],
    ['Spay / Neuter','Conditional'],
    ['Distemper','Required'],
    ['Bordetella','Required'],
    ['Heartworm Test','Conditional'],
    ['Fecal / Deworming','Required'],
    ['CVI','Conditional'],
    ['Other Veterinary Records','Required'],
    ['Medication Dispensed Record','Conditional'],
    ['Adoption Payment','Required'],
    ['Adopter Education Packet','Required'],
    ['PetPoint Adoption Update','Required'],
    ['Final Paperwork Review','Required']
  ];

  items.forEach(x=>createClosingItemV18_(adoptionID,x[0],resolveClosingRequirementV18_(x[0],x[1],dog,adoption)));
  return getAdoptionClosingV18(adoptionID);
}

function resolveClosingRequirementV18_(itemType,defaultStatus,dog,adoption){
  if(itemType==='CVI'){
    // Import CVI is NOT universally required. This closing item concerns adoption movement.
    // Final legal routing remains state-aware and configurable.
    return adoptionCVIRequiredV18_(dog,adoption)?'Required':'Not Applicable';
  }
  if(itemType==='Heartworm Test'){
    const ageMonths=Number(dog.AgeMonths||0);
    return ageMonths>6?'Required':'Not Applicable';
  }
  if(itemType==='Spay / Neuter'){
    const ageMonths=Number(dog.AgeMonths||0);
    return ageMonths>=6?'Required':'Conditional';
  }
  return defaultStatus;
}

function adoptionCVIRequiredV18_(dog,adoption){
  const fosterState=String(adoption.FosterState||dog.FosterState||'').toUpperCase();
  const adopterState=String(adoption.AdopterState||'').toUpperCase();
  if(!fosterState || !adopterState) return false; // requires review rather than guessing
  return fosterState!==adopterState;
}

function createClosingItemV18_(adoptionID,itemType,requiredStatus){
  const existing=getRecords_('AdoptionClosingItems').find(x=>
    String(x.AdoptionID)===String(adoptionID)&&String(x.ItemType)===String(itemType)
  );
  if(existing) return existing;
  const status=requiredStatus==='Not Applicable'?'Not Applicable':'Missing';
  appendRecord_('AdoptionClosingItems',{
    ClosingItemID:'ACI-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    AdoptionID:adoptionID,ItemType:itemType,RequiredStatus:requiredStatus,
    ItemStatus:status,DocumentID:'',PaymentID:'',Notes:'',
    CompletedByPersonID:'',CompletedAt:'',UpdatedAt:new Date()
  });
}

function getAdoptionClosingV18(adoptionID){
  ensureV18Tables_();
  const items=getRecords_('AdoptionClosingItems').filter(x=>String(x.AdoptionID)===String(adoptionID));
  const required=items.filter(x=>String(x.RequiredStatus)==='Required');
  const complete=required.filter(x=>['Received','Verified','Completed','Not Applicable'].includes(String(x.ItemStatus)));
  return {
    adoptionID:adoptionID,items:items,
    requiredCount:required.length,completeCount:complete.length,
    percent:required.length?Math.round(complete.length/required.length*100):100,
    canClose:required.length===complete.length,
    missing:required.filter(x=>!['Received','Verified','Completed','Not Applicable'].includes(String(x.ItemStatus)))
  };
}

function updateAdoptionClosingItemV18(closingItemID,status,notes){
  const item=findRecord_('AdoptionClosingItems','ClosingItemID',closingItemID);
  if(!item) throw new Error('Closing item not found.');
  const done=['Received','Verified','Completed','Not Applicable'].includes(String(status));
  updateRecord_('AdoptionClosingItems','ClosingItemID',closingItemID,{
    ItemStatus:status,Notes:notes||'',
    CompletedByPersonID:done?currentPersonId_():'',
    CompletedAt:done?new Date():'',UpdatedAt:new Date()
  });
  return getAdoptionClosingV18(item.AdoptionID);
}

function closeAdoptionV18(adoptionID){
  const state=getAdoptionClosingV18(adoptionID);
  if(!state.canClose){
    throw new Error('Adoption cannot be closed. '+state.missing.length+' required item(s) are still incomplete: '+state.missing.map(x=>x.ItemType).join(', '));
  }
  updateRecord_('Adoptions','AdoptionID',adoptionID,{Status:'Closed',ClosedAt:new Date()});
  addTimelineEvent_('Adoption',adoptionID,'Adoption Closed','All required adoption closing items completed.');
  return {ok:true,message:'Adoption closed. The Circle of Care is complete.'};
}

function getAdoptionsNeedingClosingAttentionV18(){
  ensureV18Tables_();
  const adoptions=getRecords_('Adoptions').filter(x=>!['Closed','Cancelled'].includes(String(x.Status)));
  return adoptions.map(a=>{
    let items=getRecords_('AdoptionClosingItems').filter(x=>String(x.AdoptionID)===String(a.AdoptionID));
    if(!items.length){ initializeAdoptionClosingV18(a.AdoptionID); }
    const state=getAdoptionClosingV18(a.AdoptionID);
    const dog=findRecord_('Dogs','DogID',a.DogID);
    return {
      AdoptionID:a.AdoptionID,DogName:dog?dog.Name:'',
      Percent:state.percent,MissingCount:state.missing.length,
      MissingItems:state.missing.map(x=>x.ItemType).join(', ')
    };
  }).filter(x=>x.MissingCount>0).sort((a,b)=>b.MissingCount-a.MissingCount);
}

function reconcileAdoptionClosingV18(adoptionID){
  const items=getRecords_('AdoptionClosingItems').filter(x=>String(x.AdoptionID)===String(adoptionID));
  const docs=getRecords_('Documents').filter(x=>String(x.RelatedRecordType)==='Adoption'&&String(x.RelatedRecordID)===String(adoptionID));
  const payments=getRecords_('Payments').filter(x=>String(x.RelatedRecordType)==='Adoption'&&String(x.RelatedRecordID)===String(adoptionID));

  items.forEach(item=>{
    if(String(item.ItemType)==='Adoption Payment' && payments.length){
      updateRecord_('AdoptionClosingItems','ClosingItemID',item.ClosingItemID,{ItemStatus:'Received',PaymentID:payments[0].PaymentID,UpdatedAt:new Date()});
      return;
    }
    const map={
      'Adoption Contract':'Adoption Contract','Home Visit':'Home Visit',
      'Rabies Certificate':'Rabies Certificate','Other Veterinary Records':'Veterinary Records',
      'Medication Dispensed Record':'Medication Dispensed'
    };
    const docType=map[item.ItemType];
    const doc=docType?docs.find(d=>String(d.DocumentType)===docType):null;
    if(doc) updateRecord_('AdoptionClosingItems','ClosingItemID',item.ClosingItemID,{
      ItemStatus:String(doc.RequirementStatus)==='Verified'?'Verified':'Received',
      DocumentID:doc.DocumentID,UpdatedAt:new Date()
    });
  });
  return getAdoptionClosingV18(adoptionID);
}
