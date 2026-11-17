# Tablescape iOS shell

The open-source iOS wrapper for Tablescape. The app itself is a web app; this repo only builds the store shell.

The shell is a small [Capacitor](https://capacitorjs.com) app that opens https://app.tablescape.vip and adds a few native pieces: share,
files, haptics, native sign-in and an offline screen. The `ios/` project, `native/` and `scripts/` are everything the
iPhone build needs.

Builds run in GitHub Actions (**Actions > iOS > Run workflow**): an unsigned simulator build by default, or a signed upload to
TestFlight when "upload" is ticked. The workflow only runs when started by a maintainer.

This repo is a copy: changes are made upstream and synced here, so pull requests are not merged.

MIT licensed (see LICENSE). The Tablescape name, icon and artwork are not covered by the license.
