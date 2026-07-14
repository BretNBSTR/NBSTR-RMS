/**
 * NBSTR RMS v2.1 — Smart Launch Manager
 */

function getSmartLaunchManagerV21() {
  const readiness = getProductionReadiness();
  const items = readiness.items || [];

  const launchItems = items.map(function(item) {
    return {
      launchChecklistID: String(item.LaunchChecklistID || ''),
      itemName: String(item.ItemName || ''),
      category: String(item.Category || ''),
      critical: String(item.Critical).toLowerCase() === 'true',
      status: String(item.Status || 'Open'),
      notes: String(item.Notes || ''),
      completedByPersonID: String(item.CompletedByPersonID || ''),
      completedAt: item.CompletedAt
        ? String(item.CompletedAt)
        : ''
    };
  });

  const open = launchItems.filter(function(item) {
    return item.status !== 'Complete';
  });

  const criticalOpen = open.filter(function(item) {
    return item.critical;
  });

  return {
    total: launchItems.length,
    complete: launchItems.length - open.length,
    open: open.length,
    criticalOpen: criticalOpen.length,
    launchReady: criticalOpen.length === 0,
    items: launchItems
  };
}

function completeLaunchChecklistItemV21(launchChecklistID, notes) {
  const item = findRecord_(
    'LaunchChecklist',
    'LaunchChecklistID',
    launchChecklistID
  );

  if (!item) {
    throw new Error('Launch checklist item not found.');
  }

  updateRecord_(
    'LaunchChecklist',
    'LaunchChecklistID',
    launchChecklistID,
    {
      Status: 'Complete',
      Notes: String(notes || ''),
      CompletedByPersonID: currentPersonId_(),
      CompletedAt: new Date()
    }
  );

  return getSmartLaunchManagerV21();
}

function reopenLaunchChecklistItemV21(launchChecklistID) {
  const item = findRecord_(
    'LaunchChecklist',
    'LaunchChecklistID',
    launchChecklistID
  );

  if (!item) {
    throw new Error('Launch checklist item not found.');
  }

  updateRecord_(
    'LaunchChecklist',
    'LaunchChecklistID',
    launchChecklistID,
    {
      Status: 'Open',
      CompletedByPersonID: '',
      CompletedAt: ''
    }
  );

  return getSmartLaunchManagerV21();
}