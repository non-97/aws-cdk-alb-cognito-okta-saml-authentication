import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NetworkProperty } from "../../parameter/index";

export interface NetworkConstructProps extends NetworkProperty {}

export class NetworkConstruct extends Construct {
  readonly vpc: cdk.aws_ec2.IVpc;

  constructor(scope: Construct, id: string, props: NetworkConstructProps) {
    super(scope, id);

    // VPC
    this.vpc = new cdk.aws_ec2.Vpc(this, "Default", {
      ipAddresses: cdk.aws_ec2.IpAddresses.cidr(props.vpcCidr),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: props.natGateways,
      maxAzs: props.maxAzs,
      subnetConfiguration: props.subnetConfigurations,
    });
  }
}
