import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AlbProperty } from "../../parameter/index";
import { NetworkConstruct } from "./network-construct";
import { HostedZoneConstruct } from "./hosted-zone-construct";
import { CertificateConstruct } from "./certificate-construct";
import { SamlAuthConstruct } from "./saml-auth-construct";
import { AsgConstruct } from "./asg-construct";

export interface AlbConstructProps extends AlbProperty {
  networkConstruct: NetworkConstruct;
  hostedZoneConstruct: HostedZoneConstruct;
  certificateConstruct: CertificateConstruct;
  samlAuthConstruct: SamlAuthConstruct;
  asgConstruct: AsgConstruct;
}

export class AlbConstruct extends Construct {
  readonly alb: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer;
  readonly targetGroup: cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    // ALB
    this.alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(
      this,
      "Default",
      {
        vpc: props.networkConstruct.vpc,
        internetFacing: props.internetFacing,
        vpcSubnets: props.networkConstruct.vpc.selectSubnets(
          props.subnetSelection
        ),
      }
    );

    // Target Group
    this.targetGroup =
      new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(
        this,
        "TargetGroup",
        {
          vpc: props.networkConstruct.vpc,
          protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
          protocolVersion:
            cdk.aws_elasticloadbalancingv2.ApplicationProtocolVersion.HTTP1,
          port: 80,
          targetType: cdk.aws_elasticloadbalancingv2.TargetType.INSTANCE,
          healthCheck: {
            path: "/",
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
            healthyThresholdCount: 5,
          },
          deregistrationDelay: cdk.Duration.minutes(1),
          targets: [props.asgConstruct.asg],
        }
      );

    // Listener
    const listener = this.alb.addListener("ListenerHttps", {
      port: 443,
      certificates: [props.certificateConstruct.certificate],
      protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS,
      sslPolicy: cdk.aws_elasticloadbalancingv2.SslPolicy.RECOMMENDED_TLS,
      defaultAction:
        new cdk.aws_elasticloadbalancingv2_actions.AuthenticateCognitoAction({
          userPool: props.samlAuthConstruct.userPool,
          userPoolClient: props.samlAuthConstruct.userPoolClient,
          userPoolDomain: props.samlAuthConstruct.userPoolDomain,
          next: cdk.aws_elasticloadbalancingv2.ListenerAction.forward([
            this.targetGroup,
          ]),
        }),
    });

    props.asgConstruct.asg.connections.allowFrom(
      this.alb,
      cdk.aws_ec2.Port.tcp(80)
    );

    // Alias
    new cdk.aws_route53.ARecord(this, "AliasRecord", {
      zone: props.hostedZoneConstruct.hostedZone,
      recordName: props.recordName,
      target: cdk.aws_route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.LoadBalancerTarget(this.alb)
      ),
    });
  }
}
