/* @flow */

import chalk from 'chalk'
import AWS from 'aws-sdk'
import {
  type ResourceRecordSet,
  type StackOutput,
  DescribeInstancesResponseType,
  type DescribeInstancesResponse,
  DescribeStacksResponseType,
  DescribeLoadBalancersResponseType,
} from './AWSTypes'
import isDomainName from 'is-domain-name'

import { upsertRecordSet } from 'mindless-route53'

const isECSInstanceId = (s: string) => /^i-[a-z0-9]{17,}$/.test(s)
const loadBalancerArnRx = /^arn:aws:elasticloadbalancing:([^:]+):(\d+):loadbalancer\/.+/
const isLoadBalancerArn = (s: string) => loadBalancerArnRx.test(s)

function isEmpty(collection: Object): boolean {
  for (let key in collection) {
    if (collection.hasOwnProperty(key)) {
      return false
    }
  }
  return true
}

export type GeneratedResourceRecordSet = {
  ResourceRecordSet: ResourceRecordSet,
  PrivateZone?: ?boolean,
  OutputKey?: ?string,
  InstanceId?: ?string,
  LoadBalancerArn?: ?string,
}

export async function genRecordSetsForECSInstance(options: {
  InstanceId: string,
  DNSName: string,
  EC2?: ?AWS.EC2,
  TTL?: ?number,
  region?: ?string,
  log?: ?(...args: any) => any,
  verbose?: ?boolean,
}): Promise<Array<GeneratedResourceRecordSet>> {
  const { InstanceId, DNSName, TTL, verbose, region } = options
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const EC2 = options.EC2 || new AWS.EC2(region ? { region } : {})
  if (verbose) log(`Describing EC2 Instance: ${InstanceId}...`)
  const response: DescribeInstancesResponse = await EC2.describeInstances({
    InstanceIds: [InstanceId],
  }).promise()
  DescribeInstancesResponseType.assert(response)
  const { Reservations } = response
  if (!Reservations.length) throw new Error(`Instance not found: ${InstanceId}`)
  if (Reservations.length > 1)
    throw new Error(`Multiple reservations found for instance: ${InstanceId}`)
  const { Instances } = Reservations[0]
  if (!Instances || !Instances.length)
    throw new Error(`Instance not found: ${InstanceId}`)
  if (Instances.length > 1)
    throw new Error(`Multiple instances found for id: ${InstanceId}`)

  const { PublicIpAddress, PrivateIpAddress } = Instances[0]
  if (verbose) {
    log(
      `Got PublicIpAddress: ${String(
        PublicIpAddress
      )}, PrivateIpAddress: ${String(PrivateIpAddress)}`
    )
  }
  const result: Array<GeneratedResourceRecordSet> = []
  if (PublicIpAddress) {
    result.push({
      ResourceRecordSet: {
        Name: DNSName,
        Type: 'A',
        ResourceRecords: [{ Value: PublicIpAddress }],
      },
      InstanceId,
      PrivateZone: false,
    })
  }
  if (PrivateIpAddress) {
    result.push({
      ResourceRecordSet: {
        Name: DNSName,
        Type: 'A',
        ResourceRecords: [{ Value: PrivateIpAddress }],
      },
      InstanceId,
      PrivateZone: true,
    })
  }
  if (TTL != null) {
    for (const { ResourceRecordSet } of result) {
      ResourceRecordSet.TTL = TTL
    }
  }
  return result
}

export async function genRecordSetsForLoadBalancer(options: {
  LoadBalancerArn: string,
  DNSName: string,
  ELBv2?: ?AWS.ELBv2,
  log?: ?(...args: any) => any,
  region?: ?string,
  verbose?: ?boolean,
}): Promise<Array<GeneratedResourceRecordSet>> {
  const { LoadBalancerArn, DNSName, verbose, region } = options
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const ELBv2 = options.ELBv2 || new AWS.ELBv2(region ? { region } : {})
  if (verbose) log(`Describing load balancer: ${LoadBalancerArn}...`)
  const response = await ELBv2.describeLoadBalancers({
    LoadBalancerArns: [LoadBalancerArn],
  }).promise()
  DescribeLoadBalancersResponseType.assert(response)
  const { LoadBalancers } = response
  if (!LoadBalancers || !LoadBalancers.length) {
    throw new Error(`Load balancer not found: ${LoadBalancerArn}`)
  }
  if (LoadBalancers.length > 1) {
    throw new Error(
      `More than 1 load balancer found for arn: ${LoadBalancerArn}`
    )
  }
  const balancer = LoadBalancers[0]
  const ResourceRecordSet = {
    Name: DNSName,
    Type: 'A',
    AliasTarget: {
      DNSName: balancer.DNSName,
      HostedZoneId: balancer.CanonicalHostedZoneId,
      EvaluateTargetHealth: false,
    },
  }
  return [
    {
      ResourceRecordSet,
      LoadBalancerArn,
      PrivateZone: false,
    },
    {
      ResourceRecordSet,
      LoadBalancerArn,
      PrivateZone: true,
    },
  ]
}

export async function genRecordSetsForStackOutputs(options: {
  Outputs: Array<StackOutput>,
  DNSName: string,
  TTL?: ?number,
  EC2?: ?AWS.EC2,
  ELBv2?: ?AWS.ELBv2,
  region?: ?string,
  log?: ?(...args: any) => any,
  verbose?: ?boolean,
}): Promise<Array<GeneratedResourceRecordSet>> {
  const { Outputs, DNSName, TTL, EC2, ELBv2, region, verbose } = options
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const ecsInstanceIds: { [string]: string } = {}
  const loadBalancerArns: { [string]: string } = {}
  for (const { OutputKey, OutputValue } of Outputs) {
    if (!OutputValue) continue
    if (isECSInstanceId(OutputValue)) ecsInstanceIds[OutputKey] = OutputValue
    else if (isLoadBalancerArn(OutputValue))
      loadBalancerArns[OutputKey] = OutputValue
  }
  if (isEmpty(ecsInstanceIds) && isEmpty(loadBalancerArns)) {
    throw new Error(`No addressable outputs found`)
  }
  if (isEmpty(ecsInstanceIds) !== isEmpty(loadBalancerArns)) {
    if (!isEmpty(ecsInstanceIds)) {
      const result = await genRecordSetsForECSInstance({
        InstanceId: (Object.values(ecsInstanceIds)[0]: any),
        DNSName,
        TTL,
        EC2,
        region,
        log,
        verbose,
      })
      result.forEach(item => (item.OutputKey = Object.keys(ecsInstanceIds)[0]))
      return result
    } else {
      const result = await genRecordSetsForLoadBalancer({
        LoadBalancerArn: (Object.values(loadBalancerArns)[0]: any),
        DNSName,
        ELBv2,
        region,
        log,
        verbose,
      })
      result.forEach(
        item => (item.OutputKey = Object.keys(loadBalancerArns)[0])
      )
      return result
    }
  }
  throw new Error(`Multiple addressable outputs found!
${
    isEmpty(ecsInstanceIds)
      ? ''
      : `ECS Instances:\n  ${Object.values(ecsInstanceIds).join('\n  ')}`
  }
${
    isEmpty(loadBalancerArns)
      ? ''
      : `Load Balancers:\n  ${Object.values(loadBalancerArns).join('\n  ')}`
  }`)
}

export type GenRecordSetsForStackOptions = {
  StackName: string,
  DNSName: string,
  TTL?: ?number,
  interactive?: ?boolean,
  CloudFormation?: ?AWS.CloudFormation,
  EC2?: ?AWS.EC2,
  ELBv2?: ?AWS.ELBv2,
  region?: ?string,
  log?: ?(...args: any) => any,
  verbose?: ?boolean,
}

export async function genRecordSetsForStack(
  options: GenRecordSetsForStackOptions
): Promise<Array<GeneratedResourceRecordSet>> {
  const {
    StackName,
    DNSName,
    interactive,
    EC2,
    ELBv2,
    verbose,
    region,
    TTL,
  } = options
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const CloudFormation =
    options.CloudFormation || new AWS.CloudFormation(region ? { region } : {})
  if (verbose) log(`Describing CloudFormation stack: ${StackName}`)
  const response = await CloudFormation.describeStacks({
    StackName,
  }).promise()
  DescribeStacksResponseType.assert(response)
  const { Stacks } = response
  if (!Stacks.length) throw new Error(`Stack not found: ${StackName}`)
  if (Stacks.length > 1)
    throw new Error(`More than one stack found for name: ${StackName}`)
  const { Outputs } = Stacks[0]
  if (verbose) log(`Got outputs: ${JSON.stringify(Outputs, null, 2)}`)
  return await genRecordSetsForStackOutputs({
    Outputs,
    DNSName,
    TTL,
    interactive,
    EC2,
    ELBv2,
    region,
    log,
    verbose,
  })
}

type UpsertOptions = $Call<<T>((T) => any) => T, typeof upsertRecordSet>

export type UpsertRecordSetsForStackOptions = GenRecordSetsForStackOptions & {
  Comment?: ?string,
  Route53?: ?AWS.Route53,
}

export async function upsertRecordSetsForStack(
  options: UpsertRecordSetsForStackOptions
): Promise<void> {
  const recordSets = await genRecordSetsForStack(options)

  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const { verbose, Comment, region } = options
  const Route53 = options.Route53 || new AWS.Route53(region ? { region } : {})
  await Promise.all(
    recordSets.map(
      async ({
        ResourceRecordSet,
        PrivateZone,
      }: GeneratedResourceRecordSet): Promise<any> => {
        const upsertOptions: UpsertOptions = {
          Route53,
          ResourceRecordSet,
          PrivateZone,
          log,
          verbose,
        }
        if (Comment) upsertOptions.Comment = Comment
        await upsertRecordSet(upsertOptions)
      }
    )
  )
}

export function confirmationMessage(options: {
  StackName: string,
  recordSets: Array<GeneratedResourceRecordSet>,
}): string {
  const { StackName, recordSets } = options
  /* eslint-disable no-console */
  return `These are the DNS records that will be upserted for stack ${StackName}:

${recordSets
    .map(
      ({
        ResourceRecordSet,
        PrivateZone,
        OutputKey,
        InstanceId,
        LoadBalancerArn,
      }: GeneratedResourceRecordSet) =>
        `${chalk.bold(ResourceRecordSet.Name)} (${
          PrivateZone ? 'private' : 'public'
        } zone)
  from stack output [${String(OutputKey)}]: ${String(
          InstanceId || LoadBalancerArn
        )}:
${JSON.stringify(ResourceRecordSet, null, 2).replace(/^/gm, '  ')}
`
    )
    .join('\n')}
  `
  /* eslint-enable no-console */
}

if (!module.parent) {
  /* eslint-disable no-console */
  const argv = process.argv.slice(2)
  const StackName = argv.find(arg => !isDomainName(arg) || arg.indexOf('.') < 0)
  const DNSName = argv.find(arg => isDomainName(arg) && arg.indexOf('.') >= 0)
  if (!StackName || !DNSName) {
    console.log(
      `Usage: ${process.argv[0]} ${process.argv[1]} <stack name> <domain name>`
    )
    process.exit(1)
  } else {
    genRecordSetsForStack({
      StackName,
      DNSName,
      region: 'us-west-2',
      verbose: false,
    }).then(
      r => console.log(confirmationMessage({ StackName, recordSets: r })),
      console.error
    ) // eslint-disable-line no-console
  }
}
