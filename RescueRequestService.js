function createRescueRequest(data) {
  ensureV10Tables_();

  const requestId = Utilities.getUuid();

  pushRecord_('RescueRequest', {
    ID: requestId,
    SourceType: data.SourceType || '',
    CurrentDogName: data.CurrentDogName || '',
    Breed: data.Breed || '',
    Sex: data.Sex || '',
    EstimatedAge: data.EstimatedAge || '',
    Weight: data.Weight || '',
    CurrentCity: data.CurrentCity || '',
    CurrentState: data.CurrentState || '',
    BehaviorIssues: data.BehaviorIssues || '',
    MedicalConcerns: data.MedicalConcerns || '',
    ReasonForRescue: data.ReasonForRescue || '',
    Urgency: data.Urgency || 'Routine',
    Status: 'Received',
    CreatedAt: new Date()
  });

  return requestId;
}