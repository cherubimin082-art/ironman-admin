pipeline {
    agent any

    environment {
        DEPLOY_DIR  = '/var/www/ironman-admin'
        PM2_NAME    = 'smart-iron-admin'
    }

    stages {
        stage('Pull') {
            steps {
                sh 'git -C ${DEPLOY_DIR} pull origin main'
            }
        }

        stage('Install') {
            steps {
                sh '''
                    cd ${DEPLOY_DIR}
                    npm install --legacy-peer-deps --silent
                    cd backend
                    npm install --legacy-peer-deps --silent
                '''
            }
        }

        stage('Build') {
            steps {
                sh 'cd ${DEPLOY_DIR} && npm run build'
            }
        }

        stage('Migrate') {
            steps {
                sh 'node ${DEPLOY_DIR}/backend/migrate.js || true'
            }
        }

        stage('Restart Backend') {
            steps {
                sh '''
                    pm2 describe ${PM2_NAME} > /dev/null 2>&1 \
                        && pm2 restart ${PM2_NAME} \
                        || pm2 start ${DEPLOY_DIR}/backend/server.js --name ${PM2_NAME}
                    pm2 save
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Smart Iron Admin app deployed successfully!'
        }
        failure {
            echo '❌ Deployment failed — check logs above.'
        }
    }
}
