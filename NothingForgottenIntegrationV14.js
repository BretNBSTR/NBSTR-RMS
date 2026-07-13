/**
 * Add this helper to the existing Nothing Forgotten aggregation.
 */
function getNothingForgottenV14() {
  let alerts=[];
  try { alerts=alerts.concat(getNothingForgottenConnectorAlertsV14()); } catch(err) {}
  try {
    getNothingForgottenDogs().forEach(d=>alerts.push({
      type:'Dog',priority:d.missing.length?'High':'Normal',
      title:d.name+' needs attention',detail:d.missing.map(x=>x.label).join(', ')||'Journey stage incomplete',
      recordID:d.dogID
    }));
  } catch(err) {}
  return alerts;
}
