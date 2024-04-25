import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SamlAppProperty } from "../parameter/index";
import { HostedZoneConstruct } from "./construct/hosted-zone-construct";
import { CertificateConstruct } from "./construct/certificate-construct";
import { SamlAuthConstruct } from "./construct/saml-auth-construct";
import { NetworkConstruct } from "./construct/network-construct";
import { AsgConstruct } from "./construct/asg-construct";
import { AlbConstruct } from "./construct/alb-construct";

export interface SamlAppStackProps extends cdk.StackProps, SamlAppProperty {}

export class SamlAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SamlAppStackProps) {
    super(scope, id, props);

    // Public Hosted Zone
    const hostedZoneConstruct = new HostedZoneConstruct(
      this,
      "HostedZoneConstruct",
      {
        ...props.hostedZone,
      }
    );

    // ACM Certificate
    const certificateConstruct = new CertificateConstruct(
      this,
      "CertificateConstruct",
      {
        ...props.certificate,
        hostedZoneConstruct,
      }
    );

    // Cognito
    const samlAuthConstruct = new SamlAuthConstruct(this, "SamlAuthConstruct", {
      ...props.samlAuth,
      hostedZoneConstruct,
      certificateConstruct,
    });

    // VPC
    const networkConstruct = new NetworkConstruct(this, "NetworkConstruct", {
      ...props.network,
    });

    // ASG
    const asgConstruct = new AsgConstruct(this, "AsgConstruct", {
      ...props.asg,
      networkConstruct,
    });

    // ALB
    if (!samlAuthConstruct.userPoolClient) {
      return;
    }
    new AlbConstruct(this, "AlbConstruct", {
      ...props.alb,
      networkConstruct,
      hostedZoneConstruct,
      certificateConstruct,
      samlAuthConstruct,
      asgConstruct,
    });
  }
}
