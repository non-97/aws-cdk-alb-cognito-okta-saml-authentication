import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AsgProperty } from "../../parameter/index";
import { NetworkConstruct } from "./network-construct";
import * as fs from "fs";
import * as path from "path";

export interface AsgConstructProps extends AsgProperty {
  networkConstruct: NetworkConstruct;
}

export class AsgConstruct extends Construct {
  readonly asg: cdk.aws_autoscaling.AutoScalingGroup;

  constructor(scope: Construct, id: string, props: AsgConstructProps) {
    super(scope, id);

    // User data
    const userData = cdk.aws_ec2.UserData.forLinux();
    userData.addCommands(
      fs.readFileSync(
        path.join(__dirname, "../ec2-settings/user-data/default.sh"),
        "utf8"
      )
    );

    // ASGs
    this.asg = new cdk.aws_autoscaling.AutoScalingGroup(this, "Default", {
      machineImage: props.machineImage,
      instanceType: props.instanceType,
      vpc: props.networkConstruct.vpc,
      vpcSubnets: props.networkConstruct.vpc.selectSubnets(
        props.subnetSelection
      ),
      maxCapacity: 1,
      minCapacity: 1,
      userData,
      ssmSessionPermissions: true,
      healthCheck: cdk.aws_autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(1),
      }),
    });
  }
}
