/**
 * NBSTR RMS v1.2 — Verified Form Maps
 * Based on NBSTR form PDFs supplied for the RMS project.
 */
function seedVerifiedNBSTRFormMapsV12(){
  ensureV09Tables_();
  seedVerifiedApplicationMapV12_();
  seedVerifiedDogMapV12_();
  ensureTable_(SpreadsheetApp.getActive(),'ReferenceFormFieldMap',[
    'ReferenceFormFieldMapID','SourceField','StableQuestionKey','Active'
  ]);
  seedVerifiedReferenceMapV12_();
  return {ok:true,message:'Verified NBSTR v1.2 form maps seeded. Run audits against actual response headers before live triggers.'};
}
function replaceMapRows_(table,keyField,keyValue){
  const sh=SpreadsheetApp.getActive().getSheetByName(table); if(!sh)return;
  const vals=sh.getDataRange().getValues(), headers=vals[0], ki=headers.indexOf(keyField);
  for(let r=vals.length-1;r>=1;r--) if(String(vals[r][ki])===String(keyValue)) sh.deleteRow(r+1);
}
function seedVerifiedApplicationMapV12_(){
  replaceMapRows_('FormFieldMap','FormName','NBSTR Adoption Application 2023');
  const rows=APPLICATION_MAP_V12_();
  rows.forEach(r=>appendRecord_('FormFieldMap',{
    FormFieldMapID:'FFM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    FormName:'NBSTR Adoption Application 2023',SourceField:r[0],StableQuestionKey:r[1],
    QuestionLabel:r[0],DestinationType:r[2],DestinationField:r[3],Active:true
  }));
}
function seedVerifiedDogMapV12_(){
  replaceMapRows_('DogFormFieldMap','FormName','NBSTR Dog Intake Form or Paperwork Submission');
  DOG_MAP_V12_().forEach(r=>appendRecord_('DogFormFieldMap',{
    DogFormFieldMapID:'DFM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
    FormName:'NBSTR Dog Intake Form or Paperwork Submission',SourceField:r[0],
    StableFieldKey:r[1],DestinationField:r[3],FieldType:r[2],DocumentType:r[4],Active:true
  }));
}
function seedVerifiedReferenceMapV12_(){
  REFERENCE_MAP_V12_().forEach(r=>{
    if(!getRecords_('ReferenceFormFieldMap').some(x=>String(x.SourceField)===r[0]))
      appendRecord_('ReferenceFormFieldMap',{
        ReferenceFormFieldMapID:'RFM-'+Utilities.getUuid().slice(0,8).toUpperCase(),
        SourceField:r[0],StableQuestionKey:r[1],Active:true
      });
  });
}
function auditLiveFormHeadersV12(formType,headers){
  let rows=[];
  if(formType==='Application') rows=APPLICATION_MAP_V12_();
  else if(formType==='Dog') rows=DOG_MAP_V12_();
  else if(formType==='Reference') rows=REFERENCE_MAP_V12_();
  else throw new Error('Invalid form type.');
  return (headers||[]).map(h=>{
    const exact=rows.find(r=>String(r[0]).trim()===String(h).trim());
    return {header:h,mapped:Boolean(exact),stableKey:exact?exact[1]:'UNMAPPED'};
  });
}
function APPLICATION_MAP_V12_(){ return [['Email', 'applicant_email', 'Applicant', 'email'], ['Legal First Name', 'applicant_first_name', 'Applicant', 'firstName'], ['Middle Initial', 'applicant_middle_initial', 'Answer', ''], ['Legal Last Name', 'applicant_last_name', 'Applicant', 'lastName'], ['Phone Number:', 'applicant_phone', 'Applicant', 'phone'], ['Co Applicant First Name', 'coapplicant_first_name', 'Answer', ''], ['Co Applicant Last Name', 'coapplicant_last_name', 'Answer', ''], ['Co Applicant Phone Number:', 'coapplicant_phone', 'Answer', ''], ['Street Address', 'applicant_address', 'Applicant', 'address1'], ['City', 'applicant_city', 'Applicant', 'city'], ['State', 'applicant_state', 'Applicant', 'state'], ['Zip', 'applicant_zip', 'Applicant', 'zip'], ['How many People other than the applicant and co applicant, live in your home? Name and Ages of people in the home (i.e: Sally 7 years).', 'household_people_ages', 'Answer', ''], ['How many hours a day will your dog be left alone?', 'dog_hours_alone', 'Preference', 'Hours Alone'], ['Your dog will need several potty breaks per day. What are your plans for this?', 'potty_break_plan', 'Answer', ''], ['Do you have plans for the dog if you will be gone more than 8-9 hours during the day?', 'extended_absence_plan', 'Answer', ''], ["What are your plans for your dog when you're on vacation?", 'vacation_plan', 'Answer', ''], ['What are your plans if something occurs that would bring into question the ability of your family to keep the dog? (Note: The rescue would prefer that dogs be returned to the rescue).', 'future_care_plan', 'Answer', ''], ['How will your dog get exercise?', 'exercise_plan', 'Answer', ''], ['Yard:', 'yard_type', 'Answer', ''], ['Housing:', 'housing_type', 'Answer', ''], ['Landlord Name', 'landlord_name', 'Answer', ''], ['Landlord Phone', 'landlord_phone', 'Answer', ''], ['Are you willing to travel to meet your new pet?', 'travel_willingness', 'Answer', ''], ['Are you interested in a certain dog from our website?', 'specific_dog_interest', 'Answer', ''], ['What is the name of the dog you are interested in?', 'specific_dog_name', 'Preference', 'Specific Dog'], ['If this dog becomes unavailable, would you like to be considered for a different dog?', 'alternate_dog_interest', 'Answer', ''], ['Do you currently have pets or have you previously had pets?', 'pet_history_exists', 'Answer', ''], ['Have all of your current and past pets been spayed/neutered?', 'spay_neuter_compliance', 'Answer', ''], ['Explain why your cat/dog is not spayed/neutered', 'spay_neuter_explanation', 'Answer', ''], ['Have all your current and past pets been kept up to date on vaccinations?', 'vaccine_compliance', 'Answer', ''], ['Explain why your cat(s)/dog(s) are not up to date on vaccinations', 'vaccine_explanation', 'Answer', ''], ['Have all your current and past pets gotten tested yearly for heartworm and take/did take preventative heartworm medication?', 'heartworm_compliance', 'Answer', ''], ['Explain why your dog(s) have not been tested for Heartworm annually, and on preventative.', 'heartworm_explanation', 'Answer', ''], ['Do you have Current Pets', 'current_pets_exists', 'Answer', ''], ['Name (#1):', 'current_pet_1_name', 'Answer', ''], ['Species:', 'current_pet_1_species', 'Answer', ''], ['Breed:', 'current_pet_1_breed', 'Answer', ''], ['Age of Pet:', 'current_pet_1_age', 'Answer', ''], ['How long have you had the pet?', 'current_pet_1_duration', 'Answer', ''], ['If you have any more pets please list and explain them below:', 'additional_current_pets', 'Answer', ''], ['Have you had pets in the past?', 'past_pets_exists', 'Answer', ''], ['Past Pet Name (#1):', 'past_pet_1_name', 'Answer', ''], ['Species/Breed:', 'past_pet_1_species_breed', 'Answer', ''], ['What happened to him/her', 'past_pet_1_outcome', 'Answer', ''], ['How long ago did this occur?', 'past_pet_1_outcome_age', 'Answer', ''], ['How many years was this dog part of your family?', 'past_pet_1_family_years', 'Answer', ''], ['Clinic Name', 'vet_1_name', 'Answer', ''], ['Phone Number:', 'vet_1_phone', 'Answer', ''], ['Secondary Vet Clinic Name', 'vet_2_name', 'Answer', ''], ['Secondary Vet Clinic Phone', 'vet_2_phone', 'Answer', ''], ['Do you have a Groomer', 'groomer_exists', 'Answer', ''], ['Groomer Name (Most Current):', 'groomer_1_name', 'Answer', ''], ['Groomer Name (Additional):', 'groomer_2_name', 'Answer', ''], ['Reference #1 (First and Last Names)', 'personal_reference_1_name', 'Answer', ''], ['How many years has this person known you?', 'personal_reference_1_years', 'Answer', ''], ['How does this person know you?', 'personal_reference_1_relationship', 'Answer', ''], ['Please initial below that you have read the above statement.', 'background_check_initials', 'Answer', ''], ['How much would you like to donate? (A minimum of $20)', 'application_donation_choice', 'Answer', '']]; }
function DOG_MAP_V12_(){ return [["What is the Dog's Name", 'dog_name', 'Dog', 'Name', ''], ['Is this Dog in Pet Point already', 'petpoint_exists', 'Answer', '', ''], ['Intake Date', 'intake_date', 'Dog', 'IntakeDate', ''], ['Foster Home', 'foster_home', 'Answer', '', ''], ['Where did this dog come from?  If an owner surrender or puppy mill release please list address and/or phone and/or email that you have', 'origin_detail', 'Answer', '', ''], ['Breed', 'dog_breed', 'Dog', 'Breed', ''], ['Age', 'dog_age', 'Answer', '', ''], ['Sex', 'dog_sex', 'Dog', 'Sex', ''], ['Microchip Number  please enter 0 if no chip', 'microchip_number', 'Dog', 'MicrochipNumber', ''], ['Current Rabies Vaccine', 'rabies_current', 'Answer', '', ''], ['Current Distemper Vaccine', 'distemper_current', 'Answer', '', ''], ['Current Bordetella Vaccine', 'bordetella_current', 'Answer', '', ''], ['Paperwork to forward to Rescue on your new dog (Owner Release, Vaccination Info, Notes, Pics, CVI)  You can add up to 10 files', 'dog_paperwork_upload', 'File', '', 'Intake Record']]; }
function REFERENCE_MAP_V12_(){ return [['NB Member calling References', 'checker_name'], ['NB Member Email Address', 'checker_email'], ['Date of Reference Calls', 'reference_date'], ['Applicant Name', 'applicant_name'], ['Applicant Email Address', 'applicant_email'], ['Did they Pass or Fail', 'overall_result'], ['Does The Applicant Rent?', 'rents'], ['Landlord Name', 'landlord_name'], ['Landlord Phone', 'landlord_phone'], ['Are they allowed to have a dog? (Any size or quantity limits?)', 'landlord_permission'], ['Do They Have A Vet?', 'has_vet'], ['Vet Clinic Name', 'vet_name'], ['Vet Phone Number', 'vet_phone'], ['How long has the applicant been a client?', 'vet_client_duration'], ['Do They Have A Groomer?', 'has_groomer'], ['Groomer Name', 'groomer_name'], ['Groomer Phone number', 'groomer_phone'], ['How long has the applicant been bringing pets to you for grooming?', 'groomer_duration'], ['How often does the applicant bring pets in for grooming', 'groomer_frequency'], ['How does the applicant treat animals? - Groomer', 'groomer_animal_treatment'], ['Other Comments - Groomer', 'groomer_comments'], ['Personal Non Family Reference Name', 'personal_1_name'], ['Non Family Reference Phone Number', 'personal_1_phone'], ['How long have you know the applicant? - Non Family Reference', 'personal_1_duration'], ['What pets does the Applicant have? - Non Family Reference', 'personal_1_pets'], ['How does the applicant treat animals? Can you give an example? - Non Family Reference', 'personal_1_animal_treatment'], ['Other Comments - Non Family Reference', 'personal_1_comments'], ['Personal Reference #2 (Family OR Non-Family) name', 'personal_2_name'], ['Personal Reference #2 Phone Number', 'personal_2_phone'], ['How long have you known the applicant - Personal Reference #2', 'personal_2_duration'], ['What pets does the applicant currently have? - Personal Reference #2', 'personal_2_pets'], ['How does the applicant treat animals? Can you give an example? Personal Reference #2', 'personal_2_animal_treatment'], ['Other Comments Personal Reference #2', 'personal_2_comments'], ['Reference Checker Comments on Applicant', 'checker_comments']]; }
