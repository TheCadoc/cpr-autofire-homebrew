#!/usr/bin/env bash
# Builds module.zip with only the files Foundry needs, then fails if any pack source slipped in. CI and the release workflow both run it.
set -euo pipefail

zip -r module.zip module.json LICENSE README.md scripts styles templates lang packs -x "packs/_source" "packs/_source/*"
# Plain grep reads all of unzip's output, so there is no SIGPIPE; `|| true` keeps "no match" from failing under pipefail.
test -z "$(unzip -Z1 module.zip | { grep 'packs/_source' || true; })"
unzip -l module.zip
