import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { StageConfig } from '../config';

export class PlayerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, stageConfig: StageConfig, props?: cdk.StackProps) {
        super(scope, id, props);

        // DynamoDB table
        const playerTable = new dynamodb.Table(this, 'PlayerTable', {
            tableName: 'Player',
            partitionKey: { name: 'rsn', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        // Lambda functions
        const getPlayerFunction = new lambda.Function(this, 'GetPlayerFunction', {
            runtime: lambda.Runtime.JAVA_21,
            handler: 'com.osrs.xpgoals.lambda.GetPlayerHandler::handleRequest',
            code: lambda.Code.fromAsset('../service/target/xpgoals-service-1.0-SNAPSHOT.jar'),
            memorySize: 512,
            timeout: cdk.Duration.seconds(30),
            environment: {
                STAGE: stageConfig.stage
            }
        });

        const setPlayerFunction = new lambda.Function(this, 'SetPlayerFunction', {
            runtime: lambda.Runtime.JAVA_21,
            handler: 'com.osrs.xpgoals.lambda.SetPlayerHandler::handleRequest',
            code: lambda.Code.fromAsset('../service/target/xpgoals-service-1.0-SNAPSHOT.jar'),
            memorySize: 512,
            timeout: cdk.Duration.seconds(30),
            environment: {
                STAGE: stageConfig.stage
            }
        });

        // Grant DynamoDB permissions
        playerTable.grantReadData(getPlayerFunction);
        playerTable.grantWriteData(setPlayerFunction);

        // API Gateway
        const api = new apigateway.RestApi(this, 'PlayerApi', {
            restApiName: `player-api-${stageConfig.stage}`,
            deployOptions: {
                stageName: stageConfig.stage
            }
        });

        const players = api.root.addResource('players');
        const player = players.addResource('{rsn}');

        // GET /players/{rsn}
        player.addMethod('GET', new apigateway.LambdaIntegration(getPlayerFunction));

        // POST /players/{rsn}
        player.addMethod('POST', new apigateway.LambdaIntegration(setPlayerFunction));

        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL'
        });
    }
} 