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
                    cp -f .env.production /var/www/ironman-admin/backend/.env 2>/dev/null || true
                    pm2 restart smart-iron-admin || pm2 start /var/www/ironman-admin/backend/server.js --name smart-iron-admin
                '''
            }
        }
    }

    post {
        success { echo 'Admin deployed to admin.ironman.today!' }
        failure { echo 'Deployment failed — check logs above.' }
    }
}
