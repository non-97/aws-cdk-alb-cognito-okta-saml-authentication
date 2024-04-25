import * as cdk from "aws-cdk-lib";

export interface NetworkProperty {
  vpcCidr: string;
  subnetConfigurations: cdk.aws_ec2.SubnetConfiguration[];
  maxAzs: number;
  natGateways: number;
}

export interface HostZoneProperty {
  zoneName: string;
}

export interface CertificateProperty {
  certificateDomainName: string;
}

export interface SamlAuthProperty {
  domainName: string;
  saml?: {
    metadataURL: string;
    callbackUrls: string[];
    logoutUrls?: string[];
  };
}

export interface AsgProperty {
  machineImage: cdk.aws_ec2.IMachineImage;
  instanceType: cdk.aws_ec2.InstanceType;
  subnetSelection: cdk.aws_ec2.SubnetSelection;
}

export interface AlbProperty {
  internetFacing: boolean;
  allowIpAddresses: string[];
  subnetSelection: cdk.aws_ec2.SubnetSelection;
  recordName: string;
}

export interface SamlAppProperty {
  network: NetworkProperty;
  hostedZone: HostZoneProperty;
  certificate: CertificateProperty;
  samlAuth: SamlAuthProperty;

  asg: AsgProperty;
  alb: AlbProperty;
}

export interface SamlAppStackProperty {
  env?: cdk.Environment;
  props: SamlAppProperty;
}

export const samlAppStackProperty: SamlAppStackProperty = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  props: {
    hostedZone: {
      zoneName: "saml-app.non-97.net",
    },
    certificate: {
      certificateDomainName: "*.saml-app.non-97.net",
    },
    samlAuth: {
      domainName: "auth",
    },
    network: {
      vpcCidr: "10.10.0.0/20",
      subnetConfigurations: [
        {
          name: "public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
          cidrMask: 27,
        },
      ],
      maxAzs: 2,
      natGateways: 0,
    },
    asg: {
      machineImage: cdk.aws_ec2.MachineImage.latestAmazonLinux2023({
        cachedInContext: true,
      }),
      instanceType: new cdk.aws_ec2.InstanceType("t3.micro"),
      subnetSelection: {
        subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
      },
    },
    alb: {
      internetFacing: true,
      allowIpAddresses: ["0.0.0.0/0"],
      subnetSelection: {
        subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
      },
      recordName: "www",
    },
  },
};
