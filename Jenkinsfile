pipeline {
    agent any

    stages {
        stage('Install') {
            steps {
                sh 'npm install --legacy-peer-deps --silent'
                sh 'cd backend && npm install --legacy-peer-deps --silent'
            }
        }
        stage('Build') {
            steps {
                sh 'npm run build --silent'
            }
        }
        stage('Deploy') {
            steps {
                sh '''
                    mkdir -p /var/www/ironman-admin
                    cp -r dist /var/www/ironman-admin/
                    cp -r backend /var/www/ironman-admin/
                    cp -r backend/* /home/ubuntu/ironman-admin/backend/
                    pm2 restart admin-api || pm2 start /home/ubuntu/ironman-admin/backend/server.js --name admin-api
                '''
            }
        }
    }

    post {
        success { echo 'Admin deployed to devadmin.ironman.today!' }
        failure { echo 'Deployment failed — check logs above.' }
    }
}
