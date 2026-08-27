#!/bin/bash
set -e

# Required environment variables:
#   ACTIONS_RUNNER_REPO_URL  — e.g. https://github.com/KennethEgholm/reloading
#   ACTIONS_RUNNER_TOKEN     — short-lived registration token from GitHub
#   RUNNER_NAME              — (optional) defaults to "reloading-runner"

# The host's docker group GID may differ from anything baked into the image.
# Detect it at runtime and ensure the runner user is in a matching group.
if [ -S /var/run/docker.sock ]; then
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
    if getent group docker > /dev/null 2>&1; then
        groupmod -g "$DOCKER_GID" docker
    else
        groupadd -g "$DOCKER_GID" docker
    fi
    usermod -aG docker runner
fi

RUNNER_NAME="${RUNNER_NAME:-reloading-runner}"

cd /home/runner/actions-runner

# Only register if this container hasn't been configured yet. Registration
# tokens expire after ~1 hour, so re-registering on every restart would break
# recovery after a host reboot. The .runner file persists across container
# restarts (but not across `docker rm`), making it the right idempotency marker.
if [ -f .runner ]; then
  echo "Runner already configured (.runner present), skipping registration."
else
  if [ -z "${ACTIONS_RUNNER_TOKEN}" ]; then
    echo "ERROR: .runner not found and ACTIONS_RUNNER_TOKEN is empty — cannot register." >&2
    exit 1
  fi
  gosu runner ./config.sh \
    --url "${ACTIONS_RUNNER_REPO_URL}" \
    --token "${ACTIONS_RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "self-hosted,reloading" \
    --unattended \
    --replace
fi

unset ACTIONS_RUNNER_TOKEN

exec gosu runner ./run.sh
