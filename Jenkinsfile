pipeline {
    agent any

    environment {
        DEPLOY_DIR = 'D:\\Smart-iron-admin'
        PM2_NAME   = 'smart-iron-admin'
    }

    stages {
        stage('Pull') {
            steps {
                bat "git -C \"%DEPLOY_DIR%\" pull origin main"
            }
        }

        stage('Install') {
            steps {
                bat """
                    cd /d "%DEPLOY_DIR%"
                    npm install --legacy-peer-deps --silent
                    cd backend
                    npm install --legacy-peer-deps --silent
                """
            }
        }

        stage('Build') {
            steps {
                bat "cd /d \"%DEPLOY_DIR%\" && npm run build"
            }
        }

        stage('Migrate') {
            steps {
                bat "node \"%DEPLOY_DIR%\\backend\\migrate.js\" || exit 0"
            }
        }

        stage('Restart Backend') {
            steps {
                bat """
                    pm2 describe %PM2_NAME% >nul 2>&1 && pm2 restart %PM2_NAME% || pm2 start "%DEPLOY_DIR%\\backend\\server.js" --name %PM2_NAME%
                    pm2 save
                """
            }
        }
    }

    post {
        success {
            echo 'Smart Iron Admin deployed successfully!'
        }
        failure {
            echo 'Deployment failed — check logs above.'
        }
    }
}
