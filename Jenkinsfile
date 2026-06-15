pipeline {
    agent any

    environment {
        SERVER        = 'ubuntu@18.140.21.202'
        SSH_KEY       = 'C:\\Jenkins\\keys\\ironman-server.pem'
        DEPLOY_SCRIPT = '/home/ubuntu/deploy-admin.sh'
    }

    stages {
        stage('Deploy to Server') {
            steps {
                bat "ssh -i \"%SSH_KEY%\" -o StrictHostKeyChecking=no %SERVER% \"bash %DEPLOY_SCRIPT% 2>&1\""
            }
        }
    }

    post {
        success {
            echo 'Smart Iron Admin deployed to admin.ironman.today!'
        }
        failure {
            echo 'Deployment failed — check logs above.'
        }
    }
}
