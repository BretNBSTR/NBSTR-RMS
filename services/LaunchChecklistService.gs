/**
 * LaunchChecklistService
 * Central service for reading and updating launch checklist items.
 *
 * Version: 2.2.0
 */

const LaunchChecklistService = (() => {

  function getChecklist() {
    return getSmartLaunchManagerV21();
  }

  function getItem(itemId) {
    const checklist = getChecklist();

    return checklist.items.find(item => item.id === itemId) || null;
  }

  function saveEvidence(itemId, evidence, verifiedBy) {
    // Placeholder for the repository implementation.
    // For now this delegates to the existing backend.
    return saveLaunchEvidenceV22(itemId, evidence, verifiedBy);
  }

  return {
    getChecklist,
    getItem,
    saveEvidence
  };

})();