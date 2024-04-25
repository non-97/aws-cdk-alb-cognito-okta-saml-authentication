#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SamlAppStack } from "../lib/saml-app-stack";
import { samlAppStackProperty } from "../parameter/index";

const app = new cdk.App();
new SamlAppStack(app, "SamlAppStack", {
  env: samlAppStackProperty.env,
  ...samlAppStackProperty.props,
});
