# NBSTR Rescue Management System
## Technical Design

Version: 2.2.0
Status: Draft

---

# Purpose

The NBSTR Rescue Management System (RMS) is the central operational platform for
New Beginnings Shih Tzu & Friends Rescue.

The goals are to:

- Replace manual spreadsheets
- Standardize workflows
- Improve volunteer efficiency
- Reduce duplicate data entry
- Maintain complete audit history
- Support future growth

---

# Architecture

Presentation Layer
    HTML Screens
    HTML Clients

↓

Service Layer
    Business Logic
    Validation
    Workflow

↓

Repository Layer
    Data Access

↓

Storage Layer
    Google Sheets
    Google Drive
    Google Forms
    PetPoint
    Future APIs

---

# Design Principles

1. UI never talks directly to spreadsheets.
2. Business rules belong in Services.
3. Storage logic belongs in Repositories.
4. Shared data structures belong in Models.
5. Every feature must be testable.
6. Git is the source of truth.
7. Releases are versioned with Git tags.

---

# Modules

- Dashboard
- Dogs
- Applicants
- Volunteers
- Foster Homes
- Medical
- Finance
- Documents
- Communications
- Reports
- Launch Manager
- Developer Tools

---

# Development Workflow

Feature Branch
↓

Develop

↓

Testing

↓

Release Tag

↓

Main

---

This document evolves with the system.
