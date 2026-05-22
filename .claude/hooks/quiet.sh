#!/usr/bin/env bash
# Run a command and forward its output only on non-zero exit.
# Keeps successful hook runs out of the Claude conversation context.
#
# Usage:
#   quiet.sh some-command --flag arg
#   quiet.sh sh -c 'cmd1 && cmd2'
out=$("$@" 2>&1)
rc=$?
[ $rc -ne 0 ] && printf '%s\n' "$out"
exit $rc
