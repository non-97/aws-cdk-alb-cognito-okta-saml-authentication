import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SamlAuthProperty } from "../../parameter/index";
import { HostedZoneConstruct } from "./hosted-zone-construct";
import { CertificateConstruct } from "./certificate-construct";

export interface SamlAuthConstructProps extends SamlAuthProperty {
  hostedZoneConstruct: HostedZoneConstruct;
  certificateConstruct: CertificateConstruct;
}

export class SamlAuthConstruct extends Construct {
  public readonly userPool: cdk.aws_cognito.IUserPool;
  public readonly userPoolDomain: cdk.aws_cognito.IUserPoolDomain;
  public readonly userPoolClient: cdk.aws_cognito.IUserPoolClient;

  constructor(scope: Construct, id: string, props: SamlAuthConstructProps) {
    super(scope, id);

    // User pool
    const userPool = new cdk.aws_cognito.UserPool(this, "Default", {
      selfSignUpEnabled: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.userPool = userPool;

    // Custom Domain
    const rootDomainRecord = new cdk.aws_route53.ARecord(
      this,
      "RootDomainRecord",
      {
        zone: props.hostedZoneConstruct.hostedZone,
        target: cdk.aws_route53.RecordTarget.fromIpAddresses("127.0.0.1"),
      }
    );

    const userPoolDomain = userPool.addDomain("CustomDomain", {
      customDomain: {
        domainName: `${props.domainName}.${props.hostedZoneConstruct.hostedZone.zoneName}`,
        certificate: props.certificateConstruct.certificate,
      },
    });
    this.userPoolDomain = userPoolDomain;
    userPoolDomain.node.defaultChild?.node.addDependency(rootDomainRecord);

    new cdk.aws_route53.ARecord(this, "CustomDomainRecord", {
      zone: props.hostedZoneConstruct.hostedZone,
      recordName: props.domainName,
      target: cdk.aws_route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.UserPoolDomainTarget(userPoolDomain)
      ),
    });

    if (!props.saml) {
      return;
    }

    // User Pool Identity Provider
    const userPoolProvider = new cdk.aws_cognito.UserPoolIdentityProviderSaml(
      this,
      "UserPoolProvider",
      {
        userPool,
        metadata: cdk.aws_cognito.UserPoolIdentityProviderSamlMetadata.url(
          props.saml.metadataURL
        ),
        encryptedResponses: true,
        requestSigningAlgorithm: cdk.aws_cognito.SigningAlgorithm.RSA_SHA256,
        attributeMapping: {
          email: cdk.aws_cognito.ProviderAttribute.AMAZON_EMAIL,
        },
      }
    );

    // User Pool Client
    const userPoolClient = userPool.addClient("UserPoolClient", {
      generateSecret: true,
      oAuth: {
        callbackUrls: props.saml.callbackUrls,
        logoutUrls: props.saml.logoutUrls,
        flows: {
          implicitCodeGrant: false,
          authorizationCodeGrant: true,
        },
        scopes: [
          cdk.aws_cognito.OAuthScope.OPENID,
          cdk.aws_cognito.OAuthScope.EMAIL,
          cdk.aws_cognito.OAuthScope.PROFILE,
        ],
      },
      authFlows: {
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.custom(
          userPoolProvider.providerName
        ),
      ],
    });
    this.userPoolClient = userPoolClient;
  }
}
