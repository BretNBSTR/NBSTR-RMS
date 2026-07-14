/**
 * NBSTR RMS v2.1 — Developer Diagnostics Center
 * Read-only diagnostics engine.
 */

function getDeveloperDiagnosticsV21() {
  const startedAt = new Date();

  const identity = diagnosticIdentityV21_();
  const roles = diagnosticRolesV21_();
  const pilot = diagnosticPilotV21_();
  const launch = diagnosticLaunchV21_();
  const system = diagnosticSystemV21_();

  const sections = [
    identity,
    roles,
    pilot,
    launch,
    system
  ];

  const errors = sections.filter(x => x.status === 'Error').length;
  const warnings = sections.filter(x => x.status === 'Warning').length;
  const healthy = sections.filter(x => x.status === 'Healthy').length;

  const score = sections.length
    ? Math.round((healthy / sections.length) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    durationMs: new Date().getTime() - startedAt.getTime(),
    score: score,
    errors: errors,
    warnings: warnings,
    healthy: healthy,
    sections: sections
  };
}

function diagnosticIdentityV21_() {
  const email = String(
    Session.getActiveUser().getEmail() || ''
  ).toLowerCase();

  if (!email) {
    return diagnosticResultV21_(
      'Identity',
      'Error',
      'Current Google account email could not be resolved.',
      []
    );
  }

  const people = getRecords_('People');
  const matches = people.filter(
    p => String(p.Email || '').toLowerCase() === email
  );

  if (!matches.length) {
    return diagnosticResultV21_(
      'Identity',
      'Error',
      'No People record exists for ' + email + '.',
      [
        {
          type: 'MissingPerson',
          detail: email
        }
      ]
    );
  }

  if (matches.length > 1) {
    return diagnosticResultV21_(
      'Identity',
      'Warning',
      matches.length + ' People records use ' + email + '.',
      [
        {
          type: 'DuplicatePersonEmail',
          detail: email
        }
      ]
    );
  }

  const person = matches[0];

  return diagnosticResultV21_(
    'Identity',
    'Healthy',
    String(person.FirstName || '') +
      ' ' +
      String(person.LastName || '') +
      ' · ' +
      email,
    []
  );
}

function diagnosticRolesV21_() {
  const assignments = getRecords_('UserRoleAssignments').filter(
    r => String(r.Active).toLowerCase() !== 'false'
  );

  const admins = assignments.filter(
    r => String(r.RoleName) === 'RMS Administrator'
  );

  if (!assignments.length) {
    return diagnosticResultV21_(
      'Roles',
      'Error',
      'No active role assignments exist.',
      []
    );
  }

  if (!admins.length) {
    return diagnosticResultV21_(
      'Roles',
      'Error',
      'No RMS Administrator is assigned.',
      []
    );
  }

  return diagnosticResultV21_(
    'Roles',
    'Healthy',
    assignments.length +
      ' active assignment(s) · ' +
      admins.length +
      ' RMS Administrator(s)',
    []
  );
}

function diagnosticPilotV21_() {
  try {
    const pilot = getPilotSummary();

    if (pilot.fail || pilot.blocked || pilot.notTested) {
      return diagnosticResultV21_(
        'Controlled Pilot',
        'Warning',
        pilot.pass +
          '/' +
          pilot.total +
          ' passed · ' +
          pilot.fail +
          ' failed · ' +
          (pilot.blocked + pilot.notTested) +
          ' remaining',
        []
      );
    }

    return diagnosticResultV21_(
      'Controlled Pilot',
      'Healthy',
      pilot.pass + '/' + pilot.total + ' tests passed.',
      []
    );
  } catch (err) {
    return diagnosticResultV21_(
      'Controlled Pilot',
      'Error',
      String(err.message || err),
      []
    );
  }
}

function diagnosticLaunchV21_() {
  try {
    const readiness = getProductionReadiness();

    if (readiness.criticalOpen) {
      return diagnosticResultV21_(
        'Launch Readiness',
        'Warning',
        readiness.criticalOpen +
          ' critical launch checklist item(s) remain open.',
        readiness.items
          .filter(
            x =>
              String(x.Status) !== 'Complete' &&
              String(x.Critical).toLowerCase() === 'true'
          )
          .map(x => ({
            type: 'LaunchBlocker',
            detail: String(x.ItemName || '')
          }))
      );
    }

    return diagnosticResultV21_(
      'Launch Readiness',
      'Healthy',
      'No critical launch checklist items remain open.',
      []
    );
  } catch (err) {
    return diagnosticResultV21_(
      'Launch Readiness',
      'Error',
      String(err.message || err),
      []
    );
  }
}

function diagnosticSystemV21_() {
  const issues = [];

  const timezone = Session.getScriptTimeZone();

  if (!/Chicago|Central/i.test(timezone)) {
    issues.push({
      type: 'Timezone',
      detail: 'Project timezone is ' + timezone
    });
  }

  const secret = PropertiesService
    .getScriptProperties()
    .getProperty('NBSTR_CONNECTOR_SECRET');

  if (!secret) {
    issues.push({
      type: 'ConnectorSecret',
      detail: 'NBSTR_CONNECTOR_SECRET is missing.'
    });
  }

  if (issues.length) {
    return diagnosticResultV21_(
      'System',
      'Warning',
      issues.length + ' system configuration issue(s) found.',
      issues
    );
  }

  return diagnosticResultV21_(
    'System',
    'Healthy',
    'Timezone and connector configuration verified.',
    []
  );
}

function diagnosticResultV21_(name, status, summary, issues) {
  return {
    name: name,
    status: status,
    summary: summary,
    issues: issues || []
  };
}
