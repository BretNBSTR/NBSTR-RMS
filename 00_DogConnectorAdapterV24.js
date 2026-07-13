/**
 * v2.4 adapter: normalized Microsoft Forms Dog payload -> existing v0.9 dog intake engine.
 */
function importDogEntrySubmissionV09(payload){
  payload=payload||{};
  const answers=payload.answers||{};
  const maps=typeof DOG_MAP_V12_==='function'?DOG_MAP_V12_():[];
  const namedValues={};

  Object.keys(answers).forEach(key=>{
    const map=maps.find(r=>String(r[1])===String(key));
    if(map) namedValues[map[0]]=[answers[key]];
  });

  (payload.files||[]).forEach(file=>{
    const stableKey=String(file.stableFieldKey||file.fieldKey||'');
    const map=maps.find(r=>String(r[1])===stableKey);
    const value=file.driveFileID||file.fileID||file.webUrl||file.url||'';
    if(map && value){
      if(!namedValues[map[0]]) namedValues[map[0]]=[];
      namedValues[map[0]].push(value);
    }
  });

  return normalizeDogEntryForm_(
    payload.formName||'NBSTR Dog Intake Form or Paperwork Submission',
    namedValues,
    'Microsoft Forms / Power Automate'
  );
}
