pipeline {
    agent any

    environment {
        APP_DIR = '/var/www/smart-iron-admin'  // <-- change this to your server path
        BACKEND_PM2_NAME = 'smart-iron-admin'
    }

    stages {
        stage('Pull Latest Code') {
            steps {
                sh """
                    cd ${APP_DIR}
                    git pull origin main
                """
            }
        }

        stage('Install Dependencies') {
            steps {
                sh """
                    cd ${APP_DIR}
                    npm install --legacy-peer-deps
                    cd backend && npm install --legacy-peer-deps
                """
            }
        }

        stage('Build Frontend') {
            steps {
                sh """
                    cd ${APP_DIR}
                    npm run build
                """
            }
        }

        stage('Restart Backend') {
            steps {
                sh """
                    cd ${APP_DIR}/backend
                    pm2 describe ${BACKEND_PM2_NAME} > /dev/null 2>&1 \
                        && pm2 restart ${BACKEND_PM2_NAME} \
                        || pm2 start server.js --name ${BACKEND_PM2_NAME}
                    pm2 save
                """
            }
        }
    }

    post {
        success {
            echo 'Smart Iron admin app deployed successfully!'
        }
        failure {
            echo 'Deployment failed — check the logs above.'
        }
    }
}
