/**
 * ============================================================
 * Person Repository
 * NBSTR Rescue Management System v3
 * ============================================================
 *
 * Responsible ONLY for reading and writing Person data.
 *
 * This implementation uses ScriptProperties to persist Person JSON.
 * It's a small, simple key/value store suitable for Apps Script.
 */

var PersonRepository = (function () {

  var PROP_PREFIX = 'person:';

  function _props() {
    return PropertiesService.getScriptProperties();
  }

  function _makeKey(id) {
    return PROP_PREFIX + id;
  }

  function _generateId() {
    // simple unique id: timestamp + random
    return Date.now().toString(36) + '-' + Math.floor(Math.random() * 1000000).toString(36);
  }

  function getById(personId) {
    if (!personId) return null;
    var json = _props().getProperty(_makeKey(personId));
    return json ? JSON.parse(json) : null;
  }

  function save(person) {
    if (!person || typeof person !== 'object') throw new Error('person must be an object');
    if (!person.id) person.id = _generateId();
    var key = _makeKey(person.id);
    _props().setProperty(key, JSON.stringify(person));
    return person;
  }

  function findByEmail(email) {
    if (!email) return null;
    var keys = _props().getKeys() || [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.indexOf(PROP_PREFIX) !== 0) continue;
      var json = _props().getProperty(k);
      try {
        var p = JSON.parse(json);
        if (p && typeof p.email === 'string' && p.email.toLowerCase() === email.toLowerCase()) return p;
      } catch (e) {
        // ignore malformed entries
      }
    }
    return null;
  }

  function del(personId) {
    if (!personId) return false;
    var key = _makeKey(personId);
    var existing = _props().getProperty(key);
    if (!existing) return false;
    _props().deleteProperty(key);
    return true;
  }

  return {
    getById: getById,
    save: save,
    findByEmail: findByEmail,
    delete: del
  };

})();
