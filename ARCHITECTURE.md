## Service Layer

The Service Layer provides the public API used by all RMS modules.

Rules:

- UI files never access spreadsheets directly.
- UI files call Services.
- Services call Repositories.
- Repositories handle storage.
- Models define shared objects.

Current Services

- LaunchChecklistService
