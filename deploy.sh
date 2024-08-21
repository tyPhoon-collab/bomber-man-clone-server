#!/bin/bash

print_green() {
    tput setaf 2  # 緑色
    echo "$1"
    tput sgr0     # 色をリセット
}

print_yellow() {
    tput setaf 3  # 黄色
    echo "$1"
    tput sgr0     # 色をリセット
}

print_red() {
    tput setaf 1  # 赤色
    echo "$1"
    tput sgr0     # 色をリセット
}

# デフォルト値
PROJECT_ID="go-deploy-test-431817"
SERVICE_NAME="bomber-man"
REGION="asia-northeast1"
SOURCE_DIR="."

# メッセージの出力
print_yellow "Deploying Cloud Run service with the following settings:"
echo "Project ID: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"
echo "Source Directory: $SOURCE_DIR"
echo

# 確認を求める
read -p "$(tput setaf 3)Continue with deployment? (y/n): $(tput sgr0)" confirm
if [[ $confirm != "y" ]]; then
    print_red "Deployment canceled."
    exit 1
fi

print_yellow "Setting up project and region..."

# gcloudコマンドを実行
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

print_yellow "Deploying Cloud Run service..."
gcloud run deploy $SERVICE_NAME --source $SOURCE_DIR --region $REGION --platform managed --allow-unauthenticated

print_green "Deployment complete!"