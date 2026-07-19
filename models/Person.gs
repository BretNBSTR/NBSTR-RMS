/**
 * ============================================================
 * Person Business Object
 * NBSTR Rescue Management System v3
 * ============================================================
 *
 * A Person represents anyone who interacts with NBSTR.
 *
 * A single person may have multiple roles:
 *  - Applicant
 *  - Adopter
 *  - Volunteer
 *  - Foster
 *  - Donor
 *  - Veterinarian
 *  - Reference
 *  - Board Member
 *  - Transport Volunteer
 *
 * This object contains no spreadsheet logic.
 * It only defines the data and behavior of a Person.
 */

class Person {

  constructor(data = {}) {

    this.id = data.id || "";

    this.firstName = data.firstName || "";
    this.lastName = data.lastName || "";

    this.email = data.email || "";
    this.phone = data.phone || "";

    this.address = data.address || "";
    this.city = data.city || "";
    this.state = data.state || "";
    this.zip = data.zip || "";

    // Multiple roles allowed
    this.roles = data.roles || [];

    this.status = data.status || "Active";

    this.notes = data.notes || "";

    this.created = data.created || new Date();
    this.updated = data.updated || new Date();
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  hasRole(role) {
    return this.roles.includes(role);
  }

  addRole(role) {

    if (!this.hasRole(role)) {
      this.roles.push(role);
    }

    this.updated = new Date();
  }

  removeRole(role) {

    this.roles = this.roles.filter(r => r !== role);

    this.updated = new Date();
  }

}

// Export for CommonJS/Apps Script compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Person;
}
