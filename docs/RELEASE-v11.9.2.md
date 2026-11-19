Fixes a Windows startup error in v11.9.1. RepoPulse loads its notification identity from a packaged runtime module so startup does not depend on installer-only metadata. The Windows CI job now launches the packaged executable and verifies that its main window opens before uploading release files.

Windows x64 EXE, macOS Apple Silicon DMG and ZIP, and Linux x64 RPM, DEB and AppImage are included. Packages are unsigned.
