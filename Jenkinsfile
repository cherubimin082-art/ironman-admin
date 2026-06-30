pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                sh 'bash /home/ubuntu/deploy-admin.sh 2>&1'
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
