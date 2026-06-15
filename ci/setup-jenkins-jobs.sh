#!/bin/bash
# ============================================================
# Smart Iron — Jenkins Pipeline Jobs Auto-Setup
# Run AFTER Jenkins is configured in browser:
#   bash ci/setup-jenkins-jobs.sh <jenkins-admin-password>
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

JENKINS_URL="http://localhost:8080"
JENKINS_USER="admin"
JENKINS_PASS="${1:?Usage: bash setup-jenkins-jobs.sh <jenkins-password>}"

echo -e "${YELLOW}Downloading Jenkins CLI...${NC}"
curl -fsSL "$JENKINS_URL/jnlpJars/jenkins-cli.jar" -o /tmp/jenkins-cli.jar

run_cli() {
    java -jar /tmp/jenkins-cli.jar \
        -s "$JENKINS_URL" \
        -auth "$JENKINS_USER:$JENKINS_PASS" \
        "$@"
}

# ── Install required plugins ──────────────────────────────
echo -e "${YELLOW}Installing plugins...${NC}"
run_cli install-plugin \
    workflow-aggregator \
    git \
    github \
    pipeline-github-lib \
    cloudbees-folder \
    -restart 2>/dev/null || true

echo "Waiting for Jenkins to restart after plugin install..."
sleep 30
until curl -fsSL "$JENKINS_URL/login" > /dev/null 2>&1; do
    sleep 5
    echo "  Still waiting..."
done

# ── Create customer pipeline job ──────────────────────────
echo -e "${YELLOW}Creating smart-iron-customer pipeline...${NC}"
cat <<'JOBXML' | run_cli create-job smart-iron-customer 2>/dev/null \
    || cat <<'JOBXML' | run_cli update-job smart-iron-customer
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Smart Iron Customer App - Auto Deploy</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger plugin="github">
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/cherubimin082-art/ironman-customer.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
</flow-definition>
JOBXML

# ── Create admin pipeline job ─────────────────────────────
echo -e "${YELLOW}Creating smart-iron-admin pipeline...${NC}"
cat <<'JOBXML' | run_cli create-job smart-iron-admin 2>/dev/null \
    || cat <<'JOBXML' | run_cli update-job smart-iron-admin
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>Smart Iron Admin App - Auto Deploy</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <com.cloudbees.jenkins.GitHubPushTrigger plugin="github">
          <spec></spec>
        </com.cloudbees.jenkins.GitHubPushTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/cherubimin082-art/ironman-admin.git</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
</flow-definition>
JOBXML

# ── Print webhook instructions ────────────────────────────
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Jenkins Pipelines Created!                     ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Jobs:                                               ║"
echo "║  • smart-iron-customer                               ║"
echo "║  • smart-iron-admin                                  ║"
echo "║                                                      ║"
echo "║  Add GitHub Webhooks (do this once on GitHub):       ║"
echo "║                                                      ║"
echo "║  Customer repo → Settings → Webhooks → Add:         ║"
echo "║  URL: http://$SERVER_IP:8080/github-webhook/        ║"
echo "║  Content-type: application/json                      ║"
echo "║  Event: Just the push event                          ║"
echo "║                                                      ║"
echo "║  Admin repo → same webhook URL                       ║"
echo "║                                                      ║"
echo "║  After webhooks added — git push pannaa              ║"
echo "║  auto build + deploy aagum!                          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
