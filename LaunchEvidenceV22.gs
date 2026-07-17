/**
 * Returns launch checklist items with verification information.
 */
function getLaunchEvidenceV22() {
  const checklist = getSmartLaunchManagerV21();

  checklist.items = checklist.items.map(item => ({
    ...item,
    evidence: item.evidence || "",
    verifiedBy: item.verifiedBy || "",
    verifiedOn: item.verifiedOn || ""
  }));

  return checklist;
}

/**
 * Saves verification details for a launch checklist item.
 */
function saveLaunchEvidenceV22(itemId, evidence, verifiedBy) {

  const sheet = getLaunchChecklistSheet_(); // Existing helper

  const data = sheet.getDataRange().getValues();

  for (let r = 1; r < data.length; r++) {

    if (data[r][0] == itemId) {

      sheet.getRange(r + 1, 6).setValue(evidence);
      sheet.getRange(r + 1, 7).setValue(verifiedBy);
      sheet.getRange(r + 1, 8).setValue(new Date());

      return {
        success: true
      };
    }
  }

  return {
    success: false,
    message: "Checklist item not found."
  };
}
