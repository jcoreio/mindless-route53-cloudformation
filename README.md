# mindless-route53-cloudformation

[![CircleCI](https://circleci.com/gh/jcoreio/mindless-route53-cloudformation.svg?style=svg)](https://circleci.com/gh/jcoreio/mindless-route53-cloudformation)
[![Coverage Status](https://codecov.io/gh/jcoreio/mindless-route53-cloudformation/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/mindless-route53-cloudformation)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/mindless-route53-cloudformation.svg)](https://badge.fury.io/js/mindless-route53-cloudformation)

Intelligently create DNS records an EC2 Instance or load balancer output from a CloudFormation stack.
Using this command makes it easier to deal with a stack getting hosed than creating the DNS records with CloudFormation -- when something goes really wrong you can just create a new stack, and update the DNS records to point to it with this command.

<!-- toc -->

- [Node.js API](#nodejs-api)
  - [`upsertRecordSetsForStack(options)`](#upsertrecordsetsforstackoptions)
  - [`genRecordSetsForStack(options)`](#genrecordsetsforstackoptions)
- [CLI](#cli)
  - [`cfroute53 upsert`](#cfroute53-upsert)

<!-- tocstop -->

# Node.js API

## `upsertRecordSetsForStack(options)`

Upserts DNS records to Route 53 for either an
EC2 Instance output by a CloudFormation stack, or a load balancer output by it.
If there are multiple EC2 Instances and/or load balancers output by the stack,
an error will be thrown.

### `options`

#### `awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The general configuration options for AWS services, like `credentials` and `region`

#### `StackName` (`string`, _required_)

The name of the stack to generate DNS entries for.

#### `DNSName` (`string`, _required_)

The desired domain name for the DNS entries.

#### `TTL` (`number`, _optional_)

The time-to-live for the DNS entries (not required for load balancers)

#### `region` (`string`, _optional_)

The AWS region to use (unless you are passing instances of the API clients you'll have to pass the `region`)

#### `CloudFormation` (`AWS.CloudFormation`, _optional_)

An CloudFormation API client configured how you want.

#### `EC2` (`AWS.EC2`, _optional_)

An EC2 API client configured how you want.

#### `ELBv2` (`AWS.ELBv2`, _optional_)

An ELBv2 API client configured how you want.

#### `Route53` (`AWS.Route53`, _optional_)

An Route53 API client configured how you want.

#### `log` (`Function`, _optional_, default: `console.error`)

A logging function

#### `verbose` (`boolean`, _optional_, default: `false`)

Enables verbose `log` output

#### Returns

A `Promise` that will resolve once the upsert is complete.

## `genRecordSetsForStack(options)`

Generates the `ResourceRecordSets` to upsert to Route 53 for either an
EC2 Instance output by a CloudFormation stack, or a load balancer output by it.
If there are multiple EC2 Instances and/or load balancers output by the stack,
an error will be thrown.

### `options`

#### `awsConfig` (`AWS.ConfigurationOptions`, _optional_)

The general configuration options for AWS services, like `credentials` and `region`

#### `StackName` (`string`, _required_)

The name of the stack to generate DNS entries for.

#### `DNSName` (`string`, _required_)

The desired domain name for the DNS entries.

#### `TTL` (`number`, _optional_)

The time-to-live for the DNS entries (not required for load balancers)

#### `region` (`string`, _optional_)

The AWS region to use (unless you are passing instances of the API clients you'll have to pass the `region`)

#### `CloudFormation` (`AWS.CloudFormation`, _optional_)

An CloudFormation API client configured how you want.

#### `EC2` (`AWS.EC2`, _optional_)

An EC2 API client configured how you want.

#### `ELBv2` (`AWS.ELBv2`, _optional_)

An ELBv2 API client configured how you want.

#### `log` (`Function`, _optional_, default: `console.error`)

A logging function

#### `verbose` (`boolean`, _optional_, default: `false`)

Enables verbose `log` output

### Returns

A `Promise` to be resolved with an array of the following:

```
{
  ResourceRecordSet: {
    Name: string,
    Type: 'A',
    ResourceRecords?: Array<{Value: string}>,
    TTL?: number,
    AliasTarget?: {
      DNSName: string,
      EvaluateTargetHealth: boolean,
      HostedZoneId: string,
    },
  },
  PrivateZone?: ?boolean,
  OutputKey?: ?string,
  InstanceId?: ?string,
  LoadBalancerArn?: ?string,
}
```

# CLI

## `cfroute53 upsert`

Intelligently upserts Route 53 entries for an EC2 Instance or load balancer output from a CloudFormation stack.

First it will fetch information from AWS, then display the records it plans to upsert and ask you to confirm whether to upsert them.

If there are multiple EC2 Instances and/or load balancers output by the stack, the command will error out. (In the future, it may ask you to select which you would like to upsert Route 53 entries for.)

### Usage

```
cfroute53 upsert <stack name> <domain name> --region <AWS region> [--ttl <time to live>]
```

### Options

```
--version      Show version number                                   [boolean]
--help         Show help                                             [boolean]
--ttl          the time-to-live for the record                        [number]
-c, --comment  a comment for the change                               [string]
--region       the AWS region                                         [string]
-q, --quiet    suppress output                                       [boolean]
-v, --verbose  enable verbose output                                 [boolean]
-y, --yes      don't ask for confirmation                            [boolean]
```
